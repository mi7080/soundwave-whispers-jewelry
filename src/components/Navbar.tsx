import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

const LINKS = [
  { label: "How it works", href: "#experience" },
  { label: "The keepsake", href: "#customize" },
  { label: "Soul Page", href: "#soul" },
  { label: "FAQ", href: "#faq" },
];

const NAV_OFFSET = 76; // height of the fixed nav, so sections aren't hidden underneath

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToSection = (e: React.MouseEvent, href: string) => {
    const el = href.startsWith("#") ? document.querySelector(href) : null;
    if (!el) return; // let the browser handle real routes / missing targets
    e.preventDefault();
    setMenuOpen(false);
    const top = el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
    window.scrollTo({ top, behavior: "smooth" });
    history.replaceState(null, "", href);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-card/85 backdrop-blur-md border-b border-border shadow-[0_8px_30px_-18px_rgba(80,55,30,0.45)]"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" className="flex items-baseline gap-2 group">
          <span className="font-serif text-2xl md:text-[28px] font-semibold tracking-[0.06em] text-foreground">
            ANIMUS
          </span>
          <span className="hidden sm:inline text-[10px] tracking-[0.32em] uppercase text-gold/80 font-sans pb-0.5">
            wave
          </span>
        </a>

        <div className="hidden md:flex items-center gap-9 text-[13px] text-muted-foreground font-sans">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={(e) => scrollToSection(e, l.href)}
              className="relative py-1 transition-colors hover:text-foreground after:absolute after:left-0 after:-bottom-0.5 after:h-px after:w-0 after:bg-gold after:transition-all hover:after:w-full"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3 md:gap-5">
          <a
            href="#customize"
            onClick={(e) => scrollToSection(e, "#customize")}
            className="hidden md:inline-flex items-center rounded-full bg-primary text-primary-foreground px-6 py-2.5 text-[13px] font-sans font-medium transition-all hover:bg-primary/90 hover:shadow-[0_10px_24px_-10px_rgba(80,55,30,0.6)]"
          >
            Create your keepsake
          </a>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-1 text-foreground"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-border bg-card/95 backdrop-blur-md px-6 py-6 space-y-4">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={(e) => scrollToSection(e, l.href)}
              className="block text-[15px] text-foreground/80 font-sans hover:text-gold transition-colors"
            >
              {l.label}
            </a>
          ))}
          <a
            href="#customize"
            onClick={(e) => scrollToSection(e, "#customize")}
            className="block rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-sans font-medium text-center mt-2"
          >
            Create your keepsake
          </a>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
