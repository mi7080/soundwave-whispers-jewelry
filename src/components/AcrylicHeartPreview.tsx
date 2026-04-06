import { useMemo } from "react";

interface AcrylicHeartPreviewProps {
  waveformData: number[];
  petName: string;
  qrDataUrl?: string | null;
}

const AcrylicHeartPreview = ({ waveformData, petName, qrDataUrl }: AcrylicHeartPreviewProps) => {
  const waveformPath = useMemo(() => {
    if (!waveformData.length) return "";
    const w = 200;
    const h = 40;
    const startX = 50;
    const centerY = 155;
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
      {/* Heart shape container */}
      <svg viewBox="0 0 300 300" className="w-full max-w-[360px]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id="heartClip">
            <path d="M150 265 C75 210 15 170 15 115 C15 75 45 45 85 45 C110 45 130 60 150 85 C170 60 190 45 215 45 C255 45 285 75 285 115 C285 170 225 210 150 265Z" />
          </clipPath>
          <linearGradient id="acrylicGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(220, 10%, 18%)" />
            <stop offset="50%" stopColor="hsl(220, 8%, 14%)" />
            <stop offset="100%" stopColor="hsl(220, 12%, 10%)" />
          </linearGradient>
          <linearGradient id="shineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="40%" stopColor="rgba(255,255,255,0.03)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        {/* Heart background */}
        <path
          d="M150 265 C75 210 15 170 15 115 C15 75 45 45 85 45 C110 45 130 60 150 85 C170 60 190 45 215 45 C255 45 285 75 285 115 C285 170 225 210 150 265Z"
          fill="url(#acrylicGrad)"
          stroke="hsl(38, 45%, 58%)"
          strokeWidth="1.5"
          opacity="0.95"
        />

        {/* Acrylic shine overlay */}
        <path
          d="M150 265 C75 210 15 170 15 115 C15 75 45 45 85 45 C110 45 130 60 150 85 C170 60 190 45 215 45 C255 45 285 75 285 115 C285 170 225 210 150 265Z"
          fill="url(#shineGrad)"
        />

        {/* Content inside heart */}
        <g clipPath="url(#heartClip)">
          {/* Pet name */}
          {petName && (
            <text
              x="150"
              y="105"
              textAnchor="middle"
              fontFamily="'Playfair Display', Georgia, serif"
              fontSize="22"
              fill="hsl(38, 45%, 58%)"
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
              stroke="hsl(38, 45%, 58%)"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.9"
            />
          )}

          {/* QR Code */}
          {qrDataUrl && (
            <image
              href={qrDataUrl}
              x="110"
              y="185"
              width="80"
              height="80"
              opacity="0.85"
            />
          )}

          {/* Scan label */}
          {qrDataUrl && (
            <text
              x="150"
              y="278"
              textAnchor="middle"
              fontFamily="'Inter', sans-serif"
              fontSize="7"
              fill="hsl(38, 45%, 58%)"
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

export default AcrylicHeartPreview;
