import { Ruler, Link2, Lock, Gem, Waves, Gift } from "lucide-react";

const specs = [
  { icon: Ruler, title: "Pendant Size", detail: '1.1" × 2" (28.5mm × 51mm)' },
  { icon: Link2, title: "Chain", detail: "24\" Military-Style Ball Chain (61cm)" },
  { icon: Lock, title: "Clasp", detail: "Lobster Clasp Attachment" },
  { icon: Gem, title: "Material", detail: "Polished Stainless Steel / 18K Yellow Gold" },
  { icon: Waves, title: "Engraving", detail: "Laser-Etched Soundwave & QR Code" },
  { icon: Gift, title: "Packaging", detail: "Complimentary Luxury Gift Box" },
];

const ProductSpecs = () => {
  return (
    <section className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16 space-y-4">
          <p className="text-xs tracking-[0.4em] uppercase text-gold font-sans">
            Specifications
          </p>
          <h2 className="text-3xl md:text-4xl font-serif text-foreground">
            Pendant Details
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {specs.map((spec) => (
            <div
              key={spec.title}
              className="flex items-start gap-4 p-6 rounded-sm bg-card border border-border"
            >
              <spec.icon className="w-6 h-6 text-gold shrink-0 mt-0.5" strokeWidth={1.5} />
              <div>
                <h3 className="text-sm font-medium text-foreground tracking-wide">
                  {spec.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 font-light">
                  {spec.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductSpecs;
