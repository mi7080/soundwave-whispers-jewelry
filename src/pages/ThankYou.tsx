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
  const orderId = searchParams.get("order");
  const [particles, setParticles] = useState<Particle[]>([]);

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
    createConfetti();
    const timer = setTimeout(() => setParticles([]), 5000);
    return () => clearTimeout(timer);
  }, [createConfetti]);

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

      <div className="text-center px-6 z-10 max-w-lg">
        <img src={logo} alt="ANIMUS" className="h-14 mx-auto mb-10" />

        <div className="mb-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full border-2 border-gold flex items-center justify-center">
            <span className="text-gold text-3xl">✓</span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-3">
            Thank You
          </h1>
          <p className="text-gold text-sm tracking-[0.3em] uppercase font-sans">
            Your Order Is Confirmed
          </p>
        </div>

        <p className="text-muted-foreground text-base leading-relaxed mb-8">
          Your ANIMUS Memorial Pendant is being crafted with care.
          We'll send you a confirmation email with tracking information
          once your pendant ships.
        </p>

        {orderId && (
          <p className="text-muted-foreground/60 text-xs tracking-widest mb-8">
            ORDER ID: {orderId.slice(0, 8).toUpperCase()}
          </p>
        )}

        <Link
          to="/"
          className="inline-block h-12 px-10 bg-gold text-background text-xs tracking-[0.2em] uppercase font-medium hover:bg-gold-light transition-colors rounded-md leading-[48px]"
        >
          Return Home
        </Link>
      </div>

      <footer className="absolute bottom-6 text-center text-muted-foreground/50 text-xs tracking-widest">
        © {new Date().getFullYear()} ANIMUS — All Rights Reserved
      </footer>
    </main>
  );
};

export default ThankYou;
