import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import Footer from "@/components/Footer";

type Section = { heading: string; body?: string[]; bullets?: string[] };

type Policy = {
  title: string;
  subtitle: string;
  updated?: string;
  content?: string[];
  sections?: Section[];
};

const policies: Record<string, Policy> = {
  shipping: {
    title: "Shipping Policy",
    subtitle: "US-Only Shipping",
    updated: "May 27, 2026",
    content: [
      "We currently ship only within the United States. Every order goes out by USPS Priority Mail.",
      "Each necklace is made to order. Production takes 3 to 5 business days, and delivery takes another 2 to 5 business days after that.",
      "Shipping is free, and you will get a tracking number by email as soon as your order is on its way.",
      "We cannot control delays once a package is with USPS, and we are not responsible for orders sent to an incorrect address entered at checkout. Please double-check your address before you pay.",
    ],
  },
  refund: {
    title: "Refund Policy",
    subtitle: "Custom Product Returns",
    updated: "May 27, 2026",
    content: [
      "Every ANIMUS necklace is engraved with your own soundwave, which makes it one of a kind. For that reason we cannot accept returns simply for a change of mind.",
      "If your order arrives damaged or defective, email us within 7 days of delivery and we will make a free replacement. A clear photo helps us sort it out faster.",
      "We stand behind our work with a 30-day satisfaction guarantee. If you are unhappy with the engraving or the materials, reach out and we will work with you until it is right.",
      "When a refund is approved, it goes back to your original payment method within 5 to 7 business days.",
    ],
  },
  terms: {
    title: "Terms of Service",
    subtitle: "The Agreement",
    updated: "May 27, 2026",
    sections: [
      {
        heading: "",
        body: [
          "These terms cover your use of animuswave.com and any order you place with ANIMUS. By buying from us or using the site, you agree to them. ANIMUS is operated from Israel and ships to customers in the United States.",
        ],
      },
      {
        heading: "Custom, Made-to-Order Products",
        body: [
          "Everything we make is personalized with your recording, so each piece is unique and is produced only after you order. As set out in our [Refund Policy](/refund), custom items cannot be returned for a change of mind, though we replace anything that arrives damaged or defective.",
        ],
      },
      {
        heading: "Your Content and the License You Give Us",
        body: [
          "You keep ownership of the audio and any photos you upload. By uploading them, you give us permission to use them for one purpose: to produce your order and host the playback your QR card links to. You confirm that you have the right to use what you upload and that it does not break any law or anyone else's rights.",
          "We may refuse or cancel an order if the content is unlawful, infringing, or inappropriate.",
        ],
      },
      {
        heading: "Pricing and Payment",
        body: [
          "Prices are shown in US dollars and can change at any time. The price you pay is the one displayed when you place the order. Payments are handled by our provider, iCount, and we never see or store your full card number.",
        ],
      },
      {
        heading: "How We Use Your Data",
        body: [
          "Our [Privacy Policy](/privacy) explains what we collect and how we handle it, including your uploaded audio and photos.",
        ],
      },
      {
        heading: "Liability",
        body: [
          "We do our best to describe our products accurately and to deliver them in good condition. To the extent the law allows, our responsibility for any order is limited to the amount you paid for it. We are not liable for delays outside our control, such as carrier delays.",
        ],
      },
      {
        heading: "Governing Law",
        body: [
          "These terms are governed by the laws of Israel. Nothing here removes consumer protections you are entitled to where you live.",
        ],
      },
      {
        heading: "Changes",
        body: [
          "We may update these terms from time to time. The date at the top shows when they last changed. Continuing to use the site or place orders means you accept the current version.",
        ],
      },
      {
        heading: "Contact",
        body: ["Questions about these terms? Email support@animusjewelry.com."],
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    subtitle: "How We Handle Your Data",
    updated: "May 27, 2026",
    sections: [
      {
        heading: "",
        body: [
          "ANIMUS makes custom soundwave jewelry. We are based in Israel and ship to customers across the United States. This policy explains what we collect when you visit animuswave.com or place an order, why we collect it, and the choices you have.",
          "We kept this in plain language on purpose. If anything here is unclear, email support@animusjewelry.com and we will walk you through it.",
        ],
      },
      {
        heading: "Information You Give Us",
        body: [
          "When you order, we collect your name, shipping address, email address, and phone number so we can make and deliver your piece and keep you updated.",
          "The recording you upload is the heart of the product. We use the audio to generate your soundwave engraving and to host the playback that your QR card links to. If you add a photo, such as a pet portrait, we use it the same way: only to produce what you ordered.",
        ],
      },
      {
        heading: "Payment Information",
        body: [
          "Payments are processed by iCount, our payment provider. Your card details go straight to them and are handled under their security standards. We never see or store your full card number.",
        ],
      },
      {
        heading: "Information We Collect Automatically",
        body: [
          "Like most websites, we collect some technical information when you browse: your device and browser type, approximate location based on IP address, the pages you view, and how you move through the site. This comes from cookies and similar tools.",
          "We use it to understand what is working, fix what is not, and show our products to people who are likely to be interested. The specific tools are listed in our [Cookie Policy](/cookies).",
        ],
      },
      {
        heading: "Your Audio and Photos",
        body: [
          "Your recording is stored on cloud servers and kept for as long as your QR card needs to play it. This is the Forever Memory promise: your audio stays live so the card never goes dead.",
          "Please know that the QR code links to your recording through a web address. Anyone who scans the code or has the link can listen to it, so treat it like any link you would share. We do not list these pages publicly or submit them to search engines.",
          "If you ever want your audio or photo removed, email us and we will delete it from our servers. Deleting it means the QR card will stop playing, so we will confirm with you before we do.",
        ],
      },
      {
        heading: "How We Use Your Information",
        bullets: [
          "Make your product and create your QR playback card",
          "Process payments and prevent fraud",
          "Ship your order and send tracking updates",
          "Answer your questions and provide support",
          "Send order confirmations and service emails",
          "Measure and improve how the site performs",
          "Show relevant ads and reach similar customers, unless you have opted out",
          "Meet legal, tax, and accounting obligations",
        ],
      },
      {
        heading: "Who We Share It With",
        body: [
          "We do not sell your personal information. We share it only with the companies that help us run the business, and only with what they need to do their job:",
        ],
        bullets: [
          "Payment processing: iCount",
          "Production and printing: ShineOn, our fulfillment partner",
          "Shipping: USPS",
          "Email delivery and customer messaging providers",
          "Cloud hosting for your audio, photos, and the site itself",
          "Analytics and advertising: Google, Microsoft, and Meta (see our [Cookie Policy](/cookies))",
        ],
      },
      {
        heading: "Where Your Data Is Processed",
        body: [
          "We operate from Israel and serve customers in the United States, and our service providers sit in several countries. That means your information may be stored and processed outside the country where you live, including in Israel and the United States. Wherever it goes, we expect it to be handled with the protections described here.",
        ],
      },
      {
        heading: "How Long We Keep It",
        body: [
          "We keep order and contact details for as long as we need them to fulfill your order and meet legal and tax requirements, usually several years. Your uploaded audio and photos are kept for the life of your QR card unless you ask us to delete them. Analytics data is retained according to each provider's settings.",
        ],
      },
      {
        heading: "Your Choices and Rights",
        body: [
          "You can ask us to show you the personal information we hold about you, correct it, or delete it. You can opt out of marketing emails at any time using the unsubscribe link or by emailing us.",
          "If you are a California resident, the CCPA and CPRA give you the right to know what we collect, to request deletion or correction, and to opt out of the sale or sharing of personal information. We do not sell your personal information. To use any of these rights, email support@animusjewelry.com and we will respond within the time the law allows. We will not treat you differently for asking.",
        ],
      },
      {
        heading: "Children",
        body: [
          "ANIMUS is meant for adults. We do not knowingly collect information from anyone under 16. If you believe a child has given us their information, contact us and we will remove it.",
        ],
      },
      {
        heading: "Security",
        body: [
          "We use encrypted connections and reputable providers to protect your information. No method of storage or transmission is perfectly secure, but we take reasonable steps to guard against loss, misuse, and unauthorized access.",
        ],
      },
      {
        heading: "Changes to This Policy",
        body: [
          "When we update this policy we change the date at the top of the page. If a change is significant, we will make a clearer effort to let you know.",
        ],
      },
      {
        heading: "Contact",
        body: [
          "Questions about your privacy or this policy? Email support@animusjewelry.com and a real person will reply, usually within one business day.",
        ],
      },
    ],
  },
  cookies: {
    title: "Cookie Policy",
    subtitle: "Cookies and Tracking",
    updated: "May 27, 2026",
    sections: [
      {
        heading: "",
        body: [
          "This page explains the cookies and similar tools we use on animuswave.com, what they do, and how to turn them off. For the bigger picture on how we handle your data, see our [Privacy Policy](/privacy).",
        ],
      },
      {
        heading: "What Cookies Are",
        body: [
          "Cookies are small files a website stores on your device. They let the site remember things between visits, measure how it is used, and support advertising. Some are essential for the site to work; others are optional.",
        ],
      },
      {
        heading: "Essential Cookies",
        body: [
          "These keep the basics running: your cart, the checkout flow, and security. The site will not work properly without them, so they cannot be switched off from here.",
        ],
      },
      {
        heading: "Analytics",
        body: [
          "We use these to see which pages people visit and where they get stuck, so we can make the site better.",
        ],
        bullets: [
          "Google Analytics measures traffic and which pages perform. Read [Google's privacy policy](https://policies.google.com/privacy), or opt out with the [Google Analytics Opt-out Add-on](https://tools.google.com/dlpage/gaoptout).",
          "Microsoft Clarity records anonymized session activity such as clicks, scrolls, and mouse movement to show us how pages are used. It masks the text you type into forms. Read [Microsoft's privacy statement](https://privacy.microsoft.com/privacystatement).",
        ],
      },
      {
        heading: "Advertising",
        body: [
          "These help us show our products to the right people and measure whether our ads are working.",
        ],
        bullets: [
          "Meta Pixel lets us measure ad results and reach people similar to our customers on Facebook and Instagram. Read [Meta's privacy policy](https://www.facebook.com/privacy/policy) or manage your [ad preferences](https://www.facebook.com/adpreferences).",
        ],
      },
      {
        heading: "How to Control Cookies",
        body: [
          "You can block or delete cookies in your browser settings, and most browsers also offer a private browsing mode. Blocking essential cookies may break parts of the site.",
          "Many browsers send a Global Privacy Control or Do Not Track signal. Where the law requires us to honor it, we do.",
        ],
      },
      {
        heading: "Questions",
        body: [
          "Email support@animusjewelry.com if you want help managing your choices.",
        ],
      },
    ],
  },
  accessibility: {
    title: "Accessibility Statement",
    subtitle: "Our Commitment to Access",
    updated: "May 27, 2026",
    sections: [
      {
        heading: "",
        body: [
          "We want everyone to be able to use animuswave.com, including people who rely on assistive technology. Accessibility is something we work on continuously, not a box we tick once.",
        ],
      },
      {
        heading: "What We Aim For",
        body: [
          "We are working toward the Web Content Accessibility Guidelines (WCAG) 2.1 at Level AA. That covers readable text, keyboard navigation, sufficient color contrast, and labels that screen readers can announce.",
        ],
      },
      {
        heading: "What We Have Done",
        bullets: [
          "Text that can be resized without breaking the layout",
          "Color contrast chosen for readability",
          "Keyboard access to navigation and forms",
          "Descriptive labels and alt text for images and controls",
        ],
      },
      {
        heading: "Where We Fall Short",
        body: [
          "Parts of the site, especially the audio recorder and live previews, are still being improved for full assistive-technology support. We know about these gaps and are working on them.",
        ],
      },
      {
        heading: "Tell Us When Something Does Not Work",
        body: [
          "If you hit a barrier on our site, or you need help completing an order another way, email support@animusjewelry.com. Tell us what page you were on and what went wrong, and we will help you directly and fix the problem. We aim to respond within two business days.",
        ],
      },
    ],
  },
  guarantee: {
    title: "The Forever Memory Guarantee",
    subtitle: "Your Audio, Preserved Forever",
    content: [
      "Every ANIMUS necklace comes with our Forever Memory Guarantee. Your uploaded audio recording is securely hosted on our cloud servers indefinitely, at no additional cost.",
      "The QR code on your included card will always link to your original recording. No subscriptions, no expiration dates, no hidden fees.",
      "Our servers use encrypted, redundant storage so your memories stay accessible, anywhere in the world.",
      "If you ever need to update or replace your audio file, contact our support team and we'll help you free of charge.",
    ],
  },
  care: {
    title: "Care Instructions",
    subtitle: "Keeping Your Necklace Beautiful",
    content: [
      "316L Surgical Steel: Fully waterproof. Safe for showers, swimming, and daily wear. Clean with mild soap and warm water, then dry with a soft cloth.",
      "14K Gold Finish: Water-resistant for everyday wear. To keep the golden luster, remove it before prolonged water exposure or swimming in chlorinated pools.",
      "Avoid contact with harsh chemicals such as bleach, perfume, and cleaning agents.",
      "Store your necklace in the included luxury box when you are not wearing it to prevent scratches. Polish occasionally with a microfiber cloth for a like-new shine.",
    ],
  },
  contact: {
    title: "Contact Us",
    subtitle: "We're Here to Help",
    content: [
      "Email us at support@animusjewelry.com and we respond within 24 hours on business days.",
      "For order-related questions, please include your order number in the subject line for faster help.",
      "Follow us on Instagram @animusjewelry for the latest designs, customer stories, and behind-the-scenes content.",
      "Business hours: Monday to Friday, 9 AM to 6 PM EST.",
    ],
  },
  track: {
    title: "Track Your Order",
    subtitle: "Order Status",
    content: [
      "Once your custom necklace ships, you'll receive an email with your USPS tracking number.",
      "You can track your package directly at usps.com or through the USPS mobile app.",
      "Typical delivery is 2 to 5 business days after shipping. Production takes 3 to 5 business days before shipment.",
      "If your tracking hasn't updated in 5 or more business days, please contact us at support@animusjewelry.com.",
    ],
  },
};

const linkClass =
  "text-gold hover:text-gold-light underline underline-offset-2 transition-colors";

const renderRich = (text: string): ReactNode[] => {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (!match) return part;
    const [, label, href] = match;
    if (href.startsWith("/")) {
      return (
        <Link key={i} to={href} className={linkClass}>
          {label}
        </Link>
      );
    }
    return (
      <a key={i} href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
        {label}
      </a>
    );
  });
};

