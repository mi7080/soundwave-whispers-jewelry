import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Lock } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { PRODUCT_CONFIG } from "@/config/product";
import { US_STATES, isUsStateCode, ZIP_RE, normalizeUsPhone } from "@/lib/usAddress";

// We ship to the US only, so the country dropdown lists the US alone. The schema
// also rejects anything other than US as a defensive guard.
const COUNTRIES = [
  { code: "US", name: "United States" },
];

const SHIP_ONLY_US = "We currently ship to the US only";

const shippingSchema = z.object({
  fullName: z.string().trim().min(2, "Full name required").max(100),
  email: z.string().trim().email("Valid email required").max(255),
  phone: z.string().trim().min(6, "Phone required").max(30),
  address1: z.string().trim().min(3, "Address required").max(200),
  address2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(1, "City required").max(100),
  state: z.string().trim().min(1, "State required").max(100),
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
  // Shipping: US-only country, valid USPS state, valid US ZIP and phone.
  if (data.country !== "US") ctx.addIssue({ code: "custom", path: ["country"], message: SHIP_ONLY_US });
  if (!isUsStateCode(data.state)) ctx.addIssue({ code: "custom", path: ["state"], message: "Select a state" });
  if (!ZIP_RE.test(data.zip.trim())) ctx.addIssue({ code: "custom", path: ["zip"], message: "Enter a valid US ZIP (12345 or 12345-6789)" });
  if (!normalizeUsPhone(data.phone)) ctx.addIssue({ code: "custom", path: ["phone"], message: "Enter a valid US phone number" });

  if (!data.billingSame) {
    if (!data.billingName?.trim()) ctx.addIssue({ code: "custom", path: ["billingName"], message: "Required" });
    if (!data.billingAddress1?.trim()) ctx.addIssue({ code: "custom", path: ["billingAddress1"], message: "Required" });
    if (!data.billingCity?.trim()) ctx.addIssue({ code: "custom", path: ["billingCity"], message: "Required" });
    if (!isUsStateCode(data.billingState)) ctx.addIssue({ code: "custom", path: ["billingState"], message: "Select a state" });
    if (!data.billingZip?.trim() || !ZIP_RE.test(data.billingZip.trim())) ctx.addIssue({ code: "custom", path: ["billingZip"], message: "Enter a valid US ZIP (12345 or 12345-6789)" });
    if (data.billingCountry !== "US") ctx.addIssue({ code: "custom", path: ["billingCountry"], message: SHIP_ONLY_US });
  }
});

