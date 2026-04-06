import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { downloadSvg } from "@/lib/svgExport";
import { Download, Loader2, RefreshCw, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface AnimusOrder {
  id: string;
  shopify_order_id: string | null;
  pet_name: string;
  audio_url: string;
  pet_photo_url: string | null;
  soul_page_url: string;
  right_side_engraving: string | null;
  svg_content: string;
  status: string;
  created_at: string;
}

const AdminDashboard = () => {
  const [orders, setOrders] = useState<AnimusOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("animus_orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setOrders(data as AnimusOrder[]);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleDownload = (order: AnimusOrder) => {
    const filename = `ANIMUS_${order.pet_name.replace(/\s+/g, "_")}_${order.id.slice(0, 8)}.svg`;
    downloadSvg(order.svg_content, filename);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-6 py-12 max-w-5xl">
        <div className="flex items-center justify-between mb-10">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-gold transition-colors mb-4">
              <ArrowLeft className="w-3 h-3" /> Back to Store
            </Link>
            <h1 className="text-2xl font-serif text-foreground">ANIMUS Production Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Download print-ready SVGs for ShineOn fulfillment</p>
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

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gold" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 border border-border/30 rounded-sm">
            <p className="text-muted-foreground">No orders yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="border border-border/30 rounded-sm p-6 bg-card hover:border-gold/30 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-serif text-foreground">{order.pet_name}</h3>
                      <span className={`text-[9px] tracking-[0.2em] uppercase px-2 py-0.5 rounded-sm border ${
                        order.status === "pending" ? "border-gold/30 text-gold bg-gold/5" : "border-green-500/30 text-green-400 bg-green-500/5"
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {order.shopify_order_id && (
                      <p className="text-xs text-muted-foreground/70">Shopify: {order.shopify_order_id}</p>
                    )}
                    {order.right_side_engraving && (
                      <p className="text-xs text-muted-foreground/70">Engraving: {order.right_side_engraving}</p>
                    )}
                    <div className="flex gap-4 mt-2">
                      <a href={order.audio_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-gold/70 hover:text-gold transition-colors underline">
                        Audio ↗
                      </a>
                      <a href={order.soul_page_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-gold/70 hover:text-gold transition-colors underline">
                        Soul Page ↗
                      </a>
                      {order.pet_photo_url && (
                        <a href={order.pet_photo_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-gold/70 hover:text-gold transition-colors underline">
                          Photo ↗
                        </a>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(order)}
                    className="flex items-center gap-2 px-6 py-3 bg-gold text-background text-xs tracking-[0.3em] uppercase hover:bg-gold-light transition-all flex-shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    Download SVG
                  </button>
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
