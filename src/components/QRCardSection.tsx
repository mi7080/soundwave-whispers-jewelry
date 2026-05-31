import { useRef, useState } from "react";
import { Play, Pause, QrCode } from "lucide-react";

const DEMO_PHOTO =
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&h=500&fit=crop&crop=faces";
const DEMO_AUDIO = "/demo-heartbeat.wav";
const BARS = [6, 12, 20, 28, 18, 30, 14, 24, 10, 22, 16, 8, 18, 26, 12];

const QRCardSection = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) a.pause();
    else a.play().catch(() => {});
    setIsPlaying((p) => !p);
  };

  return (
    <section id="soul" className="py-24 md:py-32 bg-background overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          {/* Copy column */}
          <div className="space-y-8 lg:pr-6">
            <p className="text-xs tracking-[0.2em] text-gold font-sans">
              The Digital Soul Page
            </p>
            <h2 className="text-4xl md:text-5xl font-serif font-medium text-foreground leading-[1.05]">
              More than a pendant,{" "}
              <span className="italic text-[hsl(24_47%_47%)]">a living memory.</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed font-light text-lg max-w-xl">
              Every ANIMUS pendant carries a unique QR code engraved directly into
              the metal. Scan it with any smartphone and the original recording
              plays back instantly, their voice, anytime, anywhere.
            </p>

            <div className="flex items-center gap-5 pt-1">
              <span className="w-12 h-px bg-gold/60" aria-hidden="true" />
              <p className="text-sm text-muted-foreground tracking-wide italic font-light">
                Press play. This is exactly what a scan reveals.
              </p>
            </div>
          </div>

          {/* The live Soul Page example */}
          <div className="relative flex justify-center lg:justify-end">
            {/* soft warm halo behind the device */}
            <div
              className="absolute inset-0 -z-10 blur-3xl opacity-70"
              aria-hidden="true"
              style={{
                background:
                  "radial-gradient(50% 50% at 60% 40%, hsl(35 46% 60% / 0.45) 0%, transparent 70%)",
              }}
            />

            <div className="relative w-[300px] md:w-[340px]">
              {/* Phone frame */}
              <div className="rounded-[2.75rem] bg-primary p-3 ring-1 ring-border shadow-[0_30px_70px_-35px_rgba(90,60,30,0.4)]">
                <div className="rounded-[2.25rem] overflow-hidden bg-card">
                  {/* The Soul Page photo + play control */}
                  <div className="relative">
                    <img
                      src={DEMO_PHOTO}
                      alt="A grandmother remembered on her ANIMUS Soul Page"
                      className="w-full h-64 object-cover"
                    />
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-primary/50 to-transparent"
                      aria-hidden="true"
                    />
                    <button
                      type="button"
                      onClick={togglePlay}
                      aria-label={isPlaying ? "Pause sample" : "Play sample"}
                      className="absolute inset-0 flex items-center justify-center group"
                    >
                      <span className="flex items-center justify-center w-16 h-16 rounded-full bg-card/90 ring-1 ring-border shadow-[0_18px_40px_-16px_rgba(80,55,30,0.7)] transition-transform duration-300 group-hover:scale-105">
                        {isPlaying ? (
                          <Pause className="w-6 h-6 text-[hsl(24_47%_47%)]" fill="currentColor" strokeWidth={0} />
                        ) : (
                          <Play className="w-6 h-6 text-[hsl(24_47%_47%)] translate-x-0.5" fill="currentColor" strokeWidth={0} />
                        )}
                      </span>
                    </button>
                  </div>

                  {/* Playback meta */}
                  <div className="px-6 py-6 space-y-4 text-center">
                    <p className="font-serif text-xl font-medium text-foreground leading-tight">
                      For Grandma, always.
                    </p>
                    {/* waveform, animates while playing */}
                    <div className="flex items-end justify-center gap-1 h-8" aria-hidden="true">
                      {BARS.map((h, i) => (
                        <span
                          key={i}
                          className="w-1 rounded-full bg-gold/70"
                          style={{
                            height: `${h}px`,
                            transformOrigin: "bottom",
                            animation: isPlaying ? `soundbar 0.9s ease-in-out ${i * 0.05}s infinite` : "none",
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground font-light italic">
                      {isPlaying ? "Now playing, her heartbeat." : "Tap play, and hear them again."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Floating engraved QR keepsake, overlapping the phone */}
              <div className="absolute -left-8 -bottom-8 md:-left-12 rounded-2xl bg-card ring-1 ring-border p-4 shadow-[0_30px_70px_-35px_rgba(90,60,30,0.4)]">
                <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-background ring-1 ring-border">
                  <QrCode className="w-9 h-9 text-foreground" strokeWidth={1.25} />
                </div>
                <p className="mt-2 text-[10px] tracking-[0.2em] text-gold text-center font-sans">
                  ENGRAVED
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={DEMO_AUDIO}
        onEnded={() => setIsPlaying(false)}
        preload="none"
      />
    </section>
  );
};

export default QRCardSection;
