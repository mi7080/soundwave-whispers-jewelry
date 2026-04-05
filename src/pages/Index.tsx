import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ExperienceSection from "@/components/ExperienceSection";
import QRCardSection from "@/components/QRCardSection";
import CraftsmanshipSection from "@/components/CraftsmanshipSection";
import ProductGallery from "@/components/ProductGallery";
import ComparisonSection from "@/components/ComparisonSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import ProductSection from "@/components/ProductSection";
import FAQSection from "@/components/FAQSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <main>
      <Navbar />
      <HeroSection />
      <ExperienceSection />
      <QRCardSection />
      <CraftsmanshipSection />
      <ProductGallery />
      <ComparisonSection />
      <TestimonialsSection />
      <ProductSection />
      <FAQSection />
      <Footer />
    </main>
  );
};

export default Index;
