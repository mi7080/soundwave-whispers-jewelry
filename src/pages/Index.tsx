import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ExperienceSection from "@/components/ExperienceSection";
import QRCardSection from "@/components/QRCardSection";
import CraftsmanshipSection from "@/components/CraftsmanshipSection";
import FourSideGuide from "@/components/FourSideGuide";
import ProductGallery from "@/components/ProductGallery";
import ComparisonSection from "@/components/ComparisonSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import ProductSection from "@/components/ProductSection";
import FAQSection from "@/components/FAQSection";
import Footer from "@/components/Footer";
import MobileStickyBar from "@/components/MobileStickyBar";

const Index = () => {
  return (
    <main className="pb-16 md:pb-0">
      <Navbar />
      <HeroSection />
      <ExperienceSection />
      <QRCardSection />
      <CraftsmanshipSection />
      <FourSideGuide />
      <ProductGallery />
      <ComparisonSection />
      <TestimonialsSection />
      <ProductSection />
      <FAQSection />
      <Footer />
      <MobileStickyBar />
    </main>
  );
};

export default Index;
