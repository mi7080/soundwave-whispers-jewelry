import { useMemo, useRef, useEffect, useState } from "react";
import dogtagMockup from "@/assets/dogtag-mockup.png";

interface DogTagPreviewProps {
  waveformData: number[];
  petName: string;
  qrDataUrl?: string | null;
  showBack?: boolean;
  backText?: string;
}

const DogTagPreview = ({
  waveformData,
  petName,
  qrDataUrl,
  showBack = false,
  backText = "",
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

    if (showBack) {
      // --- BACK VIEW: show engraved text ---
      if (backText.trim()) {
        ctx.save();
        ctx.globalCompositeOperation = "overlay";
        const fontSize = Math.max(12, tw * 0.08);
        ctx.font = `600 ${fontSize}px 'Playfair Display', Georgia, serif`;
        ctx.fillStyle = "rgba(200, 200, 200, 0.7)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Word wrap
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

    // --- FRONT VIEW ---
    // Draw waveform with multiply blend
    if (waveformData.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "overlay";

      const waveArea = {
        x: tx + tw * 0.1,
        y: ty + th * 0.15,
        w: tw * 0.8,
        h: th * 0.25,
      };

      const centerY = waveArea.y + waveArea.h / 2;

      ctx.strokeStyle = "rgba(220, 220, 220, 0.85)";
      ctx.lineWidth = 1.8;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Draw continuous oscillating waveform (smooth curve, not bars)
      ctx.beginPath();
      for (let i = 0; i < waveformData.length; i++) {
        const x = waveArea.x + (i / (waveformData.length - 1)) * waveArea.w;
        const amp = waveformData[i] * waveArea.h * 0.45;
        const y = centerY - amp;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          // Smooth curve using quadratic bezier to previous midpoint
          const prevX = waveArea.x + ((i - 1) / (waveformData.length - 1)) * waveArea.w;
          const prevAmp = waveformData[i - 1] * waveArea.h * 0.45;
          const prevY = centerY - prevAmp;
          const cpX = (prevX + x) / 2;
          ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
        }
      }
      // Final segment
      const lastX = waveArea.x + waveArea.w;
      const lastAmp = waveformData[waveformData.length - 1] * waveArea.h * 0.45;
      ctx.quadraticCurveTo(lastX, centerY - lastAmp, lastX, centerY - lastAmp);
      ctx.stroke();

      // Mirror waveform below center line
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

    // Draw name with overlay blend
    if (petName.trim()) {
      ctx.save();
      ctx.globalCompositeOperation = "overlay";
      const nameSize = Math.max(10, tw * 0.07);
      ctx.font = `600 ${nameSize}px 'Playfair Display', Georgia, serif`;
      ctx.fillStyle = "rgba(210, 210, 210, 0.8)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(petName, tx + tw / 2, ty + th * 0.08);
      ctx.restore();
    }

    // Draw QR code with multiply blend
    if (qrImage) {
      ctx.save();
      ctx.globalCompositeOperation = "overlay";
      const qrSize = tw * 0.35;
      const qrX = tx + (tw - qrSize) / 2;
      const qrY = ty + th * 0.52;
      ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
      ctx.restore();
    }

    // "SCAN TO HEAR" label
    if (qrDataUrl) {
      ctx.save();
      ctx.globalCompositeOperation = "overlay";
      const labelSize = Math.max(6, tw * 0.03);
      ctx.font = `400 ${labelSize}px 'Inter', sans-serif`;
      ctx.fillStyle = "rgba(180, 180, 180, 0.6)";
      ctx.textAlign = "center";
      ctx.letterSpacing = "3px";
      ctx.fillText("SCAN TO HEAR", tx + tw / 2, ty + th * 0.88);
      ctx.restore();
    }
  }, [baseImage, waveformData, petName, qrImage, qrDataUrl, showBack, backText, tag]);

  return (
    <div className="relative flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="w-full max-w-[300px] aspect-square"
        style={{ imageRendering: "auto" }}
      />
    </div>
  );
};

export default DogTagPreview;
