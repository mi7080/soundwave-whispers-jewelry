import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Scroll-reveal wrapper: fades + rises its children into view once.
 * After the reveal transition settles it drops the transform utility, so any
 * position:sticky descendants (which a transformed ancestor would break) work.
 */
const Reveal = ({ children, className = "" }: { children: ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      setSettled(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const motion = settled
    ? "opacity-100"
    : shown
      ? "opacity-100 translate-y-0"
      : "opacity-0 translate-y-10";

  return (
    <div
      ref={ref}
      onTransitionEnd={() => shown && setSettled(true)}
      className={`transition-[opacity,transform] duration-[800ms] ease-out ${motion} ${className}`}
    >
      {children}
    </div>
  );
};

export default Reveal;
