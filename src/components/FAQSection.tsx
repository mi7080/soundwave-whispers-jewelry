import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "What audio quality do I need for the recording?",
    a: "Any clear recording from your smartphone works perfectly. We recommend a 5-15 second clip in a quiet environment. Our technology can extract a beautiful waveform from most audio files — .mp3, .wav, .m4a, and more.",
  },
  {
    q: "What materials are the necklaces made of?",
    a: "We offer two premium options: 14K Gold Finish over stainless steel for a luxurious warm tone, and .316L Surgical Steel for a sleek silver look. Both are hypoallergenic, tarnish-resistant, and built to last.",
  },
  {
    q: "How long does shipping take?",
    a: "Each piece is custom-made to order. Production takes 5-7 business days, and shipping is free worldwide. US orders arrive in 7-12 business days; international orders in 10-18 business days.",
  },
  {
    q: "How does the QR Code card work?",
    a: "Every order includes a premium printed card with a unique QR code. When scanned with any smartphone camera, it instantly plays back the original audio recording you submitted. It's a beautiful way to share the memory.",
  },
  {
    q: "Can I use a recording of a person's voice instead of a pet?",
    a: "Absolutely. While our brand is pet-focused, many customers create necklaces from a child's laughter, a loved one's voice message, or any meaningful sound.",
  },
  {
    q: "What if I'm not satisfied with my order?",
    a: "We stand behind every piece. If you're not completely happy, we offer a 30-day satisfaction guarantee. Contact our support team and we'll make it right.",
  },
];

const FAQSection = () => {
  return (
    <section id="faq" className="py-24 md:py-32 bg-card">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16 space-y-4">
          <p className="text-xs tracking-[0.4em] uppercase text-gold font-sans">
            Questions
          </p>
          <h2 className="text-3xl md:text-4xl font-serif text-foreground">
            Frequently Asked
          </h2>
        </div>
        <div className="max-w-2xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="border border-border/50 rounded-sm px-6 bg-cream/50"
              >
                <AccordionTrigger className="text-left font-serif text-base hover:no-underline hover:text-gold transition-colors py-5">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground font-light leading-relaxed pb-5">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
