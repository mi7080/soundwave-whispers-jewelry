import { Check, X } from "lucide-react";

const features = [
  { label: "Soundwave Engraving", animus: true, traditional: false },
  { label: "Plays Audio via QR Code", animus: true, traditional: false },
  { label: "Permanent Laser Etching", animus: true, traditional: false },
  { label: "Fades Over Time", animus: false, traditional: true },
  { label: "Emotional & High-Tech", animus: true, traditional: false },
  { label: "Cloud-Hosted Audio Forever", animus: true, traditional: false },
  { label: "Hypoallergenic Materials", animus: true, traditional: false },
];

const ComparisonSection = () => {
  return (
    <section className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16 space-y-4">
          <p className="text-xs tracking-[0.4em] uppercase text-gold font-sans">
            The Difference
          </p>
          <h2 className="text-3xl md:text-4xl font-serif text-foreground">
            Why Animus?
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto font-light">
            See how our laser-engraved soundwave jewelry compares to traditional engraving.
          </p>
        </div>
        <div className="max-w-2xl mx-auto">
          <div className="grid grid-cols-3 gap-0 border border-border/50 rounded-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 md:p-6 bg-card border-b border-border/50" />
            <div className="p-4 md:p-6 bg-gold/10 border-b border-border/50 text-center">
              <p className="text-xs tracking-[0.3em] uppercase text-gold font-sans font-medium">Animus</p>
            </div>
            <div className="p-4 md:p-6 bg-card border-b border-border/50 text-center">
              <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground font-sans">Traditional</p>
            </div>
            {/* Rows */}
            {features.map((f, i) => (
              <div key={i} className="contents">
                <div className="p-4 md:p-6 border-b border-border/30 flex items-center">
                  <span className="text-sm text-foreground font-light">{f.label}</span>
                </div>
                <div className="p-4 md:p-6 border-b border-border/30 bg-gold/5 flex items-center justify-center">
                  {f.animus ? (
                    <Check className="w-5 h-5 text-gold" />
                  ) : (
                    <X className="w-5 h-5 text-muted-foreground/30" />
                  )}
                </div>
                <div className="p-4 md:p-6 border-b border-border/30 flex items-center justify-center">
                  {f.traditional ? (
                    <Check className="w-5 h-5 text-muted-foreground/50" />
                  ) : (
                    <X className="w-5 h-5 text-muted-foreground/30" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;
