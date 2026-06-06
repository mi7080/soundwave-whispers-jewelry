import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2, Package, Users, DollarSign,
  Settings as SettingsIcon, AlertTriangle, Save, Send,
  Trash2, ArchiveRestore,
} from "lucide-react";
import AdminOrders from "./AdminOrders";
import { DateRangeProvider, useDateRange, inRange } from "@/components/admin/DateRangeContext";
import { computeFinanceStats } from "@/lib/financeStats";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { AdminShell, type AdminTab } from "@/components/admin/AdminShell";
import { AdminCard, AdminKpi, AdminSectionHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const ADMIN_EMAILS = ["mi7080@gmail.com", "adir.yed@gmail.com"];

interface CostSettings {
  id: number;
  shineon_unit_cost: number;
  transaction_fee_percent: number;
  transaction_fee_fixed: number;
  monthly_ad_spend: number;
  currency: string;
  updated_at: string;
}

interface OrderSummary {
  id: string;
  amount: number | null;
  created_at: string;
  status: string;
  customer_email: string | null;
  customer_name: string | null;
  pet_name: string;
}

interface LeadSummary {
  id: string;
  email: string;
  status: string;
  created_at: string;
  archived_at: string | null;
}

type TabKey = "dashboard" | "finance" | "crm" | "settings";

const TABS: AdminTab[] = [
  { key: "dashboard", label: "Orders", icon: <Package className="w-3.5 h-3.5" /> },
  { key: "finance", label: "Finance", icon: <DollarSign className="w-3.5 h-3.5" /> },
  { key: "crm", label: "CRM", icon: <Users className="w-3.5 h-3.5" /> },
  { key: "settings", label: "Settings", icon: <SettingsIcon className="w-3.5 h-3.5" /> },
];

const AdminControl = () => {
  const navigate = useNavigate();
  const [authChecking, setAuthChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [tab, setTab] = useState<TabKey>("dashboard");

  // Auth gate: ONLY mi7080@gmail.com with admin role
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/admin-login", { replace: true });
        return;
      }
      const { data: hasRole } = await supabase.rpc("has_role", {
        _user_id: session.user.id, _role: "admin",
      });
      if (!mounted) return;
      if (hasRole && ADMIN_EMAILS.includes(session.user.email ?? "")) {
        setAuthorized(true);
      } else {
        toast.error("Access denied - Command Center is restricted");
        await supabase.auth.signOut();
        navigate("/", { replace: true });
        return;
      }
      setAuthChecking(false);
    };
    check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate("/admin-login", { replace: true });
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [navigate]);

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-gold" />
      </div>
    );
  }
  if (!authorized) return null;

  const signOut = async () => { await supabase.auth.signOut(); navigate("/"); };

  return (
    <DateRangeProvider>
      <AdminShell
        tabs={TABS}
        active={tab}
        onChange={(k) => setTab(k as TabKey)}
        onSignOut={signOut}
        headerExtra={<DateRangePicker />}
      >
        {tab === "dashboard" && <AdminOrders embedded />}
        {tab === "finance" && <FinanceTab />}
        {tab === "crm" && <CrmTab />}
        {tab === "settings" && <SettingsTab />}
      </AdminShell>
    </DateRangeProvider>
  );
};

