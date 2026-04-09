import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

const PreOrderLanding = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      <section className="flex-1 flex items-center justify-center px-6 py-16 md:py-24">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-block">
            <span className="text-gold text-xs tracking-[0.3em] uppercase font-medium border border-gold/30 px-4 py-2 rounded-full">
              Founders Edition — Limited to 250
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-serif text-4xl md:text-6xl leading-tight text-foreground">
            40% Off &<br />
            <span className="text-gold">Lifetime Access</span>
          </h1>

          {/* Subheadline */}
          <p className="text-muted-foreground text-lg md:text-xl max-w-lg mx-auto leading-relaxed">
            Be one of the first 250 founding members to eternalize your memories
            with an exclusive launch discount on the{" "}
            <span className="text-foreground font-medium">Eternal Echo Memory Pendant</span>.
          </p>

          {/* Description */}
          <p className="text-muted-foreground/80 text-sm md:text-base max-w-md mx-auto">
            A wearable soundwave of a voice, a heartbeat, or a melody — crafted
            in premium materials and linked to a private digital memorial.
          </p>

          {/* Email Form */}
          {status === "success" ? (
            <div className="bg-gold/10 border border-gold/30 rounded-lg p-8 max-w-md mx-auto">
              <p className="text-gold font-serif text-2xl mb-2">You're In.</p>
              <p className="text-muted-foreground text-sm">
                We'll notify you the moment the Founders Edition goes live.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
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
                className="h-12 px-8 bg-gold text-background text-xs tracking-[0.2em] uppercase font-medium hover:bg-gold-light transition-colors disabled:opacity-50 rounded-md whitespace-nowrap"
              >
                {status === "loading" ? "Joining…" : "Join the Waitlist"}
              </button>
            </form>
          )}

          {status === "error" && (
            <p className="text-red-400 text-sm">{errorMsg}</p>
          )}

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-muted-foreground/60 text-xs tracking-widest uppercase">
            <span>Premium Materials</span>
            <span className="hidden sm:inline text-gold/30">·</span>
            <span>Handcrafted in the US</span>
            <span className="hidden sm:inline text-gold/30">·</span>
            <span>Private Digital Memorial</span>
          </div>
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
