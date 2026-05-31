import { Play, ArrowRight } from "lucide-react";
import heroImage from "@/assets/pendant-hero.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center pt-28 pb-20 overflow-hidden bg-background">
      {/* soft warm glow behind the product */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-1/4 h-[520px] w-[520px] rounded-full blur-3xl opacity-60"
        style={{ background: "radial-gradient(circle, hsl(35 50% 80%) 0%, transparent 70%)" }}
      />

      <div className="container mx-auto px-6 relative">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-14 lg:gap-20 items-center">
          {/* Copy */}
          <div className="space-y-7 animate-fade-up">
            <p className="text-[13px] tracking-[0.22em] text-gold font-sans">
              Wearable sound keepsakes
            </p>
            <h1 className="font-serif font-medium leading-[1.05] text-foreground text-[2.6rem] md:text-6xl lg:text-[4.1rem]">
              The sound of someone<br className="hidden sm:block" /> you love,{" "}
              <span className="italic text-[hsl(24_47%_47%)]">held close.</span>
            </h1>
            <p className="text-[17px] md:text-lg text-muted-foreground leading-relaxed max-w-xl font-sans font-light">
              Turn a voice message, a heartbeat, or a first laugh into a pendant you’ll never
              take off, with a private page that plays it back whenever you miss them.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <a
                href="#customize"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-9 py-4 text-sm font-sans font-medium transition-all hover:shadow-[0_18px_40px_-16px_rgba(80,55,30,0.7)] hover:-translate-y-0.5"
              >
                Create your keepsake
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href="#experience"
                className="inline-flex items-center justify-center gap-2 px-2 py-4 text-sm font-sans text-foreground/80 hover:text-foreground transition-colors"
              >
                <span className="border-b border-gold/50 pb-0.5">See how it works</span>
              </a>
            </div>

            <p className="text-[13px] text-muted-foreground/80 font-sans pt-3">
              Free US shipping · 30-day promise · lifetime soundwave guarantee
            </p>
          </div>

          {/* Product */}
          <div className="relative animate-fade-up-delay-1">
            <div className="relative rounded-2xl overflow-hidden bg-card shadow-[0_40px_80px_-30px_rgba(90,60,30,0.45)] ring-1 ring-border">
              <img
                src={heroImage}
                alt="ANIMUS soundwave pendant engraved with a personal waveform"
                width={1024}
                height={1024}
                fetchPriority="high"
                className="w-full h-full object-cover"
              />
            </div>

            {/* now-playing keepsake chip */}
            <div className="absolute -bottom-5 -left-3 sm:left-6 flex items-center gap-3 rounded-full bg-card/95 backdrop-blur pl-3 pr-5 py-2.5 shadow-[0_18px_40px_-18px_rgba(90,60,30,0.55)] ring-1 ring-border">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Play className="w-3.5 h-3.5 translate-x-px" fill="currentColor" />
              </span>
              <span className="flex items-end gap-[3px] h-5">
                {[6, 12, 18, 9, 16, 7, 14, 10].map((h, i) => (
                  <span
                    key={i}
                    className="w-[3px] rounded-full bg-gold"
                    style={{ height: `${h}px` }}
                  />
                ))}
              </span>
              <span className="font-sans text-[13px] text-foreground/80 leading-none">
                Dad’s voice
                <span className="block text-[11px] text-muted-foreground mt-0.5">0:07</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
