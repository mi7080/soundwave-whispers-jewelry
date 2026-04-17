import { Truck, Shield, Lock, Loader2, Eye, Info } from "lucide-react";
import AudioRecorder from "@/components/AudioRecorder";
import AudioPresets from "@/components/AudioPresets";
import PetPhotoUpload from "@/components/PetPhotoUpload";
import FourSideGuide from "@/components/FourSideGuide";
import DogTagPreview from "@/components/DogTagPreview";
import SoulPage from "@/pages/SoulPage";
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ShopifyProduct } from "@/lib/shopify";
import { generateProductionSvg } from "@/lib/svgExport";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import QRCode from "qrcode";
import { buildSoulPageUrl } from "@/lib/soulPage";
import { PRODUCT_CONFIG } from "@/config/product";

// Build ShopifyProduct shape from central config
const HARDCODED_PRODUCT: ShopifyProduct["node"] = {
  id: PRODUCT_CONFIG.shopifyGid,
  title: PRODUCT_CONFIG.title,
  description: PRODUCT_CONFIG.description,
  handle: PRODUCT_CONFIG.shopifyHandle,
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
  const [product, setProduct] = useState<ShopifyProduct["node"] | null>(null);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(resumeVariantIdx || 0);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [orderComplete, setOrderComplete] = useState(false);
  
  const [addTextToBack, setAddTextToBack] = useState(false);
  const [backText, setBackText] = useState("");
  const [showBackPreview, setShowBackPreview] = useState(false);
  const [preOrderId] = useState(() => resumeOrderId || crypto.randomUUID());
  const [resumed, setResumed] = useState(false);
  const [initialAudioUrl, setInitialAudioUrl] = useState<string | null>(null);
  const [initialPhotoUrl, setInitialPhotoUrl] = useState<string | null>(null);
  // Draft persistence flag (declared early so resume effect can short-circuit it)
  const [draftSaved, setDraftSaved] = useState(false);

  // Use hardcoded ShineOn PT-2151 product data directly — no Shopify API fetch
  useEffect(() => {
    setProduct(HARDCODED_PRODUCT);
    setLoading(false);
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

    supabase.from("animus_orders").upsert({
      id: preOrderId,
      pet_name: petNameVal,
      audio_url: audioUrl,
      pet_photo_url: photoUrl,
      soul_page_url: soulPageUrl,
      svg_content: "<svg></svg>", // placeholder until checkout
      status: "draft",
      add_name_to_back: addTextToBack,
    } as any, { onConflict: "id" }).then(({ error }) => {
      if (error) {
        console.error("[ANIMUS] Draft save failed:", error);
      } else {
        console.log("[ANIMUS] ✓ Draft record created:", preOrderId);
        setDraftSaved(true);
      }
    });
  }, [audioUrl, photoUrl, draftSaved, preOrderId, generateSoulPageUrl, dedicatedText, backText, addTextToBack]);

  // Generate QR only after draft is persisted
  useEffect(() => {
    if (!audioUrl || !draftSaved) { setQrDataUrl(null); return; }
    const url = generateSoulPageUrl();
    QRCode.toDataURL(url, { margin: 1, width: 200, color: { dark: "#B78E48", light: "#00000000" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [audioUrl, draftSaved, dedicatedText, photoUrl, generateSoulPageUrl]);

  const handleAudioUrl = useCallback((url: string) => {
    setAudioUrl(url);
    fetch(url)
      .then(r => r.arrayBuffer())
      .then(buf => {
        const ctx = new AudioContext();
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
          ctx.close();
        });
      })
      .catch(err => console.error("Waveform extraction failed:", err));
  }, []);

  const variants = product?.variants?.edges || [];
  const selectedVariant = variants[selectedVariantIdx]?.node;
  const allStepsComplete = !!audioUrl && !!photoUrl;

  const handleAnimusCheckout = async () => {
    if (!audioUrl) { toast.error("Please record or upload a sound first."); return; }
    if (!photoUrl) { toast.error("Please upload a photo or media file."); return; }
    if (!product || !selectedVariant) { toast.error("Product not loaded."); return; }

    setCartLoading(true);
    try {
      const soulPageUrl = generateSoulPageUrl();
      const petNameVal = backText.trim() || dedicatedText.trim() || "Memorial";

      // 1. Generate SVG content
      const svgContent = await generateProductionSvg({
        waveformData,
        petName: petNameVal,
        soulPageUrl,
      });

      // 2. Save order to DB first
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

        const persistedOrder = await verifyPersistedOrder(orderData.id, soulPageUrl);
        console.log("[ANIMUS] Verified persisted Soul Page record:", persistedOrder);
      } else {
        toast.error("Order creation failed. Please try again.");
        setCartLoading(false);
        return;
      }

      // 4. Redirect to native checkout page
      console.log("[ANIMUS] ✓ All data ready, redirecting to checkout");
      setOrderComplete(true);
      navigate(`/checkout?order=${orderData.id}&variant=${selectedVariantIdx}`);
    } catch (err: any) {
      console.error("[ANIMUS] Checkout error:", err);
      toast.error(err?.message || "Checkout failed. Please try again.");
    } finally {
      setCartLoading(false);
    }
  };


  if (loading) {
    return (
      <section id="customize" className="py-28 md:py-36 bg-card">
        <div className="container mx-auto px-6 flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gold" />
        </div>
      </section>
    );
  }

  if (!product) {
    return (
      <section id="customize" className="py-28 md:py-36 bg-card">
        <div className="container mx-auto px-6 text-center">
          <p className="text-muted-foreground">Product not found.</p>
        </div>
      </section>
    );
  }

  return (
    <section id="customize" className="py-28 md:py-36 bg-card">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16 space-y-4">
          <p className="text-xs tracking-[0.4em] uppercase text-gold font-sans">
            Create Your Keepsake
          </p>
          <h2 className="text-3xl md:text-4xl font-serif text-foreground">
            Design Your Memory Pendant
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto font-light">
            A first laugh, a heartbeat, a whispered "I love you" — any meaningful sound, engraved forever on a luxury pendant with a scannable QR Soul Page.
          </p>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">

          {/* Variant Picker */}
          {variants.length > 1 && (
            <div className="border border-border/50 rounded-sm p-6 bg-background/50 space-y-4">
              <label className="text-xs tracking-[0.3em] uppercase text-gold font-sans">
                Select Finish
              </label>
              <div className="flex gap-3">
                {variants.map((v, i) => (
                  <button
                    key={v.node.id}
                    onClick={() => setSelectedVariantIdx(i)}
                    className={`flex-1 border rounded-sm px-4 py-3 text-sm font-sans transition-all ${
                      selectedVariantIdx === i
                        ? "border-gold text-gold bg-gold/5"
                        : "border-border/50 text-muted-foreground hover:border-gold/40"
                    }`}
                  >
                    <span className="block">{v.node.title}</span>
                    <span className="block text-xs mt-1 opacity-70">
                      ${parseFloat(v.node.price.amount).toFixed(2)} {v.node.price.currencyCode}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Price */}
          {selectedVariant && (
            <div className="text-center">
              <span className="text-2xl font-serif text-foreground">
                ${parseFloat(selectedVariant.price.amount).toFixed(2)}
              </span>
              <span className="text-sm text-muted-foreground ml-2">{selectedVariant.price.currencyCode}</span>
            </div>
          )}

          {/* Step 1: Audio Upload */}
          <div className="border border-border/50 rounded-sm p-6 bg-background/50 space-y-4">
            <div className="flex items-center gap-3">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-sans border ${audioUrl ? "bg-gold/20 border-gold text-gold" : "border-border/50 text-muted-foreground"}`}>
                {audioUrl ? "✓" : "1"}
              </span>
              <label className="text-xs tracking-[0.3em] uppercase text-gold font-sans">
                Upload Audio
              </label>
              <span className="text-[9px] tracking-[0.2em] uppercase text-foreground/80 border border-gold/30 rounded-sm px-2 py-0.5 font-sans bg-gold/10">
                Required
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground/60 font-light pl-10">
              A loved one's voice, a baby's laugh, a heartbeat, or any meaningful sound
            </p>
            <AudioRecorder onAudioUrl={handleAudioUrl} />
            <AudioPresets />
          </div>

          {/* Step 2: Photo / Media */}
          <div className="border border-border/50 rounded-sm p-6 bg-background/50 space-y-3">
            <div className="flex items-center gap-3">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-sans border ${photoUrl ? "bg-gold/20 border-gold text-gold" : "border-border/50 text-muted-foreground"}`}>
                {photoUrl ? "✓" : "2"}
              </span>
              <label className="text-xs tracking-[0.3em] uppercase text-gold font-sans">
                Upload Photo / Media
              </label>
              <span className="text-[9px] tracking-[0.2em] uppercase text-foreground/80 border border-gold/30 rounded-sm px-2 py-0.5 font-sans bg-gold/10">
                Required
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground/60 font-light pl-10">
              This photo will appear on your personal Soul Page
            </p>
            <PetPhotoUpload onPhotoUrl={(url) => setPhotoUrl(url || null)} />
          </div>

          {/* Step 3: Name / Dedicated Text */}
          <div className="border border-border/50 rounded-sm p-6 bg-background/50 space-y-3">
            <div className="flex items-center gap-3">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-sans border ${dedicatedText.trim() ? "bg-gold/20 border-gold text-gold" : "border-border/50 text-muted-foreground"}`}>
                {dedicatedText.trim() ? "✓" : "3"}
              </span>
              <label className="text-xs tracking-[0.3em] uppercase text-gold font-sans">
                Name / Dedicated Text
              </label>
              <span className="text-[9px] tracking-[0.2em] uppercase text-gold/70 border border-gold/20 rounded-sm px-2 py-0.5 font-sans">
                Optional
              </span>
            </div>
            <input
              type="text"
              placeholder="e.g. Mom, Grandpa, Baby Luna, Forever Loved"
              value={dedicatedText}
              onChange={(e) => setDedicatedText(e.target.value)}
              className="w-full bg-transparent border border-border/50 rounded-sm px-4 py-3 text-foreground text-sm font-sans placeholder:text-muted-foreground/40 focus:outline-none focus:border-gold/50 transition-colors"
            />
            <p className="text-[10px] text-muted-foreground/50 font-light">
              Displayed on the Soul Page and optionally engraved on the back
            </p>
          </div>

          {/* Back Engraving Toggle */}
          <div className="border border-border/50 rounded-sm p-6 bg-background/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <label className="text-xs tracking-[0.3em] uppercase text-gold font-sans">
                  Engrave Text on Back
                </label>
                <span className="text-[9px] tracking-[0.2em] uppercase text-gold/70 border border-gold/20 rounded-sm px-2 py-0.5 font-sans">
                  Optional
                </span>
              </div>
              <button
                onClick={() => setAddTextToBack(!addTextToBack)}
                className={`relative w-12 h-6 rounded-full transition-colors ${addTextToBack ? "bg-gold" : "bg-border/50"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background transition-transform ${addTextToBack ? "translate-x-6" : "translate-x-0"}`} />
              </button>
            </div>
            {addTextToBack && (
              <div className="space-y-3 pt-2">
                <input
                  type="text"
                  placeholder="e.g. Buddy 2015-2024, Forever in my heart"
                  value={backText}
                  onChange={(e) => setBackText(e.target.value)}
                  className="w-full bg-transparent border border-border/50 rounded-sm px-4 py-3 text-foreground text-sm font-sans placeholder:text-muted-foreground/40 focus:outline-none focus:border-gold/50 transition-colors"
                />
                <p className="text-[10px] text-gold/70 font-light">
                  This text will be engraved on the back in elegant serif lettering.
                </p>
              </div>
            )}
          </div>

          {/* Guidance Note */}
          <div className="flex items-start gap-3 border border-gold/15 rounded-sm p-4 bg-gold/5">
            <Info className="w-4 h-4 text-gold/60 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground/70 font-light leading-relaxed">
              <span className="text-gold/80 font-medium">For best results:</span> Record in a quiet area for crisp waveforms. Use high-resolution photos with natural lighting for the Soul Page.
            </p>
          </div>

          {/* Buy Now */}
          <button
            onClick={handleAnimusCheckout}
            disabled={cartLoading || !selectedVariant?.availableForSale}
            className="w-full bg-gold text-background px-10 py-5 text-xs tracking-[0.3em] uppercase hover:bg-gold-light transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {cartLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Securing your sound…</>
            ) : !selectedVariant?.availableForSale ? (
              "Sold Out"
            ) : (
              `Buy Now — $${parseFloat(selectedVariant.price.amount).toFixed(2)}`
            )}
          </button>


          {/* Order Confirmation */}
          {orderComplete && (
            <div className="border border-gold/30 rounded-sm p-6 bg-gold/5">
              <p className="text-sm text-gold font-sans text-center">
                ✓ Order submitted — checkout opened in new tab
              </p>
            </div>
          )}

          {/* Preview Soul Page */}
          <button
            onClick={() => {
              if (!audioUrl) { toast.info("Record or upload a sound first to preview your Soul Page."); return; }
              setShowPreview(true);
            }}
            className="w-full border border-gold/30 text-gold px-10 py-4 text-xs tracking-[0.3em] uppercase hover:bg-gold/5 hover:border-gold/50 transition-all flex items-center justify-center gap-3"
          >
            <Eye className="w-4 h-4" />
            Preview Your Digital Soul Page
          </button>

          {!allStepsComplete && (
            <p className="text-[10px] text-muted-foreground/50 text-center">
              {!audioUrl && "① Upload sound · "}
              {!photoUrl && "② Upload photo"}
            </p>
          )}

          <FourSideGuide inline />

          {showPreview && (
            <div className="fixed inset-0 z-[100] bg-background animate-fade-in">
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

          {/* Trust Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-6 border-t border-border/30">
            <div className="flex items-center justify-center gap-3 py-3">
              <Truck className="w-4 h-4 text-gold flex-shrink-0" />
              <span className="text-xs text-muted-foreground tracking-wide">Fast US Shipping (7-14 Days)</span>
            </div>
            <div className="flex items-center justify-center gap-3 py-3">
              <Shield className="w-4 h-4 text-gold flex-shrink-0" />
              <span className="text-xs text-muted-foreground tracking-wide">Lifetime Soundwave Guarantee</span>
            </div>
            <div className="flex items-center justify-center gap-3 py-3">
              <Lock className="w-4 h-4 text-gold flex-shrink-0" />
              <span className="text-xs text-muted-foreground tracking-wide">Secure SSL Checkout</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center tracking-wide">
            Free US shipping · 30-day satisfaction guarantee
          </p>
        </div>
      </div>
    </section>
  );
};

export default ProductSection;
