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
    q: "What is the Memory Pendant made of?",
    a: "The ANIMUS Memory Pendant is a premium polished metal piece crafted at our US-based facility. It features high-precision laser engraving that captures every detail of your soundwave and QR code.",
  },
  {
    q: "How long does shipping take?",
    a: "Each pendant is custom-made to order. Production takes 5-7 business days, and shipping is free within the US. Domestic orders arrive in 7-12 business days; international orders in 10-18 business days.",
  },
  {
    q: "How does the QR Code work?",
    a: "Every pendant includes a QR code engraved directly on the metal. When scanned with any smartphone camera, it opens your personal Soul Page where the original audio plays instantly.",
  },
  {
    q: "Who is this for?",
    a: "ANIMUS is a universal memorial brand. Customers create pendants from a loved one's voice, a child's laughter, a heartbeat, or any meaningful sound. It's for anyone who wants to carry a memory close to their heart.",
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
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div className="lg:sticky lg:top-32 lg:self-start space-y-5">
            <p className="text-xs tracking-[0.2em] text-gold font-sans">
              Questions
            </p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-medium leading-tight text-foreground">
              The things you may be wondering
            </h2>
            <p className="text-muted-foreground font-light leading-relaxed max-w-sm">
              A few quiet answers about how a recording becomes a keepsake you can carry. If something is left unsaid, we are always close by.
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="border-none rounded-2xl bg-background px-6 ring-1 ring-border shadow-[0_30px_70px_-35px_rgba(90,60,30,0.4)] transition-shadow hover:ring-gold/40"
              >
                <AccordionTrigger className="text-left font-serif font-medium text-lg leading-snug text-foreground hover:no-underline [&[data-state=open]]:text-gold transition-colors py-6">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground font-light leading-relaxed pb-6 pr-6">
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
