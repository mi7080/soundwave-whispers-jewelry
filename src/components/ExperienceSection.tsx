import { Upload, Waves, QrCode, Package } from "lucide-react";

const steps = [
  {
    icon: Upload,
    step: "01",
    title: "Upload Your Sound",
    description: "Record or upload any meaningful audio — a laugh, a heartbeat, a whispered 'I love you,' or a beloved voice.",
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
    <section id="experience" className="py-28 md:py-36 bg-card">
      <div className="container mx-auto px-6">
        <div className="text-center mb-20 space-y-4">
          <p className="text-xs tracking-[0.4em] uppercase text-gold font-sans">
            How It Works
          </p>
          <h2 className="text-3xl md:text-4xl font-serif text-foreground">
            From Sound to Keepsake in 4 Steps
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto font-light">
            A meaningful moment, preserved forever on polished metal.
          </p>
        </div>
        <div className="grid md:grid-cols-4 gap-12 max-w-5xl mx-auto">
          {steps.map((item) => (
            <div key={item.step} className="text-center space-y-6 group">
              <div className="relative mx-auto w-20 h-20 flex items-center justify-center border border-border rounded-full group-hover:border-gold transition-colors duration-500">
                <item.icon className="w-8 h-8 text-gold" strokeWidth={1.5} />
                <span className="absolute -top-2 -right-2 text-[10px] tracking-widest text-muted-foreground font-sans">
                  {item.step}
                </span>
              </div>
              <h3 className="text-xl font-serif text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-light">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ExperienceSection;
