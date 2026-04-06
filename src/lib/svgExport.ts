import QRCode from "qrcode";

interface SvgExportOptions {
  waveformData: number[];
  petName: string;
  soulPageUrl: string;
}

/**
 * Generate a production-ready SVG (2000×2000) for ShineOn Acrylic Heart:
 * - Centered vector waveform as <polyline> (chronological left-to-right)
 * - Centered vector QR code as <rect> elements below waveform
 * - Optional pet name as centered serif text above waveform
 * All pure black (#000000) on transparent background.
 */
export async function generateProductionSvg(options: SvgExportOptions): Promise<string> {
  const { waveformData, petName, soulPageUrl } = options;
  const size = 2000;
  const cx = size / 2;

  // --- Waveform as vertical bars (chronological L→R, NOT mirrored/reversed) ---
  const waveY = 850; // center Y of waveform region
  const waveWidth = 1400;
  const maxBarHeight = 400;
  const startX = (size - waveWidth) / 2;
  const samples = waveformData.length || 1;
  const barWidth = Math.max(2, waveWidth / samples - 1);
  const gap = (waveWidth - barWidth * samples) / (samples - 1 || 1);

  let waveRects = "";
  for (let i = 0; i < samples; i++) {
    const amp = (waveformData[i] || 0) * maxBarHeight;
    const x = startX + i * (barWidth + gap);
    const y = waveY - amp / 2;
    const h = Math.max(amp, 2); // minimum 2px bar
    waveRects += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${h.toFixed(1)}" fill="#000000" rx="1"/>`;
  }

  // --- QR Code as vector rects ---
  const qrSegments = await QRCode.create(soulPageUrl, { errorCorrectionLevel: "M" });
  const qrModules = qrSegments.modules;
  const qrSize = qrModules.size;
  const qrBlockSize = 360 / qrSize;
  const qrOffsetX = cx - 180;
  const qrOffsetY = 1150;

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

  // --- Build SVG ---
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <!-- Pet Name (back engraving reference) -->
  ${petName.trim() ? `<text x="${cx}" y="500" text-anchor="middle" font-family="'Playfair Display', Georgia, serif" font-size="100" fill="#000000" font-weight="600">${escapeXml(petName)}</text>` : ""}

  <!-- Waveform (vertical bars, chronological L→R) -->
  <g id="waveform">
    ${waveRects}
  </g>

  <!-- QR Code -->
  <g id="qr-code">
    ${qrRects}
  </g>

  <!-- Scan label -->
  <text x="${cx}" y="1580" text-anchor="middle" font-family="'Inter', sans-serif" font-size="32" fill="#000000" letter-spacing="6">SCAN TO HEAR</text>
</svg>`;

  return svg;
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
