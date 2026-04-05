import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Sarah M.",
    text: "I lost my golden retriever last year. Wearing his bark close to my heart every day has brought me so much comfort. This is the most meaningful piece of jewelry I own.",
    rating: 5,
  },
  {
    name: "James & Emily K.",
    text: "We got matching necklaces with our cat's purr. The QR card was the perfect extra touch — our kids love scanning it!",
    rating: 5,
  },
  {
    name: "Dr. Priya R.",
    text: "The quality is outstanding. The 14K gold finish is beautiful, and the soundwave engraving is incredibly detailed. Truly luxury.",
    rating: 5,
  },
  {
    name: "Michael T.",
    text: "Ordered this for my wife's birthday with our puppy's first bark. She cried happy tears. Best gift I've ever given.",
    rating: 5,
  },
];

const TestimonialsSection = () => {
  return (
    <section id="reviews" className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-20 space-y-4">
          <p className="text-xs tracking-[0.4em] uppercase text-gold font-sans">
            Love Stories
          </p>
          <h2 className="text-3xl md:text-4xl font-serif text-foreground">
            What Our Customers Say
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="bg-card p-8 rounded-sm space-y-4 border border-border/50"
            >
              <div className="flex gap-1">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-gold text-gold" />
                ))}
              </div>
              <p className="text-foreground/70 leading-relaxed font-light italic">
                "{t.text}"
              </p>
              <p className="text-sm text-muted-foreground tracking-wide pt-2">
                — {t.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
