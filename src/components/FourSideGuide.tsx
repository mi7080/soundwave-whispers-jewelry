import { AudioWaveform, QrCode, Type, Sparkles } from "lucide-react";

const sides = [
  {
    icon: AudioWaveform,
    side: "Front",
    title: "Your Unique Waveform",
    description: "Laser-engraved soundwave pattern from your recording",
  },
  {
    icon: QrCode,
    side: "Back",
    title: "Scannable QR Code",
    description: "Scan to play back the original audio instantly",
  },
  {
    icon: Type,
    side: "Left",
    title: "Pet's Name / Custom Text",
    description: "Personalized engraving of your pet's name",
  },
  {
    icon: Sparkles,
    side: "Right",
    title: "Polished Minimalist",
    description: "Clean, blank finish for a sleek look",
  },
];

const FourSideGuide = () => {
  return (
    <section className="py-28 md:py-36 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-20 space-y-4">
          <p className="text-xs tracking-[0.4em] uppercase text-gold font-sans">
            Every Detail Matters
          </p>
          <h2 className="text-3xl md:text-4xl font-serif text-foreground">
            Four Sides of <span className="italic text-gold">Meaning</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto font-light">
            Each face of the ANIMUS pendant is crafted with intention.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10 max-w-4xl mx-auto">
          {sides.map((item) => (
            <div
              key={item.side}
              className="text-center space-y-4 group p-6 border border-border/30 rounded-sm hover:border-gold/30 transition-colors bg-card/50"
            >
              <div className="mx-auto w-14 h-14 flex items-center justify-center border border-border/50 rounded-full group-hover:border-gold/50 transition-colors">
                <item.icon
                  className="w-6 h-6 text-gold"
                  strokeWidth={1.5}
                />
              </div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-sans">
                {item.side}
              </p>
              <h3 className="text-sm font-serif text-foreground">
                {item.title}
              </h3>
              <p className="text-xs text-muted-foreground/70 font-light leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FourSideGuide;
