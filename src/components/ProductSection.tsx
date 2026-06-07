import { Loader2, Eye, ArrowRight, Check } from "lucide-react";
import dogtagSteel from "@/assets/dogtag-steel.jpg";
import dogtagGold from "@/assets/dogtag-gold.jpg";
import AudioRecorder from "@/components/AudioRecorder";
import AudioPresets from "@/components/AudioPresets";
import PetPhotoUpload from "@/components/PetPhotoUpload";
import SoulPage from "@/pages/SoulPage";
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { generateProductionSvg } from "@/lib/svgExport";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { buildSoulPageUrl } from "@/lib/soulPage";
import { PRODUCT_CONFIG } from "@/config/product";
import { trackViewContent } from "@/lib/pixel";

// Local product shape (no external commerce platform)
interface LocalProduct {
  id: string;
  title: string;
  description: string;
  handle: string;
  priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
  images: { edges: Array<{ node: { url: string; altText: string | null } }> };
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        price: { amount: string; currencyCode: string };
        availableForSale: boolean;
        selectedOptions: Array<{ name: string; value: string }>;
      };
    }>;
  };
  options: Array<{ name: string; values: string[] }>;
}

const HARDCODED_PRODUCT: LocalProduct = {
  id: "animus-pendant",
  title: PRODUCT_CONFIG.title,
  description: PRODUCT_CONFIG.description,
  handle: "animus-pendant",
  priceRange: { minVariantPrice: { amount: PRODUCT_CONFIG.foundersPrice.toFixed(2), currencyCode: PRODUCT_CONFIG.currency } },
  images: { edges: [] },
  variants: {
    edges: PRODUCT_CONFIG.variants.map((v) => ({
      node: {
        id: v.id,
        title: v.title,
        price: { amount: v.foundersPrice.toFixed(2), currencyCode: PRODUCT_CONFIG.currency },
        availableForSale: true,
        selectedOptions: [{ name: "Finish", value: v.title }],
      },
    })),
  },
  options: [
    { name: "Finish", values: PRODUCT_CONFIG.variants.map((v) => v.title) },
  ],
};

