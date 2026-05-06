import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Loader2, LogOut, Mail, RefreshCw, ShieldAlert } from "lucide-react";

type OrderStatus = "payment_pending" | "paid" | "shineon_error" | "fulfilled" | "shipped" | "payment_failed";
type LeadStatus = "new" | "contacted" | "converted";

interface OrderRow {
  id: string;
  pet_name: string;
  customer_name: string | null;
  customer_email: string | null;
  amount: number | null;
  status: OrderStatus | string;
  soul_page_url: string;
  created_at: string;
}

interface LeadRow {
  id: string;
  email: string;
  status: LeadStatus;
  status_updated_at: string | null;
  created_at: string;
}

const FULFILLMENT_OPTIONS: { value: OrderStatus; label: string; cls: string }[] = [
  { value: "payment_pending", label: "Payment Pending", cls: "border-zinc-500/40 text-zinc-300 bg-zinc-500/5" },
  { value: "paid", label: "Paid", cls: "border-gold/40 text-gold bg-gold/5" },
  { value: "shineon_error", label: "ShineOn Error", cls: "border-destructive/50 text-destructive bg-destructive/10" },
  { value: "fulfilled", label: "Fulfilled", cls: "border-blue-500/40 text-blue-400 bg-blue-500/5" },
  { value: "shipped", label: "Shipped", cls: "border-green-500/40 text-green-400 bg-green-500/5" },
  { value: "payment_failed", label: "Payment Failed", cls: "border-red-500/40 text-red-400 bg-red-500/5" },
];

