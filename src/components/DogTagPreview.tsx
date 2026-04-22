import { useMemo, useRef, useEffect, useState } from "react";
import dogtagMockup from "@/assets/dogtag-mockup.png";

export type PendantMaterial = "gold" | "silver";

interface DogTagPreviewProps {
  waveformData: number[];
  petName: string;
  qrDataUrl?: string | null;
  showBack?: boolean;
  backText?: string;
  material?: PendantMaterial;
}

const DogTagPreview = ({
  waveformData,
  petName,
  qrDataUrl,
  showBack = false,
  backText = "",
  material = "silver",
}: DogTagPreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);
  const [qrImage, setQrImage] = useState<HTMLImageElement | null>(null);

  // Load base mockup
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setBaseImage(img);
    img.src = dogtagMockup;
  }, []);

  // Load QR image
  useEffect(() => {
    if (!qrDataUrl) {
      setQrImage(null);
      return;
    }
    const img = new Image();
    img.onload = () => setQrImage(img);
    img.src = qrDataUrl;
  }, [qrDataUrl]);

  // Tag boundaries (percentage-based relative to image)
  const tag = useMemo(() => ({
    left: 0.24,
    top: 0.18,
    width: 0.52,
    height: 0.72,
  }), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !baseImage) return;

    const dpr = window.devicePixelRatio || 1;
    const displayW = canvas.clientWidth;
    const displayH = canvas.clientHeight;
    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Draw base image
    ctx.drawImage(baseImage, 0, 0, displayW, displayH);

    // Calculate tag area in pixels
    const tx = tag.left * displayW;
    const ty = tag.top * displayH;
    const tw = tag.width * displayW;
    const th = tag.height * displayH;

    // Material tint — overlay a warm gold wash for the gold variant
    if (material === "gold") {
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      const grad = ctx.createLinearGradient(tx, ty, tx + tw, ty + th);
      grad.addColorStop(0, "#f0d68a");
      grad.addColorStop(0.5, "#d4a849");
      grad.addColorStop(1, "#b8862e");
      ctx.fillStyle = grad;
      const r = Math.min(tw, th) * 0.12;
      ctx.beginPath();
      ctx.moveTo(tx + r, ty);
      ctx.lineTo(tx + tw - r, ty);
      ctx.quadraticCurveTo(tx + tw, ty, tx + tw, ty + r);
      ctx.lineTo(tx + tw, ty + th - r);
      ctx.quadraticCurveTo(tx + tw, ty + th, tx + tw - r, ty + th);
      ctx.lineTo(tx + r, ty + th);
      ctx.quadraticCurveTo(tx, ty + th, tx, ty + th - r);
      ctx.lineTo(tx, ty + r);
      ctx.quadraticCurveTo(tx, ty, tx + r, ty);
      ctx.closePath();
      ctx.fill();
      // Subtle warm highlight pass
      ctx.globalCompositeOperation = "overlay";
      ctx.fillStyle = "rgba(255, 220, 140, 0.18)";
      ctx.fill();
      ctx.restore();
    }

    if (showBack) {
      // --- BACK VIEW: dark ink for high contrast on metal mockup ---
      if (backText.trim()) {
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        const fontSize = Math.max(12, tw * 0.08);
        ctx.font = `600 ${fontSize}px 'Playfair Display', Georgia, serif`;
        ctx.fillStyle = "rgba(20, 20, 20, 0.9)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const maxWidth = tw * 0.8;
        const words = backText.split(" ");
        const lines: string[] = [];
        let currentLine = "";
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          if (ctx.measureText(testLine).width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        lines.push(currentLine);

        const lineHeight = fontSize * 1.5;
        const totalHeight = lines.length * lineHeight;
        const startY = ty + th / 2 - totalHeight / 2 + lineHeight / 2;

        lines.forEach((line, i) => {
          ctx.fillText(line, tx + tw / 2, startY + i * lineHeight);
        });
        ctx.restore();
      }
      return;
    }

    // --- FRONT VIEW: dark ink for high contrast on metal mockup ---
    if (waveformData.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "source-over";

      const waveArea = {
        x: tx + tw * 0.1,
        y: ty + th * 0.12,
        w: tw * 0.8,
        h: th * 0.22,
      };
      const centerY = waveArea.y + waveArea.h / 2;

      ctx.strokeStyle = "rgba(15, 15, 15, 0.92)";
      ctx.lineWidth = 1.8;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      for (let i = 0; i < waveformData.length; i++) {
        const x = waveArea.x + (i / (waveformData.length - 1)) * waveArea.w;
        const amp = waveformData[i] * waveArea.h * 0.45;
        const y = centerY - amp;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevX = waveArea.x + ((i - 1) / (waveformData.length - 1)) * waveArea.w;
          const prevAmp = waveformData[i - 1] * waveArea.h * 0.45;
          const prevY = centerY - prevAmp;
          const cpX = (prevX + x) / 2;
          ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
        }
      }
      const lastX = waveArea.x + waveArea.w;
      const lastAmp = waveformData[waveformData.length - 1] * waveArea.h * 0.45;
      ctx.quadraticCurveTo(lastX, centerY - lastAmp, lastX, centerY - lastAmp);
      ctx.stroke();

      ctx.beginPath();
      for (let i = 0; i < waveformData.length; i++) {
        const x = waveArea.x + (i / (waveformData.length - 1)) * waveArea.w;
        const amp = waveformData[i] * waveArea.h * 0.45;
        const y = centerY + amp;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevX = waveArea.x + ((i - 1) / (waveformData.length - 1)) * waveArea.w;
          const prevAmp = waveformData[i - 1] * waveArea.h * 0.45;
          const prevY = centerY + prevAmp;
          const cpX = (prevX + x) / 2;
          ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
        }
      }
      const lastAmp2 = waveformData[waveformData.length - 1] * waveArea.h * 0.45;
      ctx.quadraticCurveTo(lastX, centerY + lastAmp2, lastX, centerY + lastAmp2);
      ctx.stroke();

      ctx.restore();
    }

    // QR with white plate for legibility on the metal
    if (qrImage) {
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      const qrSize = tw * 0.45;
      const qrX = tx + (tw - qrSize) / 2;
      const qrY = ty + th * 0.38;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.fillRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8);
      ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
      ctx.restore();
    }

    if (petName.trim()) {
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      const nameSize = Math.max(10, tw * 0.07);
      ctx.font = `600 ${nameSize}px 'Playfair Display', Georgia, serif`;
      ctx.fillStyle = "rgba(20, 20, 20, 0.9)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(petName, tx + tw / 2, ty + th * 0.82);
      ctx.restore();
    }
  }, [baseImage, waveformData, petName, qrImage, qrDataUrl, showBack, backText, tag, material]);

  return (
    <div
      className="relative flex items-center justify-center rounded-md p-3 shadow-inner"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0 1px, transparent 1px 2px), linear-gradient(135deg, hsl(0 0% 96%) 0%, hsl(30 8% 88%) 50%, hsl(0 0% 92%) 100%)",
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full max-w-[300px] aspect-square"
        style={{ imageRendering: "auto" }}
      />
    </div>
  );
};

export default DogTagPreview;
