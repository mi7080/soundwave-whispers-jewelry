import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { downloadSvg, generateProductionSvg, generateBackEngravingSvg } from "@/lib/svgExport";
import { Download, Loader2, RefreshCw, ArrowLeft, FileText, Music, Image, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface AnimusOrder {
  id: string;
  shopify_order_id: string | null;
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
}

const AdminDashboard = () => {
  const [orders, setOrders] = useState<AnimusOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState<string | null>(null);

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

  const handleDownloadFront = (order: AnimusOrder) => {
    const filename = `ANIMUS_FRONT_${order.pet_name.replace(/\s+/g, "_")}_${order.id.slice(0, 8)}.svg`;
    downloadSvg(order.svg_content, filename);
  };

  const handleDownloadBack = (order: AnimusOrder) => {
    if (!order.pet_name.trim()) { toast.error("No pet name for back engraving."); return; }
    const backSvg = generateBackEngravingSvg(order.pet_name);
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
              ShineOn Dog Tag Necklace — Download print-ready engraving SVGs
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

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="border border-border/30 rounded-sm p-4 text-center">
            <p className="text-2xl font-serif text-foreground">{orders.length}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Total Orders</p>
          </div>
          <div className="border border-border/30 rounded-sm p-4 text-center">
            <p className="text-2xl font-serif text-gold">{orders.filter(o => o.status === "pending").length}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Pending</p>
          </div>
          <div className="border border-border/30 rounded-sm p-4 text-center">
            <p className="text-2xl font-serif text-green-400">{orders.filter(o => o.status === "fulfilled").length}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Fulfilled</p>
          </div>
        </div>

        {/* Orders */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gold" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 border border-border/30 rounded-sm">
            <p className="text-muted-foreground">No orders yet</p>
            <p className="text-xs text-muted-foreground/50 mt-2">Orders will appear here after customers complete checkout</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="border border-border/30 rounded-sm overflow-hidden bg-card hover:border-gold/30 transition-colors">
                {/* Order Header */}
                <div className="p-6 border-b border-border/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-serif text-foreground">{order.pet_name}</h3>
                        <span className={`text-[9px] tracking-[0.2em] uppercase px-2 py-0.5 rounded-sm border ${
                          order.status === "pending" ? "border-gold/30 text-gold bg-gold/5" : "border-green-500/30 text-green-400 bg-green-500/5"
                        }`}>
                          {order.status}
                        </span>
                        {order.add_name_to_back && (
                          <span className="text-[9px] tracking-[0.2em] uppercase px-2 py-0.5 rounded-sm border border-blue-500/30 text-blue-400 bg-blue-500/5">
                            Back Engraving
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(order.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {order.shopify_order_id && (
                        <p className="text-xs text-muted-foreground/70 mt-0.5">Shopify ID: {order.shopify_order_id}</p>
                      )}
                      {order.right_side_engraving && (
                        <p className="text-xs text-muted-foreground/70 mt-0.5">Side Engraving: "{order.right_side_engraving}"</p>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground/50 font-mono">{order.id.slice(0, 8)}</p>
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
                        <Image className="w-3 h-3" /> Pet Photo <ExternalLink className="w-2.5 h-2.5" />
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
