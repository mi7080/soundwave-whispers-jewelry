import { useEffect, useState } from "react";

const MobileStickyBar = () => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const el = document.getElementById("customize");
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setVisible(rect.top > window.innerHeight || rect.bottom < 0);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-md border-t border-border/50 px-4 py-3 flex gap-3 animate-fade-in">
      <a
        href="#customize"
        className="flex-1 bg-gold text-background py-4 text-xs tracking-[0.2em] uppercase text-center font-sans hover:bg-gold-light transition-colors"
      >
        Design Your Dog Tag
      </a>
    </div>
  );
};

export default MobileStickyBar;
