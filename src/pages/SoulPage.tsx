import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Play, Pause } from "lucide-react";
import { useRef } from "react";

const SoulPage = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{ petName: string; photoUrl: string; audioUrl: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!id) return;
    try {
      const decoded = JSON.parse(atob(decodeURIComponent(id)));
      setData(decoded);
    } catch {
      setData(null);
    }
  }, [id]);

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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center space-y-8 py-16">
        {/* Pet Photo */}
        {data.photoUrl && (
          <div className="w-40 h-40 mx-auto rounded-full overflow-hidden border-2 border-gold/30 shadow-lg shadow-gold/10">
            <img
              src={data.photoUrl}
              alt={data.petName || "Pet"}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Pet Name */}
        <div className="space-y-2">
          <p className="text-xs tracking-[0.4em] uppercase text-gold/70 font-sans">
            In Loving Memory
          </p>
          <h1 className="text-4xl font-serif text-foreground">
            {data.petName || "Beloved Pet"}
          </h1>
        </div>

        {/* Audio Player */}
        {data.audioUrl && (
          <div className="space-y-4">
            <button
              onClick={togglePlay}
              className="w-16 h-16 mx-auto rounded-full border-2 border-gold/40 flex items-center justify-center text-gold hover:bg-gold/10 transition-colors"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
            </button>
            <p className="text-xs text-muted-foreground/60 tracking-wide font-sans">
              {isPlaying ? "Now playing their sound…" : "Tap to hear their sound"}
            </p>
            <audio ref={audioRef} src={data.audioUrl} onEnded={() => setIsPlaying(false)} />
          </div>
        )}

        {/* Branding */}
        <div className="pt-8 border-t border-border/20">
          <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground/40 font-sans">
            Animus · Eternal Echo Pendant
          </p>
        </div>
      </div>
    </div>
  );
};

export default SoulPage;
