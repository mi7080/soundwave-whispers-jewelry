import { Link } from "react-router-dom";

const QRCardSection = () => {
  return (
    <section className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <p className="text-xs tracking-[0.4em] uppercase text-gold font-sans">
            The Digital Soul Page
          </p>
          <h2 className="text-3xl md:text-4xl font-serif text-foreground leading-tight">
            More Than a Dog Tag —{" "}
            <span className="italic text-gold">A Living Memory.</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed font-light text-lg max-w-2xl mx-auto">
            Every ANIMUS dog tag includes a unique QR code engraved directly on the metal.
            Scan it with any smartphone and instantly play the original audio recording —
            hear their voice anytime, anywhere.
          </p>
          <div className="flex items-center justify-center gap-6 pt-4">
            <div className="w-12 h-[1px] bg-gold" />
            <p className="text-sm text-muted-foreground tracking-wide italic">
              A memorial that truly speaks
            </p>
            <div className="w-12 h-[1px] bg-gold" />
          </div>
          <Link
            to="/soul-page/demo"
            className="inline-block border border-gold/40 text-gold px-8 py-3 text-[10px] tracking-[0.3em] uppercase hover:bg-gold/10 hover:border-gold/60 transition-all duration-300 mt-2"
          >
            See the Experience →
          </Link>
        </div>
      </div>
    </section>
  );
};

export default QRCardSection;
