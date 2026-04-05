import logo from "@/assets/logo.png";

const Footer = () => {
  return (
    <footer className="bg-card py-16 border-t border-border/50">
      <div className="container mx-auto px-6">
        <div className="text-center space-y-6">
          <img src={logo} alt="ANIMUS" className="h-10 mx-auto" />
          <p className="text-muted-foreground text-sm font-light max-w-md mx-auto">
            Transforming the sounds you love into wearable art. Every piece tells a story.
          </p>
          <div className="w-12 h-[1px] bg-gold mx-auto" />
          <div className="flex justify-center gap-8 text-xs tracking-widest uppercase text-muted-foreground">
            <a href="#" className="hover:text-gold transition-colors">Privacy</a>
            <a href="#" className="hover:text-gold transition-colors">Terms</a>
            <a href="#" className="hover:text-gold transition-colors">Contact</a>
          </div>
          <p className="text-muted-foreground/50 text-xs">
            © {new Date().getFullYear()} ANIMUS. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
