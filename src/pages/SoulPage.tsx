import { useParams, Link } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import { Play, Pause, X } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { mapOrderToSoulPageData, type SoulPageData } from "@/lib/soulPage";

const DEMO_DATA: SoulPageData = {
  petName: "Grandma Rose",
  photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face",
  audioUrl: "",
  textMessage: "Your love lives on in every heartbeat. We carry you with us, always.",
};

const DEMO_WAVEFORM = Array.from({ length: 80 }, (_, i) => {
  const x = i / 80;
  return 0.3 + 0.7 * Math.abs(Math.sin(x * Math.PI * 4) * Math.cos(x * Math.PI * 2.5) + Math.sin(x * Math.PI * 7) * 0.3);
});

interface SoulPageProps {
  previewMode?: boolean;
  previewData?: { petName: string; photoUrl: string; audioUrl: string; textMessage?: string };
  onClose?: () => void;
}

const QUERY_RETRY_LIMIT = 2;
const QUERY_RETRY_DELAY_MS = 1200;
const SOUL_PAGE_TABLE = "animus_orders";
const PUBLIC_STORAGE_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public`;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function resolvePublicAssetUrl(assetUrl: string, orderId?: string): string {
  const trimmed = assetUrl?.trim() || "";
  if (!trimmed) return "";
  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const normalizedPath = trimmed.replace(/^\/+/, "");
  if (normalizedPath.startsWith("storage/v1/object/public/")) {
    return `${import.meta.env.VITE_SUPABASE_URL}/${normalizedPath}`;
  }
  if (normalizedPath.startsWith("soul_assets/") || normalizedPath.startsWith("production_assets/")) {
    return `${PUBLIC_STORAGE_BASE_URL}/${normalizedPath}`;
  }
  if (orderId) {
    return `${PUBLIC_STORAGE_BASE_URL}/soul_assets/${orderId}/${normalizedPath}`;
  }
  return `${PUBLIC_STORAGE_BASE_URL}/${normalizedPath}`;
}

const SoulPageContent = ({ data, isDemo, previewMode, onClose, assetFolderId }: {
  data: SoulPageData;
  isDemo: boolean;
  previewMode?: boolean;
  onClose?: () => void;
  assetFolderId?: string;
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>(isDemo ? DEMO_WAVEFORM : []);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [rippleScale, setRippleScale] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animFrameRef = useRef<number>(0);

  const resolvedPhotoUrl = previewMode || isDemo
    ? data.photoUrl
    : resolvePublicAssetUrl(data.photoUrl, assetFolderId);
  const resolvedAudioUrl = previewMode || isDemo
    ? data.audioUrl
    : resolvePublicAssetUrl(data.audioUrl, assetFolderId);

  const generateWaveform = useCallback(async (url: string) => {
    if (isDemo) return;
    try {
      const res = await fetch(url);
      const buf = await res.arrayBuffer();
      const ctx = new AudioContext();
      const audioBuffer = await ctx.decodeAudioData(buf);
      const rawData = audioBuffer.getChannelData(0);
      const samples = 80;
      const blockSize = Math.max(1, Math.floor(rawData.length / samples));
      const filtered: number[] = [];
      for (let i = 0; i < samples; i++) {
        const start = i * blockSize;
        const end = Math.min(start + blockSize, rawData.length);
        let sum = 0;
        for (let j = start; j < end; j++) sum += Math.abs(rawData[j]);
        filtered.push(sum / Math.max(1, end - start));
      }
      const max = Math.max(...filtered, 0);
      setWaveformData(max > 0 ? filtered.map((v) => v / max) : Array.from({ length: samples }, () => 0.25));
      ctx.close();
    } catch {
      setWaveformData(Array.from({ length: 80 }, () => 0.2 + Math.random() * 0.8));
    }
  }, [isDemo]);

  useEffect(() => {
    if (resolvedAudioUrl && !isDemo) generateWaveform(resolvedAudioUrl);
  }, [generateWaveform, isDemo, resolvedAudioUrl]);

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
        {/* Memory Photo — Circular with golden ripples */}
        {resolvedPhotoUrl ? (
          <div className="relative w-48 h-48 mx-auto animate-fade-in">
            {/* Outer golden ripple rings */}
            <div
              className="absolute inset-[-12px] rounded-full border border-gold/15 transition-transform duration-500"
              style={{ transform: `scale(${rippleScale * 1.08})`, opacity: isPlaying ? 0.8 : 0.4 }}
            />
            <div
              className="absolute inset-[-24px] rounded-full border border-gold/8 transition-transform duration-700"
              style={{ transform: `scale(${rippleScale * 1.12})`, opacity: isPlaying ? 0.5 : 0.2 }}
            />
            <div
              className="absolute inset-[-36px] rounded-full border border-gold/5 transition-transform duration-1000"
              style={{ transform: `scale(${rippleScale * 1.15})`, opacity: isPlaying ? 0.3 : 0.1 }}
            />
            {/* Photo circle */}
            <div className="w-full h-full rounded-full overflow-hidden border-2 border-gold/40 shadow-[0_0_50px_rgba(183,142,72,0.2)] relative z-10">
              <img
                src={resolvedPhotoUrl}
                alt={data.petName || "Memorial"}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        ) : (
          /* Placeholder ANIMUS logo circle when no photo */
          <div className="relative w-48 h-48 mx-auto animate-fade-in">
            <div className="w-full h-full rounded-full border-2 border-gold/30 flex items-center justify-center bg-card/50">
              <span className="text-2xl tracking-[0.4em] text-gold/40 font-serif">A</span>
            </div>
          </div>
        )}

        {/* Name — Serif typography */}
        <div className="space-y-3 animate-fade-in">
          <p className="text-[10px] tracking-[0.5em] uppercase text-gold/60 font-sans">
            In Loving Memory
          </p>
          <h1 className="text-4xl md:text-5xl font-serif text-foreground">
            {data.petName || "Beloved"}
          </h1>
          <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground/50 font-sans">
            Eternal Echo
          </p>
        </div>

        {/* Personal Message — Elegant display */}
        {data.textMessage && (
          <div className="animate-fade-in px-4">
            <div className="relative py-6">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-[1px] bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
              <p className="text-base md:text-lg text-foreground/70 font-light italic leading-relaxed font-serif">
                "{data.textMessage}"
              </p>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-[1px] bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
            </div>
          </div>
        )}

        {/* Interactive Waveform + Play Button */}
        {(resolvedAudioUrl || isDemo) && (
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

            {/* Play/Pause Button */}
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
            {resolvedAudioUrl && (
              <audio
                ref={audioRef}
                src={resolvedAudioUrl}
                onEnded={() => { setIsPlaying(false); setPlaybackProgress(0); }}
              />
            )}
          </div>
        )}

        {/* Footer */}
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
            Animus · Memory Pendant
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
  const [queryState, setQueryState] = useState<"loading" | "retrying" | "ready" | "not_found" | "error">("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const isDemo = id === "demo";

  useEffect(() => {
    let cancelled = false;
    const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
    const rawId = id || "";
    const normalizedId = rawId.trim();

    const fetchSoulData = async () => {
      setLoading(true);
      setData(null);
      setErrorMsg(null);
      setQueryState("loading");

      if (previewMode && previewData) {
        if (!cancelled) {
          setData(previewData);
          setQueryState("ready");
          setLoading(false);
        }
        return;
      }

      if (isDemo) {
        if (!cancelled) {
          setData(DEMO_DATA);
          setQueryState("ready");
          setLoading(false);
        }
        return;
      }

      if (!normalizedId) {
        if (!cancelled) {
          setErrorMsg("No memory ID found.");
          setQueryState("error");
          setLoading(false);
        }
        return;
      }

      if (!UUID_REGEX.test(normalizedId)) {
        if (!cancelled) {
          setErrorMsg("Invalid Memory Link — the ID in the URL is not a valid format.");
          setQueryState("error");
          setLoading(false);
        }
        return;
      }

      try {
        for (let attempt = 0; attempt < QUERY_RETRY_LIMIT; attempt++) {
          const { data: order, error } = await supabase
            .from(SOUL_PAGE_TABLE)
            .select("id, pet_name, pet_photo_url, audio_url, text_message")
            .eq("id", normalizedId)
            .maybeSingle();

          if (cancelled) return;

          if (error) {
            if (attempt < QUERY_RETRY_LIMIT - 1) {
              setQueryState("retrying");
              await wait(QUERY_RETRY_DELAY_MS);
              if (cancelled) return;
              continue;
            }
            setErrorMsg("Could not load this memory. Please try again.");
            setQueryState("error");
            setLoading(false);
            return;
          }

          if (order) {
            const resolvedData = mapOrderToSoulPageData(order as any);
            if (resolvedData) {
              setData(resolvedData);
              setQueryState("ready");
              setLoading(false);
              return;
            }
          }

          if (attempt < QUERY_RETRY_LIMIT - 1) {
            setQueryState("retrying");
            await wait(QUERY_RETRY_DELAY_MS);
            if (cancelled) return;
            continue;
          }

          setErrorMsg("Searching for your memory. Please give it a moment and try again.");
          setQueryState("not_found");
          setLoading(false);
          return;
        }
      } catch {
        if (cancelled) return;
        setErrorMsg("Something went wrong loading this memory.");
        setQueryState("error");
        setLoading(false);
      }
    };

    void fetchSoulData();
    return () => { cancelled = true; };
  }, [id, isDemo, previewMode, previewData, reloadKey]);

  const isSearchingForMemory = queryState === "not_found";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto" />
          <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-sans">
            {queryState === "retrying" ? "Crafting your memory…" : "Loading Memory"}
          </p>
        </div>
      </div>
    );
  }

  if (!data && !previewMode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <p className="text-[10px] tracking-[0.4em] uppercase text-gold/60 font-sans">Animus</p>
          {isSearchingForMemory ? (
            <>
              <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto" />
              <h1 className="text-3xl font-serif text-foreground">Crafting your memory…</h1>
              <p className="text-muted-foreground font-sans">
                {errorMsg || "We haven't found this record yet. If you just completed your design, give it a moment and try again."}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground font-sans">{errorMsg || "Memory not found."}</p>
          )}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setReloadKey((c) => c + 1)}
              className="inline-block border border-border text-foreground px-8 py-3 text-[10px] tracking-[0.3em] uppercase hover:bg-muted transition-all duration-300"
            >
              {isSearchingForMemory ? "Search Again" : "Reload"}
            </button>
            <Link
              to="/"
              className="inline-block border border-gold/30 text-gold px-8 py-3 text-[10px] tracking-[0.3em] uppercase hover:bg-gold/10 hover:border-gold/50 transition-all duration-300"
            >
              Create Your Own Memory
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <p className="text-[10px] tracking-[0.4em] uppercase text-gold/60 font-sans">Animus</p>
          <p className="text-muted-foreground font-sans">{errorMsg || "This memory could not be displayed."}</p>
          <button
            onClick={() => setReloadKey((c) => c + 1)}
            className="inline-block border border-border text-foreground px-8 py-3 text-[10px] tracking-[0.3em] uppercase hover:bg-muted transition-all duration-300"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <SoulPageContent
      data={data}
      isDemo={isDemo}
      previewMode={previewMode}
      onClose={onClose}
      assetFolderId={id?.trim()}
    />
  );
};

export default SoulPage;
