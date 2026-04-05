import { Truck, Shield, Lock, Upload } from "lucide-react";

const ProductSection = () => {
  return (
    <section id="customize" className="py-24 md:py-32 bg-card">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16 space-y-4">
          <p className="text-xs tracking-[0.4em] uppercase text-gold font-sans">
            Design Yours
          </p>
          <h2 className="text-3xl md:text-4xl font-serif text-foreground">
            Create Your Soundwave Necklace
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto font-light">
            Choose your material, upload a recording, and we'll do the rest.
          </p>
        </div>
        <div className="max-w-2xl mx-auto">
          {/* Dynamic Preview Placeholder */}
          <div className="border border-border/50 rounded-sm p-8 md:p-12 bg-background/50 mb-8">
            <div className="text-center space-y-4">
              <div className="w-full h-48 md:h-64 bg-muted/30 rounded-sm flex items-center justify-center border border-dashed border-border/50">
                <div className="space-y-3 text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gold/10 flex items-center justify-center">
                    <span className="text-2xl">🎵</span>
                  </div>
                  <p className="text-sm text-muted-foreground font-light">
                    Your pet's name & soundwave will appear here
                  </p>
                  <p className="text-xs text-muted-foreground/50">
                    3D Live Preview
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Zepto Widget Placeholder */}
          <div className="border border-dashed border-border rounded-sm p-12 text-center space-y-4 bg-background/50 mb-8">
            <p className="text-sm text-muted-foreground tracking-wide uppercase">
              Zepto Product Personalizer Widget
            </p>
            <p className="text-xs text-muted-foreground/70">
              Place your Zepto embed code here
            </p>
          </div>

          {/* Upload Button */}
          <button className="w-full group relative overflow-hidden bg-gold text-background px-10 py-5 text-xs tracking-[0.3em] uppercase hover:bg-gold-light transition-all flex items-center justify-center gap-3 mb-4">
            <Upload className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
            Upload Your Soul Sound
          </button>

          {/* Add to Cart */}
          <button className="w-full border border-foreground/30 text-foreground px-10 py-4 text-xs tracking-[0.3em] uppercase hover:border-gold hover:text-gold transition-colors mb-6">
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
