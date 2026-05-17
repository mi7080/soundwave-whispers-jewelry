import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, Upload, Play, Pause, X, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AudioRecorderProps {
  onAudioUrl?: (url: string) => void;
  initialUrl?: string | null;
}

const AudioRecorder = ({ onAudioUrl, initialUrl }: AudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
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
  const analyserRef = useRef<AnalyserNode | null>(null);
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
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setFileName("Recording.webm");
        generateWaveformFromBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
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
    setAudioBlob(file);
    setAudioUrl(URL.createObjectURL(file));
    setFileName(file.name);
    generateWaveformFromBlob(file);
    setUploadedUrl(null);
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
    setAudioBlob(null);
    setAudioUrl(null);
    setWaveformData([]);
    setUploadedUrl(null);
    setFileName(null);
    setRecordingTime(0);
  };

  const uploadToSupabase = async () => {
    if (!audioBlob) return;
    setIsUploading(true);
    try {
      const tempId = crypto.randomUUID();
      const ext = fileName?.split(".").pop() || "webm";
      const filePath = `${tempId}/audio.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("soul_assets")
        .upload(filePath, audioBlob, {
          contentType: audioBlob.type || "audio/webm",
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
      toast.error("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      {/* Waveform Display */}
      <div className="border border-border/50 rounded-sm p-6 md:p-8 bg-background/50">
        <div className="flex items-end justify-center gap-[3px] h-32 md:h-40">
          {waveformData.length > 0
            ? waveformData.map((v, i) => (
                <div
                  key={i}
                  className="bg-gradient-to-t from-gold-dark via-gold to-gold-light rounded-full transition-all duration-300"
                  style={{
                    height: `${Math.max(v * 100, 4)}%`,
                    width: "3px",
                    opacity: 0.5 + v * 0.5,
                  }}
                />
              ))
            : liveBarData.map((v, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-75 ${
                    isRecording
                      ? "bg-gradient-to-t from-red-700 via-red-500 to-red-300"
                      : "bg-muted-foreground/20"
                  }`}
                  style={{
                    height: `${v * 100}%`,
                    width: "3px",
                  }}
                />
              ))}
        </div>

        {/* Status */}
        <div className="text-center mt-4">
          {isRecording && (
            <p className="text-sm text-red-400 font-sans tracking-[0.15em] flex items-center justify-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Recording — {formatTime(recordingTime)}
            </p>
          )}
          {!isRecording && !audioUrl && (
            <p className="text-xs text-muted-foreground/50 tracking-widest uppercase font-sans">
              Record or upload a meaningful sound
            </p>
          )}
          {fileName && !isRecording && (
            <p className="text-xs text-muted-foreground/70 tracking-wide font-sans truncate max-w-[240px] mx-auto">
              {fileName}
            </p>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {!audioUrl ? (
          <>
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 text-xs tracking-[0.3em] uppercase transition-all ${
                isRecording
                  ? "bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30"
                  : "bg-gold text-background hover:bg-gold-light"
              }`}
            >
              {isRecording ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
              {isRecording ? "Stop Recording" : "Record Sound"}
            </button>
            <label className="flex-1 flex items-center justify-center gap-3 px-6 py-4 text-xs tracking-[0.3em] uppercase border border-foreground/30 text-foreground hover:border-gold hover:text-gold transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              Upload File
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </>
        ) : (
          <>
            <button
              onClick={togglePlayback}
              className="flex-1 flex items-center justify-center gap-3 px-6 py-4 text-xs tracking-[0.3em] uppercase border border-foreground/30 text-foreground hover:border-gold hover:text-gold transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {isPlaying ? "Pause" : "Preview"}
            </button>
            <button
              onClick={clearAudio}
              className="flex items-center justify-center gap-2 px-4 py-4 text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-red-400 transition-colors"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          </>
        )}
      </div>

      {/* Upload to Supabase */}
      {audioUrl && !uploadedUrl && (
        <div className="space-y-2">
          <button
            onClick={uploadToSupabase}
            disabled={isUploading}
            className="w-full group relative overflow-hidden bg-gold text-background px-10 py-5 text-xs tracking-[0.3em] uppercase hover:bg-gold-light transition-all flex items-center justify-center gap-3 disabled:opacity-60"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Preserving Your Sound…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
                Save This Sound
              </>
            )}
            {/* shimmer sweep on hover */}
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
          </button>
          {isUploading && (
            <p className="text-[10px] text-gold/70 text-center tracking-[0.2em] uppercase font-sans animate-pulse">
              Encoding your memory into the pendant…
            </p>
          )}
        </div>
      )}

      {/* Success */}
      {uploadedUrl && (
        <div className="flex items-center gap-3 p-4 border border-gold/30 rounded-sm bg-gold/5">
          <Check className="w-5 h-5 text-gold flex-shrink-0" />
          <div>
            <p className="text-sm text-foreground font-sans">
              Sound uploaded successfully
            </p>
          </div>
        </div>
      )}

      {audioUrl && <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />}
    </div>
  );
};

export default AudioRecorder;
