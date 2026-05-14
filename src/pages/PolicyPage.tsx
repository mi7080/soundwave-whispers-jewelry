import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Helmet } from "react-helmet-async";
import Footer from "@/components/Footer";

const policies: Record<string, { title: string; subtitle: string; content: string[] }> = {
  shipping: {
    title: "Shipping Policy",
    subtitle: "US-Only Shipping",
    content: [
      "All ANIMUS orders are currently shipped exclusively within the United States via USPS Priority Mail.",
      "Each necklace is custom-made to order. Production takes 3-5 business days, followed by 2-5 business days for delivery.",
      "All orders include free shipping and a tracking number sent to your email upon dispatch.",
      "We are not responsible for delays caused by USPS or incorrect shipping addresses provided at checkout.",
    ],
  },
  refund: {
    title: "Refund Policy",
    subtitle: "Custom Product Returns",
    content: [
      "Because each ANIMUS necklace is custom-engraved with your unique soundwave, we cannot accept returns for change of mind.",
      "If your item arrives damaged or defective, contact us within 7 days of delivery and we will send a free replacement.",
      "We offer a 30-day satisfaction guarantee. If you're not happy with the quality of the engraving or materials, reach out and we'll work with you to make it right.",
      "Refunds, when approved, are processed within 5-7 business days to the original payment method.",
    ],
  },
  terms: {
    title: "Terms of Service",
    subtitle: "Agreement",
    content: [
      "By placing an order with ANIMUS, you agree to these terms. All products are custom-made and non-returnable except as outlined in our Refund Policy.",
      "Audio files uploaded for soundwave engraving are stored securely and used solely for the purpose of creating your product and QR playback card.",
      "We reserve the right to refuse service if uploaded content is deemed inappropriate or violates any laws.",
      "Prices are listed in USD and are subject to change without notice. Orders are charged at the price displayed at the time of purchase.",
    ],
  },
  guarantee: {
    title: "The Forever Memory Guarantee",
    subtitle: "Your Audio, Preserved Forever",
    content: [
      "Every ANIMUS necklace comes with our Forever Memory Guarantee — your uploaded audio recording is securely hosted on our cloud servers indefinitely, at no additional cost.",
      "The QR code on your included card will always link to your original recording. No subscriptions, no expiration dates, no hidden fees.",
      "Our servers use encrypted, redundant storage to ensure your precious memories are always accessible, anywhere in the world.",
      "If you ever need to update or replace your audio file, simply contact our support team and we'll assist you free of charge.",
    ],
  },
  care: {
    title: "Care Instructions",
    subtitle: "Keeping Your Necklace Beautiful",
    content: [
      "316L Surgical Steel: Fully waterproof. Safe for showers, swimming, and daily wear. Clean with mild soap and warm water. Dry with a soft cloth.",
      "14K Gold Finish: Water-resistant for everyday wear. To preserve the golden luster, remove before prolonged water exposure or swimming in chlorinated pools.",
      "Avoid contact with harsh chemicals such as bleach, perfume, and cleaning agents.",
      "Store your necklace in the included luxury box when not wearing it to prevent scratches. Polish occasionally with a microfiber cloth for a like-new shine.",
    ],
  },
  contact: {
    title: "Contact Us",
    subtitle: "We're Here to Help",
    content: [
      "Email us at support@animusjewelry.com — we respond within 24 hours on business days.",
      "For order-related inquiries, please include your order number in the subject line for faster assistance.",
      "Follow us on Instagram @animusjewelry for the latest designs, customer stories, and behind-the-scenes content.",
      "Business hours: Monday–Friday, 9 AM – 6 PM EST.",
    ],
  },
  track: {
    title: "Track Your Order",
    subtitle: "Order Status",
    content: [
      "Once your custom necklace ships, you'll receive an email with your USPS tracking number.",
      "You can track your package directly at usps.com or through the USPS mobile app.",
      "Typical delivery: 2-5 business days after shipping. Production takes 3-5 business days before shipment.",
      "If your tracking hasn't updated in 5+ business days, please contact us at support@animusjewelry.com.",
    ],
  },
};

const PolicyPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const page = policies[slug || ""];

  if (!page) {
    return (
      <main className="min-h-screen bg-background pt-20 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-serif text-foreground">Page Not Found</h1>
          <Link to="/" className="text-gold hover:text-gold-light transition-colors text-sm">Return Home</Link>
        </div>
      </main>
    );
  }

  const pageTitle = `${page.title} — ANIMUS`;
  const pageDesc = page.content[0]?.slice(0, 155) ?? page.subtitle;
  const canonical = `https://animuswave.com/${slug}`;

  return (
    <main className="min-h-screen bg-background pt-20">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:url" content={canonical} />
      </Helmet>
      <div className="container mx-auto px-6 py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gold transition-colors mb-12">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <p className="text-xs tracking-[0.4em] uppercase text-gold font-sans">{page.subtitle}</p>
            <h1 className="text-3xl md:text-4xl font-serif text-foreground">{page.title}</h1>
          </div>
          <div className="space-y-6">
            {page.content.map((p, i) => (
              <p key={i} className="text-muted-foreground font-light leading-relaxed">{p}</p>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
};

export default PolicyPage;
