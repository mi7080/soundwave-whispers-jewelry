import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, Upload, Play, Pause, X, Check, Loader2 } from "lucide-react";

const CLOUDINARY_CLOUD_NAME = "dsmbuwxqf";
const CLOUDINARY_UPLOAD_PRESET = "animus_unsigned";

interface AudioRecorderProps {
  onAudioUrl?: (url: string) => void;
}

const AudioRecorder = ({ onAudioUrl }: AudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

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
      alert("Please allow microphone access to record audio.");
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

  const uploadToCloudinary = async () => {
    if (!audioBlob) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", audioBlob);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      formData.append("resource_type", "auto");

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
        { method: "POST", body: formData }
      );
      const data = await res.json();
      if (data.secure_url) {
        setUploadedUrl(data.secure_url);
        onAudioUrl?.(data.secure_url);
      } else {
        throw new Error("Upload failed");
      }
    } catch (err) {
      console.error(err);
      alert("Upload failed. Please try again.");
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
            : Array.from({ length: 64 }).map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-300 ${
                    isRecording
                      ? "bg-red-500/60 animate-pulse"
                      : "bg-muted-foreground/20"
                  }`}
                  style={{
                    height: isRecording
                      ? `${Math.random() * 80 + 10}%`
                      : "8%",
                    width: "3px",
                  }}
                />
              ))}
        </div>

        {/* Status */}
        <div className="text-center mt-4">
          {isRecording && (
            <p className="text-sm text-red-400 font-sans tracking-wide animate-pulse">
              ● Recording — {formatTime(recordingTime)}
            </p>
          )}
          {!isRecording && !audioUrl && (
            <p className="text-xs text-muted-foreground/50 tracking-wide">
              Record or upload your pet's sound
            </p>
          )}
          {fileName && !isRecording && (
            <p className="text-xs text-muted-foreground tracking-wide">
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

      {/* Upload to Cloudinary */}
      {audioUrl && !uploadedUrl && (
        <button
          onClick={uploadToCloudinary}
          disabled={isUploading}
          className="w-full group relative overflow-hidden bg-gold text-background px-10 py-5 text-xs tracking-[0.3em] uppercase hover:bg-gold-light transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading Your Soul Sound…
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
              Upload Your Soul Sound
            </>
          )}
        </button>
      )}

      {/* Success */}
      {uploadedUrl && (
        <div className="flex items-center gap-3 p-4 border border-gold/30 rounded-sm bg-gold/5">
          <Check className="w-5 h-5 text-gold flex-shrink-0" />
          <div>
            <p className="text-sm text-foreground font-sans">
              Sound uploaded successfully
            </p>
            <p className="text-xs text-muted-foreground truncate max-w-xs">
              {uploadedUrl}
            </p>
          </div>
        </div>
      )}

      {audioUrl && <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default AudioRecorder;
