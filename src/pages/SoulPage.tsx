import { useParams, Link } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import { Play, Pause, X } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";

const DEMO_DATA = {
  petName: "Max",
  photoUrl: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=400&fit=crop&crop=face",
  audioUrl: "https://res.cloudinary.com/dsmbuwxqf/video/upload/v1700000000/sample-dog-bark.mp3",
};

const DEMO_WAVEFORM = Array.from({ length: 80 }, (_, i) => {
  const x = i / 80;
  return 0.3 + 0.7 * Math.abs(Math.sin(x * Math.PI * 4) * Math.cos(x * Math.PI * 2.5) + Math.sin(x * Math.PI * 7) * 0.3);
});

interface SoulPageProps {
  previewMode?: boolean;
  previewData?: { petName: string; photoUrl: string; audioUrl: string };
  onClose?: () => void;
}

interface SoulPageData {
  petName: string;
  photoUrl: string;
  audioUrl: string;
}


const mapOrderToSoulData = (order: {
  pet_name: string;
  pet_photo_url: string | null;
  audio_url: string;
}): SoulPageData => ({
  petName: order.pet_name,
  photoUrl: order.pet_photo_url || "",
  audioUrl: order.audio_url,
});

const SoulPageContent = ({ data, isDemo, previewMode, onClose }: {
  data: { petName: string; photoUrl: string; audioUrl: string };
  isDemo: boolean;
  previewMode?: boolean;
  onClose?: () => void;
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>(isDemo ? DEMO_WAVEFORM : []);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [rippleScale, setRippleScale] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animFrameRef = useRef<number>(0);

  const generateWaveform = useCallback(async (url: string) => {
    if (isDemo) return;
    try {
      const res = await fetch(url);
      const buf = await res.arrayBuffer();
      const ctx = new AudioContext();
      const audioBuffer = await ctx.decodeAudioData(buf);
      const rawData = audioBuffer.getChannelData(0);
      const samples = 80;
      const blockSize = Math.floor(rawData.length / samples);
      const filtered: number[] = [];
      for (let i = 0; i < samples; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(rawData[i * blockSize + j]);
        }
        filtered.push(sum / blockSize);
      }
      const max = Math.max(...filtered);
      setWaveformData(filtered.map((v) => v / max));
      ctx.close();
    } catch {
      setWaveformData(Array.from({ length: 80 }, () => 0.2 + Math.random() * 0.8));
    }
  }, [isDemo]);

  useEffect(() => {
    if (data.audioUrl && !isDemo) generateWaveform(data.audioUrl);
  }, [data.audioUrl, generateWaveform, isDemo]);

  useEffect(() => {
    const tick = () => {
      if (audioRef.current && !audioRef.current.paused) {
        const pct = audioRef.current.currentTime / (audioRef.current.duration || 1);
        setPlaybackProgress(pct);
        setRippleScale(1 + Math.sin(audioRef.current.currentTime * 6) * 0.15);
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };
    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(tick);
    } else {
      setRippleScale(1);
    }
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  const activeBar = Math.floor(playbackProgress * waveformData.length);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 sm:px-6 relative">
      {!previewMode && (
        <Helmet>
          <meta name="robots" content="noindex, nofollow" />
          <title>{`${data.petName || "Memorial"} — Eternal Echo | ANIMUS`}</title>
        </Helmet>
      )}
      {previewMode && onClose && (
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-10 w-10 h-10 rounded-full border border-border/50 flex items-center justify-center text-muted-foreground hover:text-gold hover:border-gold/50 transition-all duration-300"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {isDemo && (
        <div className="absolute top-6 left-6 z-10">
          <span className="text-[9px] tracking-[0.3em] uppercase text-gold/60 border border-gold/20 rounded-sm px-3 py-1 font-sans bg-gold/5">
            Sample Preview
          </span>
        </div>
      )}

      {previewMode && (
        <div className="absolute top-6 left-6 z-10">
          <span className="text-[9px] tracking-[0.3em] uppercase text-gold/60 border border-gold/20 rounded-sm px-3 py-1 font-sans bg-gold/5">
            Preview
          </span>
        </div>
      )}

      <div className="max-w-md w-full text-center space-y-10 py-16">
        {data.photoUrl && (
          <div className="relative w-44 h-44 mx-auto animate-fade-in">
            <div
              className="absolute inset-0 rounded-full border border-gold/10 transition-transform duration-300"
              style={{ transform: `scale(${rippleScale * 1.15})`, opacity: isPlaying ? 0.6 : 0 }}
            />
            <div
              className="absolute inset-0 rounded-full border border-gold/5 transition-transform duration-500"
              style={{ transform: `scale(${rippleScale * 1.3})`, opacity: isPlaying ? 0.3 : 0 }}
            />
            <div className="w-full h-full rounded-full overflow-hidden border-2 border-gold/30 shadow-[0_0_40px_rgba(183,142,72,0.15)] relative z-10">
              <img
                src={data.photoUrl}
                alt={data.petName || "Pet"}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        <div className="space-y-3 animate-fade-in">
          <p className="text-[10px] tracking-[0.5em] uppercase text-gold/60 font-sans">
            In Loving Memory
          </p>
          <h1 className="text-4xl md:text-5xl font-serif text-foreground">
            {data.petName || "Beloved Pet"}
          </h1>
          <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground/50 font-sans">
            Eternal Echo
          </p>
        </div>

        {(data.audioUrl || isDemo) && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-end justify-center gap-[2px] h-28 px-4">
              {waveformData.map((v, i) => {
                const isActive = i <= activeBar && isPlaying;
                const isNearHead = isPlaying && Math.abs(i - activeBar) < 4;
                return (
                  <div
                    key={i}
                    className="rounded-full"
                    style={{
                      height: `${Math.max(v * 100, 6)}%`,
                      width: "3px",
                      backgroundColor: isActive
                        ? "hsl(var(--gold))"
                        : "hsl(var(--muted-foreground) / 0.15)",
                      transform: isNearHead ? `scaleY(${1 + (v * 0.4)})` : "scaleY(1)",
                      opacity: isActive ? 1 : 0.4 + v * 0.5,
                      transition: "background-color 0.15s, opacity 0.15s, transform 0.2s",
                      boxShadow: isNearHead ? "0 0 8px hsl(var(--gold) / 0.4)" : "none",
                    }}
                  />
                );
              })}
            </div>

            <div className="relative w-24 h-24 sm:w-20 sm:h-20 mx-auto">
              {isPlaying && (
                <>
                  <div
                    className="absolute inset-0 rounded-full border border-gold/20"
                    style={{ animation: "pulse 2s ease-in-out infinite" }}
                  />
                  <div
                    className="absolute -inset-3 rounded-full border border-gold/10"
                    style={{ animation: "pulse 2s ease-in-out infinite 0.5s" }}
                  />
                </>
              )}
              <button
                onClick={togglePlay}
                aria-label={isPlaying ? "Pause audio" : "Play audio"}
                className="relative z-10 w-24 h-24 sm:w-20 sm:h-20 rounded-full border-2 border-gold/40 flex items-center justify-center text-gold hover:bg-gold/10 hover:border-gold/60 active:bg-gold/20 transition-all duration-300 hover:shadow-[0_0_30px_rgba(183,142,72,0.25)]"
              >
                {isPlaying ? <Pause className="w-9 h-9 sm:w-7 sm:h-7" /> : <Play className="w-9 h-9 sm:w-7 sm:h-7 ml-1" />}
              </button>
            </div>
            <p className="text-xs sm:text-[11px] text-muted-foreground/50 tracking-widest font-sans uppercase">
              {isPlaying ? "Now playing…" : "Tap to hear their sound"}
            </p>
            {data.audioUrl && (
              <audio
                ref={audioRef}
                src={data.audioUrl}
                onEnded={() => { setIsPlaying(false); setPlaybackProgress(0); }}
              />
            )}
          </div>
        )}

        <div className="pt-10 space-y-6">
          <div className="border-t border-border/20" />
          {previewMode && onClose ? (
            <button
              onClick={onClose}
              className="inline-block border border-gold/30 text-gold px-8 py-3 text-[10px] tracking-[0.3em] uppercase hover:bg-gold/10 hover:border-gold/50 transition-all duration-300"
            >
              Close Preview
            </button>
          ) : (
            <Link
              to="/"
              className="inline-block border border-gold/30 text-gold px-8 py-3 text-[10px] tracking-[0.3em] uppercase hover:bg-gold/10 hover:border-gold/50 transition-all duration-300"
            >
              Create Your Own Memory
            </Link>
          )}
          <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground/30 font-sans">
            Animus · Eternal Echo Pendant
          </p>
        </div>
      </div>
    </div>
  );
};

const SoulPage = ({ previewMode, previewData, onClose }: SoulPageProps) => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<SoulPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isDemo = id === "demo";

  useEffect(() => {
    let cancelled = false;

    const fetchSoulData = async () => {
      setLoading(true);
      setData(null);
      setErrorMsg(null);

      // Preview mode (inline modal)
      if (previewMode && previewData) {
        if (!cancelled) { setData(previewData); setLoading(false); }
        return;
      }

      // Demo mode
      if (isDemo) {
        if (!cancelled) { setData(DEMO_DATA); setLoading(false); }
        return;
      }

      const normalizedId = (id || "").trim();
      if (!normalizedId) {
        if (!cancelled) { setErrorMsg("No memory ID found."); setLoading(false); }
        return;
      }

      // UUID lookup from database (DB stores full Cloudinary asset URLs)
      try {
        const { data: order, error } = await supabase
          .from("animus_orders")
          .select("id, pet_name, pet_photo_url, audio_url")
          .eq("id", normalizedId)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error("[SoulPage] DB error:", error);
          setErrorMsg("Could not load this memory. Please try again.");
          setLoading(false);
          return;
        }

        if (order) {
          setData(mapOrderToSoulData(order));
        } else {
          setErrorMsg("This memory page was not found.");
        }
      } catch (err) {
        if (cancelled) return;
        console.error("[SoulPage] Fetch error:", err);
        setErrorMsg("Something went wrong loading this memory.");
      }

      if (!cancelled) setLoading(false);
    };

    void fetchSoulData();
    return () => { cancelled = true; };
  }, [id, isDemo, previewMode, previewData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (!data && !previewMode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <p className="text-[10px] tracking-[0.4em] uppercase text-gold/60 font-sans">Animus</p>
          <p className="text-muted-foreground font-sans">{errorMsg || "Memory not found."}</p>
          <Link
            to="/"
            className="inline-block border border-gold/30 text-gold px-8 py-3 text-[10px] tracking-[0.3em] uppercase hover:bg-gold/10 hover:border-gold/50 transition-all duration-300 mt-4"
          >
            Create Your Own Memory
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return <SoulPageContent data={data} isDemo={isDemo} previewMode={previewMode} onClose={onClose} />;
};

export default SoulPage;
