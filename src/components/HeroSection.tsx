import heroConcept from "@/assets/hero-concept.png";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center pt-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="space-y-8 animate-fade-up">
            <p className="text-xs tracking-[0.4em] uppercase text-gold font-sans">
              Soundwave Keepsake Collection
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif leading-tight text-foreground">
              Their Voice, Close to Your Heart{" "}
              <span className="italic gold-shimmer">Forever.</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-lg font-sans font-light">
              Transform your pet's unique bark, howl, or sound into a luxury
              acrylic heart keepsake with a scannable QR code.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <a
                href="#customize"
                className="inline-flex items-center justify-center bg-gold text-background px-10 py-4 text-xs tracking-[0.3em] uppercase hover:bg-gold-light transition-colors"
              >
                Design Your Keepsake
              </a>
              <a
                href="#experience"
                className="inline-flex items-center justify-center border border-foreground/30 text-foreground px-10 py-4 text-xs tracking-[0.3em] uppercase hover:border-gold hover:text-gold transition-colors"
              >
                Learn More
              </a>
            </div>
          </div>
          <div className="animate-fade-up-delay-1">
            <img
              src={heroConcept}
              alt="ANIMUS Acrylic Heart Keepsake with soundwave and QR code"
              width={1024}
              height={1024}
              className="w-full rounded-sm shadow-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
