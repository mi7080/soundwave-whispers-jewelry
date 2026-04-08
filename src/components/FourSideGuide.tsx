import { AudioWaveform, QrCode, Type } from "lucide-react";

const sides = [
  {
    icon: AudioWaveform,
    side: "Front",
    title: "Soundwave + QR Code",
    description: "Laser-engraved waveform with scannable QR code below",
  },
  {
    icon: Type,
    side: "Back",
    title: "Name / Text (Optional)",
    description: "Elegant serif engraving of a name, date, or dedication",
  },
];

interface FourSideGuideProps {
  inline?: boolean;
}

const FourSideGuide = ({ inline }: FourSideGuideProps) => {
  if (inline) {
    return (
      <div className="border border-border/30 rounded-sm p-5 bg-background/30 space-y-4">
        <p className="text-[10px] tracking-[0.3em] uppercase text-gold/70 font-sans text-center">
          Your Pendant Layout
        </p>
        <div className="grid grid-cols-2 gap-3">
          {sides.map((item) => (
            <div key={item.side} className="text-center space-y-2">
              <div className="mx-auto w-10 h-10 flex items-center justify-center border border-border/40 rounded-full">
                <item.icon className="w-4 h-4 text-gold" strokeWidth={1.5} />
              </div>
              <p className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground/60 font-sans">
                {item.side}
              </p>
              <p className="text-[10px] text-muted-foreground/80 font-light leading-tight">
                {item.title}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="py-28 md:py-36 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-20 space-y-4">
          <p className="text-xs tracking-[0.4em] uppercase text-gold font-sans">
            Every Detail Matters
          </p>
          <h2 className="text-3xl md:text-4xl font-serif text-foreground">
            Your Pendant, <span className="italic text-gold">Two Sides</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto font-light">
            Each face of the ANIMUS Memory Pendant is crafted with intention.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-6 md:gap-10 max-w-2xl mx-auto">
          {sides.map((item) => (
            <div
              key={item.side}
              className="text-center space-y-4 group p-6 border border-border/30 rounded-sm hover:border-gold/30 transition-colors bg-card/50"
            >
              <div className="mx-auto w-14 h-14 flex items-center justify-center border border-border/50 rounded-full group-hover:border-gold/50 transition-colors">
                <item.icon className="w-6 h-6 text-gold" strokeWidth={1.5} />
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
