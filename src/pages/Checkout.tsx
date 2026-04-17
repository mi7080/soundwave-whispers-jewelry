import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { PRODUCT_CONFIG } from "@/config/product";
import logo from "@/assets/logo.png";

const ICOUNT_BASE_URL =
  "https://app.icount.co.il/m/f9f6f/c693586ep3u69dfd9dd?utm_source=iCount&utm_medium=paypage&utm_campaign=3";

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("order");
  const variantIdx = parseInt(searchParams.get("variant") || "0", 10);
  const variant = PRODUCT_CONFIG.variants[variantIdx] || PRODUCT_CONFIG.variants[0];

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const failed = searchParams.get("status") === "failed";

  useEffect(() => {
    if (!orderId) {
      navigate("/");
      return;
    }
    supabase
      .from("animus_orders")
      .select("id, pet_name, design_image_url, pet_photo_url, status")
      .eq("id", orderId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          toast.error("Order not found");
          navigate("/");
          return;
        }
        setOrder(data);
        setLoading(false);
      });
  }, [orderId, navigate]);

  const handleProceed = () => {
    const paymentUrl = `${ICOUNT_BASE_URL}&info=${encodeURIComponent(orderId!)}`;
    window.location.href = paymentUrl;
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <nav className="w-full py-6 px-6 border-b border-border/30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate(`/?order=${orderId}&variant=${variantIdx}#customize`)}
            className="flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Back to edit design"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Edit Design</span>
          </button>
          <img src={logo} alt="ANIMUS" className="h-12" />
          <div className="w-[88px]" aria-hidden="true" />
        </div>
      </nav>

      <div className="flex-1 max-w-lg mx-auto w-full px-6 py-10 md:py-16 flex flex-col items-center">
        <h1 className="font-serif text-3xl md:text-4xl text-foreground text-center mb-2">
          Order Summary
        </h1>
        <p className="text-center text-muted-foreground text-sm mb-8">
          Review your pendant details before proceeding to payment.
        </p>

        {failed && (
          <div className="w-full mb-6 p-4 rounded-md border border-red-500/30 bg-red-500/10 text-red-400 text-sm text-center">
            Payment was not successful. Please try again.
          </div>
        )}

        <div className="w-full border border-border/50 rounded-lg p-6 bg-card">
          <p className="text-xs tracking-[0.3em] uppercase text-gold font-sans mb-4">
            Your Pendant
          </p>

          {order?.design_image_url && (
            <div className="mb-5 rounded-md overflow-hidden border border-border/30">
              <img
                src={order.design_image_url}
                alt="Your soundwave design"
                className="w-full h-auto"
              />
            </div>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Product</span>
              <span className="text-foreground font-medium text-right text-xs">
                Memorial Pendant
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Finish</span>
              <span className="text-foreground">{variant.title}</span>
            </div>
            {order?.pet_name && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Engraving</span>
                <span className="text-foreground">{order.pet_name}</span>
              </div>
            )}
            <div className="border-t border-border/30 pt-2 mt-2 flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">
                ${variant.foundersPrice.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span className="text-gold text-xs">FREE</span>
            </div>
            <div className="border-t border-border/30 pt-2 flex justify-between text-lg">
              <span className="text-foreground font-serif">Total</span>
              <span className="text-gold font-serif">
                ${variant.foundersPrice.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleProceed}
          className="w-full h-13 py-3.5 bg-gold text-background text-xs tracking-[0.2em] uppercase font-medium hover:bg-gold-light transition-colors rounded-md flex items-center justify-center gap-2 mt-6"
        >
          Proceed to Shipping & Payment
        </button>

        <div className="flex items-center justify-center gap-4 text-muted-foreground/50 text-[10px] tracking-widest uppercase pt-4">
          <span>🔒 Secure Payment</span>
          <span>·</span>
          <span>Free Shipping</span>
        </div>
      </div>

      <footer className="py-6 text-center text-muted-foreground/50 text-xs tracking-widest">
        © {new Date().getFullYear()} ANIMUS — All Rights Reserved
      </footer>
    </main>
  );
};

export default Checkout;
