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
          {/* Zepto Product Personalizer Widget Placeholder */}
          <div className="border-2 border-dashed border-border rounded-sm p-16 text-center space-y-4 bg-background/50">
            <p className="text-sm text-muted-foreground tracking-wide uppercase">
              Zepto Product Personalizer Widget
            </p>
            <p className="text-xs text-muted-foreground/70">
              Place your Zepto embed code here
            </p>
          </div>
          <div className="mt-8 text-center">
            <button className="bg-gold text-background px-12 py-4 text-xs tracking-[0.3em] uppercase hover:bg-gold-light transition-colors w-full sm:w-auto">
              Add to Cart
            </button>
            <p className="text-xs text-muted-foreground mt-4 tracking-wide">
              Free shipping worldwide · 30-day satisfaction guarantee
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductSection;
