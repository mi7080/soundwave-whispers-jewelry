import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2, ArrowLeft, LogOut, RefreshCw, Package, Users, DollarSign,
  Settings as SettingsIcon, TrendingUp, TrendingDown, AlertTriangle, Save,
  Mail, Send, Sparkles,
} from "lucide-react";
import AdminOrders from "./AdminOrders";

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
  workflow_status: string;
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

type TabKey = "dashboard" | "finance" | "crm" | "settings";

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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0A0A0A" }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#D4AF37" }} />
      </div>
    );
  }
  if (!authorized) return null;

  return (
    <div className="min-h-screen text-foreground" style={{ backgroundColor: "#0A0A0A" }}>
      {/* Header — Command Center */}
      <header className="border-b sticky top-0 z-30 backdrop-blur-md" style={{ backgroundColor: "rgba(10,10,10,0.95)", borderColor: "rgba(212,175,55,0.15)" }}>
        <div className="container mx-auto px-6 py-5 max-w-7xl">
          <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
            <div>
              <Link to="/" className="inline-flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase text-muted-foreground hover:text-[#D4AF37] transition-colors mb-3">
                <ArrowLeft className="w-3 h-3" /> Exit Command Center
              </Link>
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5" style={{ color: "#D4AF37" }} />
                <h1 className="font-serif text-3xl tracking-wide" style={{ color: "#F5F5F0" }}>
                  ANIMUS Command Center
                </h1>
              </div>
              <p className="text-[10px] mt-2 tracking-[0.3em] uppercase" style={{ color: "#D4AF37" }}>
                Elite Operations · Founder Access
              </p>
            </div>
            <button
              onClick={async () => { await supabase.auth.signOut(); navigate("/"); }}
              className="flex items-center gap-2 px-4 py-2 text-[10px] tracking-[0.25em] uppercase border transition-all"
              style={{ borderColor: "rgba(255,255,255,0.1)", color: "#999" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#dc2626"; e.currentTarget.style.color = "#dc2626"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#999"; }}
            >
              <LogOut className="w-3 h-3" /> Sign Out
            </button>
          </div>

          {/* Tabs */}
          <nav className="flex items-center gap-1 mt-6 -mb-5 border-b" style={{ borderColor: "rgba(212,175,55,0.1)" }}>
            <CmdTab active={tab === "dashboard"} onClick={() => setTab("dashboard")} icon={<Package className="w-3.5 h-3.5" />}>Orders</CmdTab>
            <CmdTab active={tab === "finance"} onClick={() => setTab("finance")} icon={<DollarSign className="w-3.5 h-3.5" />}>Finance</CmdTab>
            <CmdTab active={tab === "crm"} onClick={() => setTab("crm")} icon={<Users className="w-3.5 h-3.5" />}>CRM</CmdTab>
            <CmdTab active={tab === "settings"} onClick={() => setTab("settings")} icon={<SettingsIcon className="w-3.5 h-3.5" />}>Settings</CmdTab>
          </nav>
        </div>
      </header>

      <main>
        {tab === "dashboard" && <DashboardTab />}
        {tab === "finance" && <FinanceTab />}
        {tab === "crm" && <CrmTab />}
        {tab === "settings" && <SettingsTab />}
      </main>
    </div>
  );
};

// ─── Tab Button ─────────────────────────────────────────────────────
const CmdTab = ({ active, onClick, icon, children }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 px-5 py-3 text-[11px] tracking-[0.25em] uppercase transition-all border-b-2 -mb-px"
    style={{
      color: active ? "#D4AF37" : "#888",
      borderColor: active ? "#D4AF37" : "transparent",
      fontWeight: active ? 600 : 400,
    }}
    onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = "#F5F5F0"; }}
    onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = "#888"; }}
  >
    {icon} {children}
  </button>
);

// ─── Dashboard Tab — wraps the existing AdminOrders dashboard ───────
const DashboardTab = () => (
  <div style={{ backgroundColor: "#0A0A0A" }}>
    <AdminOrders />
  </div>
);

