import logo from "@/assets/logo.png";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <a href="#">
          <img src={logo} alt="ANIMUS" className="h-8" />
        </a>
        <div className="hidden md:flex items-center gap-8 text-sm tracking-widest uppercase text-muted-foreground">
          <a href="#experience" className="hover:text-gold transition-colors">How It Works</a>
          <a href="#craftsmanship" className="hover:text-gold transition-colors">Craftsmanship</a>
          <a href="#reviews" className="hover:text-gold transition-colors">Reviews</a>
          <a href="#faq" className="hover:text-gold transition-colors">FAQ</a>
        </div>
        <a
          href="#customize"
          className="bg-foreground text-background px-6 py-2.5 text-xs tracking-widest uppercase hover:bg-gold transition-colors"
        >
          Shop Now
        </a>
      </div>
    </nav>
  );
};

export default Navbar;
