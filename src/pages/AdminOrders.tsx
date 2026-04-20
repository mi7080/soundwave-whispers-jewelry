import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2, Search, Download, ArrowLeft, LogOut, Package, Users,
  Eye, Truck, Image as ImageIcon, ExternalLink, RefreshCw, X, MapPin, FileSpreadsheet, RotateCw, CheckCircle2, Sparkles
} from "lucide-react";
import { useDateRangeOptional, inRange } from "@/components/admin/DateRangeContext";

const ADMIN_EMAIL = "mi7080@gmail.com";
const DEFAULT_SKU = "SO-15845645";

type WorkflowStatus = "new" | "paid" | "sent_to_production" | "shipped";

interface Order {
  id: string;
  created_at: string;
  pet_name: string;
  customer_name: string | null;
  customer_email: string | null;
  amount: number | null;
  status: string;
  workflow_status: WorkflowStatus;
  fulfillment_status: string;
  icount_docnum: string | null;
  icount_docnum_auto_detected?: boolean | null;
  tracking_number: string | null;
  tracking_updated_at: string | null;
  shipping_address1: string | null;
  shipping_city: string | null;
  shipping_zip: string | null;
  shipping_country_code: string | null;
  design_image_url: string | null;
  print_image_url: string | null;
  svg_content: string;
  soul_page_url: string;
  audio_url: string;
  pet_photo_url: string | null;
  exported_at: string | null;
}

interface Lead {
  id: string;
  email: string;
  status: string;
  created_at: string;
  status_updated_at: string | null;
}

