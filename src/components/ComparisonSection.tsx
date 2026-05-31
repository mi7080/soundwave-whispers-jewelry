import { AudioWaveform, QrCode, Infinity as InfinityIcon } from "lucide-react";

const reasons = [
  {
    icon: AudioWaveform,
    title: "Their sound, made visible",
    text: "We turn a real recording into a soundwave and etch it onto the pendant. No two are alike, because no two voices are.",
  },
  {
    icon: QrCode,
    title: "A Soul Page you can hear",
    text: "Scan the pendant and the audio plays back through a private page. The laugh, the heartbeat, the words, always a touch away.",
  },
  {
    icon: InfinityIcon,
    title: "Etched to last a lifetime",
    text: "Laser engraving into premium metal does not fade or wear. What you carry today will look the same in fifty years.",
  },
];

const ComparisonSection = () => {
  return (
    <section className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-2xl mb-16 md:mb-20 space-y-5">
          <p className="text-xs tracking-[0.2em] text-gold font-sans">
            The Difference
          </p>
          <h2 className="text-4xl md:text-5xl font-serif font-medium text-foreground leading-tight">
            Why ANIMUS
          </h2>
          <p className="text-base text-muted-foreground font-light leading-relaxed">
            A memorial that does more than remember. It keeps the sound of
            someone loved within reach, kept in metal made to outlast us.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 md:gap-12 max-w-5xl">
          {reasons.map((r) => {
            const Icon = r.icon;
            return (
              <div key={r.title} className="space-y-5">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-[hsl(24_47%_47%)]">
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </span>
                <h3 className="text-2xl font-serif font-medium text-foreground leading-tight">
                  {r.title}
                </h3>
                <p className="text-base text-muted-foreground font-light leading-relaxed">
                  {r.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;
