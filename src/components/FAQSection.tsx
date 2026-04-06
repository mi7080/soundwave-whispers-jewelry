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
    q: "What is the Dog Tag made of?",
    a: "The ANIMUS Dog Tag is a premium polished metal pendant manufactured by ShineOn. It features high-precision laser engraving that captures every detail of your soundwave and QR code.",
  },
  {
    q: "How long does shipping take?",
    a: "Each dog tag is custom-made to order. Production takes 5-7 business days, and shipping is free within the US. Domestic orders arrive in 7-12 business days; international orders in 10-18 business days.",
  },
  {
    q: "How does the QR Code work?",
    a: "Every dog tag includes a QR code engraved directly on the metal. When scanned with any smartphone camera, it opens your personal Soul Page where the original audio plays instantly.",
  },
  {
    q: "Can I memorialize a person as well as a pet?",
    a: "Absolutely. ANIMUS is a universal memorial brand. Customers create dog tags from a pet's bark, a loved one's voice message, a child's laughter, or any meaningful sound.",
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
                className="border border-border/50 rounded-sm px-6 bg-background/50"
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
