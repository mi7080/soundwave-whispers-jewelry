import logo from "@/assets/logo.png";
import CartDrawer from "@/components/CartDrawer";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center">
          <img src={logo} alt="ANIMUS" className="h-12 md:h-14" />
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8 text-sm tracking-widest uppercase text-muted-foreground">
          <a href="/#experience" className="hover:text-gold transition-colors">How It Works</a>
          <a href="/#craftsmanship" className="hover:text-gold transition-colors">Craftsmanship</a>
          <a href="/#reviews" className="hover:text-gold transition-colors">Reviews</a>
          <a href="/faq" className="hover:text-gold transition-colors">FAQ</a>
        </div>

        <div className="flex items-center gap-3 md:gap-5">
          <CartDrawer />
          <a
            href="/#customize"
            className="hidden md:inline-block bg-gold text-background px-6 py-2.5 text-xs tracking-widest uppercase hover:bg-gold-light transition-colors"
          >
            Shop Now
          </a>
          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-1 text-foreground"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-md px-6 py-6 space-y-4">
          <a href="/#experience" onClick={() => setMenuOpen(false)} className="block text-sm tracking-widest uppercase text-muted-foreground hover:text-gold transition-colors">How It Works</a>
          <a href="/#craftsmanship" onClick={() => setMenuOpen(false)} className="block text-sm tracking-widest uppercase text-muted-foreground hover:text-gold transition-colors">Craftsmanship</a>
          <a href="/#reviews" onClick={() => setMenuOpen(false)} className="block text-sm tracking-widest uppercase text-muted-foreground hover:text-gold transition-colors">Reviews</a>
          <a href="/faq" onClick={() => setMenuOpen(false)} className="block text-sm tracking-widest uppercase text-muted-foreground hover:text-gold transition-colors">FAQ</a>
          <a
            href="/#customize"
            onClick={() => setMenuOpen(false)}
            className="block bg-gold text-background px-6 py-3 text-xs tracking-widest uppercase text-center hover:bg-gold-light transition-colors mt-2"
          >
            Shop Now
          </a>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
