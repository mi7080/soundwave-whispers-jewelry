import { Star } from "lucide-react";

const featured = {
  name: "James & Emily K.",
  text: "We created a pendant with our grandmother's voice saying I love you. The whole family cried. It is the most meaningful piece of jewelry we own.",
  context: "Their grandmother's voice",
};

const testimonials = [
  {
    name: "Sarah M.",
    text: "I lost my golden retriever last year. Having his bark preserved in this pendant brings me so much comfort. The QR plays his sound instantly.",
    context: "A dog's bark",
  },
  {
    name: "Dr. Priya R.",
    text: "I recorded my baby's first laugh and turned it into a pendant. The waveform is uniquely hers. I wear it every day.",
    context: "A baby's first laugh",
  },
  {
    name: "Michael T.",
    text: "Ordered this for my wife with a recording of our wedding vows. She cried happy tears. The engraving quality is incredible.",
    context: "Wedding vows",
  },
];

const Stars = ({ tone = "gold" }: { tone?: "gold" | "soft" }) => (
  <div className="flex gap-0.5" aria-label="Five star review">
    {Array.from({ length: 5 }).map((_, s) => (
      <Star
        key={s}
        className={`w-3.5 h-3.5 fill-current ${tone === "gold" ? "text-gold" : "text-gold/80"}`}
        strokeWidth={0}
      />
    ))}
  </div>
);

const Monogram = ({ name, dark = false }: { name: string; dark?: boolean }) => (
  <span
    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-serif text-base ${
      dark
        ? "bg-primary-foreground/10 text-gold ring-1 ring-primary-foreground/15"
        : "bg-secondary text-[hsl(24_47%_47%)] ring-1 ring-border"
    }`}
  >
    {name.charAt(0)}
  </span>
);

const TestimonialsSection = () => {
  return (
    <section id="reviews" className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-2xl mb-14 md:mb-16 space-y-5">
          <p className="text-xs tracking-[0.2em] text-gold font-sans">Stories</p>
          <h2 className="text-4xl md:text-5xl font-serif font-medium text-foreground leading-tight">
            The moments they<br className="hidden md:block" /> carry with them
          </h2>
          <p className="text-base text-muted-foreground font-light leading-relaxed max-w-xl">
            A voice, a heartbeat, a laugh. Held close, and heard again whenever the
            heart needs it most.
          </p>
        </div>

        {/* Featured story, dramatic espresso card */}
        <figure className="relative overflow-hidden rounded-3xl bg-primary text-primary-foreground p-9 md:p-14 mb-6 md:mb-8 shadow-[0_40px_90px_-45px_rgba(46,36,26,0.7)]">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-6 left-8 font-serif text-[10rem] leading-none text-gold/20 select-none"
          >
            &ldquo;
          </span>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -bottom-24 h-72 w-72 rounded-full blur-3xl"
            style={{ background: "radial-gradient(circle, hsl(35 46% 55% / 0.35) 0%, transparent 70%)" }}
          />
          <div className="relative max-w-3xl space-y-7">
            <Stars />
            <blockquote className="font-serif font-medium leading-snug text-2xl md:text-[2rem] md:leading-[1.2]">
              {featured.text}
            </blockquote>
            <figcaption className="flex items-center gap-4 pt-1">
              <Monogram name={featured.name} dark />
              <span className="space-y-0.5">
                <span className="block text-sm font-sans font-medium tracking-wide">{featured.name}</span>
                <span className="block text-[13px] font-sans text-primary-foreground/60">{featured.context}</span>
              </span>
            </figcaption>
          </div>
        </figure>

        {/* Supporting stories */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="flex flex-col gap-5 rounded-2xl bg-card ring-1 ring-border p-7 md:p-8 shadow-[0_30px_70px_-40px_rgba(90,60,30,0.4)]"
            >
              <Stars tone="soft" />
              <blockquote className="text-lg text-foreground font-serif font-medium leading-snug">
                {t.text}
              </blockquote>
              <figcaption className="flex items-center gap-3.5 pt-1 mt-auto">
                <Monogram name={t.name} />
                <span className="space-y-0.5">
                  <span className="block text-sm font-sans font-medium tracking-wide text-foreground">{t.name}</span>
                  <span className="block text-[13px] font-sans text-muted-foreground">{t.context}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
