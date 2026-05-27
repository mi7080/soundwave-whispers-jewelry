import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2, Package, Users, DollarSign,
  Settings as SettingsIcon, AlertTriangle, Save, Mail, Send,
  Boxes, Music, FileText, Image as ImageIcon, FolderOpen, ExternalLink, CheckCircle2, Circle,
} from "lucide-react";
import AdminOrders from "./AdminOrders";
import { DateRangeProvider, useDateRange, inRange } from "@/components/admin/DateRangeContext";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { AdminShell, type AdminTab } from "@/components/admin/AdminShell";
import { AdminCard, AdminKpi, AdminSectionHeader, AdminEmpty } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const ADMIN_EMAIL = "mi7080@gmail.com";

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
}

type TabKey = "dashboard" | "production" | "finance" | "crm" | "settings";

const TABS: AdminTab[] = [
  { key: "dashboard", label: "Orders", icon: <Package className="w-3.5 h-3.5" /> },
  { key: "production", label: "Production", icon: <Boxes className="w-3.5 h-3.5" /> },
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
      if (hasRole && session.user.email === ADMIN_EMAIL) {
        setAuthorized(true);
      } else {
        toast.error("Access denied — Command Center is restricted");
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
        {tab === "production" && <ProductionTab />}
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

  const stats = useMemo(() => {
    if (!costs) return null;
    const paidOrders = orders.filter(o => ["paid","fulfilled","shipped","shineon_error"].includes(o.status) && o.amount && inRange(o.created_at, range));
    const totalRevenue = paidOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
    const orderCount = paidOrders.length || 1;

    // Pro-rated ad spend per order (monthly / count of paid orders this month)
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthOrders = paidOrders.filter(o => new Date(o.created_at) >= monthStart);
    const monthOrderCount = monthOrders.length || 1;
    const adSpendPerOrder = Number(costs.monthly_ad_spend) / monthOrderCount;

    const computeProfit = (amount: number) => {
      const fees = (amount * Number(costs.transaction_fee_percent) / 100) + Number(costs.transaction_fee_fixed);
      return amount - Number(costs.shineon_unit_cost) - fees - adSpendPerOrder;
    };

    const totalCost = paidOrders.reduce((sum, o) => {
      const amt = Number(o.amount) || 0;
      const fees = (amt * Number(costs.transaction_fee_percent) / 100) + Number(costs.transaction_fee_fixed);
      return sum + Number(costs.shineon_unit_cost) + fees + adSpendPerOrder;
    }, 0);

    const totalProfit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const avgOrderValue = totalRevenue / orderCount;
    const avgProfit = totalProfit / orderCount;

    const adAlert = avgOrderValue > 0 && (adSpendPerOrder / avgOrderValue) > 0.3;
    const productionAlert = avgOrderValue > 0 && (Number(costs.shineon_unit_cost) / avgOrderValue) > 0.4;

    return {
      totalRevenue, totalCost, totalProfit, margin, avgOrderValue, avgProfit,
      adSpendPerOrder, monthOrderCount, paidOrders, computeProfit,
      adAlert, productionAlert,
    };
  }, [orders, costs, range]);

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
              message={`Pro-rated ad cost (${costs.currency} ${stats.adSpendPerOrder.toFixed(2)}/order) exceeds 30% of average order value. Review campaigns.`}
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
        <AdminKpi label="Ad Cost/Order" value={`${costs.currency} ${stats.adSpendPerOrder.toFixed(2)}`} />
        <AdminKpi label={`Orders · ${range.label}`} value={`${stats.monthOrderCount}`} />
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
                const profit = stats.computeProfit(amt);
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
  const [sendingCampaign, setSendingCampaign] = useState<"email1" | "email2" | null>(null);

  const filteredLeads = useMemo(() => leads.filter(l => inRange(l.created_at, range)), [leads, range]);
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

  const sendLeadInvitation = async (lead: LeadSummary) => {
    setSendingId(lead.id);
    const { data, error } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "lead-early-access",
        recipientEmail: lead.email,
        idempotencyKey: `lead-invite-${lead.id}`,
        templateData: { inviteUrl: "https://animuswave.com/early-access-store" },
      },
    });
    setSendingId(null);
    if (error || data?.error) {
      toast.error(`Failed: ${error?.message || data?.error || "unknown"}`);
    } else {
      toast.success(`Early access invitation sent to ${lead.email}`);
      await supabase.from("waitlist_leads").update({ status: "invited", status_updated_at: new Date().toISOString() }).eq("id", lead.id);
      setLeads(p => p.map(l => l.id === lead.id ? { ...l, status: "invited" } : l));
    }
  };

  const sendCustomerUpdate = async (order: OrderSummary) => {
    if (!order.customer_email) { toast.error("No customer email on file"); return; }
    setSendingId(order.id);
    const { data: full } = await supabase.from("animus_orders").select("tracking_number,pet_name,customer_name").eq("id", order.id).maybeSingle();
    const { data, error } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "tracking-update",
        recipientEmail: order.customer_email,
        idempotencyKey: `tracking-${order.id}-${full?.tracking_number || "manual"}`,
        templateData: {
          name: full?.customer_name || "",
          petName: full?.pet_name || "",
          trackingNumber: full?.tracking_number || "Pending — we'll send tracking shortly",
        },
      },
    });
    setSendingId(null);
    if (error || data?.error) {
      toast.error(`Failed: ${error?.message || data?.error || "unknown"}`);
    } else {
      toast.success(`Update sent to ${order.customer_email}`);
    }
  };

  const sendCampaign = async (campaign: "email1" | "email2", testEmail?: string) => {
    const label = campaign === "email1" ? "Status Update" : "Referral Program";
    setSendingCampaign(campaign);
    try {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://animuswave.com";
      const { data, error } = await supabase.functions.invoke("send-campaign-email", {
        body: { campaign, baseUrl, testEmail },
      });
      if (error) throw error;
      toast.success(`${label} — sent ${data?.sent ?? 0} / ${data?.total ?? 0}${data?.failed ? ` (${data.failed} failed)` : ""}`);
      if (data?.errors?.length) console.warn("Campaign send errors:", data.errors);
    } catch (e: any) {
      toast.error(`Campaign failed: ${e?.message || "unknown error"}`);
    } finally {
      setSendingCampaign(null);
    }
  };

  const markContacted = async (lead: LeadSummary) => {
    const { error } = await supabase.from("waitlist_leads")
      .update({ status: "contacted", status_updated_at: new Date().toISOString() })
      .eq("id", lead.id);
    if (error) { toast.error("Failed to update lead"); return; }
    setLeads(p => p.map(l => l.id === lead.id ? { ...l, status: "contacted" } : l));
    toast.success(`Marked ${lead.email} as contacted`);
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
        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          <CampaignCard
            title="Status Update"
            subtitle={'"We\'re listening… 🕊️"'}
            leadCount={leads.length}
            sending={sendingCampaign === "email1"}
            anySending={sendingCampaign !== null}
            onTest={(t) => sendCampaign("email1", t)}
            onSendAll={() => sendCampaign("email1")}
          />
          <CampaignCard
            title="Referral Program"
            subtitle={'"ANIMUS for free? 🎁"'}
            leadCount={leads.length}
            sending={sendingCampaign === "email2"}
            anySending={sendingCampaign !== null}
            onTest={(t) => sendCampaign("email2", t)}
            onSendAll={() => sendCampaign("email2")}
          />
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
                        {l.status !== "contacted" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markContacted(l)}
                            aria-label={`Mark ${l.email} as contacted`}
                            className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Contacted
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendLeadInvitation(l)}
                          disabled={sendingId === l.id}
                          aria-label={`Send early access invite to ${l.email}`}
                          className="text-[10px] tracking-[0.2em] uppercase border-gold/40 text-gold-dark hover:bg-gold/10"
                        >
                          {sendingId === l.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                          Send Invite
                        </Button>
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
                  <th className="text-right px-5 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(o => (
                  <tr key={o.id} className="border-t border-border/60">
                    <td className="px-5 py-3 text-foreground">{o.customer_name || "—"}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{o.customer_email}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{o.pet_name}</td>
                    <td className="px-5 py-3 text-xs capitalize text-muted-foreground">{o.status.replace(/_/g, " ")}</td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendCustomerUpdate(o)}
                        disabled={sendingId === o.id}
                        aria-label={`Email update to ${o.customer_email}`}
                        className="text-[10px] tracking-[0.2em] uppercase border-gold/40 text-gold-dark hover:bg-gold/10"
                      >
                        {sendingId === o.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                        Email Update
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-xs text-muted-foreground">No customers in {range.label.toLowerCase()}</td></tr>
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
              This emails all {leadCount} leads via Resend with personalized codes/links. This cannot be undone.
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

// ─── Production Tab ─────────────────────────────────────────────────
interface ProductionOrder {
  id: string;
  pet_name: string;
  status: string;
  created_at: string;
  customer_name: string | null;
  right_side_engraving: string | null;
  add_name_to_back: boolean | null;
  exported_at: string | null;
  audio_url: string | null;
  soul_page_url: string | null;
  pet_photo_url: string | null;
  cloudinary_folder_url: string | null;
  design_image_url: string | null;
  print_image_url: string | null;
}

const ProductionTab = () => {
  const { range } = useDateRange();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [marking, setMarking] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("animus_orders")
        .select("id,pet_name,status,created_at,customer_name,right_side_engraving,add_name_to_back,exported_at,audio_url,soul_page_url,pet_photo_url,cloudinary_folder_url,design_image_url,print_image_url")
        .order("created_at", { ascending: false });
      if (data) setOrders(data as unknown as ProductionOrder[]);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => orders.filter(o => inRange(o.created_at, range)), [orders, range]);
  const exportedCount = filtered.filter(o => o.exported_at).length;

  const toggleExported = async (order: ProductionOrder) => {
    const newVal = order.exported_at ? null : new Date().toISOString();
    const prev = orders;
    setMarking(order.id);
    setOrders(p => p.map(o => o.id === order.id ? { ...o, exported_at: newVal } : o));
    const { error } = await supabase.from("animus_orders").update({ exported_at: newVal }).eq("id", order.id);
    setMarking(null);
    if (error) {
      setOrders(prev);
      toast.error("Failed to update export status");
    } else {
      toast.success(newVal ? "Marked as exported" : "Marked as not exported");
    }
  };

  if (loading) {
    return <div className="container mx-auto px-6 py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gold" /></div>;
  }

  return (
    <div className="container mx-auto px-6 py-10 max-w-5xl">
      <AdminSectionHeader
        eyebrow="Manufacturer Handoff"
        title="Production Reference"
        right={
          <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
            {range.label} · {filtered.length} orders · <span className="text-emerald-700">{exportedCount} exported</span>
          </p>
        }
      />

      {filtered.length === 0 ? (
        <AdminEmpty>No orders in {range.label.toLowerCase()}</AdminEmpty>
      ) : (
        <div className="space-y-4">
          {filtered.map(o => (
            <AdminCard key={o.id} className={cn("overflow-hidden", o.exported_at && "border-emerald-200")}>
              <div className="p-5 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-serif text-lg text-foreground">{o.pet_name || o.customer_name || "—"}</h3>
                    <span className="text-[9px] tracking-[0.2em] uppercase px-2 py-0.5 rounded-sm border border-border text-muted-foreground capitalize">
                      {o.status.replace(/_/g, " ")}
                    </span>
                    {o.add_name_to_back && (
                      <span className="text-[9px] tracking-[0.2em] uppercase px-2 py-0.5 rounded-sm border border-gold/30 text-gold-dark bg-gold/10">
                        Back Engraving
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(o.created_at).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    {o.right_side_engraving && <> · Side: "{o.right_side_engraving}"</>}
                  </p>
                </div>
                <button
                  onClick={() => toggleExported(o)}
                  disabled={marking === o.id}
                  className={cn(
                    "inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase border rounded-md px-2.5 py-1.5 transition-colors disabled:opacity-50",
                    o.exported_at
                      ? "border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                      : "border-border text-muted-foreground hover:border-gold hover:text-gold",
                  )}
                  title="Toggle exported status"
                >
                  {marking === o.id ? <Loader2 className="w-3 h-3 animate-spin" /> : o.exported_at ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                  {o.exported_at ? "Exported" : "Mark Exported"}
                </button>
              </div>
              <div className="p-5 flex flex-wrap gap-2">
                <AssetLink href={o.audio_url} icon={<Music className="w-3 h-3" />} label="Audio" />
                <AssetLink href={o.soul_page_url} icon={<FileText className="w-3 h-3" />} label="Soul Page" />
                <AssetLink href={o.pet_photo_url} icon={<ImageIcon className="w-3 h-3" />} label="Photo" />
                <AssetLink href={o.print_image_url} icon={<ImageIcon className="w-3 h-3" />} label="Print PNG" />
                <AssetLink href={o.design_image_url} icon={<ImageIcon className="w-3 h-3" />} label="Design" />
                <AssetLink href={o.cloudinary_folder_url} icon={<FolderOpen className="w-3 h-3" />} label="Cloudinary Folder" emphasis />
              </div>
            </AdminCard>
          ))}
        </div>
      )}
    </div>
  );
};

const AssetLink = ({ href, icon, label, emphasis }: { href: string | null; icon: React.ReactNode; label: string; emphasis?: boolean }) => {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1.5 text-[10px] rounded-md px-3 py-1.5 border transition-colors",
        emphasis
          ? "border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
          : "border-gold/30 text-gold-dark hover:bg-gold/10",
      )}
    >
      {icon} {label} <ExternalLink className="w-2.5 h-2.5" />
    </a>
  );
};

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
      toast.success("Settings saved — profit calculations updated");
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
          label="Transaction Fee — Percent"
          hint="Payment processor percentage (e.g. iCount / Stripe)"
          value={form.transaction_fee_percent}
          onChange={(v) => setForm(f => ({ ...f, transaction_fee_percent: v }))}
          suffix="%"
        />
        <SettingField
          label="Transaction Fee — Fixed"
          hint="Per-transaction flat fee"
          value={form.transaction_fee_fixed}
          onChange={(v) => setForm(f => ({ ...f, transaction_fee_fixed: v }))}
          prefix={form.currency}
        />
        <SettingField
          label="Monthly Ad Spend"
          hint="Total marketing spend this month — pro-rated across orders this month"
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
