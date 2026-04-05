import { Mic, AudioWaveform, Heart } from "lucide-react";

const steps = [
  {
    icon: Mic,
    step: "01",
    title: "Record",
    description: "Upload your pet's special moment directly from your phone.",
  },
  {
    icon: AudioWaveform,
    step: "02",
    title: "Create",
    description: "We transform the audio frequency into a unique visual art piece.",
  },
  {
    icon: Heart,
    step: "03",
    title: "Cherish",
    description: "Receive a hand-finished engraved pendant, ready to wear.",
  },
];

const ExperienceSection = () => {
  return (
    <section id="experience" className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-20 space-y-4">
          <p className="text-xs tracking-[0.4em] uppercase text-gold font-sans">
            The Experience
          </p>
          <h2 className="text-3xl md:text-4xl font-serif text-foreground">
            Three Simple Steps
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto font-light">
            From a precious sound to a wearable work of art.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-16 max-w-4xl mx-auto">
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