const ProductSection = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const resumeOrderId = searchParams.get("order");
  const resumeVariantIdx = parseInt(searchParams.get("variant") || "0", 10);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [dedicatedText, setDedicatedText] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [product, setProduct] = useState<LocalProduct | null>(null);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(
    Number.isFinite(resumeVariantIdx) && resumeVariantIdx >= 0 && resumeVariantIdx < PRODUCT_CONFIG.variants.length
      ? resumeVariantIdx
      : 0,
  );
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [checkoutStage, setCheckoutStage] = useState("");
  const [waveformData, setWaveformData] = useState<number[]>([]);

  const [addTextToBack, setAddTextToBack] = useState(false);
  const [backText, setBackText] = useState("");
  // Only surface the "required" error after the user leaves the field empty or
  // tries to check out - not the instant they toggle engraving on.
  const [backTextTouched, setBackTextTouched] = useState(false);
  const [preOrderId] = useState(() => resumeOrderId || crypto.randomUUID());
  const [resumed, setResumed] = useState(false);
  const [initialAudioUrl, setInitialAudioUrl] = useState<string | null>(null);
  const [initialPhotoUrl, setInitialPhotoUrl] = useState<string | null>(null);
  // Draft persistence flag (declared early so resume effect can short-circuit it)
  const [draftSaved, setDraftSaved] = useState(false);

  // Use hardcoded ShineOn PT-2151 product data directly
  useEffect(() => {
    setProduct(HARDCODED_PRODUCT);
    setLoading(false);
    // Meta Pixel: top-of-funnel signal when the product/customize section mounts.
    trackViewContent();
  }, []);

  // Resume from existing draft order (when returning from checkout via "Edit Design")
  useEffect(() => {
    if (!resumeOrderId || resumed) return;
    let cancelled = false;
    supabase
      .from("animus_orders")
      .select("id, pet_name, audio_url, pet_photo_url, add_name_to_back, waveform_data")
      .eq("id", resumeOrderId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error || !data) {
          setResumed(true);
          return;
        }
        if (data.audio_url) {
          setAudioUrl(data.audio_url);
          setInitialAudioUrl(data.audio_url);
        }
        if (data.pet_photo_url) {
          setPhotoUrl(data.pet_photo_url);
          setInitialPhotoUrl(data.pet_photo_url);
        }
        if (data.add_name_to_back) {
          setAddTextToBack(true);
          if (data.pet_name && data.pet_name !== "Memorial") setBackText(data.pet_name);
        } else if (data.pet_name && data.pet_name !== "Memorial") {
          setDedicatedText(data.pet_name);
        }
        if (Array.isArray(data.waveform_data)) {
          setWaveformData(data.waveform_data as number[]);
        }
        setDraftSaved(true); // skip re-creating draft
        setResumed(true);
        toast.success("Your previous design has been restored.");
        // Clean up URL params after hydration so refresh doesn't re-trigger
        const next = new URLSearchParams(searchParams);
        next.delete("order");
        next.delete("variant");
        setSearchParams(next, { replace: true });
      });
    return () => { cancelled = true; };
  }, [resumeOrderId, resumed, searchParams, setSearchParams]);

  const verifyPersistedOrder = useCallback(async (orderId: string, expectedSoulPageUrl: string) => {
    const { data: persistedOrder, error } = await supabase
      .from("animus_orders")
      .select("id, pet_name, pet_photo_url, audio_url, soul_page_url, cloudinary_folder_url, design_image_url")
      .eq("id", orderId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!persistedOrder) {
      throw new Error("Your memory could not be verified in the database.");
    }

    if (persistedOrder.soul_page_url !== expectedSoulPageUrl) {
      throw new Error("The Soul Page link did not save correctly.");
    }

    if (!persistedOrder.pet_photo_url?.trim() || !persistedOrder.audio_url?.trim()) {
      throw new Error("Your Soul Page media is still syncing. Please try again.");
    }

    return persistedOrder;
  }, []);

  const generateSoulPageUrl = useCallback(() => {
    return buildSoulPageUrl(preOrderId);
  }, [preOrderId]);

  useEffect(() => {
    if (!audioUrl || !photoUrl || draftSaved) return;

    const petNameVal = backText.trim() || dedicatedText.trim() || "Memorial";
    const soulPageUrl = generateSoulPageUrl();
    const finish = PRODUCT_CONFIG.variants[selectedVariantIdx]?.finish ?? "steel";

    supabase.from("animus_orders").upsert({
      id: preOrderId,
      pet_name: petNameVal,
      audio_url: audioUrl,
      pet_photo_url: photoUrl,
      soul_page_url: soulPageUrl,
      svg_content: "<svg></svg>", // placeholder until checkout
      status: "draft",
      add_name_to_back: addTextToBack,
      // Persist the finish from creation so fulfillment never depends on the checkout
      // URL surviving. The SKU is derived from finish × engraving at fulfillment, not
      // stored - a gold order can't fall back to steel.
      variant_finish: finish,
    } as any, { onConflict: "id" }).then(({ error }) => {
      if (error) {
        console.error("[ANIMUS] Draft save failed:", error);
        toast.error("Could not save your design draft. Please check your connection and try again.");
      } else {
        console.log("[ANIMUS] ✓ Draft record created:", preOrderId);
        setDraftSaved(true);
      }
    });
  }, [audioUrl, photoUrl, draftSaved, preOrderId, generateSoulPageUrl, dedicatedText, backText, addTextToBack, selectedVariantIdx]);

  const handleAudioUrl = useCallback((url: string) => {
    setAudioUrl(url);
    let ctx: AudioContext | null = null;
    fetch(url)
      .then(r => r.arrayBuffer())
      .then(buf => {
        ctx = new AudioContext();
        return ctx.decodeAudioData(buf).then(audioBuffer => {
          const rawData = audioBuffer.getChannelData(0);
          const samples = 64;
          const blockSize = Math.floor(rawData.length / samples);
          const filtered: number[] = [];
          for (let i = 0; i < samples; i++) {
            let sum = 0;
            for (let j = 0; j < blockSize; j++) sum += Math.abs(rawData[i * blockSize + j]);
            filtered.push(sum / blockSize);
          }
          const max = Math.max(...filtered);
          setWaveformData(filtered.map(v => v / max));
        });
      })
      .catch(err => console.error("Waveform extraction failed:", err))
      .finally(() => { ctx?.close(); });
  }, []);

  const variants = product?.variants?.edges || [];
  const selectedVariant = variants[selectedVariantIdx]?.node;
  const allStepsComplete = !!audioUrl && !!photoUrl;

  const handleAnimusCheckout = async () => {
    if (!audioUrl) { toast.error("Please record or upload a sound first."); return; }
    if (!photoUrl) { toast.error("Please upload a photo or media file."); return; }
    if (!product || !selectedVariant) { toast.error("Product not loaded."); return; }
    // Back engraving is opt-in, but once enabled the text is required - an engraved
    // SKU must never ship blank.
    if (addTextToBack && !backText.trim()) {
      setBackTextTouched(true);
      toast.error("Please enter the engraving text for the back, or turn off back engraving.");
      return;
    }

    setCartLoading(true);
    setCheckoutStage("Saving your memory…");
    try {
      const soulPageUrl = generateSoulPageUrl();
      const petNameVal = backText.trim() || dedicatedText.trim() || "Memorial";

      // 1. Generate SVG content
      setCheckoutStage("Generating your waveform design…");
      const svgContent = await generateProductionSvg({
        waveformData,
        petName: petNameVal,
        soulPageUrl,
      });

      // 2. Save order to DB first
      setCheckoutStage("Saving your memory…");
      const finish = PRODUCT_CONFIG.variants[selectedVariantIdx]?.finish ?? "steel";
      const { data: orderData, error: dbError } = await supabase.from("animus_orders").upsert({
        id: preOrderId,
        pet_name: petNameVal,
        audio_url: audioUrl,
        pet_photo_url: photoUrl,
        soul_page_url: soulPageUrl,
        right_side_engraving: null,
        svg_content: svgContent,
        waveform_data: waveformData,
        add_name_to_back: addTextToBack,
        variant_finish: finish,
        // Flat founders price - record it now so the order always has an amount,
        // even if checkout submit or the webhook amount-detection is skipped.
        amount: PRODUCT_CONFIG.variants[selectedVariantIdx]?.foundersPrice ?? PRODUCT_CONFIG.foundersPrice,
        status: "pending",
      } as any, { onConflict: "id" }).select("id, soul_page_url").maybeSingle();

      if (dbError) {
        console.error("[ANIMUS] DB save failed:", dbError);
        toast.error("Failed to save order. Please try again.");
        setCartLoading(false);
        return;
      }

      if (!orderData?.id) {
        toast.error("Failed to verify your memory record. Please try again.");
        setCartLoading(false);
        return;
      }

      // 3. Upload production assets to Supabase Storage
      setCheckoutStage("Uploading to your Soul Page…");
      let designImageUrl = "";
      if (orderData?.id) {
        const projId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

        const MAX_RETRIES = 2;
        let uploadResult: any = null;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          if (attempt > 0) {
            toast.info("Finalizing your memory... retrying upload");
            await new Promise(r => setTimeout(r, 2000));
          }

          const uploadResp = await fetch(`https://${projId}.supabase.co/functions/v1/upload-production-assets`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: orderData.id,
              petName: petNameVal,
              svgContent,
              soulPageUrl,
              backText: addTextToBack ? backText.trim() : "",
              audioUrl: audioUrl,
              photoUrl: photoUrl,
            }),
          });
          uploadResult = await uploadResp.json();
          console.log(`[ANIMUS] Asset upload attempt ${attempt + 1}:`, uploadResult);

          if (!uploadResp.ok) {
            console.error("[ANIMUS] Upload function error:", uploadResult);
            continue;
          }

          if (uploadResult?.verified && uploadResult?.frontUrl) {
            break;
          }
        }

        designImageUrl = uploadResult?.frontUrl || "";

        if (!designImageUrl || !uploadResult?.verified) {
          console.error("[ANIMUS] CRITICAL: Asset verification failed after retries!", uploadResult);
          toast.error("Design upload failed. Please try again.");
          setCartLoading(false);
          return;
        }

        console.log("[ANIMUS] ✓ All assets verified in Supabase Storage");

        setCheckoutStage("Verifying your pendant…");
        const persistedOrder = await verifyPersistedOrder(orderData.id, soulPageUrl);
        console.log("[ANIMUS] Verified persisted Soul Page record:", persistedOrder);
      } else {
        toast.error("Order creation failed. Please try again.");
        setCartLoading(false);
        return;
      }

      // 4. Redirect to native checkout page
      setCheckoutStage("Redirecting to checkout…");
      console.log("[ANIMUS] ✓ All data ready, redirecting to checkout");
      navigate(`/checkout?order=${orderData.id}&variant=${selectedVariantIdx}`);
    } catch (err: any) {
      console.error("[ANIMUS] Checkout error:", err);
      toast.error(err?.message || "Checkout failed. Please try again.");
    } finally {
      setCartLoading(false);
      setCheckoutStage("");
    }
  };


  if (loading) {
    return (
      <section id="customize" className="py-24 md:py-32 bg-background">
        <div className="container mx-auto px-6 flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gold" />
        </div>
      </section>
    );
  }

  if (!product) {
    return (
      <section id="customize" className="py-24 md:py-32 bg-background">
        <div className="container mx-auto px-6 text-center">
          <p className="text-muted-foreground">Product not found.</p>
        </div>
      </section>
    );
  }

  const priceLabel = `$${parseFloat(selectedVariant?.price.amount || "89").toFixed(2)}`;

  return (
    <section id="customize" className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-14 space-y-4">
          <p className="text-[13px] tracking-[0.2em] text-gold font-sans">
            Create your keepsake
          </p>
          <h2 className="font-serif font-medium text-foreground text-4xl md:text-5xl">
            Design your pendant
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto font-sans font-light text-[17px] leading-relaxed">
            A first laugh, a heartbeat, a whispered I love you, or any sound that matters, kept
            forever on a pendant with its own private Soul Page.
          </p>
        </div>

        <div className="max-w-2xl mx-auto space-y-5">

          {/* Finish selector */}
          {variants.length > 0 && (
            <div className="rounded-2xl bg-card ring-1 ring-border p-6 md:p-7 space-y-5 shadow-[0_24px_60px_-40px_rgba(90,60,30,0.35)]">
              <div className="flex items-center justify-between">
                <span className="text-[13px] tracking-[0.2em] text-gold font-sans">
                  Choose your finish
                </span>
                <span className="text-xl font-serif text-foreground">
                  {priceLabel}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-1">
                {variants.map((v, i) => {
                  const isGold = v.node.title.toLowerCase().includes("gold");
                  const isSelected = selectedVariantIdx === i;
                  return (
                    <button
                      key={v.node.id}
                      onClick={() => setSelectedVariantIdx(i)}
                      className={`group relative flex flex-col overflow-hidden rounded-xl bg-background text-left transition-all duration-200 ${
                        isSelected
                          ? "ring-2 ring-gold shadow-[0_18px_40px_-28px_rgba(90,60,30,0.55)]"
                          : "ring-1 ring-border hover:ring-gold/50"
                      }`}
                      aria-label={`Select ${isGold ? "Gold" : "Silver"} finish`}
                      aria-pressed={isSelected}
                    >
                      <span
                        className={`absolute top-2.5 right-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-gold text-white transition-all duration-200 ${
                          isSelected ? "scale-100 opacity-100" : "scale-75 opacity-0"
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                      <img
                        src={isGold ? dogtagGold : dogtagSteel}
                        alt={`${isGold ? "14K gold" : "polished steel"} finish pendant`}
                        loading="lazy"
                        className={`aspect-square w-full object-cover transition-transform duration-300 ${
                          isSelected ? "" : "group-hover:scale-[1.03]"
                        }`}
                      />
                      <span className="flex items-center justify-between px-4 py-3">
                        <span className={`font-serif text-[15px] transition-colors ${
                          isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                        }`}>
                          {isGold ? "14K Gold" : "Polished Steel"}
                        </span>
                        <span
                          className="h-5 w-5 rounded-full ring-1 ring-black/10"
                          style={{
                            background: isGold
                              ? "linear-gradient(135deg, #f0d68a 0%, #d4a849 50%, #b8862e 100%)"
                              : "linear-gradient(135deg, #f5f5f5 0%, #c8c8c8 50%, #8a8a8a 100%)",
                          }}
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 1: Audio */}
          <div className={`rounded-2xl bg-card ring-1 p-6 md:p-7 space-y-4 transition-colors duration-500 shadow-[0_24px_60px_-40px_rgba(90,60,30,0.35)] ${
            audioUrl ? "ring-gold/50" : "ring-border"
          }`}>
            <div className="flex items-center gap-3">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-sans transition-all duration-300 ${
                audioUrl ? "bg-gold/15 text-gold ring-1 ring-gold animate-[step-pop_0.35s_ease-out]" : "ring-1 ring-border text-muted-foreground"
              }`}>
                {audioUrl ? "✓" : "1"}
              </span>
              <span className="text-base font-sans font-medium text-foreground">Upload a sound</span>
              <span className="text-xs text-muted-foreground font-sans ml-auto">Required</span>
            </div>
            <p className="text-[13px] text-muted-foreground font-sans font-light pl-11">
              A loved one's voice, a baby's laugh, a heartbeat, or any meaningful sound.
            </p>
            <AudioRecorder onAudioUrl={handleAudioUrl} initialUrl={initialAudioUrl} />
            <AudioPresets />
          </div>

          {/* Step 2: Photo */}
          <div className={`rounded-2xl bg-card ring-1 p-6 md:p-7 space-y-3 transition-colors duration-500 shadow-[0_24px_60px_-40px_rgba(90,60,30,0.35)] ${
            photoUrl ? "ring-gold/50" : "ring-border"
          }`}>
            <div className="flex items-center gap-3">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-sans transition-all duration-300 ${
                photoUrl ? "bg-gold/15 text-gold ring-1 ring-gold animate-[step-pop_0.35s_ease-out]" : "ring-1 ring-border text-muted-foreground"
              }`}>
                {photoUrl ? "✓" : "2"}
              </span>
              <span className="text-base font-sans font-medium text-foreground">Add a photo</span>
              <span className="text-xs text-muted-foreground font-sans ml-auto">Required</span>
            </div>
            <p className="text-[13px] text-muted-foreground font-sans font-light pl-11">
              This photo lives on your private Soul Page, alongside the recording.
            </p>
            <PetPhotoUpload onPhotoUrl={(url) => setPhotoUrl(url || null)} initialUrl={initialPhotoUrl} />
          </div>

          {/* Step 3: Name */}
          <div className="rounded-2xl bg-card ring-1 ring-border p-6 md:p-7 space-y-3 shadow-[0_24px_60px_-40px_rgba(90,60,30,0.35)]">
            <div className="flex items-center gap-3">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-sans ${dedicatedText.trim() ? "bg-gold/15 text-gold ring-1 ring-gold" : "ring-1 ring-border text-muted-foreground"}`}>
                {dedicatedText.trim() ? "✓" : "3"}
              </span>
              <span className="text-base font-sans font-medium text-foreground">Name or dedication</span>
              <span className="text-xs text-muted-foreground font-sans ml-auto">Optional</span>
            </div>
            <input
              type="text"
              placeholder="e.g. Mom, Grandpa, Baby Luna, Forever loved"
              value={dedicatedText}
              onChange={(e) => setDedicatedText(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm font-sans placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/60 transition-colors"
            />
            <p className="text-[13px] text-muted-foreground font-sans font-light">
              Shown on the Soul Page, and optionally engraved on the back.
            </p>
          </div>

          {/* Back engraving */}
          <div className="rounded-2xl bg-card ring-1 ring-border p-6 md:p-7 space-y-3 shadow-[0_24px_60px_-40px_rgba(90,60,30,0.35)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-base font-sans font-medium text-foreground">Engrave text on the back</span>
                <span className="text-xs text-muted-foreground font-sans">Optional</span>
              </div>
              <button
                onClick={() => { setAddTextToBack(!addTextToBack); setBackTextTouched(false); }}
                aria-label="Toggle back engraving"
                className={`relative w-12 h-6 rounded-full transition-colors ${addTextToBack ? "bg-gold" : "bg-border"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-card transition-transform ${addTextToBack ? "translate-x-6" : "translate-x-0"}`} />
              </button>
            </div>
            {addTextToBack && (() => {
              const showError = backTextTouched && !backText.trim();
              return (
              <div className="space-y-3 pt-2">
                <input
                  type="text"
                  placeholder="e.g. Buddy 2015 to 2024, Forever in my heart"
                  value={backText}
                  onChange={(e) => setBackText(e.target.value)}
                  onBlur={() => setBackTextTouched(true)}
                  aria-invalid={showError}
                  required
                  className={`w-full bg-background border rounded-xl px-4 py-3 text-foreground text-sm font-sans placeholder:text-muted-foreground/50 focus:outline-none transition-colors ${
                    showError ? "border-destructive/60 focus:border-destructive" : "border-border focus:border-gold/60"
                  }`}
                />
                <p className={`text-[13px] font-sans font-light ${showError ? "text-destructive" : "text-muted-foreground"}`}>
                  {showError
                    ? "Engraving text is required when back engraving is on."
                    : "Engraved on the back in an elegant serif."}
                </p>
              </div>
              );
            })()}
          </div>

          {/* Buy */}
          <div className="space-y-3 pt-1">
            <button
              onClick={handleAnimusCheckout}
              disabled={cartLoading || !selectedVariant?.availableForSale}
              className={`group w-full rounded-full bg-primary text-primary-foreground px-10 py-5 text-sm font-sans font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                allStepsComplete && !cartLoading ? "hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-16px_rgba(80,55,30,0.7)]" : ""
              }`}
            >
              {cartLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
              ) : !selectedVariant?.availableForSale ? (
                "Sold out"
              ) : (
                <>Create your keepsake · {priceLabel}<ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></>
              )}
            </button>
            {cartLoading && checkoutStage && (
              <p className="text-[13px] text-gold text-center font-sans flex items-center justify-center gap-2 animate-pulse">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold" />
                {checkoutStage}
              </p>
            )}
          </div>

          {/* Preview Soul Page */}
          <button
            onClick={() => {
              if (!audioUrl) { toast.info("Record or upload a sound first to preview your Soul Page."); return; }
              setShowPreview(true);
            }}
            className="w-full rounded-full border border-gold/40 text-foreground px-10 py-4 text-sm font-sans hover:bg-gold/5 hover:border-gold/60 transition-all flex items-center justify-center gap-3"
          >
            <Eye className="w-4 h-4 text-gold" />
            Preview your Soul Page
          </button>

          {!allStepsComplete && (
            <p className="text-[13px] text-muted-foreground/70 text-center font-sans">
              {!audioUrl && "Add a sound to continue. "}
              {!photoUrl && "A photo finishes your Soul Page."}
            </p>
          )}

          {showPreview && (
            <div className="fixed inset-0 z-[100] bg-background animate-fade-in overflow-y-auto">
              <SoulPage
                previewMode
                previewData={{
                  petName: dedicatedText.trim() || "Memorial",
                  photoUrl: photoUrl || "",
                  audioUrl: audioUrl || "",
                }}
                onClose={() => setShowPreview(false)}
              />
            </div>
          )}

          <p className="text-[13px] text-muted-foreground text-center font-sans font-light pt-4">
            Free US shipping. 30 day promise. Your recording stays private.
          </p>
        </div>
      </div>
    </section>
  );
};

export default ProductSection;
