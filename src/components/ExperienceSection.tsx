import { Upload, Waves, QrCode, Package } from "lucide-react";

const steps = [
  {
    icon: Upload,
    step: "01",
    title: "Upload Your Sound",
    description: "Record or upload any meaningful audio, a laugh, a heartbeat, a whispered 'I love you,' or a beloved voice.",
  },
  {
    icon: Waves,
    step: "02",
    title: "See Your Waveform",
    description: "We convert your sound into a unique vector waveform, as distinctive as a fingerprint.",
  },
  {
    icon: QrCode,
    step: "03",
    title: "QR Soul Page",
    description: "A scannable QR code links to a private digital page with your sound, photo, and personal message.",
  },
  {
    icon: Package,
    step: "04",
    title: "Receive Your Pendant",
    description: "Your ANIMUS Memory Pendant arrives laser-engraved in polished stainless steel or 18K gold.",
  },
];

const ExperienceSection = () => {
  return (
    <section id="experience" className="py-24 md:py-32 bg-card">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Editorial intro, held to the left for calm asymmetry */}
          <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-5">
            <p className="text-xs tracking-[0.2em] text-gold font-sans">
              How It Works
            </p>
            <h2 className="text-4xl md:text-5xl font-serif font-medium text-foreground leading-[1.05]">
              From sound to
              <br />
              keepsake.
            </h2>
            <p className="text-muted-foreground max-w-sm font-light leading-relaxed">
              A meaningful moment, preserved forever on polished metal. Four
              gentle steps from the voice you love to the pendant you wear.
            </p>
          </div>

          {/* Flowing step list */}
          <ol className="lg:col-span-8 relative">
            {steps.map((item, index) => (
              <li
                key={item.step}
                className="group relative flex gap-6 md:gap-8 py-8 first:pt-0 last:pb-0 border-t border-border first:border-t-0"
              >
                {/* Numbered marker */}
                <div className="flex flex-col items-center shrink-0">
                  <span className="font-serif text-2xl text-gold/70 leading-none w-8 text-center">
                    {item.step}
                  </span>
                  {index < steps.length - 1 && (
                    <span className="mt-4 w-px flex-1 bg-border" aria-hidden="true" />
                  )}
                </div>

                <div className="flex-1 space-y-3 pb-2">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center justify-center w-12 h-12 rounded-full bg-background ring-1 ring-border transition-colors duration-500 group-hover:ring-gold/60">
                      <item.icon className="w-5 h-5 text-gold" strokeWidth={1.5} />
                    </span>
                    <h3 className="text-2xl font-serif font-medium text-foreground leading-tight">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed font-light max-w-xl">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};

export default ExperienceSection;
