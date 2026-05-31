import pendantHero from "@/assets/pendant-hero.jpg";
import dogtagSteel from "@/assets/dogtag-steel.jpg";
import dogtagGold from "@/assets/dogtag-gold.jpg";

const warmShadow = "shadow-[0_30px_70px_-35px_rgba(90,60,30,0.4)]";

const finishes = [
  { src: dogtagSteel, name: "Polished Steel", note: "316L surgical stainless" },
  { src: dogtagGold, name: "14K Gold Finish", note: "Warm heirloom tone" },
];

const ProductGallery = () => {
  return (
    <section className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Copy + finishes */}
          <div className="lg:col-span-5 space-y-9">
            <div className="space-y-5 max-w-md">
              <p className="text-xs tracking-[0.2em] text-gold font-sans">
                The Pendant
              </p>
              <h2 className="text-4xl md:text-5xl font-serif font-medium text-foreground leading-tight">
                Held in the hand,<br className="hidden md:block" /> kept in the heart
              </h2>
              <p className="text-base text-muted-foreground font-light leading-relaxed">
                The soundwave belongs to no one else. The QR code beneath it opens
                the Soul Page, so a scan brings the voice back. Turn it over for the
                name or words you choose.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-5">
              {finishes.map((f) => (
                <figure
                  key={f.name}
                  className={`rounded-2xl bg-card ring-1 ring-border overflow-hidden ${warmShadow}`}
                >
                  <img
                    src={f.src}
                    alt={`ANIMUS dog-tag pendant, ${f.name}`}
                    loading="lazy"
                    className="w-full aspect-[4/5] object-cover"
                  />
                  <figcaption className="px-5 py-4">
                    <p className="font-serif text-base text-foreground">{f.name}</p>
                    <p className="text-sm text-muted-foreground font-light">{f.note}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>

          {/* Large showcase */}
          <div className="lg:col-span-7">
            <div className={`overflow-hidden rounded-3xl bg-card ring-1 ring-border ${warmShadow}`}>
              <img
                src={pendantHero}
                alt="ANIMUS Memorial Pendant, the soundwave and QR Soul Page engraved on a polished dog tag"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductGallery;
