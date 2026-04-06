import { Truck, Shield, Lock, Loader2, Eye, Download } from "lucide-react";
import AudioRecorder from "@/components/AudioRecorder";
import PetPhotoUpload from "@/components/PetPhotoUpload";
import FourSideGuide from "@/components/FourSideGuide";
import DogTagPreview from "@/components/DogTagPreview";
import SoulPage from "@/pages/SoulPage";
import { useState, useEffect, useCallback } from "react";
import { storefrontApiRequest, PRODUCT_BY_HANDLE_QUERY, ShopifyProduct, CART_CREATE_MUTATION, CART_LINES_ADD_MUTATION } from "@/lib/shopify";
import { generateProductionSvg, downloadSvg } from "@/lib/svgExport";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import QRCode from "qrcode";

const PRODUCT_HANDLE = "engraved-soundwave-qr-soul-page-necklace-shop-232097-6972";

const ProductSection = () => {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [dedicatedText, setDedicatedText] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [product, setProduct] = useState<ShopifyProduct["node"] | null>(null);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [orderComplete, setOrderComplete] = useState(false);
  const [svgGenerating, setSvgGenerating] = useState(false);
  const [addTextToBack, setAddTextToBack] = useState(false);
  const [backText, setBackText] = useState("");

  useEffect(() => {
    async function fetchProduct() {
      try {
        const data = await storefrontApiRequest(PRODUCT_BY_HANDLE_QUERY, { handle: PRODUCT_HANDLE });
        if (data?.data?.product) setProduct(data.data.product);
      } catch (err) {
        console.error("Failed to fetch product:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, []);

  const generateSoulPageUrl = useCallback(() => {
    const payload = {
      petName: dedicatedText.trim() || "Memorial",
      photoUrl: photoUrl || "",
      audioUrl: audioUrl || "",
    };
    const encoded = encodeURIComponent(btoa(JSON.stringify(payload)));
    return `${window.location.origin}/soul-page/${encoded}`;
  }, [dedicatedText, photoUrl, audioUrl]);

  useEffect(() => {
    if (!audioUrl) {
      setQrDataUrl(null);
      return;
    }
    const url = generateSoulPageUrl();
    QRCode.toDataURL(url, { margin: 1, width: 200, color: { dark: "#B78E48", light: "#00000000" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [audioUrl, dedicatedText, photoUrl, generateSoulPageUrl]);

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
      let variantId = selectedVariant.id;
      if (!variantId.startsWith('gid://')) variantId = `gid://shopify/ProductVariant/${variantId}`;

      const soulPageUrl = generateSoulPageUrl();
      const customAttributes = [
        { key: "_Audio_Link", value: audioUrl },
        { key: "_Media_Photo", value: photoUrl },
        { key: "_Soul_Page_URL", value: soulPageUrl },
      ];
      if (addTextToBack && backText.trim()) {
        customAttributes.push({ key: "_Custom_Text_Back", value: backText.trim() });
      }

      console.log("[ANIMUS] handleAnimusCheckout — attributes:", JSON.stringify(customAttributes, null, 2));

      const createData = await storefrontApiRequest(CART_CREATE_MUTATION, { input: {} });
      const cart = createData?.data?.cartCreate?.cart;
      if (!cart?.id || !cart?.checkoutUrl) {
        toast.error("Failed to create cart.");
        window.open('https://animusjewlery.com/cart', '_blank');
        return;
      }

      const addData = await storefrontApiRequest(CART_LINES_ADD_MUTATION, {
        cartId: cart.id,
        lines: [{ quantity: 1, merchandiseId: variantId, attributes: customAttributes }],
      });

      const addErrors = addData?.data?.cartLinesAdd?.userErrors || [];
      if (addErrors.length > 0) {
        console.error("[ANIMUS] Add line errors:", addErrors);
        toast.error("Failed to add item to cart.");
        window.open('https://animusjewlery.com/cart', '_blank');
        return;
      }

      // Save order to database
      try {
        const svgContent = await generateProductionSvg({
          waveformData,
          petName: backText.trim() || dedicatedText.trim() || "Memorial",
          soulPageUrl,
        });

        await supabase.from("animus_orders").insert({
          pet_name: backText.trim() || dedicatedText.trim() || "Memorial",
          audio_url: audioUrl,
          pet_photo_url: photoUrl,
          soul_page_url: soulPageUrl,
          right_side_engraving: null,
          svg_content: svgContent,
          waveform_data: waveformData,
          add_name_to_back: addTextToBack,
          status: "pending",
        } as any);
      } catch (saveErr) {
        console.error("[ANIMUS] Order save failed (checkout still proceeding):", saveErr);
      }

      setOrderComplete(true);

      const checkoutUrl = new URL(cart.checkoutUrl);
      checkoutUrl.searchParams.set('channel', 'online_store');
      window.open(checkoutUrl.toString(), '_blank');

    } catch (err: any) {
      console.error("[ANIMUS] Checkout error:", err);
      toast.error("Checkout failed. Redirecting to store...");
      window.open('https://animusjewlery.com/cart', '_blank');
    } finally {
      setCartLoading(false);
    }
  };

  const handleDownloadSvg = async () => {
    if (!audioUrl) {
      toast.error("Need audio to generate SVG.");
      return;
    }
    setSvgGenerating(true);
    try {
      const soulPageUrl = generateSoulPageUrl();
      const svg = await generateProductionSvg({
        waveformData,
        petName: backText.trim() || dedicatedText.trim() || "Memorial",
        soulPageUrl,
      });
      const name = (backText.trim() || dedicatedText.trim() || "Memorial").replace(/\s+/g, "_");
      downloadSvg(svg, `ANIMUS_${name}_production.svg`);
      toast.success("Production SVG downloaded!");
    } catch (err) {
      console.error("SVG generation failed:", err);
      toast.error("Failed to generate SVG.");
    } finally {
      setSvgGenerating(false);
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
            Design Yours
          </p>
          <h2 className="text-3xl md:text-4xl font-serif text-foreground">
            Design Your ANIMUS Memorial
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto font-light">
            A meaningful sound, forever preserved in a luxury engraved dog tag with scannable QR code.
          </p>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Dog Tag Preview */}
          <div className="border border-border/30 rounded-sm overflow-hidden p-8 bg-background/50">
            <DogTagPreview
              waveformData={waveformData}
              petName={dedicatedText.trim() || "Your Name"}
              qrDataUrl={qrDataUrl}
            />
            <p className="text-[10px] text-muted-foreground/50 text-center mt-4 tracking-wide">
              Live preview — updates as you customize
            </p>
          </div>

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

          {/* Price Display */}
          {selectedVariant && (
            <div className="text-center">
              <span className="text-2xl font-serif text-foreground">
                ${parseFloat(selectedVariant.price.amount).toFixed(2)}
              </span>
              <span className="text-sm text-muted-foreground ml-2">{selectedVariant.price.currencyCode}</span>
            </div>
          )}

          {/* Step 1: Audio */}
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
              A pet's bark, a loved one's voice, or any meaningful sound
            </p>
            <AudioRecorder onAudioUrl={handleAudioUrl} />
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

          {/* Step 3: Name / Dedicated Text (Optional) */}
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
              placeholder="e.g. Buddy, Mom, Forever Loved"
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
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  addTextToBack ? "bg-gold" : "bg-border/50"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background transition-transform ${
                    addTextToBack ? "translate-x-6" : "translate-x-0"
                  }`}
                />
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

          {/* Buy Now */}
          <button
            onClick={handleAnimusCheckout}
            disabled={cartLoading || !selectedVariant?.availableForSale}
            className="w-full bg-gold text-background px-10 py-5 text-xs tracking-[0.3em] uppercase hover:bg-gold-light transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {cartLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Securing your sound…
              </>
            ) : !selectedVariant?.availableForSale ? (
              "Sold Out"
            ) : (
              `Buy Now — $${parseFloat(selectedVariant.price.amount).toFixed(2)}`
            )}
          </button>

          {/* Download Production SVG (Admin) */}
          {allStepsComplete && (
            <button
              onClick={handleDownloadSvg}
              disabled={svgGenerating}
              className="w-full border border-gold/30 text-gold px-10 py-4 text-xs tracking-[0.3em] uppercase hover:bg-gold/5 hover:border-gold/50 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {svgGenerating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating SVG…</>
              ) : (
                <><Download className="w-4 h-4" /> Download Production SVG</>
              )}
            </button>
          )}

          {/* Order Confirmation */}
          {orderComplete && (
            <div className="border border-gold/30 rounded-sm p-6 bg-gold/5 space-y-4">
              <p className="text-sm text-gold font-sans text-center">
                ✓ Order submitted — checkout opened in new tab
              </p>
              <button
                onClick={handleDownloadSvg}
                disabled={svgGenerating}
                className="w-full bg-gold text-background px-8 py-4 text-xs tracking-[0.3em] uppercase hover:bg-gold-light transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {svgGenerating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                ) : (
                  <><Download className="w-4 h-4" /> Download Production SVG for ShineOn</>
                )}
              </button>
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
              <span className="text-xs text-muted-foreground tracking-wide">Fast US Shipping (2-5 Days)</span>
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