// ─── Finance Tab ────────────────────────────────────────────────────
const FinanceTab = () => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [costs, setCosts] = useState<CostSettings | null>(null);

  useEffect(() => {
    const load = async () => {
      const [ordersRes, costsRes] = await Promise.all([
        supabase.from("animus_orders").select("id,amount,created_at,workflow_status,customer_email,customer_name,pet_name").order("created_at", { ascending: false }),
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
    const paidOrders = orders.filter(o => o.workflow_status !== "new" && o.amount);
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

    // Cost alert: ad spend per order > 30% of avg order value
    const adAlert = avgOrderValue > 0 && (adSpendPerOrder / avgOrderValue) > 0.3;
    const productionAlert = avgOrderValue > 0 && (Number(costs.shineon_unit_cost) / avgOrderValue) > 0.4;

    return {
      totalRevenue, totalCost, totalProfit, margin, avgOrderValue, avgProfit,
      adSpendPerOrder, monthOrderCount, paidOrders, computeProfit,
      adAlert, productionAlert,
    };
  }, [orders, costs]);

  if (loading) {
    return <div className="container mx-auto px-6 py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#D4AF37" }} /></div>;
  }
  if (!costs) {
    return <div className="container mx-auto px-6 py-20 text-center text-muted-foreground">No cost settings found. Configure them in the Settings tab.</div>;
  }
  if (!stats) return null;

  return (
    <div className="container mx-auto px-6 py-10 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-2xl" style={{ color: "#F5F5F0" }}>Financial Intelligence</h2>
        <p className="text-[10px] tracking-[0.25em] uppercase" style={{ color: "#888" }}>
          Live · Updates with settings
        </p>
      </div>

      {/* Cost Alerts */}
      {(stats.adAlert || stats.productionAlert) && (
        <div className="mb-6 space-y-2">
          {stats.adAlert && (
            <CostAlert
              level="warn"
              title="Ad spend is dominating margin"
              message={`Pro-rated ad cost (${costs.currency} ${stats.adSpendPerOrder.toFixed(2)}/order) exceeds 30% of average order value. Review campaigns.`}
            />
          )}
          {stats.productionAlert && (
            <CostAlert
              level="warn"
              title="Production cost ratio is high"
              message={`ShineOn unit cost is over 40% of avg order value (${costs.currency} ${stats.avgOrderValue.toFixed(2)}). Consider repricing.`}
            />
          )}
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Kpi label="Revenue (All Time)" value={`${costs.currency} ${stats.totalRevenue.toFixed(2)}`} />
        <Kpi label="Total Costs" value={`${costs.currency} ${stats.totalCost.toFixed(2)}`} negative />
        <Kpi label="Net Profit" value={`${costs.currency} ${stats.totalProfit.toFixed(2)}`} accent positive={stats.totalProfit >= 0} />
        <Kpi label="Margin" value={`${stats.margin.toFixed(1)}%`} accent />
        <Kpi label="Avg Order Value" value={`${costs.currency} ${stats.avgOrderValue.toFixed(2)}`} />
        <Kpi label="Avg Profit/Order" value={`${costs.currency} ${stats.avgProfit.toFixed(2)}`} positive={stats.avgProfit >= 0} />
        <Kpi label="Ad Cost/Order (MTD)" value={`${costs.currency} ${stats.adSpendPerOrder.toFixed(2)}`} />
        <Kpi label="Orders This Month" value={`${stats.monthOrderCount}`} />
      </div>

      {/* Per-order profit table */}
      <div className="rounded-sm border overflow-hidden" style={{ backgroundColor: "#111", borderColor: "rgba(212,175,55,0.15)" }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "rgba(212,175,55,0.1)" }}>
          <h3 className="text-[11px] tracking-[0.25em] uppercase" style={{ color: "#D4AF37" }}>Per-Order Profit</h3>
          <p className="text-[10px]" style={{ color: "#888" }}>{stats.paidOrders.length} paid orders</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: "rgba(212,175,55,0.04)" }}>
              <tr className="text-[10px] tracking-[0.2em] uppercase" style={{ color: "#888" }}>
                <th className="text-left px-5 py-3">Date</th>
                <th className="text-left px-5 py-3">Customer</th>
                <th className="text-right px-5 py-3">Revenue</th>
                <th className="text-right px-5 py-3">Costs</th>
                <th className="text-right px-5 py-3">Net Profit</th>
              </tr>
            </thead>
            <tbody>
              {stats.paidOrders.slice(0, 50).map(o => {
                const amt = Number(o.amount) || 0;
                const profit = stats.computeProfit(amt);
                const cost = amt - profit;
                return (
                  <tr key={o.id} className="border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                    <td className="px-5 py-3 text-xs" style={{ color: "#888" }}>{new Date(o.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3" style={{ color: "#F5F5F0" }}>{o.customer_name || o.pet_name}</td>
                    <td className="px-5 py-3 text-right" style={{ color: "#F5F5F0" }}>{costs.currency} {amt.toFixed(2)}</td>
                    <td className="px-5 py-3 text-right text-xs" style={{ color: "#dc8a8a" }}>−{costs.currency} {cost.toFixed(2)}</td>
                    <td className="px-5 py-3 text-right font-medium" style={{ color: profit >= 0 ? "#D4AF37" : "#dc2626" }}>
                      {costs.currency} {profit.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
              {stats.paidOrders.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-xs" style={{ color: "#888" }}>No paid orders yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Kpi = ({ label, value, accent, positive, negative }: { label: string; value: string; accent?: boolean; positive?: boolean; negative?: boolean }) => {
  let color = "#F5F5F0";
  if (accent) color = "#D4AF37";
  if (positive === true) color = "#D4AF37";
  if (positive === false) color = "#dc2626";
  if (negative) color = "#dc8a8a";
  return (
    <div className="rounded-sm border p-4" style={{ backgroundColor: "#111", borderColor: "rgba(212,175,55,0.12)" }}>
      <p className="font-serif text-2xl" style={{ color }}>{value}</p>
      <p className="text-[10px] tracking-[0.2em] uppercase mt-1" style={{ color: "#888" }}>{label}</p>
    </div>
  );
};

const CostAlert = ({ level, title, message }: { level: "warn" | "info"; title: string; message: string }) => (
  <div className="flex items-start gap-3 p-4 rounded-sm border"
    style={{
      backgroundColor: level === "warn" ? "rgba(220,38,38,0.05)" : "rgba(212,175,55,0.05)",
      borderColor: level === "warn" ? "rgba(220,38,38,0.3)" : "rgba(212,175,55,0.3)",
    }}>
    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: level === "warn" ? "#dc2626" : "#D4AF37" }} />
    <div>
      <p className="text-sm font-medium" style={{ color: level === "warn" ? "#dc2626" : "#D4AF37" }}>{title}</p>
      <p className="text-xs mt-1" style={{ color: "#aaa" }}>{message}</p>
    </div>
  </div>
);

// ─── CRM Tab ────────────────────────────────────────────────────────
const CrmTab = () => {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [view, setView] = useState<"leads" | "customers">("leads");

  useEffect(() => {
    const load = async () => {
      const [leadsRes, ordersRes] = await Promise.all([
        supabase.from("waitlist_leads").select("*").order("created_at", { ascending: false }),
        supabase.from("animus_orders").select("id,amount,created_at,workflow_status,customer_email,customer_name,pet_name")
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
      // Update lead status locally
      await supabase.from("waitlist_leads").update({ status: "invited", status_updated_at: new Date().toISOString() }).eq("id", lead.id);
      setLeads(p => p.map(l => l.id === lead.id ? { ...l, status: "invited" } : l));
    }
  };

  const sendCustomerUpdate = async (order: OrderSummary) => {
    if (!order.customer_email) { toast.error("No customer email on file"); return; }
    setSendingId(order.id);
    // Fetch tracking number for this order
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

  if (loading) {
    return <div className="container mx-auto px-6 py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#D4AF37" }} /></div>;
  }

  return (
    <div className="container mx-auto px-6 py-10 max-w-7xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="font-serif text-2xl" style={{ color: "#F5F5F0" }}>Elite CRM</h2>
        <div className="flex items-center gap-1 border rounded-sm" style={{ borderColor: "rgba(212,175,55,0.2)" }}>
          <CrmToggle active={view === "leads"} onClick={() => setView("leads")}>Founders' Circle ({leads.length})</CrmToggle>
          <CrmToggle active={view === "customers"} onClick={() => setView("customers")}>Customers ({orders.length})</CrmToggle>
        </div>
      </div>

      {view === "leads" ? (
        <div className="rounded-sm border overflow-hidden" style={{ backgroundColor: "#111", borderColor: "rgba(212,175,55,0.15)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: "rgba(212,175,55,0.04)" }}>
                <tr className="text-[10px] tracking-[0.2em] uppercase" style={{ color: "#888" }}>
                  <th className="text-left px-5 py-3">Email</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">Joined</th>
                  <th className="text-right px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(l => (
                  <tr key={l.id} className="border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                    <td className="px-5 py-3" style={{ color: "#F5F5F0" }}>{l.email}</td>
                    <td className="px-5 py-3 text-xs capitalize" style={{ color: l.status === "invited" ? "#D4AF37" : "#888" }}>{l.status}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: "#888" }}>{new Date(l.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => sendLeadInvitation(l)}
                        disabled={sendingId === l.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-[10px] tracking-[0.2em] uppercase border transition-all disabled:opacity-50"
                        style={{ borderColor: "#D4AF37", color: "#D4AF37" }}
                      >
                        {sendingId === l.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        Send Invite
                      </button>
                    </td>
                  </tr>
                ))}
                {leads.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-12 text-center text-xs" style={{ color: "#888" }}>No leads yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-sm border overflow-hidden" style={{ backgroundColor: "#111", borderColor: "rgba(212,175,55,0.15)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: "rgba(212,175,55,0.04)" }}>
                <tr className="text-[10px] tracking-[0.2em] uppercase" style={{ color: "#888" }}>
                  <th className="text-left px-5 py-3">Customer</th>
                  <th className="text-left px-5 py-3">Email</th>
                  <th className="text-left px-5 py-3">Pendant</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-right px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} className="border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                    <td className="px-5 py-3" style={{ color: "#F5F5F0" }}>{o.customer_name || "—"}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: "#aaa" }}>{o.customer_email}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: "#888" }}>{o.pet_name}</td>
                    <td className="px-5 py-3 text-xs capitalize" style={{ color: "#888" }}>{o.workflow_status.replace(/_/g, " ")}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => sendCustomerUpdate(o)}
                        disabled={sendingId === o.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-[10px] tracking-[0.2em] uppercase border transition-all disabled:opacity-50"
                        style={{ borderColor: "#D4AF37", color: "#D4AF37" }}
                      >
                        {sendingId === o.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                        Email Update
                      </button>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-xs" style={{ color: "#888" }}>No customers yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const CrmToggle = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className="px-4 py-2 text-[10px] tracking-[0.2em] uppercase transition-all"
    style={{
      backgroundColor: active ? "#D4AF37" : "transparent",
      color: active ? "#0A0A0A" : "#888",
      fontWeight: active ? 600 : 400,
    }}
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
    currency: "ILS",
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
      currency: form.currency.trim().toUpperCase() || "ILS",
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
    return <div className="container mx-auto px-6 py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#D4AF37" }} /></div>;
  }

  return (
    <div className="container mx-auto px-6 py-10 max-w-3xl">
      <h2 className="font-serif text-2xl mb-2" style={{ color: "#F5F5F0" }}>Cost Settings</h2>
      <p className="text-xs mb-8" style={{ color: "#888" }}>
        Edit any value and save. The Finance tab updates immediately.
      </p>

      <div className="rounded-sm border p-6 space-y-5" style={{ backgroundColor: "#111", borderColor: "rgba(212,175,55,0.15)" }}>
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
          hint="3-letter ISO code (ILS, USD, EUR…)"
          value={form.currency}
          onChange={(v) => setForm(f => ({ ...f, currency: v }))}
          isText
        />

        <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <p className="text-[10px]" style={{ color: "#666" }}>
            {costs?.updated_at && `Last saved ${new Date(costs.updated_at).toLocaleString()}`}
          </p>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 text-[11px] tracking-[0.25em] uppercase font-medium transition-all disabled:opacity-50"
            style={{ backgroundColor: "#D4AF37", color: "#0A0A0A" }}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

const SettingField = ({ label, hint, value, onChange, prefix, suffix, isText }: {
  label: string; hint: string; value: string; onChange: (v: string) => void;
  prefix?: string; suffix?: string; isText?: boolean;
}) => (
  <div>
    <label className="block text-[10px] tracking-[0.25em] uppercase mb-1.5" style={{ color: "#D4AF37" }}>{label}</label>
    <p className="text-[11px] mb-2" style={{ color: "#777" }}>{hint}</p>
    <div className="flex items-stretch border rounded-sm overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
      {prefix && <span className="px-3 py-2.5 text-xs flex items-center" style={{ backgroundColor: "rgba(212,175,55,0.08)", color: "#D4AF37" }}>{prefix}</span>}
      <input
        type={isText ? "text" : "number"}
        step={isText ? undefined : "0.01"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-3 py-2.5 text-sm outline-none"
        style={{ backgroundColor: "transparent", color: "#F5F5F0" }}
      />
      {suffix && <span className="px-3 py-2.5 text-xs flex items-center" style={{ backgroundColor: "rgba(212,175,55,0.08)", color: "#D4AF37" }}>{suffix}</span>}
    </div>
  </div>
);

export default AdminControl;
