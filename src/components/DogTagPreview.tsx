import { useMemo } from "react";

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
    const centerY = 140;
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
      <svg viewBox="0 0 300 400" className="w-full max-w-[300px]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id="dogTagClip">
            <rect x="60" y="50" width="180" height="280" rx="20" ry="20" />
          </clipPath>
          <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(220, 10%, 75%)" />
            <stop offset="30%" stopColor="hsl(220, 8%, 85%)" />
            <stop offset="50%" stopColor="hsl(220, 12%, 90%)" />
            <stop offset="70%" stopColor="hsl(220, 8%, 80%)" />
            <stop offset="100%" stopColor="hsl(220, 10%, 70%)" />
          </linearGradient>
          <linearGradient id="metalShine" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
            <stop offset="40%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        {/* Chain loop */}
        <ellipse cx="150" cy="42" rx="18" ry="12" fill="none" stroke="hsl(220, 8%, 65%)" strokeWidth="3" />

        {/* Dog tag body */}
        <rect
          x="60" y="50" width="180" height="280" rx="20" ry="20"
          fill="url(#metalGrad)"
          stroke="hsl(220, 8%, 60%)"
          strokeWidth="1.5"
        />

        {/* Shine overlay */}
        <rect
          x="60" y="50" width="180" height="280" rx="20" ry="20"
          fill="url(#metalShine)"
        />

        {/* Notch at top-right */}
        <circle cx="215" cy="75" r="6" fill="hsl(220, 10%, 55%)" />

        {/* Content inside tag */}
        <g clipPath="url(#dogTagClip)">
          {/* Pet name */}
          {petName && (
            <text
              x="150"
              y="100"
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
              y="180"
              width="70"
              height="70"
              opacity="0.8"
            />
          )}

          {/* Scan label */}
          {qrDataUrl && (
            <text
              x="150"
              y="268"
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
        </g>
      </svg>
    </div>
  );
};

export default DogTagPreview;
