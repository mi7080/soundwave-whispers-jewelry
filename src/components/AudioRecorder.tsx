import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, Upload, Play, Pause, X, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AudioRecorderProps {
  onAudioUrl?: (url: string) => void;
  initialUrl?: string | null;
}

const AudioRecorder = ({ onAudioUrl, initialUrl }: AudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(initialUrl || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(initialUrl || null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [liveBarData, setLiveBarData] = useState<number[]>(() => Array.from({ length: 64 }, () => 0.08));
  const [recordingTime, setRecordingTime] = useState(0);
  const [fileName, setFileName] = useState<string | null>(initialUrl ? "Previously uploaded sound" : null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  // Animate placeholder bars while recording
  useEffect(() => {
    if (!isRecording) {
      setLiveBarData(Array.from({ length: 64 }, () => 0.08));
      return;
    }
    const id = setInterval(() => {
      setLiveBarData(Array.from({ length: 64 }, () => Math.random() * 0.85 + 0.1));
    }, 80);
    return () => clearInterval(id);
  }, [isRecording]);

  useEffect(() => {
    if (!initialUrl) return;
    setAudioUrl(initialUrl);
    setUploadedUrl(initialUrl);
    setFileName("Previously uploaded sound");
    fetch(initialUrl)
      .then((r) => r.blob())
      .then((blob) => generateWaveformFromBlob(blob))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUrl]);

  const generateWaveformFromBlob = useCallback(async (blob: Blob) => {
    const ctx = new AudioContext();
    audioContextRef.current = ctx;
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    const rawData = audioBuffer.getChannelData(0);
    const samples = 64;
    const blockSize = Math.floor(rawData.length / samples);
    const filteredData: number[] = [];
    for (let i = 0; i < samples; i++) {
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[i * blockSize + j]);
      }
      filteredData.push(sum / blockSize);
    }
    const max = Math.max(...filteredData);
    const normalized = filteredData.map((v) => v / max);
    setWaveformData(normalized);
  }, []);

  // Auto-save: upload the moment a recording stops or a file is chosen.
  const uploadBlob = useCallback(async (blob: Blob, name: string) => {
    setIsUploading(true);
    setUploadedUrl(null);
    try {
      const tempId = crypto.randomUUID();
      const ext = name.split(".").pop() || "webm";
      const filePath = `${tempId}/audio.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("soul_assets")
        .upload(filePath, blob, {
          contentType: blob.type || "audio/webm",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("soul_assets")
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        setUploadedUrl(urlData.publicUrl);
        onAudioUrl?.(urlData.publicUrl);
      } else {
        throw new Error("Failed to get public URL");
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not save your sound. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }, [onAudioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        setFileName("Recording.webm");
        generateWaveformFromBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
        void uploadBlob(blob, "recording.webm"); // auto-save
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      toast.error("Please allow microphone access to record audio.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioUrl(URL.createObjectURL(file));
    setFileName(file.name);
    generateWaveformFromBlob(file);
    void uploadBlob(file, file.name); // auto-save
  };

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const clearAudio = () => {
    setAudioUrl(null);
    setWaveformData([]);
    setUploadedUrl(null);
    setFileName(null);
    setRecordingTime(0);
    onAudioUrl?.("");
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="space-y-5">
      {/* Waveform display */}
      <div className="rounded-2xl ring-1 ring-border bg-background p-6 md:p-8">
        <div className="flex items-end justify-center gap-[3px] h-28 md:h-36">
          {waveformData.length > 0
            ? waveformData.map((v, i) => (
                <div
                  key={i}
                  className="bg-gradient-to-t from-gold-dark via-gold to-gold-light rounded-full transition-all duration-300"
                  style={{ height: `${Math.max(v * 100, 4)}%`, width: "3px", opacity: 0.5 + v * 0.5 }}
                />
              ))
            : liveBarData.map((v, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-75 ${
                    isRecording ? "bg-[hsl(24_47%_47%)]" : "bg-muted-foreground/20"
                  }`}
                  style={{ height: `${v * 100}%`, width: "3px" }}
                />
              ))}
        </div>

        <div className="text-center mt-4 min-h-[20px]">
          {isRecording && (
            <p className="text-sm text-[hsl(24_47%_47%)] font-sans flex items-center justify-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-[hsl(24_47%_47%)] animate-pulse" />
              Recording {formatTime(recordingTime)}
            </p>
          )}
          {!isRecording && !audioUrl && (
            <p className="text-[13px] text-muted-foreground font-sans">Record or upload a meaningful sound</p>
          )}
          {fileName && !isRecording && (
            <p className="text-[13px] text-muted-foreground font-sans truncate max-w-[240px] mx-auto">{fileName}</p>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {!audioUrl ? (
          <>
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`flex-1 inline-flex items-center justify-center gap-2.5 rounded-full px-6 py-3.5 text-sm font-sans font-medium transition-all ${
                isRecording
                  ? "bg-[hsl(24_47%_47%)]/10 ring-1 ring-[hsl(24_47%_47%)]/40 text-[hsl(24_47%_47%)]"
                  : "bg-primary text-primary-foreground hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-16px_rgba(80,55,30,0.7)]"
              }`}
            >
              {isRecording ? <Square className="w-4 h-4" fill="currentColor" /> : <Mic className="w-4 h-4" />}
              {isRecording ? "Stop recording" : "Record sound"}
            </button>
            <label className="flex-1 inline-flex items-center justify-center gap-2.5 rounded-full px-6 py-3.5 text-sm font-sans ring-1 ring-border text-foreground hover:ring-gold/50 transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              Upload file
              <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </>
        ) : (
          <>
            <button
              onClick={togglePlayback}
              className="flex-1 inline-flex items-center justify-center gap-2.5 rounded-full px-6 py-3.5 text-sm font-sans ring-1 ring-border text-foreground hover:ring-gold/50 transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? "Pause" : "Preview"}
            </button>
            <button
              onClick={clearAudio}
              className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-sans text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
              Redo
            </button>
          </>
        )}
      </div>

      {/* Auto-save status */}
      {isUploading && (
        <p className="text-[13px] text-gold text-center font-sans flex items-center justify-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Saving your sound…
        </p>
      )}
      {uploadedUrl && !isUploading && (
        <div className="flex items-center justify-center gap-2 text-[13px] text-gold font-sans">
          <Check className="w-4 h-4" />
          Sound saved
        </div>
      )}

      {audioUrl && <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />}
    </div>
  );
};

export default AudioRecorder;
