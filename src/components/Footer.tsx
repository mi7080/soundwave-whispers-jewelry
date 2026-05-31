import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground py-20 md:py-24">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12 mb-16">
          <div className="md:col-span-5 space-y-5">
            <img src={logo} alt="ANIMUS" className="h-9 opacity-90" />
            <span className="block font-serif font-medium text-3xl tracking-wide text-primary-foreground">
              ANIMUS
            </span>
            <p className="text-primary-foreground/70 text-sm font-light leading-relaxed max-w-sm">
              Soundwave keepsakes that hold life's most meaningful moments close. A loved one's voice, a child's laughter, a heartbeat, kept near and carried with you.
            </p>
            <p className="text-primary-foreground/45 text-xs font-light leading-relaxed max-w-sm">
              Custom items are non-refundable. Replacements are provided for defects or unscannable QR codes.
            </p>
          </div>

          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-10">
            <div className="space-y-4">
              <h4 className="text-xs tracking-[0.2em] text-gold font-sans">Support</h4>
              <ul className="space-y-3">
                <li><Link to="/shipping" className="text-sm text-primary-foreground/70 hover:text-gold transition-colors font-light">Shipping Policy</Link></li>
                <li><Link to="/refund" className="text-sm text-primary-foreground/70 hover:text-gold transition-colors font-light">Refund Policy</Link></li>
                <li><Link to="/track" className="text-sm text-primary-foreground/70 hover:text-gold transition-colors font-light">Track Your Order</Link></li>
                <li><Link to="/contact" className="text-sm text-primary-foreground/70 hover:text-gold transition-colors font-light">Contact Us</Link></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs tracking-[0.2em] text-gold font-sans">Experience</h4>
              <ul className="space-y-3">
                <li><Link to="/guarantee" className="text-sm text-primary-foreground/70 hover:text-gold transition-colors font-light">Forever Memory Guarantee</Link></li>
                <li><Link to="/care" className="text-sm text-primary-foreground/70 hover:text-gold transition-colors font-light">Care Instructions</Link></li>
                <li><Link to="/faq" className="text-sm text-primary-foreground/70 hover:text-gold transition-colors font-light">FAQ</Link></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs tracking-[0.2em] text-gold font-sans">Legal</h4>
              <ul className="space-y-3">
                <li><Link to="/terms" className="text-sm text-primary-foreground/70 hover:text-gold transition-colors font-light">Terms of Service</Link></li>
                <li><Link to="/privacy" className="text-sm text-primary-foreground/70 hover:text-gold transition-colors font-light">Privacy Policy</Link></li>
                <li><Link to="/cookies" className="text-sm text-primary-foreground/70 hover:text-gold transition-colors font-light">Cookie Policy</Link></li>
                <li><Link to="/accessibility" className="text-sm text-primary-foreground/70 hover:text-gold transition-colors font-light">Accessibility</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/15 pt-8">
          <p className="text-primary-foreground/50 text-xs font-light">
            © {new Date().getFullYear()} ANIMUS Memory Pendants. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
