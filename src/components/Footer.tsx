import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

const Footer = () => {
  return (
    <footer className="bg-card py-16 border-t border-border/50">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="space-y-4">
            <img src={logo} alt="ANIMUS" className="h-10" />
            <p className="text-muted-foreground text-sm font-light leading-relaxed">
              Transforming the sounds you love into timeless acrylic keepsakes. Every piece tells a story.
            </p>
            <p className="text-muted-foreground/50 text-[10px] font-light leading-relaxed mt-2">
              Custom items are non-refundable. Replacements provided for defects or unscannable QR codes.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs tracking-[0.3em] uppercase text-gold font-sans">Support</h4>
            <ul className="space-y-3">
              <li><Link to="/shipping" className="text-sm text-muted-foreground hover:text-gold transition-colors font-light">Shipping Policy</Link></li>
              <li><Link to="/refund" className="text-sm text-muted-foreground hover:text-gold transition-colors font-light">Refund Policy</Link></li>
              <li><Link to="/terms" className="text-sm text-muted-foreground hover:text-gold transition-colors font-light">Terms of Service</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs tracking-[0.3em] uppercase text-gold font-sans">Experience</h4>
            <ul className="space-y-3">
              <li><Link to="/guarantee" className="text-sm text-muted-foreground hover:text-gold transition-colors font-light">Forever Memory Guarantee</Link></li>
              <li><Link to="/care" className="text-sm text-muted-foreground hover:text-gold transition-colors font-light">Care Instructions</Link></li>
              <li><Link to="/faq" className="text-sm text-muted-foreground hover:text-gold transition-colors font-light">FAQ</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs tracking-[0.3em] uppercase text-gold font-sans">Contact</h4>
            <ul className="space-y-3">
              <li><Link to="/contact" className="text-sm text-muted-foreground hover:text-gold transition-colors font-light">Contact Us</Link></li>
              <li><Link to="/track" className="text-sm text-muted-foreground hover:text-gold transition-colors font-light">Track Your Order</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/30 pt-8 text-center">
          <p className="text-muted-foreground/50 text-xs">
            © {new Date().getFullYear()} ANIMUS. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
