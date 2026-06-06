// VideoUpload - video-to-audio extractor for the Soul Page customizer.
// STATUS: Complete but not yet wired into ProductSection.
// To integrate: import and render inside the "Upload Audio" step of ProductSection.tsx,
// passing preOrderId as orderId, handleAudioUrl as onAudioUrl, and setWaveformData as onWaveform.
import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, X, Loader2, Scissors, Video as VideoIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { extractAudioSegment, blobToWaveform } from "@/lib/videoTrim";
import { toast } from "sonner";

const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB
const MAX_CLIP_SEC = 10;

interface VideoUploadProps {
  orderId: string;
  onAudioUrl: (url: string) => void;
  onVideoUrl: (url: string) => void;
  onWaveform: (data: number[]) => void;
}

const VideoUpload = ({ orderId, onAudioUrl, onVideoUrl, onWaveform }: VideoUploadProps) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(MAX_CLIP_SEC);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processStage, setProcessStage] = useState(0); // 0=idle 1=video 2=extract 3=waveform 4=audio
  const videoRef = useRef<HTMLVideoElement>(null);

  const STAGES = [
    { label: "Upload Video" },
    { label: "Extract Audio" },
    { label: "Build Waveform" },
    { label: "Save Sound" },
  ];

  useEffect(() => {
    return () => {
      if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl);
    };
  }, [videoBlobUrl]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_VIDEO_BYTES) {
      toast.error("Video too large. Max 100 MB.");
      return;
    }
    if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl);
    const url = URL.createObjectURL(f);
    setVideoFile(f);
    setVideoBlobUrl(url);
    setDone(false);
    setStart(0);
    setEnd(MAX_CLIP_SEC);
  };

  const onLoadedMetadata = () => {
    const d = videoRef.current?.duration || 0;
    setDuration(d);
    setEnd(Math.min(MAX_CLIP_SEC, d));
  };

  const onStartChange = (v: number) => {
    const ns = Math.max(0, Math.min(v, duration - 0.5));
    setStart(ns);
    if (end - ns > MAX_CLIP_SEC) setEnd(ns + MAX_CLIP_SEC);
    if (ns >= end) setEnd(Math.min(duration, ns + 0.5));
    if (videoRef.current) videoRef.current.currentTime = ns;
  };
  const onEndChange = (v: number) => {
    const ne = Math.max(start + 0.5, Math.min(v, duration, start + MAX_CLIP_SEC));
    setEnd(ne);
  };

  const handleProcess = useCallback(async () => {
    if (!videoFile) return;
    setBusy(true);
    setProgress(0);
    setProcessStage(0);
    try {
      // Stage 1 - Upload full video to soul_videos (0 → 20%)
      setProcessStage(1);
      setProgress(0.05);
      const ext = (videoFile.name.split(".").pop() || "mp4").toLowerCase();
      const videoPath = `${orderId}/${Date.now()}.${ext}`;
      const { error: vidErr } = await supabase.storage
        .from("soul_videos")
        .upload(videoPath, videoFile, {
          contentType: videoFile.type || "video/mp4",
          upsert: true,
        });
      if (vidErr) throw new Error(`Video upload failed: ${vidErr.message}`);
      const { data: vidUrl } = supabase.storage.from("soul_videos").getPublicUrl(videoPath);
      onVideoUrl(vidUrl.publicUrl);
      setProgress(0.2);

      // Stage 2 - Extract audio segment (20 → 70%)
      setProcessStage(2);
      const audioBlob = await extractAudioSegment(videoFile, start, end, (p) =>
        setProgress(0.2 + p * 0.5)
      );
      setProgress(0.7);

      // Stage 3 - Build waveform (70 → 85%)
      setProcessStage(3);
      setProgress(0.75);
      const wf = await blobToWaveform(audioBlob, 64);
      onWaveform(wf);
      setProgress(0.85);

      // Stage 4 - Upload audio to soul_assets (85 → 100%)
      setProcessStage(4);
      const audioPath = `${orderId}/audio-${Date.now()}.mp3`;
      const { error: audErr } = await supabase.storage
        .from("soul_assets")
        .upload(audioPath, audioBlob, { contentType: "audio/mpeg", upsert: true });
      if (audErr) throw new Error(`Audio upload failed: ${audErr.message}`);
      const { data: audUrl } = supabase.storage.from("soul_assets").getPublicUrl(audioPath);
      onAudioUrl(audUrl.publicUrl);
      setProgress(1);

      setDone(true);
      toast.success("Memory preserved - audio extracted successfully.");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to process video");
    } finally {
      setBusy(false);
      setProcessStage(0);
      setProgress(0);
    }
  }, [videoFile, start, end, orderId, onAudioUrl, onVideoUrl, onWaveform]);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!videoFile) {
    return (
      <label className="block border border-dashed border-border/50 rounded-sm p-6 text-center cursor-pointer hover:border-gold/40 transition-colors bg-background/30">
        <input type="file" accept="video/*" className="hidden" onChange={handleFile} />
        <VideoIcon className="w-6 h-6 mx-auto mb-2 text-gold/60" />
        <p className="text-xs text-foreground/80 font-sans">Choose a video (max 100 MB)</p>
        <p className="text-[10px] text-muted-foreground/60 font-light mt-1">
          MP4, MOV, WebM - we'll extract a 10-second audio clip
        </p>
      </label>
    );
  }

  return (
    <div className="space-y-3 border border-border/50 rounded-sm p-4 bg-background/30">
      <div className="flex items-center justify-between">
        <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70 font-sans truncate">
          {videoFile.name}
        </p>
        <button
          onClick={() => { setVideoFile(null); if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl); setVideoBlobUrl(null); setDone(false); }}
          className="text-muted-foreground hover:text-destructive"
          aria-label="Remove video"
          disabled={busy}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {videoBlobUrl && (
        <video
          ref={videoRef}
          src={videoBlobUrl}
          controls
          onLoadedMetadata={onLoadedMetadata}
          className="w-full rounded-sm bg-black max-h-[260px]"
        />
      )}

      {duration > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-gold font-sans">
            <Scissors className="w-3 h-3" />
            Trim audio · {(end - start).toFixed(1)}s / {MAX_CLIP_SEC}s max
          </div>

          <div className="space-y-2">
            <label className="flex items-center justify-between text-[10px] text-muted-foreground/70 font-sans">
              <span>Start: {fmt(start)}</span>
            </label>
            <input
              type="range"
              min={0}
              max={duration}
              step={0.1}
              value={start}
              onChange={(e) => onStartChange(parseFloat(e.target.value))}
              className="w-full accent-gold"
              disabled={busy}
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center justify-between text-[10px] text-muted-foreground/70 font-sans">
              <span>End: {fmt(end)}</span>
              <span className="opacity-60">Total {fmt(duration)}</span>
            </label>
            <input
              type="range"
              min={0}
              max={duration}
              step={0.1}
              value={end}
              onChange={(e) => onEndChange(parseFloat(e.target.value))}
              className="w-full accent-gold"
              disabled={busy}
            />
          </div>
        </div>
      )}

      {busy && (
        <div className="space-y-3 pt-1">
          {/* Stage dots */}
          <div className="flex items-center gap-1">
            {STAGES.map((s, i) => {
              const stageNum = i + 1;
              const isDone = processStage > stageNum;
              const isActive = processStage === stageNum;
              return (
                <div key={s.label} className="flex-1 flex flex-col items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      isDone
                        ? "bg-gold"
                        : isActive
                        ? "bg-gold animate-pulse scale-125"
                        : "bg-border/40"
                    }`}
                  />
                  <span
                    className={`text-[9px] tracking-[0.15em] uppercase font-sans transition-colors duration-300 ${
                      isDone ? "text-gold/70" : isActive ? "text-gold" : "text-muted-foreground/30"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Shimmer progress bar */}
          <div className="h-1 bg-border/30 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full relative overflow-hidden transition-all duration-500"
              style={{
                width: `${Math.round(progress * 100)}%`,
                background: "linear-gradient(90deg, #b78e48 0%, #d4a849 50%, #f0d68a 100%)",
              }}
            >
              <span className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </div>
          </div>
          <p className="text-[10px] text-gold/80 text-center font-sans tracking-[0.15em]">
            {Math.round(progress * 100)}% complete
          </p>
        </div>
      )}

      <button
        onClick={handleProcess}
        disabled={busy || !duration}
        className="w-full px-4 py-3 border border-gold/40 text-gold text-[10px] tracking-[0.3em] uppercase font-sans hover:bg-gold/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 rounded-sm"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : done ? "Re-Process Clip" : <Upload className="w-4 h-4" />}
        {busy ? "Processing…" : done ? "Re-Process Clip" : "Extract & Use This Clip"}
      </button>
      {done && (
        <p className="text-[10px] text-gold/80 text-center font-sans">
          ✓ Audio extracted. Full video saved to your Soul Page.
        </p>
      )}
    </div>
  );
};

export default VideoUpload;
