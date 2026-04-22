import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Lock } from "lucide-react";
import { toast } from "sonner";
import { PRODUCT_CONFIG } from "@/config/product";
import logo from "@/assets/logo.png";

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "IL", name: "Israel" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "JP", name: "Japan" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
];

const shippingSchema = z.object({
  fullName: z.string().trim().min(2, "Full name required").max(100),
  email: z.string().trim().email("Valid email required").max(255),
  phone: z.string().trim().min(6, "Phone required").max(30),
  address1: z.string().trim().min(3, "Address required").max(200),
  address2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(1, "City required").max(100),
  state: z.string().trim().max(100).optional().or(z.literal("")),
  zip: z.string().trim().min(2, "ZIP required").max(20),
  country: z.string().length(2, "Country required"),
  billingSame: z.boolean(),
  billingName: z.string().trim().max(100).optional().or(z.literal("")),
  billingAddress1: z.string().trim().max(200).optional().or(z.literal("")),
  billingAddress2: z.string().trim().max(200).optional().or(z.literal("")),
  billingCity: z.string().trim().max(100).optional().or(z.literal("")),
  billingState: z.string().trim().max(100).optional().or(z.literal("")),
  billingZip: z.string().trim().max(20).optional().or(z.literal("")),
  billingCountry: z.string().max(2).optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  if (!data.billingSame) {
    if (!data.billingName?.trim()) ctx.addIssue({ code: "custom", path: ["billingName"], message: "Required" });
    if (!data.billingAddress1?.trim()) ctx.addIssue({ code: "custom", path: ["billingAddress1"], message: "Required" });
    if (!data.billingCity?.trim()) ctx.addIssue({ code: "custom", path: ["billingCity"], message: "Required" });
    if (!data.billingZip?.trim()) ctx.addIssue({ code: "custom", path: ["billingZip"], message: "Required" });
    if (!data.billingCountry || data.billingCountry.length !== 2) ctx.addIssue({ code: "custom", path: ["billingCountry"], message: "Required" });
  }
});