const STATUS_OPTIONS: { value: WorkflowStatus; label: string; tone: string }[] = [
  { value: "new", label: "New", tone: "bg-zinc-500/10 text-zinc-300 border-zinc-500/30" },
  { value: "paid", label: "Paid", tone: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
  { value: "sent_to_production", label: "Sent to Production", tone: "bg-blue-500/10 text-blue-300 border-blue-500/30" },
  { value: "shipped", label: "Shipped", tone: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
];

const csvEscape = (val: unknown) => {
  if (val === null || val === undefined) return "";
  const s = String(val);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const AdminOrders = () => {
  const navigate = useNavigate();
  const dr = useDateRangeOptional();
  const range = dr?.range;
  const [authChecking, setAuthChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [tab, setTab] = useState<"orders" | "leads">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);

  // Auth gate: must be logged in AND have admin role
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
        toast.error("Access denied");
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

  const fetchAll = async () => {
    setLoading(true);
    const [ordersRes, leadsRes] = await Promise.all([
      supabase.from("animus_orders").select("*").order("created_at", { ascending: false }),
      supabase.from("waitlist_leads").select("*").order("created_at", { ascending: false }),
    ]);
    if (ordersRes.data) setOrders(ordersRes.data as unknown as Order[]);
    if (leadsRes.data) setLeads(leadsRes.data as unknown as Lead[]);
    if (ordersRes.error) toast.error("Failed to load orders");
    if (leadsRes.error) toast.error("Failed to load leads");
    setLoading(false);
  };

  useEffect(() => { if (authorized) fetchAll(); }, [authorized]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = orders;
    if (range) list = list.filter(o => inRange(o.created_at, range));
    if (!q) return list;
    return list.filter(o =>
      [o.pet_name, o.customer_name, o.customer_email, o.icount_docnum, o.id, o.tracking_number]
        .filter(Boolean).some(v => String(v).toLowerCase().includes(q))
    );
  }, [orders, search, range]);

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = leads;
    if (range) list = list.filter(l => inRange(l.created_at, range));
    if (!q) return list;
    return list.filter(l => l.email.toLowerCase().includes(q));
  }, [leads, search, range]);

  const updateWorkflowStatus = async (order: Order, status: WorkflowStatus) => {
    const prev = orders;
    setOrders(p => p.map(o => o.id === order.id ? { ...o, workflow_status: status } : o));
    const { error } = await supabase
      .from("animus_orders")
      .update({ workflow_status: status })
      .eq("id", order.id);
    if (error) {
      setOrders(prev);
      toast.error("Failed to update status");
    } else {
      toast.success(`Marked as ${STATUS_OPTIONS.find(s => s.value === status)?.label}`);
    }
  };

  const saveTrackingAndNotify = async (orderId: string, tracking: string) => {
    const now = new Date().toISOString();
    const updates = {
      tracking_number: tracking || null,
      tracking_updated_at: tracking ? now : null,
      ...(tracking ? { workflow_status: "shipped" as const } : {}),
    };
    const { error } = await supabase
      .from("animus_orders")
      .update(updates)
      .eq("id", orderId);
    if (error) { toast.error("Failed to save"); return; }
    setOrders(p => p.map(o => o.id === orderId ? { ...o, ...updates } as Order : o));
    setSelected(s => s && s.id === orderId ? { ...s, ...updates } as Order : s);
    toast.success(tracking ? "Tracking saved — customer notification queued" : "Tracking cleared");
  };

  const renderPng = async (orderId: string) => {
    toast.info("Rendering engraving PNG…");
    const { data, error } = await supabase.functions.invoke("render-engraving-png", {
      body: { orderId },
    });
    if (error || !data?.success) {
      toast.error(`Render failed: ${error?.message || data?.error || "unknown"}`);
      return;
    }
    setOrders(p => p.map(o => o.id === orderId ? { ...o, print_image_url: data.print_image_url } : o));
    setSelected(s => s && s.id === orderId ? { ...s, print_image_url: data.print_image_url } : s);
    toast.success("PNG generated and stored");
  };

  const syncWithIcount = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order?.icount_docnum) {
      toast.error("No iCount docnum on this order — cannot sync. Order may not have completed payment.");
      return;
    }
    toast.info(`Syncing order ${order.icount_docnum} from iCount…`);
    const { data, error } = await supabase.functions.invoke("sync-icount-order", {
      body: { orderId },
    });
    if (error || !data?.success) {
      toast.error(`Sync failed: ${data?.error || error?.message || "unknown"}`);
      return;
    }
    const updates = data.updates || {};
    setOrders(p => p.map(o => o.id === orderId ? { ...o, ...updates } as Order : o));
    setSelected(s => s && s.id === orderId ? { ...s, ...updates } as Order : s);
    const fields = (data.synced_fields || []).length;
    toast.success(fields > 0 ? `Synced ${fields} field(s) from iCount` : "Synced — no new data from iCount");
  };

  const [bulkSyncing, setBulkSyncing] = useState(false);

  const autoDetectDocnum = async (orderId: string): Promise<{ found: boolean; docnum?: string }> => {
    const { data, error } = await supabase.functions.invoke("icount-find-docnum", { body: { orderId } });
    if (error || !data) return { found: false };
    if (data.success && data.found && data.docnum) {
      setOrders(p => p.map(o => o.id === orderId
        ? { ...o, icount_docnum: data.docnum, icount_docnum_auto_detected: true } as Order
        : o));
      setSelected(s => s && s.id === orderId
        ? { ...s, icount_docnum: data.docnum, icount_docnum_auto_detected: true } as Order
        : s);
      return { found: true, docnum: data.docnum };
    }
    return { found: false };
  };

  const autoDetectSingle = async (orderId: string) => {
    toast.info("Searching iCount by customer email…");
    const r = await autoDetectDocnum(orderId);
    if (r.found) {
      toast.success(`Auto-detected docnum ${r.docnum} — syncing now…`);
      await syncWithIcount(orderId);
    } else {
      toast.warning("No matching iCount document found. Set the docnum manually.");
    }
  };

  const syncAllIncomplete = async () => {
    const allIncomplete = orders.filter(o => isIncompleteShipping(o) && (!range || inRange(o.created_at, range)));
    if (allIncomplete.length === 0) {
      toast.info("No incomplete orders in selected range");
      return;
    }

    setBulkSyncing(true);

    // Phase 1 — auto-detect docnums for orders missing one (must have email)
    const needsDetect = allIncomplete.filter(o => !o.icount_docnum && o.customer_email);
    let detected = 0;
    if (needsDetect.length > 0) {
      toast.info(`Auto-detecting docnum for ${needsDetect.length} order(s) via iCount email lookup…`);
      for (const o of needsDetect) {
        const r = await autoDetectDocnum(o.id);
        if (r.found) detected++;
      }
    }

    // Phase 2 — re-read state by refetching from latest orders array via filter on `allIncomplete`
    // We rely on the in-memory updates from autoDetectDocnum (state setter is queued — use detected list)
    const targets = allIncomplete
      .map(o => orders.find(x => x.id === o.id) || o)
      .filter(o => !!o.icount_docnum || needsDetect.find(n => n.id === o.id));

    // After auto-detect, we still need to know which ones now have docnum.
    // Fetch fresh rows for the affected ids to be safe.
    const ids = allIncomplete.map(o => o.id);
    const { data: fresh } = await supabase
      .from("animus_orders")
      .select("id, icount_docnum")
      .in("id", ids);
    const docMap = new Map((fresh || []).map((r: any) => [r.id, r.icount_docnum]));
    const syncTargets = allIncomplete.filter(o => !!docMap.get(o.id));
    const stillNoDocnum = allIncomplete.length - syncTargets.length;

    let okCount = 0;
    let failCount = 0;
    if (syncTargets.length > 0) {
      toast.info(`Syncing ${syncTargets.length} order(s) from iCount…`);
      for (const o of syncTargets) {
        const { data, error } = await supabase.functions.invoke("sync-icount-order", { body: { orderId: o.id } });
        if (error || !data?.success) {
          failCount++;
          console.error(`Sync failed for ${o.id}:`, data?.error || error?.message);
        } else {
          okCount++;
          const updates = data.updates || {};
          setOrders(p => p.map(x => x.id === o.id ? { ...x, ...updates } as Order : x));
        }
      }
    }

    setBulkSyncing(false);
    const detectedNote = detected > 0 ? ` • ${detected} auto-detected` : "";
    const skipNote = stillNoDocnum > 0 ? ` • ${stillNoDocnum} skipped (no docnum found)` : "";
    if (failCount === 0 && (okCount > 0 || detected > 0)) {
      toast.success(`Synced ${okCount}${detectedNote}${skipNote}`);
    } else if (failCount > 0) {
      toast.warning(`Synced ${okCount} • Failed ${failCount}${detectedNote}${skipNote}`, { duration: 7000 });
    } else {
      toast.info(`Nothing to sync${skipNote}`);
    }
  };

  const setIcountDocnum = async (orderId: string, docnum: string) => {
    const trimmed = docnum.trim();
    if (!trimmed) { toast.error("Enter a docnum"); return; }
    const { error } = await supabase
      .from("animus_orders")
      .update({ icount_docnum: trimmed, icount_docnum_auto_detected: false })
      .eq("id", orderId);
    if (error) { toast.error("Failed to save docnum"); return; }
    setOrders(p => p.map(o => o.id === orderId ? { ...o, icount_docnum: trimmed, icount_docnum_auto_detected: false } : o));
    setSelected(s => s && s.id === orderId ? { ...s, icount_docnum: trimmed, icount_docnum_auto_detected: false } : s);
    toast.success("Docnum saved — you can now sync from iCount");
  };

  const splitName = (full: string | null): [string, string] => {
    if (!full) return ["", ""];
    const parts = full.trim().split(/\s+/);
    if (parts.length === 1) return [parts[0], ""];
    return [parts[0], parts.slice(1).join(" ")];
  };

  const isArtReady = (o: Order) =>
    o.fulfillment_status === "paid" &&
    o.workflow_status !== "sent_to_production" &&
    o.workflow_status !== "shipped" &&
    !!o.svg_content && o.svg_content.trim() !== "<svg></svg>";

  const isIncompleteShipping = (o: Order) =>
    !o.shipping_address1 || !o.shipping_city || !o.shipping_country_code;

  const exportShineOnBatch = async () => {
    const batch = orders.filter(o => isArtReady(o) && (!range || inRange(o.created_at, range)));
    if (batch.length === 0) { toast.error("No Art Ready orders in selected range"); return; }

    // Reliability check — block orders missing email or shipping address
    const missingCritical = batch.filter(o => !o.customer_email || !o.shipping_address1);
    if (missingCritical.length > 0) {
      missingCritical.forEach(o => {
        toast.error(`Order ${o.icount_docnum || o.id.slice(0, 8)} is missing shipping info. Please sync with iCount first.`, { duration: 6000 });
      });
      return;
    }

    const incompleteCount = batch.filter(isIncompleteShipping).length;
    if (incompleteCount > 0) {
      toast.warning(`${incompleteCount} order(s) have incomplete shipping — empty cells will be exported`, { duration: 5000 });
    }

    const missingPng = batch.filter(o => !o.print_image_url);
    const renderFailed: Order[] = [];
    if (missingPng.length > 0) {
      toast.info(`Generating ${missingPng.length} missing engraving PNG${missingPng.length > 1 ? "s" : ""} (1000×1788)…`);
      for (const o of missingPng) {
        const { data, error } = await supabase.functions.invoke("render-engraving-png", { body: { orderId: o.id } });
        if (data?.print_image_url) {
          o.print_image_url = data.print_image_url;
        } else {
          renderFailed.push(o);
          console.error(`Render failed for ${o.id}:`, error || data);
        }
      }
      if (renderFailed.length > 0) {
        const names = renderFailed.slice(0, 3).map(o => o.customer_name || o.pet_name || o.id.slice(0, 6)).join(", ");
        toast.error(`${renderFailed.length} order(s) failed to render — design incomplete: ${names}`, { duration: 8000 });
        return;
      }
    }

    const headers = [
      "source_id","line_item_id","line_item_sku","line_item_quantity","line_item_title","line_item_price",
      "line_item_name","line_item_print_url","line_item_engraving_line1","line_item_engraving_line2","line_item_grams",
      "billing_first_name","billing_last_name","billing_name","billing_address1","billing_address2","billing_phone",
      "billing_city","billing_zip","billing_country","billing_country_code","billing_province","billing_state",
      "billing_company","billing_latitude","billing_longitude",
      "shipping_first_name","shipping_last_name","shipping_name","shipping_address1","shipping_address2","shipping_phone",
      "shipping_city","shipping_zip","shipping_country","shipping_country_code","shipping_province","shipping_state",
      "shipping_company","shipping_latitude","shipping_longitude",
      "shipping_method","source_name","source_url","source_po_number","packing_slip_url","shipment_notification_url",
      "email","note","currency","referring_site","landing_site","checkout_id","checkout_token","reference",
      "device_id","phone","customer_locale","landing_site_ref","tags",
    ];

    const rows = batch.map(o => {
      const sourceId = o.icount_docnum || o.id.slice(0, 8);
      const [firstName, lastName] = splitName(o.customer_name);
      const fullName = o.customer_name || `${firstName} ${lastName}`.trim();
      const printUrl = o.print_image_url || o.design_image_url || "";
      const engraving1 = o.pet_name || "";
      const addr1 = o.shipping_address1 || "";
      const city = o.shipping_city || "";
      const zip = o.shipping_zip || "";
      const cc = o.shipping_country_code || "";

      return [
        sourceId, `${sourceId}-1`, DEFAULT_SKU, 1, "ANIMUS Personalized Soundwave Pendant", o.amount ?? "",
        engraving1, printUrl, engraving1, "", "",
        firstName, lastName, fullName, addr1, "", "",
        city, zip, "", cc, "", "",
        "", "", "",
        firstName, lastName, fullName, addr1, "", "",
        city, zip, "", cc, "", "",
        "", "", "",
        "Standard", "ANIMUS", "https://animuswave.com", sourceId, "", "",
        o.customer_email || "", "", "ILS", "", "", "", "", "",
        "", "", "en", "", "ANIMUS",
      ];
    });

    const csv = [headers, ...rows].map(r => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ShineOn_ANIMUS_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    const ids = batch.map(o => o.id);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("animus_orders")
      .update({ workflow_status: "sent_to_production", exported_at: now })
      .in("id", ids);
    if (error) { toast.error("CSV downloaded but DB update failed"); return; }
    setOrders(p => p.map(o => ids.includes(o.id) ? { ...o, workflow_status: "sent_to_production", exported_at: now } : o));
    toast.success(`Exported ${batch.length} orders — ShineOn production file ready`);
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gold" />
      </div>
    );
  }
  if (!authorized) return null;

  const paidPending = orders.filter(o => isArtReady(o) && (!range || inRange(o.created_at, range))).length;
  const incompleteInRange = orders.filter(o => isIncompleteShipping(o) && (!range || inRange(o.created_at, range)));
  const incompleteCount = incompleteInRange.length;
  const incompleteWithDocnum = incompleteInRange.filter(o => !!o.icount_docnum).length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-6 py-10 max-w-7xl">
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-4 mb-8 flex-col sm:flex-row">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-gold transition-colors mb-3">
              <ArrowLeft className="w-3 h-3" /> Store
            </Link>
            <h1 className="text-3xl font-serif text-foreground">ANIMUS Admin</h1>
            <p className="text-xs text-muted-foreground mt-1 tracking-[0.15em] uppercase">Orders & Customer CRM</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAll}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-[10px] tracking-[0.2em] uppercase border border-border/50 text-muted-foreground hover:border-gold hover:text-gold transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button
              onClick={async () => { await supabase.auth.signOut(); navigate("/"); }}
              className="flex items-center gap-2 px-4 py-2 text-[10px] tracking-[0.2em] uppercase border border-border/50 text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
            >
              <LogOut className="w-3 h-3" /> Sign Out
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total Orders" value={orders.length} />
          <StatCard label="Paid (Pending)" value={paidPending} accent="gold" />
          <StatCard label="Shipped" value={orders.filter(o => o.workflow_status === "shipped").length} accent="emerald" />
          <StatCard label="Waitlist Leads" value={leads.length} />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-4 border-b border-border/30">
          <TabButton active={tab === "orders"} onClick={() => setTab("orders")} icon={<Package className="w-3.5 h-3.5" />}>
            Orders <span className="opacity-60">({orders.length})</span>
          </TabButton>
          <TabButton active={tab === "leads"} onClick={() => setTab("leads")} icon={<Users className="w-3.5 h-3.5" />}>
            Leads <span className="opacity-60">({leads.length})</span>
          </TabButton>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === "orders" ? "Search by name, email, docnum, tracking…" : "Search leads by email…"}
              className="w-full pl-10 pr-4 py-2.5 bg-card border border-border/40 rounded-sm text-sm focus:border-gold outline-none"
            />
          </div>
          {tab === "orders" && (
            <>
              <button
                onClick={syncAllIncomplete}
                disabled={bulkSyncing || incompleteCount === 0}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-amber-500/40 text-amber-400 text-[11px] tracking-[0.25em] uppercase hover:bg-amber-500/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title={
                  incompleteWithDocnum > 0
                    ? `Re-fetch shipping & customer data from iCount for ${incompleteWithDocnum} flagged order(s)`
                    : "All flagged orders are missing iCount docnum — open each one and paste the docnum"
                }
              >
                {bulkSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                Sync All Incomplete ({incompleteCount}{incompleteCount > 0 && incompleteWithDocnum < incompleteCount ? ` • ${incompleteWithDocnum} ready` : ""})
              </button>
              <button
                onClick={exportShineOnBatch}
                disabled={paidPending === 0}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gold text-background text-[11px] tracking-[0.25em] uppercase hover:bg-gold-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export ShineOn Batch — Art Ready ({paidPending})
              </button>
            </>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gold" /></div>
        ) : tab === "orders" ? (
          <OrdersTable orders={filteredOrders} onSelect={setSelected} onStatusChange={updateWorkflowStatus} isIncomplete={isIncompleteShipping} onSyncIcount={syncWithIcount} onAutoDetect={autoDetectSingle} />
        ) : (
          <LeadsTable leads={filteredLeads} />
        )}
      </div>

      {selected && (
        <OrderDetailModal
          order={selected}
          onClose={() => setSelected(null)}
          onSaveTracking={saveTrackingAndNotify}
          onRenderPng={renderPng}
          onSyncIcount={syncWithIcount}
          onSetDocnum={setIcountDocnum}
          onAutoDetect={autoDetectSingle}
        />
      )}
    </div>
  );
};

