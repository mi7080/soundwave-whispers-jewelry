import { useEffect, useState } from "react";

/**
 * Persistent mobile CTA on the customization/store page.
 * Always visible on mobile (no auto-hide), so users can jump to the
 * customization form from anywhere on the page.
 */
const MobileStickyBar = () => {
  const [shouldHide, setShouldHide] = useState(false);

  useEffect(() => {
    // Only hide when the user is already actively inside the customize form
    // (so the floating button doesn't cover the inputs they're typing into).
    const handleScroll = () => {
      const el = document.getElementById("customize");
      if (!el) {
        setShouldHide(false);
        return;
      }
      const rect = el.getBoundingClientRect();
      // Hide only when the customize section fills most of the viewport
      const insideCustomize = rect.top < 80 && rect.bottom > window.innerHeight * 0.6;
      setShouldHide(insideCustomize);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-md border-t border-border/50 px-4 py-3 transition-transform duration-300 ${
        shouldHide ? "translate-y-full" : "translate-y-0"
      }`}
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
    >
      <a
        href="#customize"
        className="block w-full bg-gold text-background py-4 text-xs tracking-[0.2em] uppercase text-center font-sans hover:bg-gold-light transition-colors"
      >
        Start Your Design
      </a>
    </div>
  );
};

export default MobileStickyBar;
