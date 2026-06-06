import { Play, Pause } from "lucide-react";
import { useState, useRef } from "react";

const PRESETS = [
  { label: "Baby's First Laugh", emoji: "👶", description: "A joyful giggle" },
  { label: "Heartbeat", emoji: "❤️", description: "The rhythm of life" },
  { label: "A Beloved Voice", emoji: "🐾", description: "A loyal companion's sound" },
  { label: '"I Love You"', emoji: "💬", description: "Three words, forever" },
];

const AudioPresets = () => {
  return (
    <div className="space-y-3">
      <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/60 font-sans">
        Inspiration - sounds our customers capture
      </p>
      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map((preset) => (
          <div
            key={preset.label}
            className="flex items-center gap-3 border border-border/30 rounded-sm px-3 py-2.5 bg-background/30 hover:border-gold/30 transition-colors cursor-default"
          >
            <span className="text-lg">{preset.emoji}</span>
            <div className="min-w-0">
              <p className="text-xs text-foreground/80 font-sans truncate">{preset.label}</p>
              <p className="text-[9px] text-muted-foreground/50 font-light">{preset.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AudioPresets;
