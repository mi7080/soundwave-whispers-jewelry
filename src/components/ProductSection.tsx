import { Truck, Shield, Lock, Loader2 } from "lucide-react";
import AudioRecorder from "@/components/AudioRecorder";
import { useState, useEffect } from "react";
import { storefrontApiRequest, PRODUCT_BY_HANDLE_QUERY, ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";

const PRODUCT_HANDLE = "animus-the-4-sided-eternal-echo-pendant-shop-232097-9151";

const ProductSection = () => {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [petName, setPetName] = useState("");
  const [rightSideText, setRightSideText] = useState("");
  const [product, setProduct] = useState<ShopifyProduct["node"] | null>(null);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const { addItem, isLoading: cartLoading } = useCartStore();

  useEffect(() => {
    async function fetchProduct() {
      try {
        const data = await storefrontApiRequest(PRODUCT_BY_HANDLE_QUERY, { handle: PRODUCT_HANDLE });
        if (data?.data?.product) {
          setProduct(data.data.product);
        }
      } catch (err) {
        console.error("Failed to fetch product:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, []);

  const variants = product?.variants?.edges || [];
  const selectedVariant = variants[selectedVariantIdx]?.node;
  const variantImage = selectedVariant?.image?.url || product?.images?.edges?.[0]?.node?.url;

  const handleAddToCart = async () => {
    if (!product || !selectedVariant) return;
    const shopifyProduct: ShopifyProduct = { node: product };
    const customAttributes: Array<{ key: string; value: string }> = [];
    if (petName.trim()) customAttributes.push({ key: "Pet Name", value: petName.trim() });
    if (rightSideText.trim()) customAttributes.push({ key: "Right Side Engraving", value: rightSideText.trim() });
    if (audioUrl) customAttributes.push({ key: "Audio URL", value: audioUrl });
    await addItem({
      product: shopifyProduct,
      variantId: selectedVariant.id,
      variantTitle: selectedVariant.title,
      price: selectedVariant.price,
      quantity: 1,
      selectedOptions: selectedVariant.selectedOptions || [],
      ...(customAttributes.length > 0 && { customAttributes }),
    });
    toast.success("Added to cart", {
      description: `${product.title} — ${selectedVariant.title}`,
    });
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
            {product.title}
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto font-light">
            {product.description?.slice(0, 160) || "Record or upload a sound, and we'll transform it into wearable art."}
          </p>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Product Image */}
          {variantImage && (
            <div className="border border-border/30 rounded-sm overflow-hidden">
              <img
                src={variantImage}
                alt={selectedVariant?.title || product.title}
                className="w-full max-h-[500px] object-contain bg-background/50"
              />
            </div>
          )}

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

          {/* Audio Recorder & Waveform */}
          <AudioRecorder onAudioUrl={(url) => setAudioUrl(url)} />

          {/* Pet Name Input */}
          <div className="border border-border/50 rounded-sm p-6 bg-background/50 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs tracking-[0.3em] uppercase text-gold font-sans">
                Pet's Name
              </label>
              <span className="text-[9px] tracking-[0.2em] uppercase text-gold/70 border border-gold/20 rounded-sm px-2 py-0.5 font-sans">
                Optional
              </span>
            </div>
            <input
              type="text"
              placeholder="e.g. Buddy"
              value={petName}
              onChange={(e) => setPetName(e.target.value)}
              className="w-full bg-transparent border border-border/50 rounded-sm px-4 py-3 text-foreground text-sm font-sans placeholder:text-muted-foreground/40 focus:outline-none focus:border-gold/50 transition-colors"
            />
          </div>

          {/* Right Side Engraving (Optional) */}
          <div className="border border-border/50 rounded-sm p-6 bg-background/50 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs tracking-[0.3em] uppercase text-gold font-sans">
                Right Side — Date / Message
              </label>
              <span className="text-[9px] tracking-[0.2em] uppercase text-gold/70 border border-gold/20 rounded-sm px-2 py-0.5 font-sans">
                Optional
              </span>
            </div>
            <input
              type="text"
              placeholder="e.g. 04.12.2019 or Forever Loved"
              className="w-full bg-transparent border border-border/50 rounded-sm px-4 py-3 text-foreground text-sm font-sans placeholder:text-muted-foreground/40 focus:outline-none focus:border-gold/50 transition-colors"
            />
            <p className="text-[10px] text-muted-foreground/50 font-light">
              Add a special date, initials, or short message to the right side of your pendant.
            </p>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={cartLoading || !selectedVariant?.availableForSale}
            className="w-full border border-foreground/30 text-foreground px-10 py-5 text-xs tracking-[0.3em] uppercase hover:border-gold hover:text-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {cartLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : !selectedVariant?.availableForSale ? (
              "Sold Out"
            ) : (
              `Add to Cart — $${parseFloat(selectedVariant.price.amount).toFixed(2)}`
            )}
          </button>

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