const AdminCRM = () => {
  const navigate = useNavigate();
  const [authChecking, setAuthChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"orders" | "leads">("orders");

  // Auth gate
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) {
        navigate("/admin-login", { replace: true });
      } else {
        setUserEmail(session.user.email ?? null);
        checkAdmin(session.user.id);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/admin-login", { replace: true });
        return;
      }
      setUserEmail(session.user.email ?? null);
      checkAdmin(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAdmin = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles" as any)
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!error && !!data);
    setAuthChecking(false);
  };

  const fetchAll = async () => {
    setLoading(true);
    const [ordersRes, leadsRes] = await Promise.all([
      supabase.from("animus_orders").select("id, pet_name, customer_name, customer_email, amount, status, soul_page_url, created_at").order("created_at", { ascending: false }),
      supabase.from("waitlist_leads").select("id, email, status, status_updated_at, created_at").order("created_at", { ascending: false }),
    ]);
    if (ordersRes.error) toast.error("Failed to load orders");
    else setOrders((ordersRes.data ?? []) as unknown as OrderRow[]);
    if (leadsRes.error) toast.error("Failed to load leads");
    else setLeads((leadsRes.data ?? []) as unknown as LeadRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchAll();
  }, [isAdmin]);

  const stats = useMemo(() => {
    const revenue = orders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
    return { revenue, totalOrders: orders.length, totalLeads: leads.length };
  }, [orders, leads]);

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    const prev = orders;
    setOrders((p) => p.map((o) => (o.id === id ? { ...o, status } : o)));
    const { error } = await supabase.from("animus_orders").update({ status } as any).eq("id", id);
    if (error) {
      setOrders(prev);
      toast.error("Failed to update status");
    } else {
      toast.success("Status updated");
    }
  };

  const markLeadContacted = async (id: string) => {
    const prev = leads;
    const now = new Date().toISOString();
    setLeads((p) => p.map((l) => (l.id === id ? { ...l, status: "contacted", status_updated_at: now } : l)));
    const { error } = await supabase
      .from("waitlist_leads")
      .update({ status: "contacted", status_updated_at: now } as any)
      .eq("id", id);
    if (error) {
      setLeads(prev);
      toast.error("Failed to update lead");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/admin-login", { replace: true });
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gold" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
        <div className="max-w-md text-center border border-border/30 rounded-sm p-8 bg-card">
          <ShieldAlert className="w-8 h-8 text-gold mx-auto mb-4" />
          <h1 className="text-lg font-serif mb-2">Access Pending</h1>
          <p className="text-sm text-muted-foreground mb-1">Signed in as {userEmail}</p>
          <p className="text-xs text-muted-foreground/70 mb-6">
            Your account exists, but admin access has not been granted yet. Contact an existing admin to add the <code className="text-gold">admin</code> role to your user.
          </p>
          <button
            onClick={handleSignOut}
            className="text-[10px] tracking-[0.2em] uppercase border border-border/50 px-4 py-2 hover:border-gold hover:text-gold transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-6 py-10 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-gold transition-colors mb-3">
              <ArrowLeft className="w-3 h-3" /> Back to Store
            </Link>
            <h1 className="text-2xl font-serif">ANIMUS CRM</h1>
            <p className="text-xs text-muted-foreground mt-1">{userEmail}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchAll}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 text-[10px] tracking-[0.2em] uppercase border border-border/50 text-muted-foreground hover:border-gold hover:text-gold transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <Link
              to="/admin"
              className="flex items-center gap-2 px-3 py-2 text-[10px] tracking-[0.2em] uppercase border border-border/50 text-muted-foreground hover:border-gold hover:text-gold transition-colors"
            >
              Production
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 text-[10px] tracking-[0.2em] uppercase border border-border/50 text-muted-foreground hover:border-gold hover:text-gold transition-colors"
            >
              <LogOut className="w-3 h-3" /> Sign out
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="border border-border/30 rounded-sm p-5 bg-card">
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">Total Revenue</p>
            <p className="text-3xl font-serif text-gold">${stats.revenue.toFixed(2)}</p>
          </div>
          <div className="border border-border/30 rounded-sm p-5 bg-card">
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">Total Orders</p>
            <p className="text-3xl font-serif">{stats.totalOrders}</p>
          </div>
          <div className="border border-border/30 rounded-sm p-5 bg-card">
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">Total Leads</p>
            <p className="text-3xl font-serif">{stats.totalLeads}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border/30 mb-6">
          {(["orders", "leads"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 text-[10px] tracking-[0.2em] uppercase transition-colors border-b-2 -mb-px ${
                tab === t ? "border-gold text-gold" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "orders" ? `Orders (${orders.length})` : `Leads (${leads.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gold" />
          </div>
        ) : tab === "orders" ? (
          <OrdersTable orders={orders} onStatusChange={updateOrderStatus} />
        ) : (
          <LeadsTable leads={leads} onMarkContacted={markLeadContacted} />
        )}
      </div>
    </div>
  );
};

const OrdersTable = ({
  orders,
  onStatusChange,
}: {
  orders: OrderRow[];
  onStatusChange: (id: string, status: FulfillmentStatus) => void;
}) => {
  if (orders.length === 0) {
    return (
      <div className="text-center py-16 border border-border/30 rounded-sm text-muted-foreground text-sm">
        No orders yet
      </div>
    );
  }
  return (
    <div className="border border-border/30 rounded-sm overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-background/50 border-b border-border/30">
            <tr className="text-left text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Pet</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Soul Page</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const opt = FULFILLMENT_OPTIONS.find((f) => f.value === o.fulfillment_status) ?? FULFILLMENT_OPTIONS[0];
              return (
                <tr key={o.id} className="border-b border-border/20 hover:bg-background/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{o.customer_name || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{o.customer_email || "—"}</td>
                  <td className="px-4 py-3 font-serif">{o.pet_name}</td>
                  <td className="px-4 py-3 text-right text-gold">
                    {o.amount != null ? `$${Number(o.amount).toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={o.fulfillment_status}
                      onChange={(e) => onStatusChange(o.id, e.target.value as FulfillmentStatus)}
                      className={`text-[9px] tracking-[0.2em] uppercase px-2 py-1 rounded-sm border bg-transparent cursor-pointer ${opt.cls}`}
                    >
                      {FULFILLMENT_OPTIONS.map((f) => (
                        <option key={f.value} value={f.value} className="bg-background text-foreground">
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={o.soul_page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-gold/80 hover:text-gold"
                    >
                      Open <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const LeadsTable = ({
  leads,
  onMarkContacted,
}: {
  leads: LeadRow[];
  onMarkContacted: (id: string) => void;
}) => {
  if (leads.length === 0) {
    return (
      <div className="text-center py-16 border border-border/30 rounded-sm text-muted-foreground text-sm">
        No leads yet
      </div>
    );
  }
  return (
    <div className="border border-border/30 rounded-sm overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-background/50 border-b border-border/30">
            <tr className="text-left text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} className="border-b border-border/20 hover:bg-background/30 transition-colors">
                <td className="px-4 py-3">{l.email}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(l.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-[9px] tracking-[0.2em] uppercase px-2 py-1 rounded-sm border ${
                      l.status === "contacted"
                        ? "border-blue-500/40 text-blue-400 bg-blue-500/5"
                        : l.status === "converted"
                        ? "border-green-500/40 text-green-400 bg-green-500/5"
                        : "border-border/40 text-muted-foreground bg-background/40"
                    }`}
                  >
                    {l.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {l.status === "new" ? (
                    <button
                      onClick={() => onMarkContacted(l.id)}
                      className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase border border-gold/40 text-gold px-3 py-1.5 hover:bg-gold/5 transition-colors"
                    >
                      <Mail className="w-3 h-3" /> Mark contacted
                    </button>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/60">
                      {l.status_updated_at ? new Date(l.status_updated_at).toLocaleDateString() : ""}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminCRM;