type ShippingForm = z.infer<typeof shippingSchema>;

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("order");

  const [order, setOrder] = useState<any>(null);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Variant comes from the order's saved finish, not a URL query - the URL can be
  // stale or tampered. Fall back to the first variant until the order loads.
  const variant = PRODUCT_CONFIG.variants.find((v) => v.finish === order?.variant_finish) || PRODUCT_CONFIG.variants[0];
  const variantIdx = PRODUCT_CONFIG.variants.indexOf(variant);

  const subtotal = variant.foundersPrice;
  const total = subtotal;

  const failed = searchParams.get("status") === "failed";

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
    // Contact + shipping PII is no longer anon-readable on animus_orders directly
    // (it was enumerable via the USING(true) policy). get_checkout_order is a
    // SECURITY DEFINER RPC that returns exactly this one order by id.
    // Cast: get_checkout_order is added in migration 20260606000000; regenerate
    // src/integrations/supabase/types.ts after applying it to drop the cast.
    (supabase as any)
      .rpc("get_checkout_order", { p_id: orderId })
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          toast.error("Order not found");
          navigate("/");
          return;
        }
        setOrder(data);
        setOrderStatus(data.status);
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

  useEffect(() => {
    if (!orderId) return;

    const handleStatus = (status?: string | null) => {
      if (!status) return;
      setOrderStatus(status);
      if (status === "paid" || status === "fulfilled") {
        navigate(`/thank-you?order=${orderId}`, { replace: true });
      }
    };

    const pollStatus = async () => {
      const { data } = await supabase
        .from("animus_orders")
        .select("status")
        .eq("id", orderId)
        .maybeSingle();
      handleStatus(data?.status);
    };

    const channel = supabase
      .channel(`checkout-order-status-${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "animus_orders", filter: `id=eq.${orderId}` },
        (payload) => handleStatus((payload.new as { status?: string })?.status)
      )
      .subscribe();

    const interval = window.setInterval(pollStatus, 3000);
    pollStatus();

    return () => {
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [orderId, navigate]);

  const onSubmit = async (values: ShippingForm) => {
    if (!orderId) return;
    setSubmitting(true);
    // Persist the phone in E.164 (+1XXXXXXXXXX). The schema already guaranteed a
    // valid US number, so this falls back to the raw value only defensively.
    const phone = normalizeUsPhone(values.phone) || values.phone;
    try {
      // 1. Save shipping/billing/customer info to Supabase
      const update: Record<string, any> = {
        customer_name: values.fullName,
        customer_email: values.email,
        customer_phone: phone,
        shipping_address1: values.address1,
        shipping_address2: values.address2 || null,
        shipping_city: values.city,
        shipping_state: values.state || null,
        shipping_zip: values.zip,
        shipping_country_code: values.country,
        billing_same_as_shipping: values.billingSame,
        amount: total,
        status: "shipping_captured",
        // Persist the chosen finish; the ShineOn SKU is derived from finish × back
        // engraving at fulfillment, not stored.
        variant_finish: variant.finish,
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
          `Could not save your details (${updErr.code || "DB"}): ${updErr.message}${updErr.hint ? `. ${updErr.hint}` : ""}`
        );
      }

      // 2. Create payment via iCount API (shipping pre-filled, customer only enters CC)
      const siteUrl = window.location.origin;
      const { data: payData, error: payErr } = await supabase.functions.invoke("icount-create-payment", {
        body: {
          orderId,
          fullName: values.fullName,
          email: values.email,
          phone,
          address: values.address1 + (values.address2 ? ` ${values.address2}` : ""),
          city: values.city,
          state: values.state,
          zip: values.zip,
          country: values.country,
          amount: total,
          currency: PRODUCT_CONFIG.currency,
          siteUrl,
          successUrl: `${siteUrl}/thank-you?order=${orderId}&amount=${total}&name=${encodeURIComponent(values.fullName)}`,
          failureUrl: `${siteUrl}/checkout?order=${orderId}&variant=${variantIdx}&status=failed`,
        },
      });

      if (payErr || !payData?.paymentUrl) {
        console.error("[Checkout] Payment URL creation failed:", payErr, payData);
        throw new Error(payData?.error || payErr?.message || "Could not create payment link");
      }

      // 3. Redirect to the iCount payment page.
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
      <Helmet>
        <title>Secure Checkout | ANIMUS Memorial Pendant</title>
        <meta name="description" content="Complete your ANIMUS Memorial Pendant order. Encrypted payment, free US shipping, and a custom QR Soul Page." />
        <meta name="robots" content="noindex" />
        <link rel="canonical" href="https://animuswave.com/checkout" />
        <meta property="og:title" content="Secure Checkout | ANIMUS Memorial Pendant" />
        <meta property="og:description" content="Complete your ANIMUS Memorial Pendant order securely." />
        <meta property="og:url" content="https://animuswave.com/checkout" />
      </Helmet>

      <nav className="w-full py-5 px-6 border-b border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate(`/early-access-store?order=${orderId}&variant=${variantIdx}#customize`)}
            className="flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors font-sans"
            aria-label="Back to edit design"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Edit design</span>
          </button>
          <span className="font-serif text-xl font-semibold tracking-[0.06em] text-foreground">ANIMUS</span>
          <div className="w-[96px]" aria-hidden="true" />
        </div>
      </nav>

      <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 lg:gap-12">
        {/* Form */}
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-7"
        >
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-medium text-foreground mb-1">Almost yours</h1>
            <p className="text-muted-foreground text-sm font-sans">Enter your details, then continue to secure payment.</p>
          </div>

          {failed && (
            <div className="p-4 rounded-xl ring-1 ring-destructive/30 bg-destructive/10 text-destructive text-sm font-sans">
              Payment was not successful. Please review your details and try again.
            </div>
          )}

          {(orderStatus === "payment_pending" || orderStatus === "paid") && (
            <div className="p-4 rounded-xl ring-1 ring-gold/30 bg-gold/10 text-gold text-sm font-sans">
              {orderStatus === "paid" ? "Payment confirmed. Redirecting…" : "Waiting for payment confirmation…"}
            </div>
          )}

          {/* Contact */}
          <div className="space-y-5">
            <p className="text-[13px] tracking-[0.2em] text-gold font-sans">Contact</p>
            <Field label="Full name" name="fullName" form={form} autoComplete="name" placeholder="Jordan Avery" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Email" name="email" type="email" form={form} autoComplete="email" placeholder="you@email.com" />
              <Field label="Phone" name="phone" type="tel" form={form} autoComplete="tel" placeholder="+1 555 000 0000" />
            </div>
            <p className="text-[13px] text-muted-foreground font-sans">We email your order confirmation and Soul Page link here.</p>
          </div>

          {/* Shipping + Billing */}
          <div className="space-y-5 pt-2 border-t border-border">
            <p className="text-[13px] tracking-[0.2em] text-gold font-sans pt-3">Shipping address</p>
            <Field label="Address" name="address1" form={form} autoComplete="address-line1" placeholder="123 Main Street" />
            <Field label="Apartment, suite (optional)" name="address2" form={form} autoComplete="address-line2" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="City" name="city" form={form} autoComplete="address-level2" />
              <SelectField label="State" name="state" form={form} autoComplete="address-level1" options={[{ value: "", label: "Select a state" }, ...US_STATES.map(s => ({ value: s.code, label: s.name }))]} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="ZIP / Postal code" name="zip" form={form} autoComplete="postal-code" />
              <SelectField label="Country" name="country" form={form} autoComplete="country" options={COUNTRIES.map(c => ({ value: c.code, label: c.name }))} />
            </div>

            <label className="flex items-center gap-2.5 text-sm text-foreground/80 cursor-pointer font-sans pt-1">
              <input type="checkbox" {...form.register("billingSame")} className="accent-[hsl(var(--gold))] w-4 h-4" />
              Billing address is the same as shipping
            </label>

            {!billingSame && (
              <div className="space-y-4 pt-1 border-t border-border">
                <p className="text-[13px] tracking-[0.2em] text-gold font-sans pt-3">Billing address</p>
                <Field label="Full name" name="billingName" form={form} autoComplete="billing name" />
                <Field label="Address" name="billingAddress1" form={form} autoComplete="billing address-line1" />
                <Field label="Apartment, suite (optional)" name="billingAddress2" form={form} autoComplete="billing address-line2" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="City" name="billingCity" form={form} autoComplete="billing address-level2" />
                  <SelectField label="State" name="billingState" form={form} autoComplete="billing address-level1" options={[{ value: "", label: "Select a state" }, ...US_STATES.map(s => ({ value: s.code, label: s.name }))]} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="ZIP / Postal code" name="billingZip" form={form} autoComplete="billing postal-code" />
                  <SelectField label="Country" name="billingCountry" form={form} autoComplete="billing country" options={COUNTRIES.map(c => ({ value: c.code, label: c.name }))} />
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-8 py-4 text-sm font-sans font-medium transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-16px_rgba(80,55,30,0.7)] disabled:opacity-60 disabled:translate-y-0"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {submitting ? "Preparing payment…" : "Continue to payment"}
            </button>
          </div>

          <p className="text-center text-muted-foreground text-[12px] leading-relaxed font-sans">
            The next screen is our secure payment page. By continuing, you agree to our{" "}
            <Link to="/terms" className="text-gold hover:underline underline-offset-2">Terms of Service</Link>,{" "}
            <Link to="/privacy" className="text-gold hover:underline underline-offset-2">Privacy Policy</Link>, and{" "}
            <Link to="/refund" className="text-gold hover:underline underline-offset-2">Refund Policy</Link>.
          </p>
        </form>

        {/* Summary */}
        <aside className="lg:sticky lg:top-8 h-fit">
          <div className="rounded-2xl ring-1 ring-border bg-card p-5 shadow-[0_30px_70px_-40px_rgba(90,60,30,0.4)] space-y-4">
            <p className="text-[13px] tracking-[0.2em] text-gold font-sans">Your pendant</p>

            {order?.design_image_url && (
              <div
                className="rounded-xl overflow-hidden ring-1 ring-border flex items-center justify-center p-3"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, hsl(0 0% 97%) 0%, hsl(30 8% 90%) 50%, hsl(0 0% 94%) 100%)",
                }}
              >
                <img
                  src={order.design_image_url}
                  alt="Your soundwave pendant with QR engraving"
                  className="w-full h-auto max-h-[240px] object-contain"
                />
              </div>
            )}

            <div className="space-y-2 text-sm font-sans">
              <Row k="Product" v="Memorial Pendant" />
              <Row k="Finish" v={variant.title} />
              {order?.pet_name && <Row k="Engraving" v={order.pet_name} truncate />}
              <div className="border-t border-border pt-2.5 mt-2">
                <Row k="Subtotal" v={`$${subtotal.toFixed(2)}`} />
                <Row k="Shipping" v={<span className="text-gold">Free</span>} />
              </div>

              <div className="border-t border-border pt-3 mt-1 flex justify-between items-baseline">
                <span className="text-foreground font-serif text-lg">Total</span>
                <span className="text-foreground font-serif text-2xl">${total.toFixed(2)}</span>
              </div>
              <p className="text-[12px] text-muted-foreground text-center pt-1 font-sans">Free US shipping. 30 day promise.</p>
            </div>
          </div>
        </aside>
      </div>

      <footer className="py-6 text-center text-muted-foreground/60 text-xs font-sans">
        © {new Date().getFullYear()} ANIMUS. All rights reserved.
      </footer>
    </main>
  );
};

