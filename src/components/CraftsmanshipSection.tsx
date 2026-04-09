import craftsmanshipImage from "@/assets/craftsmanship-new.jpg";
import { Shield, Award, MapPin } from "lucide-react";

const features = [
  { icon: Award, label: "Premium Metal" },
  { icon: Shield, label: "Laser-Engraved" },
  { icon: MapPin, label: "Made in USA" },
];

const CraftsmanshipSection = () => {
  return (
    <section id="craftsmanship" className="py-28 md:py-36 bg-card">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 order-2 lg:order-1">
            <p className="text-xs tracking-[0.4em] uppercase text-gold font-sans">
              Craftsmanship
            </p>
            <h2 className="text-3xl md:text-4xl font-serif text-foreground leading-tight">
              Precision-Crafted With{" "}
              <span className="italic text-gold">Purpose</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed font-light text-lg">
              Every pendant is meticulously engraved at our US-based facility
              using state-of-the-art laser technology.
              The result is a polished metal pendant built to last a lifetime —
              a timeless tribute to any loved one or memory.
            </p>
            <div className="flex flex-wrap gap-8 pt-4">
              {features.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 text-gold" strokeWidth={1.5} />
                  <span className="text-sm text-foreground/80 tracking-wide">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <img
              src={craftsmanshipImage}
              alt="ANIMUS pendant laser engraving process"
              loading="lazy"
              width={800}
              height={600}
              className="w-full rounded-sm shadow-xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default CraftsmanshipSection;