const firstParagraph = (page: Policy): string =>
  page.content?.[0] ??
  page.sections?.find((s) => s.body && s.body.length > 0)?.body?.[0] ??
  page.subtitle;

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

  const pageTitle = `${page.title} | ANIMUS`;
  const pageDesc = firstParagraph(page).slice(0, 155);
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
        <meta property="og:image" content="https://animuswave.com/og-image.jpg" />
        <meta name="twitter:image" content="https://animuswave.com/og-image.jpg" />
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
            {page.updated && (
              <p className="text-xs text-muted-foreground/70 font-sans">Last updated: {page.updated}</p>
            )}
          </div>

          {page.sections ? (
            <div className="space-y-10">
              {page.sections.map((section, i) => (
                <section key={i} className="space-y-4">
                  {section.heading && (
                    <h2 className="text-xl font-serif text-foreground">{section.heading}</h2>
                  )}
                  {section.body?.map((p, j) => (
                    <p key={j} className="text-muted-foreground font-light leading-relaxed">
                      {renderRich(p)}
                    </p>
                  ))}
                  {section.bullets && (
                    <ul className="space-y-2 list-disc pl-5 marker:text-gold">
                      {section.bullets.map((b, j) => (
                        <li key={j} className="text-muted-foreground font-light leading-relaxed">
                          {renderRich(b)}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {page.content?.map((p, i) => (
                <p key={i} className="text-muted-foreground font-light leading-relaxed">
                  {renderRich(p)}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
};

export default PolicyPage;
