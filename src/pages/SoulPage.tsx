import { useParams, Link } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import { Play, Pause, X } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { mapOrderToSoulPageData, type SoulPageData } from "@/lib/soulPage";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const DEMO_DATA = {
  petName: "Max",
  photoUrl: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=400&fit=crop&crop=face",
  audioUrl: "",
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

const QUERY_RETRY_LIMIT = 2;
const QUERY_RETRY_DELAY_MS = 1200;
const SOUL_PAGE_TABLE = "animus_orders";
const PUBLIC_STORAGE_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public`;

interface SoulPageDebugState {
  status: "Loading" | "Success" | "Error";
  uuid: string;
  recordStatus: "Searching" | "Found" | "Not Found";
  errorMessage: string;
}

function stringifyDebugError(error: unknown): string {
  if (!error) return "";

  if (error instanceof Error) {
    return error.stack || error.message;
  }

  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
}

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

const SoulPageDebugMonitor = ({ debugState }: { debugState: SoulPageDebugState }) => (
  <div className="fixed inset-x-4 top-4 z-50 mx-auto max-w-2xl">
    <Alert className="border-border/60 bg-background/95 shadow-lg backdrop-blur-sm">
      <AlertTitle className="font-sans text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
        Debug Monitor
      </AlertTitle>
      <AlertDescription className="mt-3 space-y-2 font-mono text-xs text-foreground">
        <p>
          <span className="text-muted-foreground">Status:</span> {debugState.status}
        </p>
        <p>
          <span className="text-muted-foreground">UUID detected:</span> {debugState.uuid || "Missing"}
        </p>
        <p>
          <span className="text-muted-foreground">Database Record:</span> {debugState.recordStatus}
        </p>
        <div className="space-y-1">
          <p className="text-muted-foreground">Error Message:</p>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border/50 bg-muted/30 p-3 text-[11px] leading-relaxed text-foreground">
            {debugState.errorMessage || "None"}
          </pre>
        </div>
      </AlertDescription>
    </Alert>
  </div>
);

const SoulPageContent = ({ data, isDemo, previewMode, onClose, assetFolderId }: {
  data: { petName: string; photoUrl: string; audioUrl: string };
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
        for (let j = start; j < end; j++) {
          sum += Math.abs(rawData[j]);
        }
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

  try {
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
          {resolvedPhotoUrl && (
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
                  src={resolvedPhotoUrl}
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
  } catch (error) {
    return (
      <div className="min-h-screen bg-background px-4 py-24 text-foreground">
        <div className="mx-auto max-w-2xl space-y-4">
          <p className="text-[10px] tracking-[0.4em] uppercase text-gold/60 font-sans">Animus</p>
          <h1 className="text-3xl font-serif text-foreground">Soul Page render crash</h1>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-border/60 bg-muted/30 p-4 text-xs leading-relaxed text-foreground">
            {stringifyDebugError(error)}
          </pre>
        </div>
      </div>
    );
  }
};

const SoulPage = ({ previewMode, previewData, onClose }: SoulPageProps) => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<SoulPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [queryState, setQueryState] = useState<"loading" | "retrying" | "ready" | "not_found" | "error">("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [debugState, setDebugState] = useState<SoulPageDebugState>({
    status: "Loading",
    uuid: id || "",
    recordStatus: "Searching",
    errorMessage: "",
  });
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
      setDebugState({
        status: "Loading",
        uuid: rawId,
        recordStatus: "Searching",
        errorMessage: "",
      });

      // Preview mode (inline modal)
      if (previewMode && previewData) {
        if (!cancelled) {
          setData(previewData);
          setQueryState("ready");
          setLoading(false);
          setDebugState({
            status: "Success",
            uuid: rawId || "preview",
            recordStatus: "Found",
            errorMessage: "",
          });
        }
        return;
      }

      // Demo mode
      if (isDemo) {
        if (!cancelled) {
          setData(DEMO_DATA);
          setQueryState("ready");
          setLoading(false);
          setDebugState({
            status: "Success",
            uuid: rawId,
            recordStatus: "Found",
            errorMessage: "",
          });
        }
        return;
      }

      if (!normalizedId) {
        if (!cancelled) {
          setErrorMsg("No memory ID found.");
          setQueryState("error");
          setLoading(false);
          setDebugState({
            status: "Error",
            uuid: rawId,
            recordStatus: "Not Found",
            errorMessage: "No memory ID found.",
          });
        }
        return;
      }

      try {
        for (let attempt = 0; attempt < QUERY_RETRY_LIMIT; attempt++) {
          console.info("[SoulPage] Fetching soul page data", {
            table: SOUL_PAGE_TABLE,
            requestedId: normalizedId,
            attempt: attempt + 1,
          });

          const { data: order, error } = await supabase
            .from(SOUL_PAGE_TABLE)
            .select("id, pet_name, pet_photo_url, audio_url")
            .eq("id", normalizedId)
            .maybeSingle();

          if (cancelled) return;

          console.log("[SoulPage] Query result for ID:", normalizedId, {
            table: SOUL_PAGE_TABLE,
            order,
            error,
          });

          if (error) {
            console.error("[SoulPage] DB error:", error);
            const rawError = stringifyDebugError(error);

            if (attempt < QUERY_RETRY_LIMIT - 1) {
              setQueryState("retrying");
              setDebugState({
                status: "Loading",
                uuid: rawId,
                recordStatus: "Searching",
                errorMessage: rawError,
              });
              await wait(QUERY_RETRY_DELAY_MS);
              if (cancelled) return;
              continue;
            }

            setErrorMsg("Could not load this memory. Please try again.");
            setQueryState("error");
            setLoading(false);
            setDebugState({
              status: "Error",
              uuid: rawId,
              recordStatus: "Not Found",
              errorMessage: rawError,
            });
            return;
          }

          const resolvedData = order ? mapOrderToSoulPageData(order) : null;

          if (resolvedData) {
            setData(resolvedData);
            setQueryState("ready");
            setLoading(false);
            setDebugState({
              status: "Success",
              uuid: rawId,
              recordStatus: "Found",
              errorMessage: "",
            });
            return;
          }

          console.error("[SoulPage] No usable media found for memory:", { id: normalizedId, order });

          if (attempt < QUERY_RETRY_LIMIT - 1) {
            setQueryState("retrying");
            setDebugState({
              status: "Loading",
              uuid: rawId,
              recordStatus: order ? "Found" : "Searching",
              errorMessage: order ? "Row found in animus_orders, but pet_photo_url/audio_url were empty." : "",
            });
            await wait(QUERY_RETRY_DELAY_MS);
            if (cancelled) return;
            continue;
          }

          setErrorMsg(order ? "This memory is still syncing. Please retry in a moment." : "This memory page was not found.");
          setQueryState("not_found");
          setLoading(false);
          setDebugState({
            status: "Success",
            uuid: rawId,
            recordStatus: order ? "Found" : "Not Found",
            errorMessage: order ? "Row found in animus_orders, but pet_photo_url/audio_url were empty." : "",
          });
          return;
        }
      } catch (err) {
        if (cancelled) return;
        console.error("[SoulPage] Fetch error:", err);
        setErrorMsg("Something went wrong loading this memory.");
        setQueryState("error");
        setLoading(false);
        setDebugState({
          status: "Error",
          uuid: rawId,
          recordStatus: "Not Found",
          errorMessage: stringifyDebugError(err),
        });
        return;
      }
    };

    void fetchSoulData();
    return () => { cancelled = true; };
  }, [id, isDemo, previewMode, previewData, reloadKey]);

  try {
    if (loading) {
      return (
        <>
          {!previewMode && <SoulPageDebugMonitor debugState={debugState} />}
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto" />
              <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-sans">
                {queryState === "retrying" ? "Syncing Memory" : "Loading Memory"}
              </p>
            </div>
          </div>
        </>
      );
    }

    if (!data && !previewMode) {
      return (
        <>
          <SoulPageDebugMonitor debugState={debugState} />
          <div className="min-h-screen bg-background flex items-center justify-center px-6">
            <div className="max-w-md text-center space-y-4">
              <p className="text-[10px] tracking-[0.4em] uppercase text-gold/60 font-sans">Animus</p>
              <p className="text-muted-foreground font-sans">{errorMsg || "Memory not found."}</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setReloadKey((current) => current + 1)}
                  className="inline-block border border-border text-foreground px-8 py-3 text-[10px] tracking-[0.3em] uppercase hover:bg-muted transition-all duration-300"
                >
                  Retry Loading Memory
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
        </>
      );
    }

    if (!data) {
      return (
        <>
          {!previewMode && <SoulPageDebugMonitor debugState={debugState} />}
          <div className="min-h-screen bg-background flex items-center justify-center px-6">
            <div className="max-w-md text-center space-y-4">
              <p className="text-[10px] tracking-[0.4em] uppercase text-gold/60 font-sans">Animus</p>
              <p className="text-muted-foreground font-sans">{errorMsg || "This memory could not be displayed."}</p>
              <button
                onClick={() => setReloadKey((current) => current + 1)}
                className="inline-block border border-border text-foreground px-8 py-3 text-[10px] tracking-[0.3em] uppercase hover:bg-muted transition-all duration-300"
              >
                Retry Loading Memory
              </button>
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        {!previewMode && <SoulPageDebugMonitor debugState={debugState} />}
        <SoulPageContent
          data={data}
          isDemo={isDemo}
          previewMode={previewMode}
          onClose={onClose}
          assetFolderId={id?.trim()}
        />
      </>
    );
  } catch (error) {
    return (
      <div className="min-h-screen bg-background px-4 py-24 text-foreground">
        <div className="mx-auto max-w-2xl space-y-4">
          {!previewMode && <SoulPageDebugMonitor debugState={debugState} />}
          <p className="pt-32 text-[10px] tracking-[0.4em] uppercase text-gold/60 font-sans">Animus</p>
          <h1 className="text-3xl font-serif text-foreground">Soul Page crash</h1>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-border/60 bg-muted/30 p-4 text-xs leading-relaxed text-foreground">
            {stringifyDebugError(error)}
          </pre>
        </div>
      </div>
    );
  }
};

export default SoulPage;
