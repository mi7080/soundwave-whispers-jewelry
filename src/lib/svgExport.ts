import QRCode from "qrcode";

interface SvgExportOptions {
  waveformData: number[];
  petName: string;
  soulPageUrl: string;
  includeBackEngraving?: boolean;
}

/**
 * Generate a production-ready SVG for ShineOn Acrylic Heart (ID 279):
 * Canvas: 1000×1788px (ShineOn spec)
 * - FRONT: Centered waveform (upper) + centered QR code (below)
 * - All pure black (#000000) on transparent background
 * - Waveform = vertical bars, chronological L→R
 * - QR = vector <rect> elements
 */
export async function generateProductionSvg(options: SvgExportOptions): Promise<string> {
  const { waveformData, petName, soulPageUrl, includeBackEngraving = false } = options;
  const width = 1000;
  const height = 1788;
  const cx = width / 2;

  // --- Waveform as vertical bars (chronological L→R) ---
  const waveY = 550;
  const waveWidth = 800;
  const maxBarHeight = 300;
  const startX = (width - waveWidth) / 2;
  const samples = waveformData.length || 1;
  const barWidth = Math.max(2, waveWidth / samples - 1);
  const gap = (waveWidth - barWidth * samples) / (samples - 1 || 1);

  let waveRects = "";
  for (let i = 0; i < samples; i++) {
    const amp = (waveformData[i] || 0) * maxBarHeight;
    const x = startX + i * (barWidth + gap);
    const y = waveY - amp / 2;
    const h = Math.max(amp, 2);
    waveRects += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${h.toFixed(1)}" fill="#000000" rx="1"/>`;
  }

  // --- QR Code as vector rects ---
  const qrSegments = await QRCode.create(soulPageUrl, { errorCorrectionLevel: "M" });
  const qrModules = qrSegments.modules;
  const qrSize = qrModules.size;
  const qrPixelSize = 300;
  const qrBlockSize = qrPixelSize / qrSize;
  const qrOffsetX = cx - qrPixelSize / 2;
  const qrOffsetY = 800;

  let qrRects = "";
  for (let row = 0; row < qrSize; row++) {
    for (let col = 0; col < qrSize; col++) {
      if (qrModules.get(row, col)) {
        const rx = qrOffsetX + col * qrBlockSize;
        const ry = qrOffsetY + row * qrBlockSize;
        qrRects += `<rect x="${rx.toFixed(2)}" y="${ry.toFixed(2)}" width="${qrBlockSize.toFixed(2)}" height="${qrBlockSize.toFixed(2)}" fill="#000000"/>`;
      }
    }
  }

  // --- Build Front SVG ---
  const frontSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <!-- FRONT SIDE: Waveform + QR for ShineOn Acrylic Heart ID 279 (1000x1788) -->

  <!-- Waveform (vertical bars, chronological L→R) -->
  <g id="waveform">
    ${waveRects}
  </g>

  <!-- QR Code (vector rectangles) -->
  <g id="qr-code">
    ${qrRects}
  </g>

  <!-- Scan label -->
  <text x="${cx}" y="1160" text-anchor="middle" font-family="'Inter', sans-serif" font-size="20" fill="#000000" letter-spacing="4">SCAN TO HEAR</text>
</svg>`;

  if (!includeBackEngraving || !petName.trim()) {
    return frontSvg;
  }

  return frontSvg;
}

/**
 * Generate back-engraving SVG with name centered in luxury serif
 * Also 1000x1788 to match front dimensions
 */
export function generateBackEngravingSvg(petName: string): string {
  const width = 1000;
  const height = 1788;
  const cx = width / 2;
  const cy = height / 2;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <!-- BACK SIDE: Name Engraving for ShineOn Acrylic Heart ID 279 -->
  <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-family="'Playfair Display', Georgia, serif" font-size="80" fill="#000000" font-weight="600">${escapeXml(petName)}</text>
</svg>`;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function downloadSvg(svgContent: string, filename: string) {
  const blob = new Blob([svgContent], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
