import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { downloadSvg, generateProductionSvg, generateBackEngravingSvg } from "@/lib/svgExport";
import { Download, Loader2, RefreshCw, ArrowLeft, FileText, Music, Image, ExternalLink, FolderOpen, FileSpreadsheet, CheckCircle2, Circle, Mail, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface AnimusOrder {
  id: string;
  pet_name: string;
  audio_url: string;
  pet_photo_url: string | null;
  soul_page_url: string;
  right_side_engraving: string | null;
  svg_content: string;
  waveform_data: number[] | null;
  status: string;
  created_at: string;
  add_name_to_back: boolean | null;
  cloudinary_folder_url: string | null;
  design_image_url: string | null;
  exported_at: string | null;
  customer_name: string | null;
  customer_email: string | null;
  amount: number | null;
}

const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const csvEscape = (val: unknown) => {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const AdminDashboard = () => {
  const [orders, setOrders] = useState<AnimusOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(toLocalDateStr(new Date()));
  const [marking, setMarking] = useState(false);
  const [sendingCampaign, setSendingCampaign] = useState<"email1" | "email2" | null>(null);
  const [leadCount, setLeadCount] = useState<number | null>(null);

  const sendCampaign = async (campaign: "email1" | "email2", testEmail?: string) => {
    const label = campaign === "email1" ? "Email 1 (Status Update)" : "Email 2 (Referral Program)";
    const audience = testEmail ? `test send to ${testEmail}` : `the full waitlist (${leadCount ?? "all"} leads)`;
    if (!confirm(`Send ${label} to ${audience}?\n\nThis cannot be undone.`)) return;

    setSendingCampaign(campaign);
    try {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://animuswave.com";
      const { data, error } = await supabase.functions.invoke("send-campaign-email", {
        body: { campaign, baseUrl, testEmail },
      });
      if (error) throw error;
      toast.success(
        `${label} — sent ${data?.sent ?? 0} / ${data?.total ?? 0}` +
          (data?.failed ? ` (${data.failed} failed)` : "")
      );
      if (data?.errors?.length) console.warn("Send errors:", data.errors);
    } catch (e: any) {
      toast.error(`Campaign failed: ${e.message || "Unknown error"}`);
    } finally {
      setSendingCampaign(null);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("animus_orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setOrders(data as unknown as AnimusOrder[]);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  useEffect(() => {
    (async () => {
      const { count } = await supabase
        .from("waitlist_leads")
        .select("*", { count: "exact", head: true });
      if (typeof count === "number") setLeadCount(count);
    })();
  }, []);

  const filteredOrders = useMemo(
    () => orders.filter(o => toLocalDateStr(new Date(o.created_at)) === selectedDate),
    [orders, selectedDate]
  );

  const dateGroups = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach(o => {
      const d = toLocalDateStr(new Date(o.created_at));
      map.set(d, (map.get(d) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [orders]);

  const handleDownloadFront = (order: AnimusOrder) => {
    const filename = `ANIMUS_FRONT_${order.pet_name.replace(/\s+/g, "_")}_${order.id.slice(0, 8)}.svg`;
    downloadSvg(order.svg_content, filename);
  };

  const handleDownloadBack = async (order: AnimusOrder) => {
    if (!order.pet_name.trim()) { toast.error("No name for back engraving."); return; }
    const backSvg = await generateBackEngravingSvg(order.pet_name);
    const filename = `ANIMUS_BACK_${order.pet_name.replace(/\s+/g, "_")}_${order.id.slice(0, 8)}.svg`;
    downloadSvg(backSvg, filename);
  };

  const handleRegenerate = async (order: AnimusOrder) => {
    if (!order.waveform_data || order.waveform_data.length === 0) {
      toast.error("No waveform data available to regenerate.");
      return;
    }
    setRegenerating(order.id);
    try {
      const svgContent = await generateProductionSvg({
        waveformData: order.waveform_data,
        petName: order.pet_name,
        soulPageUrl: order.soul_page_url,
      });

      const { error } = await supabase
        .from("animus_orders")
        .update({ svg_content: svgContent })
        .eq("id", order.id);

      if (error) throw error;

      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, svg_content: svgContent } : o));
      toast.success("Production SVG regenerated!");
    } catch (err) {
      console.error("Regeneration failed:", err);
      toast.error("Failed to regenerate SVG.");
    } finally {
      setRegenerating(null);
    }
  };

  const toggleExported = async (order: AnimusOrder) => {
    const newVal = order.exported_at ? null : new Date().toISOString();
    const prev = orders;
    setOrders(p => p.map(o => o.id === order.id ? { ...o, exported_at: newVal } : o));
    const { error } = await supabase
      .from("animus_orders")
      .update({ exported_at: newVal })
      .eq("id", order.id);
    if (error) {
      setOrders(prev);
      toast.error("Failed to update export status.");
    } else {
      toast.success(newVal ? "Marked as exported" : "Marked as not exported");
    }
  };

  const handleDownloadCSV = async () => {
    if (filteredOrders.length === 0) {
      toast.error("No orders for the selected date.");
      return;
    }

    const headers = [
      "order_id", "created_at", "pet_name", "customer_name", "customer_email",
      "amount", "right_side_engraving", "add_name_to_back", "status",
      "soul_page_url", "audio_url", "pet_photo_url", "design_image_url",
      "cloudinary_folder_url", "exported_at"
    ];
    const rows = filteredOrders.map(o => [
      o.id, o.created_at, o.pet_name, o.customer_name, o.customer_email,
      o.amount, o.right_side_engraving, o.add_name_to_back, o.status,
      o.soul_page_url, o.audio_url, o.pet_photo_url, o.design_image_url,
      o.cloudinary_folder_url, o.exported_at,
    ]);
    const csv = [headers, ...rows].map(r => r.map(csvEscape).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ANIMUS_orders_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setMarking(true);
    const ids = filteredOrders.filter(o => !o.exported_at).map(o => o.id);
    if (ids.length > 0) {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("animus_orders")
        .update({ exported_at: now })
        .in("id", ids);
      if (error) {
        toast.error("CSV downloaded, but failed to mark as exported.");
      } else {
        setOrders(prev => prev.map(o => ids.includes(o.id) ? { ...o, exported_at: now } : o));
        toast.success(`Exported ${filteredOrders.length} orders for ${selectedDate}`);
      }
    } else {
      toast.success(`Re-exported ${filteredOrders.length} orders`);
    }
    setMarking(false);
  };

  const exportedCount = filteredOrders.filter(o => o.exported_at).length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-6 py-12 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-gold transition-colors mb-4">
              <ArrowLeft className="w-3 h-3" /> Back to Store
            </Link>
            <h1 className="text-2xl font-serif text-foreground">ANIMUS Production Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Memory Pendant — Daily batch export to manufacturer
            </p>
          </div>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-xs tracking-[0.2em] uppercase border border-border/50 text-muted-foreground hover:border-gold hover:text-gold transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Date Filter + CSV Export */}
        <div className="border border-border/30 rounded-sm p-5 mb-6 bg-card">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="flex-1">
              <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">
                Filter by Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-background border border-border/50 rounded-sm text-sm text-foreground focus:outline-none focus:border-gold"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {dateGroups.slice(0, 5).map(([date, count]) => (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`px-3 py-1.5 text-[10px] tracking-[0.15em] uppercase border rounded-sm transition-colors ${
                    selectedDate === date
                      ? "border-gold text-gold bg-gold/5"
                      : "border-border/40 text-muted-foreground hover:border-gold/50 hover:text-gold"
                  }`}
                >
                  {date} <span className="opacity-60">({count})</span>
                </button>
              ))}
            </div>
            <button
              onClick={handleDownloadCSV}
              disabled={marking || filteredOrders.length === 0}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gold text-background text-xs tracking-[0.3em] uppercase hover:bg-gold-light transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {marking ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              Download Daily CSV
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            Showing <span className="text-foreground font-medium">{filteredOrders.length}</span> orders for {selectedDate}
            {filteredOrders.length > 0 && (
              <> • <span className="text-green-400">{exportedCount} exported</span> • <span className="text-gold">{filteredOrders.length - exportedCount} pending</span></>
            )}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="border border-border/30 rounded-sm p-4 text-center">
            <p className="text-2xl font-serif text-foreground">{orders.length}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Total Orders</p>
          </div>
          <div className="border border-border/30 rounded-sm p-4 text-center">
            <p className="text-2xl font-serif text-gold">{orders.filter(o => !o.exported_at).length}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Not Exported</p>
          </div>
          <div className="border border-border/30 rounded-sm p-4 text-center">
            <p className="text-2xl font-serif text-green-400">{orders.filter(o => o.exported_at).length}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Exported</p>
          </div>
        </div>

        {/* Orders */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gold" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20 border border-border/30 rounded-sm">
            <p className="text-muted-foreground">No orders for {selectedDate}</p>
            <p className="text-xs text-muted-foreground/50 mt-2">Pick another date above to see orders</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div key={order.id} className={`border rounded-sm overflow-hidden bg-card transition-colors ${
                order.exported_at ? "border-green-500/20 hover:border-green-500/40" : "border-border/30 hover:border-gold/30"
              }`}>
                {/* Order Header */}
                <div className="p-6 border-b border-border/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-serif text-foreground">{order.pet_name}</h3>
                        <span className={`text-[9px] tracking-[0.2em] uppercase px-2 py-0.5 rounded-sm border ${
                          order.status === "pending" ? "border-gold/30 text-gold bg-gold/5" : "border-green-500/30 text-green-400 bg-green-500/5"
                        }`}>
                          {order.status}
                        </span>
                        {order.exported_at && (
                          <span className="text-[9px] tracking-[0.2em] uppercase px-2 py-0.5 rounded-sm border border-green-500/30 text-green-400 bg-green-500/5 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Exported
                          </span>
                        )}
                        {order.add_name_to_back && (
                          <span className="text-[9px] tracking-[0.2em] uppercase px-2 py-0.5 rounded-sm border border-blue-500/30 text-blue-400 bg-blue-500/5">
                            Back Engraving
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(order.created_at).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {order.right_side_engraving && (
                        <p className="text-xs text-muted-foreground/70 mt-0.5">Side Engraving: "{order.right_side_engraving}"</p>
                      )}
                      {order.exported_at && (
                        <p className="text-[10px] text-green-400/60 mt-0.5">Exported {new Date(order.exported_at).toLocaleString()}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleExported(order)}
                        className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase border border-border/40 hover:border-gold/50 rounded-sm px-2.5 py-1.5 text-muted-foreground hover:text-gold transition-colors"
                        title="Toggle exported status"
                      >
                        {order.exported_at ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <Circle className="w-3 h-3" />}
                        {order.exported_at ? "Exported" : "Mark Exported"}
                      </button>
                      <p className="text-[10px] text-muted-foreground/50 font-mono">{order.id.slice(0, 8)}</p>
                    </div>
                  </div>
                </div>

                {/* Order Assets */}
                <div className="p-6 space-y-4">
                  {/* Asset Links */}
                  <div className="flex flex-wrap gap-3">
                    <a href={order.audio_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[10px] text-gold/70 hover:text-gold transition-colors border border-gold/20 rounded-sm px-3 py-1.5 hover:border-gold/40">
                      <Music className="w-3 h-3" /> Audio File <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    <a href={order.soul_page_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[10px] text-gold/70 hover:text-gold transition-colors border border-gold/20 rounded-sm px-3 py-1.5 hover:border-gold/40">
                      <FileText className="w-3 h-3" /> Soul Page <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    {order.pet_photo_url && (
                      <a href={order.pet_photo_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[10px] text-gold/70 hover:text-gold transition-colors border border-gold/20 rounded-sm px-3 py-1.5 hover:border-gold/40">
                        <Image className="w-3 h-3" /> Memory Photo <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                    {order.cloudinary_folder_url && (
                      <a href={order.cloudinary_folder_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[10px] text-emerald-400/80 hover:text-emerald-400 transition-colors border border-emerald-500/30 rounded-sm px-3 py-1.5 hover:border-emerald-500/50 bg-emerald-500/5">
                        <FolderOpen className="w-3 h-3" /> Open Customer Folder in Cloudinary <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                    {order.design_image_url && (
                      <a href={order.design_image_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[10px] text-gold/70 hover:text-gold transition-colors border border-gold/20 rounded-sm px-3 py-1.5 hover:border-gold/40">
                        <Image className="w-3 h-3" /> CJ Design Image <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>

                  {/* Download Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => handleDownloadFront(order)}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-gold text-background text-xs tracking-[0.3em] uppercase hover:bg-gold-light transition-all"
                    >
                      <Download className="w-4 h-4" />
                      Front SVG (Waveform + QR)
                    </button>
                    {(order.add_name_to_back || order.pet_name.trim()) && (
                      <button
                        onClick={() => handleDownloadBack(order)}
                        className="flex-1 flex items-center justify-center gap-2 px-5 py-3 border border-gold/50 text-gold text-xs tracking-[0.3em] uppercase hover:bg-gold/5 transition-all"
                      >
                        <Download className="w-4 h-4" />
                        Back SVG (Name Engraving)
                      </button>
                    )}
                    <button
                      onClick={() => handleRegenerate(order)}
                      disabled={regenerating === order.id}
                      className="flex items-center justify-center gap-2 px-4 py-3 border border-border/50 text-muted-foreground text-xs tracking-[0.2em] uppercase hover:border-gold hover:text-gold transition-all disabled:opacity-50"
                    >
                      {regenerating === order.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      Regenerate
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
