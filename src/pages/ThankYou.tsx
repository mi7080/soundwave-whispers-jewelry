import { useEffect, useState, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import logo from "@/assets/logo.png";

const CONFETTI_COLORS = ["#B78E48", "#D4AF37", "#FFD700", "#C9A84C", "#E8C07A", "#FFFFFF"];

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  velocityX: number;
  velocityY: number;
  rotationSpeed: number;
  opacity: number;
}

const ThankYou = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order") || searchParams.get("order_id");
  const amount = searchParams.get("amount");
  const name = searchParams.get("name");
  const [particles, setParticles] = useState<Particle[]>([]);

  const parsedAmount = amount ? parseFloat(amount) : NaN;
  const decodedName = name ? decodeURIComponent(name).trim() : "";
  const isValid =
    !!orderId &&
    orderId.trim().length > 0 &&
    !!amount &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    decodedName.length > 0;

  const createConfetti = useCallback(() => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 120; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 20,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: 4 + Math.random() * 8,
        rotation: Math.random() * 360,
        velocityX: (Math.random() - 0.5) * 3,
        velocityY: 1 + Math.random() * 3,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
      });
    }
    setParticles(newParticles);
  }, []);

  useEffect(() => {
    if (!isValid) return;
    createConfetti();
    const timer = setTimeout(() => setParticles([]), 5000);
    return () => clearTimeout(timer);
  }, [createConfetti, isValid]);

  useEffect(() => {
    if (particles.length === 0) return;
    const interval = setInterval(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.velocityX * 0.3,
            y: p.y + p.velocityY * 0.5,
            rotation: p.rotation + p.rotationSpeed,
            opacity: p.y > 90 ? Math.max(0, p.opacity - 0.05) : p.opacity,
          }))
          .filter((p) => p.opacity > 0 && p.y < 110)
      );
    }, 30);
    return () => clearInterval(interval);
  }, [particles.length]);

  const displayName = decodedName;
  const displayOrderId = orderId ?? "";
  const displayAmount = parsedAmount.toFixed(2);

  if (!isValid) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-md w-full">
          <img src={logo} alt="ANIMUS" className="h-14 mx-auto mb-10" />
          <div className="w-20 h-20 mx-auto mb-6 rounded-full border-2 border-red-500/50 flex items-center justify-center">
            <span className="text-red-400 text-3xl">!</span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-3">
            Payment Error
          </h1>
          <p className="text-red-400/80 text-sm tracking-[0.3em] uppercase font-sans mb-6">
            Order Could Not Be Confirmed
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            We couldn't verify your payment details. This may happen if the transaction
            was cancelled or the confirmation link is incomplete. Please return to checkout
            and try again.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="inline-block h-12 px-10 bg-gold text-background text-xs tracking-[0.2em] uppercase font-medium hover:bg-gold-light transition-colors rounded-md leading-[48px]"
            >
              Return to Checkout
            </Link>
          </div>
        </div>
        <footer className="mt-auto pb-6 pt-8 text-center text-muted-foreground/50 text-xs tracking-widest">
          © {new Date().getFullYear()} ANIMUS — All Rights Reserved
        </footer>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
      {/* Confetti */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute pointer-events-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            transform: `rotate(${p.rotation}deg)`,
            opacity: p.opacity,
            borderRadius: "1px",
          }}
        />
      ))}

      <div className="text-center px-6 z-10 max-w-lg w-full">
        <img src={logo} alt="ANIMUS" className="h-14 mx-auto mb-10" />

        <div className="mb-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full border-2 border-gold flex items-center justify-center">
            <span className="text-gold text-3xl">✓</span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-3">
            {displayName ? `Thank you, ${displayName}!` : "Thank You"}
          </h1>
          <p className="text-gold text-sm tracking-[0.3em] uppercase font-sans">
            Your Order Is Confirmed
          </p>
        </div>

        {/* Order Summary Card */}
        <div className="border border-gold/20 rounded-lg p-5 sm:p-6 bg-[#1A1A1A] mb-8 text-left shadow-xl">
          <p className="text-xs tracking-[0.3em] uppercase text-gold font-sans mb-4 text-center">
            Order Summary
          </p>
          <div className="space-y-3 text-sm">
            {displayOrderId && (
              <div className="flex justify-between items-center gap-4">
                <span className="text-white/60">Order Number</span>
                <span className="text-white font-mono tracking-wide">#{displayOrderId}</span>
              </div>
            )}
            {displayAmount && (
              <div className="flex justify-between items-center gap-4">
                <span className="text-white/60">Total Amount</span>
                <span className="text-gold font-serif text-lg">${displayAmount}</span>
              </div>
            )}
            <div className="flex justify-between items-center gap-4">
              <span className="text-white/60">Status</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-400 text-xs tracking-widest uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Payment Confirmed
              </span>
            </div>
          </div>
        </div>

        <p className="text-muted-foreground text-sm leading-relaxed mb-8">
          Your ANIMUS Memorial Pendant is being crafted with care.
          We'll send you a confirmation email with tracking information
          once your pendant ships.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-block h-12 px-10 bg-gold text-background text-xs tracking-[0.2em] uppercase font-medium hover:bg-gold-light transition-colors rounded-md leading-[48px]"
          >
            Back to Home
          </Link>
        </div>
      </div>

      <footer className="mt-auto pb-6 pt-8 text-center text-muted-foreground/50 text-xs tracking-widest">
        © {new Date().getFullYear()} ANIMUS — All Rights Reserved
      </footer>
    </main>
  );
};

export default ThankYou;
