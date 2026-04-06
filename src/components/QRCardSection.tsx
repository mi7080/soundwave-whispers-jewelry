import { Link } from "react-router-dom";
import messageCardImage from "@/assets/animus-message-card.png";

const QRCardSection = () => {
  return (
    <section className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <img
              src={qrCardImage}
              alt="Premium QR Code Message Card included with every ANIMUS necklace"
              loading="lazy"
              width={800}
              height={800}
              className="w-full max-w-md mx-auto rounded-sm shadow-xl"
            />
          </div>
          <div className="space-y-8">
            <p className="text-xs tracking-[0.4em] uppercase text-gold font-sans">
              Exclusive Feature
            </p>
            <h2 className="text-3xl md:text-4xl font-serif text-foreground leading-tight">
              More Than Jewelry —{" "}
              <span className="italic text-gold">A Living Memory.</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed font-light text-lg">
              Every ANIMUS necklace ships with a premium Message Card featuring a unique QR code.
              Simply scan the card and instantly play the original audio recording —
              hear their voice anytime, anywhere.
            </p>
            <div className="flex items-center gap-6 pt-4">
              <div className="w-12 h-[1px] bg-gold" />
              <p className="text-sm text-muted-foreground tracking-wide italic">
                A gift that truly speaks
              </p>
            </div>
            <Link
              to="/soul-page/demo"
              className="inline-block border border-gold/40 text-gold px-8 py-3 text-[10px] tracking-[0.3em] uppercase hover:bg-gold/10 hover:border-gold/60 transition-all duration-300 mt-2"
            >
              See the Experience →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default QRCardSection;
