import { Truck, Shield, Lock } from "lucide-react";
import AudioRecorder from "@/components/AudioRecorder";
import { useState } from "react";

const ProductSection = () => {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  return (
    <section id="customize" className="py-28 md:py-36 bg-card">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16 space-y-4">
          <p className="text-xs tracking-[0.4em] uppercase text-gold font-sans">
            Design Yours
          </p>
          <h2 className="text-3xl md:text-4xl font-serif text-foreground">
            Create Your Soundwave Necklace
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto font-light">
            Record or upload a sound, and we'll transform it into wearable art.
          </p>
        </div>
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Audio Recorder & Waveform */}
          <AudioRecorder onAudioUrl={(url) => setAudioUrl(url)} />

          {/* Pet Name Input */}
          <div className="border border-border/50 rounded-sm p-6 bg-background/50 space-y-3">
            <label className="text-xs tracking-[0.3em] uppercase text-gold font-sans">
              Pet's Name
            </label>
            <input
              type="text"
              placeholder="e.g. Buddy"
              className="w-full bg-transparent border border-border/50 rounded-sm px-4 py-3 text-foreground text-sm font-sans placeholder:text-muted-foreground/40 focus:outline-none focus:border-gold/50 transition-colors"
            />
          </div>

          {/* Add to Cart */}
          <button className="w-full border border-foreground/30 text-foreground px-10 py-5 text-xs tracking-[0.3em] uppercase hover:border-gold hover:text-gold transition-colors">
            Add to Cart
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
