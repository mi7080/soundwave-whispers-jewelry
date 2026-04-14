import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PRODUCT_CONFIG } from "@/config/product";
import logo from "@/assets/logo.png";

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("order");
  const variantIdx = parseInt(searchParams.get("variant") || "0", 10);
  const variant = PRODUCT_CONFIG.variants[variantIdx] || PRODUCT_CONFIG.variants[0];

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("US");

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !street.trim() || !city.trim() || !zip.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const projId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const siteUrl = window.location.origin;

      const resp = await fetch(
        `https://${projId}.supabase.co/functions/v1/icount-create-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            fullName: fullName.trim(),
            email: email.trim(),
            address: street.trim(),
            city: city.trim(),
            state: state.trim(),
            zip: zip.trim(),
            country,
            amount: variant.foundersPrice,
            currency: PRODUCT_CONFIG.currency,
            siteUrl,
          }),
        }
      );

      const result = await resp.json();

      if (!resp.ok || result.error) {
        toast.error(result.error || "Payment initiation failed");
        setSubmitting(false);
        return;
      }

      if (result.paymentUrl) {
        setPaymentUrl(result.paymentUrl);
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </main>
    );
  }

  // Payment iframe modal
  if (paymentUrl) {
    return (
      <main className="min-h-screen bg-background flex flex-col">
        <nav className="w-full py-6 px-6">
          <div className="max-w-5xl mx-auto flex items-center justify-center">
            <img src={logo} alt="ANIMUS" className="h-12" />
          </div>
        </nav>
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-lg bg-card border border-border rounded-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-border text-center">
              <p className="text-xs tracking-[0.3em] uppercase text-gold font-sans">Secure Payment</p>
            </div>
            <iframe
              src={paymentUrl}
              className="w-full h-[500px] border-0"
              title="iCount Payment"
              allow="payment"
            />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="w-full py-6 px-6 border-b border-border/30">
        <div className="max-w-5xl mx-auto flex items-center justify-center">
          <img src={logo} alt="ANIMUS" className="h-12" />
        </div>
      </nav>

      <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-10 md:py-16">
        <h1 className="font-serif text-3xl md:text-4xl text-foreground text-center mb-2">
          Complete Your Order
        </h1>
        <p className="text-center text-muted-foreground text-sm mb-10">
          Secure checkout — your memory pendant is almost ready.
        </p>

        {failed && (
          <div className="mb-6 p-4 rounded-md border border-red-500/30 bg-red-500/10 text-red-400 text-sm text-center">
            Payment was not successful. Please try again.
          </div>
        )}

        <div className="grid md:grid-cols-5 gap-10">
          {/* Order Summary — Right on desktop */}
          <div className="md:col-span-2 md:order-2">
            <div className="border border-border/50 rounded-lg p-6 bg-card sticky top-8">
              <p className="text-xs tracking-[0.3em] uppercase text-gold font-sans mb-4">
                Order Summary
              </p>

              {/* Design preview */}
              {order?.design_image_url && (
                <div className="mb-4 rounded-md overflow-hidden border border-border/30">
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
                  <span className="text-foreground font-medium text-right text-xs">Memorial Pendant</span>
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
                  <span className="text-foreground">${variant.foundersPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-gold text-xs">FREE</span>
                </div>
                <div className="border-t border-border/30 pt-2 flex justify-between text-lg">
                  <span className="text-foreground font-serif">Total</span>
                  <span className="text-gold font-serif">${variant.foundersPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Form — Left on desktop */}
          <form onSubmit={handleSubmit} className="md:col-span-3 md:order-1 space-y-5">
            <p className="text-xs tracking-[0.3em] uppercase text-gold font-sans mb-2">
              Shipping Information
            </p>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full h-11 px-4 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 text-sm"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Email *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-4 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 text-sm"
                placeholder="you@email.com"
              />
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Street Address *</label>
              <input
                type="text"
                required
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="w-full h-11 px-4 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 text-sm"
                placeholder="123 Main St"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full h-11 px-4 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 text-sm"
                  placeholder="New York"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full h-11 px-4 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 text-sm"
                  placeholder="NY"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Zip Code *</label>
                <input
                  type="text"
                  required
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  className="w-full h-11 px-4 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 text-sm"
                  placeholder="10001"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Country *</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full h-11 px-4 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 text-sm"
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                  <option value="AU">Australia</option>
                  <option value="IL">Israel</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                  <option value="NL">Netherlands</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-13 py-3.5 bg-gold text-background text-xs tracking-[0.2em] uppercase font-medium hover:bg-gold-light transition-colors disabled:opacity-50 rounded-md flex items-center justify-center gap-2 mt-6"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing…
                </>
              ) : (
                `Complete Purchase — $${variant.foundersPrice.toFixed(2)}`
              )}
            </button>

            <div className="flex items-center justify-center gap-4 text-muted-foreground/50 text-[10px] tracking-widest uppercase pt-2">
              <span>🔒 Secure Payment</span>
              <span>·</span>
              <span>Free Shipping</span>
            </div>
          </form>
        </div>
      </div>

      <footer className="py-6 text-center text-muted-foreground/50 text-xs tracking-widest">
        © {new Date().getFullYear()} ANIMUS — All Rights Reserved
      </footer>
    </main>
  );
};

export default Checkout;
