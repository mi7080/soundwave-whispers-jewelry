import { AudioWaveform, QrCode, Type } from "lucide-react";
import { PRODUCT_CONFIG } from "@/config/product";
import craftsmanshipImage from "@/assets/craftsmanship-new.jpg";
import dogtagGold from "@/assets/dogtag-gold.jpg";
import dogtagSteel from "@/assets/dogtag-steel.jpg";

const warmShadow = "shadow-[0_30px_70px_-35px_rgba(90,60,30,0.4)]";

const finishes = [
  {
    image: dogtagSteel,
    name: "Polished Stainless Steel",
    note: "316L Surgical Stainless Steel, polished to a soft, lasting shine.",
  },
  {
    image: dogtagGold,
    name: "14K Gold Finish",
    note: "A warm 18K-toned gold finish over surgical steel for an heirloom glow.",
  },
];

const specs = [
  { label: "Pendant Size", detail: PRODUCT_CONFIG.pendantSize },
  { label: "Chain", detail: PRODUCT_CONFIG.chainLength },
  { label: "Clasp", detail: PRODUCT_CONFIG.clasp },
  { label: "Material", detail: PRODUCT_CONFIG.material },
  { label: "Engraving", detail: PRODUCT_CONFIG.engraving },
  { label: "Packaging", detail: PRODUCT_CONFIG.packaging },
  { label: "Shipping", detail: PRODUCT_CONFIG.shipping },
];

const sides = [
  {
    icon: AudioWaveform,
    side: "Front",
    title: "Soundwave",
    description:
      "The unique waveform of a voice, a laugh, or a heartbeat, laser-etched across the face of the pendant.",
  },
  {
    icon: QrCode,
    side: "Front",
    title: "QR Soul Page",
    description:
      "A discreet, scannable code below the waveform that opens a private page of photos, voice, and memories.",
  },
  {
    icon: Type,
    side: "Back",
    title: "Name or Text",
    description:
      "An elegant serif engraving of a name, a date, or a short dedication. Always optional, always yours.",
  },
];

const CraftAndMaterials = () => {
  return (
    <section id="craftsmanship" className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="max-w-2xl space-y-4 mb-16 md:mb-20">
          <p className="text-sm tracking-[0.2em] text-gold font-sans">
            Craft &amp; Materials
          </p>
          <h2 className="text-4xl md:text-5xl font-serif font-medium text-foreground leading-tight">
            Made to be held,{" "}
            <span className="italic text-[hsl(24_47%_47%)]">made to last</span>
          </h2>
          <p className="text-lg text-muted-foreground font-light leading-relaxed">
            Every pendant is precision laser-engraved on high-grade 316L surgical
            stainless steel, or a warm 14K gold finish, at our US-based facility. The
            result is a dog-tag style keepsake built to carry a memory for a lifetime.
          </p>
        </div>

        {/* Materials & finishes */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-20 md:mb-28">
          <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
            <img
              src={craftsmanshipImage}
              alt="The ANIMUS pendant during the laser-engraving process"
              loading="lazy"
              width={800}
              height={600}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="space-y-8">
            <div className="space-y-3">
              <p className="text-sm tracking-[0.2em] text-gold font-sans">
                Materials &amp; Finishes
              </p>
              <p className="text-base text-muted-foreground font-light leading-relaxed">
                Two finishes, one feeling. Choose the metal that suits the person you
                are remembering. Both are engraved with the same care.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              {finishes.map((finish) => (
                <figure
                  key={finish.name}
                  className={`rounded-2xl bg-card ring-1 ring-border overflow-hidden ${warmShadow}`}
                >
                  <img
                    src={finish.image}
                    alt={finish.name}
                    loading="lazy"
                    className="w-full aspect-square object-cover"
                  />
                  <figcaption className="p-5 space-y-1.5">
                    <h3 className="text-base font-serif font-medium text-foreground">
                      {finish.name}
                    </h3>
                    <p className="text-sm text-muted-foreground font-light leading-relaxed">
                      {finish.note}
                    </p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>

        {/* The pendant, side by side */}
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-12 lg:gap-20 items-start mb-20 md:mb-28">
          <div className="space-y-3 lg:pt-2 lg:sticky lg:top-28 lg:self-start">
            <p className="text-sm tracking-[0.2em] text-gold font-sans">
              Two Sides, One Story
            </p>
            <h3 className="text-3xl md:text-4xl font-serif font-medium text-foreground leading-tight">
              Every face crafted with intention
            </h3>
            <p className="text-base text-muted-foreground font-light leading-relaxed">
              Each surface of the pendant carries a piece of the memory, from the
              waveform you can see to the page you can open.
            </p>
          </div>

          <div className="divide-y divide-border">
            {sides.map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-6 py-7 first:pt-0"
              >
                <div className="shrink-0 mt-0.5 w-12 h-12 flex items-center justify-center rounded-full bg-card ring-1 ring-border">
                  <item.icon className="w-5 h-5 text-gold" strokeWidth={1.5} />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs tracking-[0.2em] text-muted-foreground font-sans">
                    {item.side}
                  </p>
                  <h4 className="text-xl font-serif font-medium text-foreground">
                    {item.title}
                  </h4>
                  <p className="text-base text-muted-foreground font-light leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key specs, clean typographic rows */}
        <div className={`rounded-2xl bg-card ring-1 ring-border ${warmShadow} px-8 py-10 md:px-12 md:py-12`}>
          <div className="mb-8 space-y-2">
            <p className="text-sm tracking-[0.2em] text-gold font-sans">
              The Details
            </p>
            <h3 className="text-2xl md:text-3xl font-serif font-medium text-foreground">
              What you receive
            </h3>
          </div>

          <dl className="divide-y divide-border">
            {specs.map((spec) => (
              <div
                key={spec.label}
                className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-1 sm:gap-8 py-4"
              >
                <dt className="text-sm tracking-[0.12em] text-foreground font-sans">
                  {spec.label}
                </dt>
                <dd className="text-base text-muted-foreground font-light leading-relaxed">
                  {spec.detail}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
};

export default CraftAndMaterials;