// ─── Subcomponents ──────────────────────────────────────────────────

const StatCard = ({ label, value, accent }: { label: string; value: number; accent?: "gold" | "emerald" }) => (
  <div className="border border-border/30 rounded-sm p-4 bg-card">
    <p className={`text-2xl font-serif ${accent === "gold" ? "text-gold" : accent === "emerald" ? "text-emerald-400" : "text-foreground"}`}>{value}</p>
    <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-1">{label}</p>
  </div>
);

const TabButton = ({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 text-[11px] tracking-[0.2em] uppercase transition-colors border-b-2 -mb-px ${
      active ? "text-gold border-gold" : "text-muted-foreground border-transparent hover:text-foreground"
    }`}
  >
    {icon} {children}
  </button>
);

const StatusPill = ({ status, onChange }: { status: WorkflowStatus; onChange: (s: WorkflowStatus) => void }) => {
  const opt = STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[0];
  return (
    <select
      value={status}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value as WorkflowStatus)}
      className={`text-[10px] tracking-[0.15em] uppercase px-2.5 py-1.5 rounded-sm border bg-transparent cursor-pointer focus:outline-none ${opt.tone}`}
    >
      {STATUS_OPTIONS.map(o => (
        <option key={o.value} value={o.value} className="bg-background text-foreground">{o.label}</option>
      ))}
    </select>
  );
};

const OrdersTable = ({ orders, onSelect, onStatusChange, isIncomplete, onSyncIcount, onAutoDetect }: {
  orders: Order[]; onSelect: (o: Order) => void; onStatusChange: (o: Order, s: WorkflowStatus) => void;
  isIncomplete: (o: Order) => boolean;
  onSyncIcount: (orderId: string) => Promise<void>;
  onAutoDetect: (orderId: string) => Promise<void>;
}) => {
  if (orders.length === 0) {
    return <div className="text-center py-20 border border-border/30 rounded-sm text-muted-foreground">No orders found</div>;
  }
  return (
    <div className="border border-border/30 rounded-sm overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-background/50 border-b border-border/30">
            <tr className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Docnum</th>
              <th className="text-left px-4 py-3">Customer</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-right px-4 py-3">Amount</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => {
              const incomplete = isIncomplete(o);
              return (
                <tr key={o.id} className={`border-b border-border/20 hover:bg-background/30 transition-colors ${incomplete ? "border-l-2 border-l-destructive/70" : ""}`}>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-foreground">
                    {o.icount_docnum ? (
                      <span className="inline-flex items-center gap-1.5">
                        {o.icount_docnum}
                        {o.icount_docnum_auto_detected && (
                          <CheckCircle2
                            className="w-3.5 h-3.5 text-emerald-400"
                            aria-label="Auto-detected from iCount"
                          />
                        )}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    <div className="flex items-center gap-2">
                      <span>{o.customer_name || o.pet_name}</span>
                      {incomplete && (
                        o.icount_docnum ? (
                          <span className="text-[9px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-sm border border-destructive/40 text-destructive bg-destructive/5">
                            Data Incomplete
                          </span>
                        ) : (
                          <span className="text-[9px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-sm border border-amber-500/40 text-amber-400 bg-amber-500/5">
                            Needs Docnum
                          </span>
                        )
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{o.customer_email || "—"}</td>
                  <td className="px-4 py-3 text-right text-foreground font-medium">{o.amount ? `$${o.amount}` : "—"}</td>
                  <td className="px-4 py-3"><StatusPill status={o.workflow_status} onChange={(s) => onStatusChange(o, s)} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-3">
                      {incomplete && !o.icount_docnum && o.customer_email && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onAutoDetect(o.id); }}
                          className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-emerald-400 hover:text-emerald-300"
                          title="Search iCount by customer email and auto-link the most recent invoice/receipt"
                        >
                          <Sparkles className="w-3 h-3" /> Auto-detect
                        </button>
                      )}
                      {incomplete && o.icount_docnum && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onSyncIcount(o.id); }}
                          className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-amber-400 hover:text-amber-300"
                          title="Re-fetch shipping & customer details from iCount"
                        >
                          <RotateCw className="w-3 h-3" /> Sync iCount
                        </button>
                      )}
                      <button onClick={() => onSelect(o)} className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-gold hover:text-gold-light">
                        <Eye className="w-3 h-3" /> View
                      </button>
                    </div>
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

const LeadsTable = ({ leads }: { leads: Lead[] }) => {
  if (leads.length === 0) {
    return <div className="text-center py-20 border border-border/30 rounded-sm text-muted-foreground">No leads found</div>;
  }
  const exportLeadsCsv = () => {
    const headers = ["email", "status", "created_at"];
    const rows = leads.map(l => [l.email, l.status, l.created_at]);
    const csv = [headers, ...rows].map(r => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ANIMUS_leads_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };
  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={exportLeadsCsv} className="flex items-center gap-2 px-4 py-2 text-[10px] tracking-[0.2em] uppercase border border-border/50 text-muted-foreground hover:border-gold hover:text-gold transition-colors">
          <Download className="w-3 h-3" /> Export Leads CSV
        </button>
      </div>
      <div className="border border-border/30 rounded-sm overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-background/50 border-b border-border/30">
            <tr className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {leads.map(l => (
              <tr key={l.id} className="border-b border-border/20 hover:bg-background/30 transition-colors">
                <td className="px-4 py-3 text-foreground">{l.email}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{l.status}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const OrderDetailModal = ({ order, onClose, onSaveTracking, onRenderPng, onSyncIcount, onSetDocnum, onAutoDetect }: {
  order: Order;
  onClose: () => void;
  onSaveTracking: (id: string, tracking: string) => Promise<void>;
  onRenderPng: (id: string) => Promise<void>;
  onSyncIcount: (id: string) => Promise<void>;
  onSetDocnum: (id: string, docnum: string) => Promise<void>;
  onAutoDetect: (id: string) => Promise<void>;
}) => {
  const [tracking, setTracking] = useState(order.tracking_number || "");
  const [saving, setSaving] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [docnumInput, setDocnumInput] = useState("");
  const [savingDocnum, setSavingDocnum] = useState(false);
  const [autoDetecting, setAutoDetecting] = useState(false);
  const previewUrl = order.print_image_url || order.design_image_url;

  const handleSave = async () => {
    setSaving(true);
    await onSaveTracking(order.id, tracking.trim());
    setSaving(false);
  };
  const handleRender = async () => {
    setRendering(true);
    await onRenderPng(order.id);
    setRendering(false);
  };
  const handleSync = async () => {
    setSyncing(true);
    await onSyncIcount(order.id);
    setSyncing(false);
  };
  const handleAutoDetect = async () => {
    setAutoDetecting(true);
    await onAutoDetect(order.id);
    setAutoDetecting(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-card border border-border/40 rounded-sm max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-card border-b border-border/30 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-serif text-foreground">{order.customer_name || order.pet_name}</h2>
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-0.5">
              Order {order.icount_docnum || order.id.slice(0, 8)} • {new Date(order.created_at).toLocaleString()}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Engraving preview */}
          <section>
            <h3 className="text-[10px] tracking-[0.25em] uppercase text-gold mb-3">Engraving Preview</h3>
            <div className="border border-border/30 rounded-sm bg-background/50 p-6 flex items-center justify-center min-h-[280px]">
              {previewUrl ? (
                <img src={previewUrl} alt="Engraving" className="max-h-72 object-contain" />
              ) : (
                <p className="text-xs text-muted-foreground">No preview available — generate PNG below</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <button onClick={handleRender} disabled={rendering}
                className="inline-flex items-center gap-2 px-3 py-2 text-[10px] tracking-[0.2em] uppercase border border-gold/40 text-gold hover:bg-gold/5 transition-colors disabled:opacity-50">
                {rendering ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
                {order.print_image_url ? "Re-render PNG" : "Generate PNG"}
              </button>
              {order.print_image_url && (
                <a href={order.print_image_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase border border-border/50 text-muted-foreground hover:border-gold hover:text-gold px-3 py-2 transition-colors">
                  Open PNG <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
              {order.soul_page_url && (
                <a href={order.soul_page_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase border border-border/50 text-muted-foreground hover:border-gold hover:text-gold px-3 py-2 transition-colors">
                  Soul Page <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          </section>

          {/* Shipping */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] tracking-[0.25em] uppercase text-gold flex items-center gap-2"><MapPin className="w-3 h-3" /> Shipping Address</h3>
              {order.icount_docnum && (
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] tracking-[0.2em] uppercase border border-amber-500/40 text-amber-400 hover:bg-amber-500/5 transition-colors disabled:opacity-50"
                  title={`Re-fetch from iCount docnum ${order.icount_docnum}`}
                >
                  {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
                  Sync iCount
                </button>
              )}
            </div>
            <div className="border border-border/30 rounded-sm p-4 bg-background/30 text-sm space-y-1">
              <p className="text-foreground">{order.customer_name || "—"}</p>
              <p className="text-muted-foreground">{order.shipping_address1 || <span className="italic">No address on file</span>}</p>
              <p className="text-muted-foreground">
                {[order.shipping_city, order.shipping_zip].filter(Boolean).join(", ") || ""}
                {order.shipping_country_code && ` • ${order.shipping_country_code}`}
              </p>
              {order.customer_email && <p className="text-xs text-muted-foreground/80 mt-2">{order.customer_email}</p>}
            </div>

            {!order.icount_docnum && (
              <div className="mt-3 border border-amber-500/30 rounded-sm p-3 bg-amber-500/5">
                <p className="text-[10px] tracking-[0.2em] uppercase text-amber-400 mb-2">Set iCount Docnum</p>
                <p className="text-xs text-muted-foreground mb-3">
                  This order has no iCount docnum, so it cannot be synced. Paste the docnum from your iCount dashboard to enable sync.
                </p>
                <div className="flex gap-2">
                  <input
                    value={docnumInput}
                    onChange={(e) => setDocnumInput(e.target.value)}
                    placeholder="e.g. 12345"
                    className="flex-1 px-3 py-2 bg-background border border-border/40 rounded-sm text-sm focus:border-amber-400 outline-none font-mono"
                  />
                  <button
                    onClick={async () => { setSavingDocnum(true); await onSetDocnum(order.id, docnumInput); setSavingDocnum(false); setDocnumInput(""); }}
                    disabled={savingDocnum || !docnumInput.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-[10px] tracking-[0.2em] uppercase border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-40"
                  >
                    {savingDocnum ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    Save Docnum
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Tracking */}
          <section>
            <h3 className="text-[10px] tracking-[0.25em] uppercase text-gold mb-3 flex items-center gap-2"><Truck className="w-3 h-3" /> Tracking</h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                placeholder="Enter tracking number"
                className="flex-1 px-3 py-2.5 bg-background border border-border/40 rounded-sm text-sm focus:border-gold outline-none"
              />
              <button onClick={handleSave} disabled={saving}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gold text-background text-[11px] tracking-[0.25em] uppercase hover:bg-gold-light transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Truck className="w-3 h-3" />}
                Update & Notify Customer
              </button>
            </div>
            {order.tracking_updated_at && (
              <p className="text-[10px] text-emerald-400/70 mt-2">Last updated {new Date(order.tracking_updated_at).toLocaleString()}</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminOrders;
