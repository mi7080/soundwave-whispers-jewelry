import { useMemo } from "react";
import dogtagMockup from "@/assets/dogtag-mockup.png";

interface DogTagPreviewProps {
  waveformData: number[];
  petName: string;
  qrDataUrl?: string | null;
}

const DogTagPreview = ({ waveformData, petName, qrDataUrl }: DogTagPreviewProps) => {
  const waveformPath = useMemo(() => {
    if (!waveformData.length) return "";
    const w = 160;
    const h = 30;
    const startX = 70;
    const centerY = 200;
    const step = w / (waveformData.length - 1 || 1);

    let top = `M ${startX} ${centerY}`;
    let bottom = `M ${startX} ${centerY}`;
    for (let i = 0; i < waveformData.length; i++) {
      const x = startX + i * step;
      const amp = waveformData[i] * h;
      top += ` L ${x} ${centerY - amp / 2}`;
      bottom += ` L ${x} ${centerY + amp / 2}`;
    }
    return `${top} ${bottom}`;
  }, [waveformData]);

  return (
    <div className="relative flex items-center justify-center">
      <div className="relative w-full max-w-[300px]">
        <img
          src={dogtagMockup}
          alt="ANIMUS Signature Dog Tag"
          className="w-full h-auto"
        />
        {/* Overlay SVG for waveform, QR, and name */}
        <svg
          viewBox="0 0 300 400"
          className="absolute inset-0 w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Pet name */}
          {petName && (
            <text
              x="150"
              y="155"
              textAnchor="middle"
              fontFamily="'Playfair Display', Georgia, serif"
              fontSize="18"
              fill="hsl(220, 10%, 25%)"
              fontWeight="600"
            >
              {petName}
            </text>
          )}

          {/* Waveform */}
          {waveformPath && (
            <path
              d={waveformPath}
              fill="none"
              stroke="hsl(220, 10%, 25%)"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.85"
            />
          )}

          {/* QR Code */}
          {qrDataUrl && (
            <image
              href={qrDataUrl}
              x="115"
              y="240"
              width="70"
              height="70"
              opacity="0.8"
            />
          )}

          {/* Scan label */}
          {qrDataUrl && (
            <text
              x="150"
              y="325"
              textAnchor="middle"
              fontFamily="'Inter', sans-serif"
              fontSize="6"
              fill="hsl(220, 10%, 35%)"
              letterSpacing="3"
              opacity="0.7"
            >
              SCAN TO HEAR
            </text>
          )}
        </svg>
      </div>
    </div>
  );
};

export default DogTagPreview;
