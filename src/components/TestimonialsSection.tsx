import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Sarah M.",
    text: "I lost my golden retriever last year. Having his bark preserved in this beautiful tag brings me so much comfort. The QR code plays his sound instantly — it's magical.",
    rating: 5,
  },
  {
    name: "James & Emily K.",
    text: "We created a tag with our grandmother's voice saying 'I love you.' The whole family cried. It's the most meaningful piece of jewelry we own.",
    rating: 5,
  },
  {
    name: "Dr. Priya R.",
    text: "I recorded my baby's first laugh and turned it into a tag. The waveform is uniquely hers. I wear it every day as a reminder of that perfect moment.",
    rating: 5,
  },
  {
    name: "Michael T.",
    text: "Ordered this for my wife's birthday with our puppy's first bark. She cried happy tears. The quality of the engraving is incredible.",
    rating: 5,
  },
];

const TestimonialsSection = () => {
  return (
    <section id="reviews" className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-20 space-y-4">
          <p className="text-xs tracking-[0.4em] uppercase text-gold font-sans">
            Stories
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
