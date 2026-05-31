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
  offers: {
    "@type": "Offer",
    price: PRODUCT_CONFIG.foundersPrice,
    priceCurrency: PRODUCT_CONFIG.currency,
    availability: "https://schema.org/InStock",
    url: "https://animuswave.com/early-access-store",
  },
};

const Index = () => {
  return (
    <main>
      <Helmet>
        <title>Shop the ANIMUS Memorial Pendant — Early Access</title>
        <meta name="description" content="Order the ANIMUS soundwave dog-tag pendant in 316L steel or 14K gold finish. Free US shipping, custom QR Soul Page included." />
        <link rel="canonical" href="https://animuswave.com/early-access-store" />
        <meta property="og:title" content="Shop the ANIMUS Memorial Pendant — Early Access" />
        <meta property="og:description" content="Order the ANIMUS soundwave dog-tag pendant. Free US shipping, custom QR Soul Page included." />
        <meta property="og:url" content="https://animuswave.com/early-access-store" />
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
