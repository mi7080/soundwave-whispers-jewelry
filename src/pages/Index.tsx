import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Reveal from "@/components/Reveal";
import HeroSection from "@/components/HeroSection";
import ExperienceSection from "@/components/ExperienceSection";
import QRCardSection from "@/components/QRCardSection";
import ProductSection from "@/components/ProductSection";
import CraftAndMaterials from "@/components/CraftAndMaterials";
import ProductGallery from "@/components/ProductGallery";
import TestimonialsSection from "@/components/TestimonialsSection";
import ComparisonSection from "@/components/ComparisonSection";
import FAQSection from "@/components/FAQSection";
import Footer from "@/components/Footer";
import { PRODUCT_CONFIG } from "@/config/product";

const productJsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: PRODUCT_CONFIG.title,
  description: PRODUCT_CONFIG.description,
  brand: { "@type": "Brand", name: "ANIMUS" },
  material: PRODUCT_CONFIG.material,
  image: ["https://animuswave.com/og-image.jpg"],
  offers: {
    "@type": "Offer",
    price: PRODUCT_CONFIG.foundersPrice,
    priceCurrency: PRODUCT_CONFIG.currency,
    availability: "https://schema.org/InStock",
    itemCondition: "https://schema.org/NewCondition",
    url: "https://animuswave.com/early-access-store",
    priceValidUntil: "2026-12-31",
    shippingDetails: {
      "@type": "OfferShippingDetails",
      shippingRate: { "@type": "MonetaryAmount", value: 0, currency: PRODUCT_CONFIG.currency },
      shippingDestination: { "@type": "DefinedRegion", addressCountry: "US" },
    },
  },
};

const Index = () => {
  return (
    <main>
      <Helmet>
        <title>Shop the ANIMUS Memorial Pendant | Steel or 14K Gold</title>
        <meta name="description" content="Order the ANIMUS engraved soundwave pendant in 316L stainless steel or 14K gold finish. Custom QR Soul Page included. Free US shipping, $89." />
        <link rel="canonical" href="https://animuswave.com/early-access-store" />
        <meta property="og:type" content="product" />
        <meta property="og:title" content="Shop the ANIMUS Memorial Pendant | Steel or 14K Gold" />
        <meta property="og:description" content="Order the ANIMUS engraved soundwave pendant in steel or 14K gold. Custom QR Soul Page included. Free US shipping, $89." />
        <meta property="og:url" content="https://animuswave.com/early-access-store" />
        <meta property="og:image" content="https://animuswave.com/og-image.jpg" />
        <meta name="twitter:image" content="https://animuswave.com/og-image.jpg" />
        <script type="application/ld+json">{JSON.stringify(productJsonLd)}</script>
      </Helmet>
      <Navbar />
      <HeroSection />
      <Reveal><ExperienceSection /></Reveal>
      <Reveal><QRCardSection /></Reveal>
      <Reveal><ProductSection /></Reveal>
      <Reveal><CraftAndMaterials /></Reveal>
      <Reveal><ProductGallery /></Reveal>
      <Reveal><TestimonialsSection /></Reveal>
      <Reveal><ComparisonSection /></Reveal>
      <Reveal><FAQSection /></Reveal>
      <Footer />
    </main>
  );
};

export default Index;
