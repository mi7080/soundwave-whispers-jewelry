import { useParams, Link } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import { Play, Pause } from "lucide-react";

const SoulPage = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{ petName: string; photoUrl: string; audioUrl: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    if (!id) return;
    try {
      const decoded = JSON.parse(atob(decodeURIComponent(id)));
      setData(decoded);
    } catch {
      setData(null);
    }
  }, [id]);

  // Generate static waveform from audio URL
  const generateWaveform = useCallback(async (url: string) => {
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
      // Fallback: generate random waveform
      setWaveformData(Array.from({ length: 80 }, () => 0.2 + Math.random() * 0.8));
    }
  }, []);

  useEffect(() => {
    if (data?.audioUrl) generateWaveform(data.audioUrl);
  }, [data?.audioUrl, generateWaveform]);

  // Animate progress during playback
  useEffect(() => {
    const tick = () => {
      if (audioRef.current && !audioRef.current.paused) {
        const pct = audioRef.current.currentTime / (audioRef.current.duration || 1);
        setPlaybackProgress(pct);
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };
    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground font-sans">Soul page not found.</p>
      </div>
    );
  }

  const activeBar = Math.floor(playbackProgress * waveformData.length);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-10 py-16">
        {/* Pet Photo */}
        {data.photoUrl && (
          <div className="w-44 h-44 mx-auto rounded-full overflow-hidden border-2 border-gold/30 shadow-[0_0_40px_rgba(183,142,72,0.15)] animate-fade-in">
            <img
              src={data.photoUrl}
              alt={data.petName || "Pet"}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Pet Name */}
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

        {/* Animated Waveform Player */}
        {data.audioUrl && (
          <div className="space-y-6 animate-fade-in">
            {/* Waveform */}
            <div className="flex items-end justify-center gap-[2px] h-24 px-4">
              {waveformData.map((v, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all duration-150"
                  style={{
                    height: `${Math.max(v * 100, 6)}%`,
                    width: "3px",
                    backgroundColor:
                      i <= activeBar && isPlaying
                        ? "hsl(var(--gold))"
                        : "hsl(var(--muted-foreground) / 0.2)",
                    transform: isPlaying && Math.abs(i - activeBar) < 3
                      ? `scaleY(${1 + Math.random() * 0.3})`
                      : "scaleY(1)",
                    opacity: i <= activeBar && isPlaying ? 1 : 0.5 + v * 0.5,
                  }}
                />
              ))}
            </div>

            {/* Play Button */}
            <button
              onClick={togglePlay}
              className="w-16 h-16 mx-auto rounded-full border-2 border-gold/40 flex items-center justify-center text-gold hover:bg-gold/10 hover:border-gold/60 transition-all duration-300 hover:shadow-[0_0_20px_rgba(183,142,72,0.2)]"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
            </button>
            <p className="text-[11px] text-muted-foreground/50 tracking-widest font-sans uppercase">
              {isPlaying ? "Now playing…" : "Tap to hear their sound"}
            </p>
            <audio
              ref={audioRef}
              src={data.audioUrl}
              onEnded={() => { setIsPlaying(false); setPlaybackProgress(0); }}
            />
          </div>
        )}

        {/* CTA */}
        <div className="pt-10 space-y-6">
          <div className="border-t border-border/20" />
          <Link
            to="/"
            className="inline-block border border-gold/30 text-gold px-8 py-3 text-[10px] tracking-[0.3em] uppercase hover:bg-gold/10 hover:border-gold/50 transition-all duration-300"
          >
            Create Your Own Memory
          </Link>
          <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground/30 font-sans">
            Animus · Eternal Echo Pendant
          </p>
        </div>
      </div>
    </div>
  );
};

export default SoulPage;