type ShippingForm = z.infer<typeof shippingSchema>;

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("order");
  const variantIdx = parseInt(searchParams.get("variant") || "0", 10);
  const variant = PRODUCT_CONFIG.variants[variantIdx] || PRODUCT_CONFIG.variants[0];

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Discount code state
  const [discountInput, setDiscountInput] = useState("");
  const [discountCode, setDiscountCode] = useState<string | null>(null);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [validatingDiscount, setValidatingDiscount] = useState(false);
  // Hard lock — flipped true once a payment link is created. Prevents ANY
  // change to the applied discount (no remove, no reapply, no clear).
  const [paymentLinkCreated, setPaymentLinkCreated] = useState(false);

  const subtotal = variant.foundersPrice;
  const discountAmount = +(subtotal * (discountPercent / 100)).toFixed(2);
  const total = +Math.max(0, subtotal - discountAmount).toFixed(2);

  const failed = searchParams.get("status") === "failed";

  const applyDiscount = async () => {
    if (paymentLinkCreated) {
      toast.error("Payment link already created — discount is locked.");
      return;
    }
    if (discountCode) return; // already applied — locked until payment link is created
    const code = discountInput.trim().toUpperCase();
    setDiscountError(null);
    if (!code) return;
    setValidatingDiscount(true);
    try {
      const { data, error } = await supabase.rpc("validate_discount_code", { _code: code });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.valid) {
        setDiscountCode(null);
        setDiscountPercent(0);
        setDiscountError("Invalid discount code");
      } else if (row.already_used) {
        setDiscountCode(null);
        setDiscountPercent(0);
        setDiscountError("This code has already been used");
      } else {
        setDiscountCode(code);
        setDiscountPercent(row.discount_percent || 0);
        toast.success(`${row.discount_percent}% discount applied`);
      }
    } catch (e: any) {
      setDiscountError(e?.message || "Could not validate code");
    } finally {
      setValidatingDiscount(false);
    }
  };

  const removeDiscount = () => {
    if (paymentLinkCreated) {
      toast.error("Payment link already created — discount cannot be removed.");
      return;
    }
    setDiscountCode(null);
    setDiscountPercent(0);
    setDiscountInput("");
    setDiscountError(null);
  };

  const form = useForm<ShippingForm>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      fullName: "", email: "", phone: "",
      address1: "", address2: "", city: "", state: "", zip: "", country: "US",
      billingSame: true,
      billingName: "", billingAddress1: "", billingAddress2: "",
      billingCity: "", billingState: "", billingZip: "", billingCountry: "US",
    },
  });

  const billingSame = form.watch("billingSame");

  useEffect(() => {
    if (!orderId) {
      navigate("/");
      return;
    }
    supabase
      .from("animus_orders")
      .select("id, pet_name, design_image_url, pet_photo_url, status, customer_name, customer_email, customer_phone, shipping_address1, shipping_address2, shipping_city, shipping_state, shipping_zip, shipping_country_code")
      .eq("id", orderId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          toast.error("Order not found");
          navigate("/");
          return;
        }
        setOrder(data);
        // Pre-fill if user already submitted shipping (returning from failed payment)
        form.reset({
          fullName: data.customer_name || "",
          email: data.customer_email || "",
          phone: data.customer_phone || "",
          address1: data.shipping_address1 || "",
          address2: data.shipping_address2 || "",
          city: data.shipping_city || "",
          state: data.shipping_state || "",
          zip: data.shipping_zip || "",
          country: data.shipping_country_code || "US",
          billingSame: true,
          billingName: "", billingAddress1: "", billingAddress2: "",
          billingCity: "", billingState: "", billingZip: "", billingCountry: "US",
        });
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, navigate]);

  const onSubmit = async (values: ShippingForm) => {
    if (!orderId) return;
    setSubmitting(true);
    try {
      // 1. Save shipping/billing/customer info to Supabase
      const update: Record<string, any> = {
        customer_name: values.fullName,
        customer_email: values.email,
        customer_phone: values.phone,
        shipping_address1: values.address1,
        shipping_address2: values.address2 || null,
        shipping_city: values.city,
        shipping_state: values.state || null,
        shipping_zip: values.zip,
        shipping_country_code: values.country,
        billing_same_as_shipping: values.billingSame,
        amount: total,
        status: "shipping_captured",
      };
      if (!values.billingSame) {
        update.billing_name = values.billingName;
        update.billing_address1 = values.billingAddress1;
        update.billing_address2 = values.billingAddress2 || null;
        update.billing_city = values.billingCity;
        update.billing_state = values.billingState || null;
        update.billing_zip = values.billingZip;
        update.billing_country_code = values.billingCountry;
      } else {
        update.billing_name = values.fullName;
        update.billing_address1 = values.address1;
        update.billing_address2 = values.address2 || null;
        update.billing_city = values.city;
        update.billing_state = values.state || null;
        update.billing_zip = values.zip;
        update.billing_country_code = values.country;
      }

      const { error: updErr } = await supabase
        .from("animus_orders")
        .update(update as never)
        .eq("id", orderId);
      if (updErr) {
        console.error("[Checkout] Order update failed:", updErr);
        throw new Error(
          `Could not save your details (${updErr.code || "DB"}): ${updErr.message}${updErr.hint ? ` — ${updErr.hint}` : ""}`
        );
      }

      // 2. Create payment via iCount API (shipping pre-filled, customer only enters CC)
      const siteUrl = window.location.origin;
      const { data: payData, error: payErr } = await supabase.functions.invoke("icount-create-payment", {
        body: {
          orderId,
          fullName: values.fullName,
          email: values.email,
          phone: values.phone,
          address: values.address1 + (values.address2 ? ` ${values.address2}` : ""),
          city: values.city,
          state: values.state,
          zip: values.zip,
          country: values.country,
          amount: total,
          currency: PRODUCT_CONFIG.currency,
          discountCode: discountCode || undefined,
          discountPercent: discountPercent || undefined,
          siteUrl,
          successUrl: `${siteUrl}/thank-you?order=${orderId}&amount=${total}&name=${encodeURIComponent(values.fullName)}`,
          failureUrl: `${siteUrl}/checkout?order=${orderId}&variant=${variantIdx}&status=failed`,
        },
      });

      if (payErr || !payData?.paymentUrl) {
        console.error("[Checkout] Payment URL creation failed:", payErr, payData);
        throw new Error(payData?.error || payErr?.message || "Could not create payment link");
      }

      // Hard-lock the discount: payment link exists. No further changes allowed.
      setPaymentLinkCreated(true);

      // 3. Redirect to iCount credit card screen
      window.location.href = payData.paymentUrl;
    } catch (err: any) {
      console.error("[Checkout] Submit failed:", err);
      toast.error(err?.message || "Something went wrong. Please try again.");
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

      <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        {/* Form */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl text-white mb-1">Shipping & Billing</h1>
            <p className="text-white/60 text-sm">Enter your details — payment is the final step.</p>
          </div>

          {failed && (
            <div className="p-4 rounded-md border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
              Payment was not successful. Please review your details and try again.
            </div>
          )}

          {/* Contact */}
          <fieldset className="border border-border/30 rounded-md p-5 space-y-4 bg-card/40">
            <legend className="px-2 text-[10px] tracking-[0.3em] uppercase text-gold font-sans">Contact</legend>
            <Field label="Full Name" name="fullName" form={form} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Email" name="email" type="email" form={form} />
              <Field label="Phone" name="phone" type="tel" form={form} />
            </div>
          </fieldset>

          {/* Shipping */}
          <fieldset className="border border-border/30 rounded-md p-5 space-y-4 bg-card/40">
            <legend className="px-2 text-[10px] tracking-[0.3em] uppercase text-gold font-sans">Shipping Address</legend>
            <Field label="Address Line 1" name="address1" form={form} />
            <Field label="Address Line 2 (optional)" name="address2" form={form} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="City" name="city" form={form} />
              <Field label="State / Region" name="state" form={form} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="ZIP / Postal Code" name="zip" form={form} />
              <SelectField label="Country" name="country" form={form} options={COUNTRIES.map(c => ({ value: c.code, label: c.name }))} />
            </div>
          </fieldset>

          {/* Billing */}
          <fieldset className="border border-border/30 rounded-md p-5 space-y-4 bg-card/40">
            <legend className="px-2 text-[10px] tracking-[0.3em] uppercase text-gold font-sans">Billing</legend>
            <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
              <input
                type="checkbox"
                {...form.register("billingSame")}
                className="accent-gold w-4 h-4"
              />
              Billing address same as shipping
            </label>

            {!billingSame && (
              <div className="space-y-4 pt-2">
                <Field label="Full Name (Billing)" name="billingName" form={form} />
                <Field label="Address Line 1" name="billingAddress1" form={form} />
                <Field label="Address Line 2 (optional)" name="billingAddress2" form={form} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="City" name="billingCity" form={form} />
                  <Field label="State / Region" name="billingState" form={form} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="ZIP / Postal Code" name="billingZip" form={form} />
                  <SelectField label="Country" name="billingCountry" form={form} options={COUNTRIES.map(c => ({ value: c.code, label: c.name }))} />
                </div>
              </div>
            )}
          </fieldset>

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[52px] py-3.5 px-4 bg-gold text-background text-xs sm:text-sm tracking-[0.2em] uppercase font-semibold hover:bg-gold-light transition-colors rounded-md flex items-center justify-center gap-2 shadow-lg shadow-gold/10 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {submitting ? "Preparing payment…" : "Continue to Payment"}
          </button>

          <div className="flex items-center justify-center gap-3 text-white/40 text-[10px] tracking-widest uppercase pt-1">
            <span>🔒 Secure</span>
            <span>·</span>
            <span>Free Shipping</span>
            <span>·</span>
            <span>30-Day Guarantee</span>
          </div>
        </form>

        {/* Summary */}
        <aside className="lg:sticky lg:top-8 h-fit">
          <div className="border border-gold/20 rounded-lg p-5 bg-[#1A1A1A] shadow-xl space-y-4">
            <p className="text-[10px] tracking-[0.3em] uppercase text-gold font-sans">Your Pendant</p>

            {order?.design_image_url && (
              <div
                className="rounded-md overflow-hidden border border-gold/20 flex items-center justify-center p-3 shadow-inner"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0 1px, transparent 1px 2px), linear-gradient(135deg, hsl(0 0% 96%) 0%, hsl(30 8% 88%) 50%, hsl(0 0% 92%) 100%)",
                }}
              >
                <img
                  src={order.design_image_url}
                  alt="Your soundwave pendant with QR engraving"
                  className="w-full h-auto max-h-[260px] object-contain"
                />
              </div>
            )}

            <div className="space-y-2 text-sm">
              <Row k="Product" v="Memorial Pendant" />
              <Row k="Finish" v={variant.title} />
              {order?.pet_name && <Row k="Engraving" v={order.pet_name} truncate />}
              <div className="border-t border-white/10 pt-2.5 mt-2">
                <Row k="Subtotal" v={`$${subtotal.toFixed(2)}`} />
                <Row k="Shipping" v={<span className="text-gold text-xs tracking-widest uppercase">FREE</span>} />
                {discountCode && (
                  <Row
                    k={`Discount (${discountCode})`}
                    v={<span className="text-gold">−${discountAmount.toFixed(2)}</span>}
                  />
                )}
              </div>

              {/* Discount code entry */}
              <div className="border-t border-white/10 pt-3 mt-1">
                {!discountCode ? (
                  <div className="space-y-1.5">
                    <label className="text-[10px] tracking-[0.2em] uppercase text-white/60 font-sans">
                      Discount Code
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={discountInput}
                        onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                        placeholder="ENTER CODE"
                        className="flex-1 bg-background/60 border border-border/40 rounded-md px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-gold focus:outline-none transition-colors uppercase tracking-wider"
                      />
                      <button
                        type="button"
                        onClick={applyDiscount}
                        disabled={validatingDiscount || !discountInput.trim()}
                        className="px-3 py-2 text-[10px] tracking-[0.2em] uppercase text-gold border border-gold/40 rounded-md hover:bg-gold/10 transition-colors disabled:opacity-50"
                      >
                        {validatingDiscount ? "…" : "Apply"}
                      </button>
                    </div>
                    {discountError && (
                      <p className="text-[10px] text-red-400">{discountError}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-[10px] tracking-[0.2em] uppercase text-white/60 font-sans">
                      Discount Code
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={discountCode}
                        readOnly
                        disabled
                        aria-label="Applied discount code (locked)"
                        className="flex-1 bg-background/30 border border-gold/30 rounded-md px-3 py-2 text-sm text-gold/90 uppercase tracking-wider cursor-not-allowed opacity-80"
                      />
                      <span
                        className="px-3 py-2 text-[10px] tracking-[0.2em] uppercase text-gold border border-gold/30 rounded-md flex items-center gap-1 bg-gold/5"
                        aria-live="polite"
                      >
                        <Lock className="w-3 h-3" /> {discountPercent}% Off
                      </span>
                    </div>
                    <p className="text-[10px] text-white/40 tracking-wider">
                      {paymentLinkCreated
                        ? "Discount locked — payment link already created."
                        : "Code locked. Continue to payment to redeem."}
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t border-white/10 pt-3 mt-1 flex justify-between items-baseline">
                <span className="text-white font-serif text-lg">Total</span>
                <span className="text-gold font-serif text-2xl">${total.toFixed(2)}</span>
              </div>
              <p className="text-[10px] tracking-[0.2em] uppercase text-gold/70 text-center pt-1">Founders Price</p>
            </div>
          </div>
        </aside>
      </div>

      <footer className="py-6 text-center text-muted-foreground/50 text-xs tracking-widest">
        © {new Date().getFullYear()} ANIMUS — All Rights Reserved
      </footer>
    </main>
  );
};

const Field = ({ label, name, type = "text", form }: any) => (
  <div className="space-y-1.5">
    <label className="text-[10px] tracking-[0.2em] uppercase text-white/60 font-sans">{label}</label>
    <input
      type={type}
      {...form.register(name)}
      className="w-full bg-background/60 border border-border/40 rounded-md px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-gold focus:outline-none transition-colors"
    />
    {form.formState.errors[name] && (
      <p className="text-[10px] text-red-400">{String(form.formState.errors[name]?.message || "")}</p>
    )}
  </div>
);

const SelectField = ({ label, name, form, options }: any) => (
  <div className="space-y-1.5">
    <label className="text-[10px] tracking-[0.2em] uppercase text-white/60 font-sans">{label}</label>
    <select
      {...form.register(name)}
      className="w-full bg-background/60 border border-border/40 rounded-md px-3 py-2.5 text-sm text-white focus:border-gold focus:outline-none transition-colors"
    >
      {options.map((o: any) => (
        <option key={o.value} value={o.value} className="bg-background">{o.label}</option>
      ))}
    </select>
    {form.formState.errors[name] && (
      <p className="text-[10px] text-red-400">{String(form.formState.errors[name]?.message || "")}</p>
    )}
  </div>
);

const Row = ({ k, v, truncate }: { k: string; v: any; truncate?: boolean }) => (
  <div className="flex justify-between gap-4">
    <span className="text-white/60">{k}</span>
    <span className={`text-white text-right ${truncate ? "truncate max-w-[60%]" : ""}`}>{v}</span>
  </div>
);

export default Checkout;