// ─── Finance Tab ────────────────────────────────────────────────────
const FinanceTab = () => {
  const { range } = useDateRange();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [costs, setCosts] = useState<CostSettings | null>(null);

  useEffect(() => {
    const load = async () => {
      const [ordersRes, costsRes] = await Promise.all([
        supabase.from("animus_orders").select("id,amount,created_at,status,customer_email,customer_name,pet_name").order("created_at", { ascending: false }),
        supabase.from("cost_settings").select("*").eq("id", 1).maybeSingle(),
      ]);
      if (ordersRes.data) setOrders(ordersRes.data as OrderSummary[]);
      if (costsRes.data) setCosts(costsRes.data as CostSettings);
      setLoading(false);
    };
    load();
  }, []);

  const stats = useMemo(
    () => (costs ? computeFinanceStats(orders, costs, range) : null),
    [orders, costs, range],
  );

  if (loading) {
    return <div className="container mx-auto px-6 py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gold" /></div>;
  }
  if (!costs) {
    return <div className="container mx-auto px-6 py-20 text-center text-muted-foreground">No cost settings found. Configure them in the Settings tab.</div>;
  }
  if (!stats) return null;

  return (
    <div className="container mx-auto px-6 py-10 max-w-7xl">
      <AdminSectionHeader
        eyebrow="Financial Intelligence"
        title="Profit & Margins"
        right={<p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground">{range.label} · Live</p>}
      />

      {(stats.adAlert || stats.productionAlert) && (
        <div className="mb-6 space-y-2">
          {stats.adAlert && (
            <CostAlert
              title="Ad spend is dominating margin"
              message={`Pro-rated ad cost (${costs.currency} ${stats.avgAdPerOrder.toFixed(2)}/order) exceeds 30% of average order value. Review campaigns.`}
            />
          )}
          {stats.productionAlert && (
            <CostAlert
              title="Production cost ratio is high"
              message={`ShineOn unit cost is over 40% of avg order value (${costs.currency} ${stats.avgOrderValue.toFixed(2)}). Consider repricing.`}
            />
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <AdminKpi label={`Revenue · ${range.label}`} value={`${costs.currency} ${stats.totalRevenue.toFixed(2)}`} />
        <AdminKpi label="Total Costs" value={`${costs.currency} ${stats.totalCost.toFixed(2)}`} negative />
        <AdminKpi label="Net Profit" value={`${costs.currency} ${stats.totalProfit.toFixed(2)}`} tone={stats.totalProfit >= 0 ? "positive" : "negative"} />
        <AdminKpi label="Margin" value={`${stats.margin.toFixed(1)}%`} tone="accent" />
        <AdminKpi label="Avg Order Value" value={`${costs.currency} ${stats.avgOrderValue.toFixed(2)}`} />
        <AdminKpi label="Avg Profit/Order" value={`${costs.currency} ${stats.avgProfit.toFixed(2)}`} tone={stats.avgProfit >= 0 ? "positive" : "negative"} />
        <AdminKpi label="Avg Ad Cost/Order" value={`${costs.currency} ${stats.avgAdPerOrder.toFixed(2)}`} />
        <AdminKpi label={`Orders · ${range.label}`} value={`${stats.orderCount}`} />
      </div>

      <AdminCard className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-[11px] tracking-[0.25em] uppercase text-gold">Per-Order Profit</h3>
          <p className="text-[10px] text-muted-foreground">{stats.paidOrders.length} paid orders</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                <th className="text-left px-5 py-3 font-medium">Date</th>
                <th className="text-left px-5 py-3 font-medium">Customer</th>
                <th className="text-right px-5 py-3 font-medium">Revenue</th>
                <th className="text-right px-5 py-3 font-medium">Costs</th>
                <th className="text-right px-5 py-3 font-medium">Net Profit</th>
              </tr>
            </thead>
            <tbody>
              {stats.paidOrders.slice(0, 50).map(o => {
                const amt = Number(o.amount) || 0;
                const profit = stats.profitFor(o);
                const cost = amt - profit;
                return (
                  <tr key={o.id} className="border-t border-border/60">
                    <td className="px-5 py-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-foreground">{o.customer_name || o.pet_name}</td>
                    <td className="px-5 py-3 text-right text-foreground tabular-nums">{costs.currency} {amt.toFixed(2)}</td>
                    <td className="px-5 py-3 text-right text-xs text-destructive tabular-nums">−{costs.currency} {cost.toFixed(2)}</td>
                    <td className={cn("px-5 py-3 text-right font-medium tabular-nums", profit >= 0 ? "text-emerald-700" : "text-destructive")}>
                      {costs.currency} {profit.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
              {stats.paidOrders.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-xs text-muted-foreground">No paid orders yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  );
};

const CostAlert = ({ title, message }: { title: string; message: string }) => (
  <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/[0.06]">
    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-destructive" />
    <div>
      <p className="text-sm font-medium text-destructive">{title}</p>
      <p className="text-xs mt-1 text-muted-foreground">{message}</p>
    </div>
  </div>
);

// ─── CRM Tab ────────────────────────────────────────────────────────
const CrmTab = () => {
  const { range } = useDateRange();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [view, setView] = useState<"leads" | "customers">("leads");
  const [sendingCampaign, setSendingCampaign] = useState<boolean>(false);
  const [showArchivedLeads, setShowArchivedLeads] = useState(false);

  const liveLeads = useMemo(() => leads.filter(l => !l.archived_at), [leads]);
  const archivedLeadCount = leads.length - liveLeads.length;
  const filteredLeads = useMemo(
    () => leads.filter(l => (showArchivedLeads ? !!l.archived_at : !l.archived_at) && inRange(l.created_at, range)),
    [leads, range, showArchivedLeads],
  );
  const filteredOrders = useMemo(() => orders.filter(o => inRange(o.created_at, range)), [orders, range]);

  useEffect(() => {
    const load = async () => {
      const [leadsRes, ordersRes] = await Promise.all([
        supabase.from("waitlist_leads").select("*").order("created_at", { ascending: false }),
        supabase.from("animus_orders").select("id,amount,created_at,status,customer_email,customer_name,pet_name")
          .not("customer_email", "is", null).order("created_at", { ascending: false }),
      ]);
      if (leadsRes.data) setLeads(leadsRes.data as LeadSummary[]);
      if (ordersRes.data) setOrders(ordersRes.data as OrderSummary[]);
      setLoading(false);
    };
    load();
  }, []);

  // Sends the Founders Launch email (40% / FCB011) to a single lead - for stragglers
  // who join after the bulk send. Reuses send-campaign-email's single-recipient path.
  const sendLeadInvitation = async (lead: LeadSummary) => {
    setSendingId(lead.id);
    const { data, error } = await supabase.functions.invoke("send-campaign-email", {
      body: { baseUrl: "https://animuswave.com", testEmail: lead.email },
    });
    setSendingId(null);
    if (error || data?.error) {
      toast.error(`Failed: ${error?.message || data?.error || "unknown"}`);
    } else {
      toast.success(`Founders Launch sent to ${lead.email}`);
      await supabase.from("waitlist_leads").update({ status: "invited", status_updated_at: new Date().toISOString() }).eq("id", lead.id);
      setLeads(p => p.map(l => l.id === lead.id ? { ...l, status: "invited" } : l));
    }
  };

  const sendCampaign = async (testEmail?: string) => {
    setSendingCampaign(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-campaign-email", {
        body: { baseUrl: "https://animuswave.com", testEmail },
      });
      if (error) throw error;
      toast.success(`Founders Launch - sent ${data?.sent ?? 0} / ${data?.total ?? 0}${data?.failed ? ` (${data.failed} failed)` : ""}`);
      if (data?.errors?.length) console.warn("Campaign send errors:", data.errors);
    } catch (e) {
      toast.error(`Campaign failed: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setSendingCampaign(false);
    }
  };

  const setLeadArchived = async (lead: LeadSummary, archived: boolean) => {
    const archived_at = archived ? new Date().toISOString() : null;
    const prev = leads;
    setLeads(p => p.map(l => l.id === lead.id ? { ...l, archived_at } : l));
    const { error } = await supabase.from("waitlist_leads").update({ archived_at }).eq("id", lead.id);
    if (error) {
      setLeads(prev);
      toast.error(archived ? "Failed to archive" : "Failed to restore");
    } else {
      toast.success(archived ? `Archived ${lead.email}` : `Restored ${lead.email}`);
    }
  };

  if (loading) {
    return <div className="container mx-auto px-6 py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gold" /></div>;
  }

  return (
    <div className="container mx-auto px-6 py-10 max-w-7xl">
      <AdminSectionHeader
        eyebrow="Relationships"
        title="Elite CRM"
        right={
          <div className="flex items-center gap-1 rounded-lg border border-border p-1 bg-card">
            <CrmToggle active={view === "leads"} onClick={() => setView("leads")}>Founders' Circle ({filteredLeads.length})</CrmToggle>
            <CrmToggle active={view === "customers"} onClick={() => setView("customers")}>Customers ({filteredOrders.length})</CrmToggle>
          </div>
        }
      />

      {view === "leads" && (
        <div className="mb-6">
          <CampaignCard
            title="Founders Launch"
            subtitle={'"We\'re ready. Your 40% discount is live."'}
            leadCount={liveLeads.length}
            sending={sendingCampaign}
            anySending={sendingCampaign}
            onTest={(t) => sendCampaign(t)}
            onSendAll={() => sendCampaign()}
          />
        </div>
      )}

      {view === "leads" && (
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] tracking-[0.2em] uppercase text-muted-foreground">
            {showArchivedLeads ? `Archived leads (${archivedLeadCount})` : ""}
          </span>
          <button
            onClick={() => setShowArchivedLeads(s => !s)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border/50 text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground hover:border-gold transition-colors shrink-0"
          >
            {showArchivedLeads ? "Back to active" : `Archived (${archivedLeadCount})`}
          </button>
        </div>
      )}

      {view === "leads" ? (
        <AdminCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                  <th className="text-left px-5 py-3 font-medium">Email</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-left px-5 py-3 font-medium">Joined</th>
                  <th className="text-right px-5 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(l => (
                  <tr key={l.id} className="border-t border-border/60">
                    <td className="px-5 py-3 text-foreground">{l.email}</td>
                    <td className={cn("px-5 py-3 text-xs capitalize", l.status === "invited" ? "text-gold-dark" : "text-muted-foreground")}>{l.status}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {showArchivedLeads ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLeadArchived(l, false)}
                            aria-label={`Restore ${l.email}`}
                            className="text-[10px] tracking-[0.2em] uppercase text-emerald-700 hover:text-emerald-800"
                          >
                            <ArchiveRestore className="w-3 h-3" /> Restore
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => sendLeadInvitation(l)}
                              disabled={sendingId === l.id}
                              aria-label={`Send Founders Launch email to ${l.email}`}
                              className="text-[10px] tracking-[0.2em] uppercase border-gold/40 text-gold-dark hover:bg-gold/10"
                            >
                              {sendingId === l.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                              Send Launch
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  aria-label={`Archive ${l.email}`}
                                  className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="w-3 h-3" /> Archive
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Archive this email?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {l.email} will be hidden from the CRM and excluded from campaign sends. You can restore it anytime from the Archived view.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => setLeadArchived(l, true)}>Archive</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredLeads.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-12 text-center text-xs text-muted-foreground">No leads in {range.label.toLowerCase()}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </AdminCard>
      ) : (
        <AdminCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                  <th className="text-left px-5 py-3 font-medium">Customer</th>
                  <th className="text-left px-5 py-3 font-medium">Email</th>
                  <th className="text-left px-5 py-3 font-medium">Pendant</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(o => (
                  <tr key={o.id} className="border-t border-border/60">
                    <td className="px-5 py-3 text-foreground">{o.customer_name || " - "}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{o.customer_email}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{o.pet_name}</td>
                    <td className="px-5 py-3 text-xs capitalize text-muted-foreground">{o.status.replace(/_/g, " ")}</td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-12 text-center text-xs text-muted-foreground">No customers in {range.label.toLowerCase()}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}
    </div>
  );
};

const CampaignCard = ({ title, subtitle, leadCount, sending, anySending, onTest, onSendAll }: {
  title: string;
  subtitle: string;
  leadCount: number;
  sending: boolean;
  anySending: boolean;
  onTest: (email: string) => void;
  onSendAll: () => void;
}) => {
  const [testEmail, setTestEmail] = useState("");
  return (
    <AdminCard className="p-5 flex flex-col gap-3">
      <div>
        <p className="text-[10px] tracking-[0.25em] uppercase text-gold">{title}</p>
        <p className="text-sm text-foreground mt-1">{subtitle}</p>
      </div>
      <div className="flex items-stretch gap-2 mt-auto">
        <Input
          type="email"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          placeholder="test@email.com"
          aria-label={`Test recipient for ${title} campaign`}
          className="h-9 text-xs"
        />
        <Button
          variant="outline"
          size="sm"
          disabled={anySending || !testEmail.trim()}
          onClick={() => onTest(testEmail.trim())}
          className="text-[10px] tracking-[0.2em] uppercase shrink-0"
        >
          {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          Test
        </Button>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            disabled={anySending || leadCount === 0}
            className="w-full text-[10px] tracking-[0.25em] uppercase"
          >
            {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            Send to all {leadCount} leads
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send "{title}" to the full waitlist?</AlertDialogTitle>
            <AlertDialogDescription>
              This emails all {leadCount} leads via Resend with the 40% Founders discount (code FCB011). This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onSendAll}>Send to all</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminCard>
  );
};

const CrmToggle = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={cn(
      "px-4 py-2 rounded-md text-[10px] tracking-[0.2em] uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      active ? "bg-gold text-accent-foreground font-semibold" : "text-muted-foreground hover:text-foreground",
    )}
  >
    {children}
  </button>
);

// ─── Settings Tab ───────────────────────────────────────────────────
const SettingsTab = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [costs, setCosts] = useState<CostSettings | null>(null);
  const [form, setForm] = useState({
    shineon_unit_cost: "0",
    transaction_fee_percent: "0",
    transaction_fee_fixed: "0",
    monthly_ad_spend: "0",
    currency: "USD",
  });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("cost_settings").select("*").eq("id", 1).maybeSingle();
      if (data) {
        const c = data as CostSettings;
        setCosts(c);
        setForm({
          shineon_unit_cost: String(c.shineon_unit_cost),
          transaction_fee_percent: String(c.transaction_fee_percent),
          transaction_fee_fixed: String(c.transaction_fee_fixed),
          monthly_ad_spend: String(c.monthly_ad_spend),
          currency: c.currency,
        });
      }
      setLoading(false);
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    const updates = {
      shineon_unit_cost: parseFloat(form.shineon_unit_cost) || 0,
      transaction_fee_percent: parseFloat(form.transaction_fee_percent) || 0,
      transaction_fee_fixed: parseFloat(form.transaction_fee_fixed) || 0,
      monthly_ad_spend: parseFloat(form.monthly_ad_spend) || 0,
      currency: form.currency.trim().toUpperCase() || "USD",
    };
    const { error } = await supabase.from("cost_settings").update(updates).eq("id", 1);
    setSaving(false);
    if (error) {
      toast.error(`Save failed: ${error.message}`);
    } else {
      toast.success("Settings saved - profit calculations updated");
      setCosts(c => c ? { ...c, ...updates, updated_at: new Date().toISOString() } : c);
    }
  };

  if (loading) {
    return <div className="container mx-auto px-6 py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gold" /></div>;
  }

  return (
    <div className="container mx-auto px-6 py-10 max-w-3xl">
      <AdminSectionHeader eyebrow="Configuration" title="Cost Settings" />
      <p className="text-xs mb-8 text-muted-foreground -mt-4">
        Edit any value and save. The Finance tab updates immediately.
      </p>

      <AdminCard className="p-6 space-y-5">
        <SettingField
          label="ShineOn Unit Cost"
          hint="What each pendant costs you from the ShineOn manufacturer"
          value={form.shineon_unit_cost}
          onChange={(v) => setForm(f => ({ ...f, shineon_unit_cost: v }))}
          prefix={form.currency}
        />
        <SettingField
          label="Transaction Fee - Percent"
          hint="Payment processor percentage (e.g. iCount / Stripe)"
          value={form.transaction_fee_percent}
          onChange={(v) => setForm(f => ({ ...f, transaction_fee_percent: v }))}
          suffix="%"
        />
        <SettingField
          label="Transaction Fee - Fixed"
          hint="Per-transaction flat fee"
          value={form.transaction_fee_fixed}
          onChange={(v) => setForm(f => ({ ...f, transaction_fee_fixed: v }))}
          prefix={form.currency}
        />
        <SettingField
          label="Monthly Ad Spend"
          hint="Total marketing spend this month - pro-rated across orders this month"
          value={form.monthly_ad_spend}
          onChange={(v) => setForm(f => ({ ...f, monthly_ad_spend: v }))}
          prefix={form.currency}
        />
        <SettingField
          label="Currency Code"
          hint="3-letter ISO code (USD, ILS, EUR…)"
          value={form.currency}
          onChange={(v) => setForm(f => ({ ...f, currency: v }))}
          isText
        />

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <p className="text-[10px] text-muted-foreground">
            {costs?.updated_at && `Last saved ${new Date(costs.updated_at).toLocaleString()}`}
          </p>
          <Button onClick={save} disabled={saving} className="text-[11px] tracking-[0.25em] uppercase">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Settings
          </Button>
        </div>
      </AdminCard>
    </div>
  );
};

const SettingField = ({ label, hint, value, onChange, prefix, suffix, isText }: {
  label: string; hint: string; value: string; onChange: (v: string) => void;
  prefix?: string; suffix?: string; isText?: boolean;
}) => {
  const id = `setting-${label.replace(/[^a-z]/gi, "-").toLowerCase()}`;
  return (
    <div>
      <Label htmlFor={id} className="block text-[10px] tracking-[0.25em] uppercase mb-1.5 text-gold-dark">{label}</Label>
      <p className="text-[11px] mb-2 text-muted-foreground">{hint}</p>
      <div className="flex items-stretch rounded-md border border-input overflow-hidden focus-within:ring-2 focus-within:ring-ring">
        {prefix && <span className="px-3 flex items-center text-xs bg-gold/[0.08] text-gold-dark">{prefix}</span>}
        <Input
          id={id}
          type={isText ? "text" : "number"}
          step={isText ? undefined : "0.01"}
          inputMode={isText ? undefined : "decimal"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        {suffix && <span className="px-3 flex items-center text-xs bg-gold/[0.08] text-gold-dark">{suffix}</span>}
      </div>
    </div>
  );
};

export default AdminControl;
