import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Helmet } from "react-helmet-async";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Footer from "@/components/Footer";

const faqs = [
  {
    q: "How does the QR code work?",
    a: "Every ANIMUS necklace comes with a premium printed card featuring a unique QR code. When scanned with any smartphone camera, it instantly plays back the original audio recording you submitted. No app needed - just point, scan, and listen to that precious sound again.",
  },
  {
    q: "Will the sound link ever expire?",
    a: "No, never. Your audio is securely hosted on our cloud servers forever at no additional cost. The QR code and playback link will work for as long as you need it - years, decades, a lifetime.",
  },
  {
    q: "Can I shower with the necklace?",
    a: "Yes! Our necklaces are crafted from .316L Surgical Stainless Steel, which is highly resistant to water, sweat, and everyday wear. You can shower, swim, and exercise without worry. For the 14K Gold Finish option, we recommend removing before prolonged water exposure to preserve the finish.",
  },
  {
    q: "Do you ship outside the US?",
    a: "Currently, we exclusively serve the US market to ensure the fastest delivery times (2-5 business days) and best customer experience. We're working on expanding internationally - sign up for our newsletter to be the first to know.",
  },
  {
    q: "What audio quality do I need for the recording?",
    a: "Any clear recording from your smartphone works perfectly. We recommend a 5-15 second clip in a quiet environment. Our technology can extract a beautiful waveform from most audio files - .mp3, .wav, .m4a, and more.",
  },
  {
    q: "What materials are the necklaces made of?",
    a: "We offer two premium options: 14K Gold Finish over stainless steel for a luxurious warm tone, and .316L Surgical Steel for a sleek silver look. Both are hypoallergenic, tarnish-resistant, and built to last.",
  },
  {
    q: "What kinds of sounds can I use?",
    a: "Anything meaningful. Customers create pendants from a child's laughter, a loved one's voice message, a heartbeat, a favorite song, or any sound that carries a memory.",
  },
  {
    q: "What if I'm not satisfied with my order?",
    a: "We stand behind every piece. If you're not completely happy, we offer a 30-day satisfaction guarantee. Contact our support team and we'll make it right.",
  },
];

const FAQ = () => {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <main className="min-h-screen bg-background pt-20">
      <Helmet>
        <title>ANIMUS FAQ | Soundwave Pendant Questions Answered</title>
        <meta name="description" content="Answers about ANIMUS soundwave pendants: how the QR code works, materials, water resistance, audio quality, and shipping." />
        <link rel="canonical" href="https://animuswaves.com/faq" />
        <meta property="og:title" content="ANIMUS FAQ | Soundwave Pendant Questions Answered" />
        <meta property="og:description" content="Answers about ANIMUS pendants: QR playback, materials, water resistance, and shipping." />
        <meta property="og:url" content="https://animuswaves.com/faq" />
        <meta property="og:image" content="https://animuswaves.com/og-image.jpg" />
        <meta name="twitter:image" content="https://animuswaves.com/og-image.jpg" />
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>
      <div className="container mx-auto px-6 py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gold transition-colors mb-12">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <p className="text-xs tracking-[0.4em] uppercase text-gold font-sans">Help Center</p>
            <h1 className="text-3xl md:text-4xl font-serif text-foreground">Frequently Asked Questions</h1>
          </div>
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="border border-border/50 rounded-sm px-6 bg-card"
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
      <Footer />
    </main>
  );
};

export default FAQ;
