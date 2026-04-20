/**
 * Video → audio trim utility powered by ffmpeg.wasm.
 * Lazy-loaded to keep the main bundle light.
 */
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

export async function getFFmpeg(onProgress?: (msg: string) => void): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const ff = new FFmpeg();
    ff.on("log", ({ message }) => {
      if (onProgress) onProgress(message);
    });
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    await ff.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpegInstance = ff;
    return ff;
  })();

  return loadPromise;
}

/**
 * Extract audio from a video file between [startSec, endSec].
 * Returns an MP3 Blob ready to upload.
 */
export async function extractAudioSegment(
  videoFile: File,
  startSec: number,
  endSec: number,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  const ff = await getFFmpeg();
  const inputName = "input." + (videoFile.name.split(".").pop() || "mp4");
  const outputName = "output.mp3";

  await ff.writeFile(inputName, await fetchFile(videoFile));

  if (onProgress) {
    ff.on("progress", ({ progress }) => onProgress(Math.min(1, Math.max(0, progress))));
  }

  const duration = Math.max(0.5, endSec - startSec);
  await ff.exec([
    "-ss", startSec.toFixed(2),
    "-i", inputName,
    "-t", duration.toFixed(2),
    "-vn",
    "-acodec", "libmp3lame",
    "-b:a", "128k",
    "-ar", "44100",
    outputName,
  ]);

  const data = await ff.readFile(outputName);
  await ff.deleteFile(inputName).catch(() => {});
  await ff.deleteFile(outputName).catch(() => {});

  const arr = data instanceof Uint8Array ? data : new Uint8Array(data as unknown as ArrayBuffer);
  return new Blob([arr], { type: "audio/mpeg" });
}

/**
 * Decode a Blob (mp3 or any audio) into a normalized waveform array (0-1).
 */
export async function blobToWaveform(blob: Blob, samples = 64): Promise<number[]> {
  const buf = await blob.arrayBuffer();
  const ctx = new AudioContext();
  try {
    const audioBuffer = await ctx.decodeAudioData(buf.slice(0));
    const raw = audioBuffer.getChannelData(0);
    const blockSize = Math.max(1, Math.floor(raw.length / samples));
    const out: number[] = [];
    for (let i = 0; i < samples; i++) {
      let sum = 0;
      const start = i * blockSize;
      const end = Math.min(start + blockSize, raw.length);
      for (let j = start; j < end; j++) sum += Math.abs(raw[j]);
      out.push(sum / Math.max(1, end - start));
    }
    const max = Math.max(...out, 0);
    return max > 0 ? out.map((v) => v / max) : out.map(() => 0.25);
  } finally {
    ctx.close();
  }
}
