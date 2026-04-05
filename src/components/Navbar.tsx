import logo from "@/assets/logo.png";
import CartDrawer from "@/components/CartDrawer";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center">
          <img src={logo} alt="ANIMUS" className="h-12 md:h-14" />
        </a>
        <div className="hidden md:flex items-center gap-8 text-sm tracking-widest uppercase text-muted-foreground">
          <a href="/#experience" className="hover:text-gold transition-colors">How It Works</a>
          <a href="/#craftsmanship" className="hover:text-gold transition-colors">Craftsmanship</a>
          <a href="/#reviews" className="hover:text-gold transition-colors">Reviews</a>
          <a href="/faq" className="hover:text-gold transition-colors">FAQ</a>
        </div>
        <div className="flex items-center gap-5">
          <CartDrawer />
          <a
            href="/#customize"
            className="bg-gold text-background px-6 py-2.5 text-xs tracking-widest uppercase hover:bg-gold-light transition-colors"
          >
            Shop Now
          </a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
