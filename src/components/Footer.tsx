const Footer = () => {
  return (
    <footer className="bg-foreground py-16">
      <div className="container mx-auto px-6">
        <div className="text-center space-y-6">
          <p className="text-3xl font-serif tracking-[0.3em] text-background">
            ANIMUS
          </p>
          <p className="text-background/50 text-sm font-light max-w-md mx-auto">
            Transforming the sounds you love into wearable art. Every piece tells a story.
          </p>
          <div className="w-12 h-[1px] bg-gold mx-auto" />
          <div className="flex justify-center gap-8 text-xs tracking-widest uppercase text-background/40">
            <a href="#" className="hover:text-gold transition-colors">Privacy</a>
            <a href="#" className="hover:text-gold transition-colors">Terms</a>
            <a href="#" className="hover:text-gold transition-colors">Contact</a>
          </div>
          <p className="text-background/30 text-xs">
            © {new Date().getFullYear()} ANIMUS. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
