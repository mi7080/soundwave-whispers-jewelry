import { useState } from "react";
import { Play, Sparkles } from "lucide-react";
import SoulPage from "@/pages/SoulPage";
import messageCardImage from "@/assets/animus-message-card.png";

const DEMO_PET_NAME = "Luna";
const DEMO_PHOTO = "https://images.unsplash.com/photo-1552053831-71594a27632d?w=600&h=600&fit=crop&crop=face";
const DEMO_AUDIO = "https://res.cloudinary.com/dsmbuwxqf/video/upload/v1700000000/sample-dog-bark.mp3";

const LiveDemoModule = () => {
  const [showDemo, setShowDemo] = useState(false);

  return (
    <>
      <div className="border border-gold/20 rounded-sm bg-gradient-to-b from-gold/[0.03] to-transparent p-6 md:p-8 space-y-5">
        <div className="flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-gold" />
          <p className="text-[10px] tracking-[0.4em] uppercase text-gold font-sans">
            Instant Demo
          </p>
        </div>

        <h3 className="text-xl md:text-2xl font-serif text-foreground leading-snug">
          See How Your Soul Sound{" "}
          <span className="italic text-gold">Becomes Art</span>
        </h3>

        <p className="text-sm text-muted-foreground font-light leading-relaxed">
          Experience the full Soul Page in under 5 seconds — no uploads needed.
          We've prepared a premium sample with {DEMO_PET_NAME}'s recording.
        </p>

        <button
          onClick={() => setShowDemo(true)}
          className="inline-flex items-center gap-3 border border-gold/40 text-gold px-8 py-3.5 text-[10px] tracking-[0.3em] uppercase hover:bg-gold/10 hover:border-gold/60 transition-all duration-300 group"
        >
          <Play className="w-4 h-4 group-hover:scale-110 transition-transform" />
          Activate Live Demo
        </button>
      </div>

      {showDemo && (
        <div className="fixed inset-0 z-[100] bg-background animate-fade-in">
          <SoulPage
            previewMode
            previewData={{
              petName: DEMO_PET_NAME,
              photoUrl: DEMO_PHOTO,
              audioUrl: DEMO_AUDIO,
            }}
            onClose={() => setShowDemo(false)}
          />
        </div>
      )}
    </>
  );
};

export default LiveDemoModule;