const Field = ({ label, name, type = "text", form, autoComplete, placeholder }: any) => (
  <div className="space-y-1.5">
    <label className="text-[13px] text-muted-foreground font-sans">{label}</label>
    <input
      type={type}
      autoComplete={autoComplete}
      placeholder={placeholder}
      {...form.register(name)}
      className="w-full bg-card ring-1 ring-border rounded-xl px-4 py-3 text-[15px] text-foreground placeholder:text-muted-foreground/40 focus:ring-gold focus:outline-none transition-shadow font-sans"
    />
    {form.formState.errors[name] && (
      <p className="text-[12px] text-destructive">{String(form.formState.errors[name]?.message || "")}</p>
    )}
  </div>
);

const SelectField = ({ label, name, form, options, autoComplete }: any) => (
  <div className="space-y-1.5">
    <label className="text-[13px] text-muted-foreground font-sans">{label}</label>
    <select
      autoComplete={autoComplete}
      {...form.register(name)}
      className="w-full bg-card ring-1 ring-border rounded-xl px-4 py-3 text-[15px] text-foreground focus:ring-gold focus:outline-none transition-shadow font-sans"
    >
      {options.map((o: any) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
    {form.formState.errors[name] && (
      <p className="text-[12px] text-destructive">{String(form.formState.errors[name]?.message || "")}</p>
    )}
  </div>
);

const Row = ({ k, v, truncate }: { k: string; v: any; truncate?: boolean }) => (
  <div className="flex justify-between gap-4">
    <span className="text-muted-foreground">{k}</span>
    <span className={`text-foreground text-right ${truncate ? "truncate max-w-[60%]" : ""}`}>{v}</span>
  </div>
);

export default Checkout;
