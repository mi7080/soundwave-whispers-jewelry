import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Waves, QrCode } from "lucide-react";
import logo from "@/assets/logo.png";
import pendantHero from "@/assets/pendant-hero.jpg";

const steps = [
  {
    icon: Upload,
    step: "01",
    title: "Capture",
    description: "Record a voice note, a laugh, or choose a song that defines your memory.",
  },
  {
    icon: Waves,
    step: "02",
    title: "Design",
    description: "We engrave your unique Soundwave and a private QR code onto a premium pendant.",
  },
  {
    icon: QrCode,
    step: "03",
    title: "Connect",
    description: "Scan the pendant anytime to relive the moment on your personal Soul Page.",
  },
];

const PreOrderLanding = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("track", "CompleteRegistration");
      console.log("PIXEL SUBMIT FIRED (backup)");
    }
    if (!email.trim()) return;

    setStatus("loading");
    setErrorMsg("");

    const { error } = await supabase
      .from("waitlist_leads")
      .insert({ email: email.trim().toLowerCase() });

    if (error) {
      if (error.code === "23505") {
        setStatus("success");
        return;
      }
      setErrorMsg("Something went wrong. Please try again.");
      setStatus("error");
      return;
    }

    setStatus("success");
  };

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="w-full py-6 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-center">
          <img src={logo} alt="ANIMUS" className="h-14 md:h-16" />
        </div>
      </nav>

      {/* Hero */}
      <section className="flex items-center justify-center px-6 py-16 md:py-24">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <div className="inline-block">
            <span className="text-gold text-xs tracking-[0.3em] uppercase font-medium border border-gold/30 px-4 py-2 rounded-full">
              Founders Edition — Limited to 250
            </span>
          </div>

          <h1 className="font-serif text-4xl md:text-6xl leading-tight text-foreground">
            40% Off &<br />
            <span className="text-gold">Lifetime Access</span>
          </h1>

          <p className="text-muted-foreground text-lg md:text-xl max-w-lg mx-auto leading-relaxed">
            Be one of the first 250 founding members to eternalize your memories
            with an exclusive launch discount on the{" "}
            <span className="text-foreground font-medium">ANIMUS Memory Pendant</span>.
          </p>
        </div>
      </section>

      {/* Visual Anchor — Product Placeholder */}
      <section className="px-6 py-12 md:py-20">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-lg overflow-hidden border border-border">
            <img
              src={pendantHero}
              alt="ANIMUS Memory Pendant with engraved soundwave and QR code"
              width={1024}
              height={1024}
              className="w-full h-auto object-cover"
            />
          </div>
          <p className="text-center mt-6 font-serif text-xl md:text-2xl text-foreground/80 italic">
            "A piece of them, always with you."
          </p>
        </div>
      </section>

      {/* Essence */}
      <section className="px-6 py-16 md:py-24 bg-card">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <p className="text-xs tracking-[0.4em] uppercase text-gold font-sans">
            The Eternal Echo
          </p>
          <h2 className="font-serif text-3xl md:text-4xl text-foreground leading-snug">
            More Than a Memory,<br />a Living Connection.
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-xl mx-auto font-light">
            ANIMUS captures the essence of those you love. We transform a voice note, a laugh, or a special song into a unique Soundwave engraved on a premium pendant. A simple scan reveals their "Soul Page" — a private digital sanctuary with their photo, words, and the sound of their voice.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <p className="text-xs tracking-[0.4em] uppercase text-gold font-sans">
              How It Works
            </p>
            <h2 className="font-serif text-3xl md:text-4xl text-foreground">
              Three Steps to Forever
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-12">
            {steps.map((item) => (
              <div key={item.step} className="text-center space-y-5 group">
                <div className="relative mx-auto w-20 h-20 flex items-center justify-center border border-border rounded-full group-hover:border-gold transition-colors duration-500">
                  <item.icon className="w-8 h-8 text-gold" strokeWidth={1.5} />
                  <span className="absolute -top-2 -right-2 text-[10px] tracking-widest text-muted-foreground font-sans">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-xl font-serif text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-light">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder's Offer CTA */}
      <section className="px-6 py-16 md:py-24 bg-card">
        <div className="max-w-lg mx-auto text-center space-y-8">
          <p className="text-xs tracking-[0.4em] uppercase text-gold font-sans">
            Exclusive Invitation
          </p>
          <h2 className="font-serif text-3xl md:text-4xl text-foreground">
            Join the Founders Circle
          </h2>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
            Only <span className="text-gold font-medium">250 spots</span> available for this exclusive launch offer. Reserve yours and receive{" "}
            <span className="text-gold font-medium">40% off</span> the ANIMUS Memory Pendant.
          </p>

          {status === "success" ? (
            <div className="bg-gold/10 border border-gold/30 rounded-lg p-8">
              <p className="text-gold font-serif text-2xl mb-2">You're In.</p>
              <p className="text-muted-foreground text-sm">
                We'll notify you the moment the Founders Edition goes live.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-3"
            >
              <input
                type="email"
                required
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 h-12 px-4 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 text-sm"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                onClick={() => {
                  if (typeof window !== "undefined" && (window as any).fbq) {
                    (window as any).fbq("track", "CompleteRegistration");
                    console.log("PIXEL CLICK FIRED");
                  }
                }}
                className="h-12 px-8 bg-gold text-background text-xs tracking-[0.2em] uppercase font-medium hover:bg-gold-light transition-colors disabled:opacity-50 rounded-md whitespace-nowrap"
              >
                {status === "loading" ? "Joining…" : "Reserve My Spot"}
              </button>
            </form>
          )}

          {status === "error" && (
            <p className="text-red-400 text-sm">{errorMsg}</p>
          )}
        </div>
      </section>

      {/* Trust signals */}
      <section className="py-10 px-6">
        <div className="flex flex-wrap items-center justify-center gap-6 text-muted-foreground/60 text-xs tracking-widest uppercase">
          <span>Premium Materials</span>
          <span className="hidden sm:inline text-gold/30">·</span>
          <span>Handcrafted in the US</span>
          <span className="hidden sm:inline text-gold/30">·</span>
          <span>Private Digital Memorial</span>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-muted-foreground/50 text-xs tracking-widest">
        © {new Date().getFullYear()} ANIMUS — All Rights Reserved
      </footer>
    </main>
  );
};

export default PreOrderLanding;
