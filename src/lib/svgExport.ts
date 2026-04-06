import QRCode from "qrcode";

interface SvgExportOptions {
  waveformData: number[];
  petName: string;
  soulPageUrl: string;
}

/**
 * Generate a production-ready SVG (2000×2000) with:
 * - Vector waveform as <polyline>
 * - Vector QR code as <rect> elements
 * - Pet name as centered serif text
 * All pure black (#000000) on transparent background.
 */
export async function generateProductionSvg(options: SvgExportOptions): Promise<string> {
  const { waveformData, petName, soulPageUrl } = options;
  const size = 2000;
  const cx = size / 2;

  // --- Waveform path ---
  const waveY = 750;
  const waveWidth = 1400;
  const waveHeight = 300;
  const startX = (size - waveWidth) / 2;
  const samples = waveformData.length || 1;
  const stepX = waveWidth / (samples - 1 || 1);

  let wavePoints = "";
  for (let i = 0; i < samples; i++) {
    const x = startX + i * stepX;
    const amp = (waveformData[i] || 0) * waveHeight;
    const y = waveY - amp / 2;
    wavePoints += `${x.toFixed(1)},${y.toFixed(1)} `;
  }
  // Mirror below center
  let waveMirrorPoints = "";
  for (let i = 0; i < samples; i++) {
    const x = startX + i * stepX;
    const amp = (waveformData[i] || 0) * waveHeight;
    const y = waveY + amp / 2;
    waveMirrorPoints += `${x.toFixed(1)},${y.toFixed(1)} `;
  }

  // --- QR Code as vector rects ---
  const qrSegments = await QRCode.create(soulPageUrl, { errorCorrectionLevel: "M" });
  const qrModules = qrSegments.modules;
  const qrSize = qrModules.size;
  const qrBlockSize = 400 / qrSize; // QR fits in 400×400 area
  const qrOffsetX = cx - 200;
  const qrOffsetY = 1050;

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
  <!-- Pet Name -->
  <text x="${cx}" y="400" text-anchor="middle" font-family="'Playfair Display', Georgia, serif" font-size="120" fill="#000000" font-weight="600">${escapeXml(petName)}</text>

  <!-- Waveform (top half) -->
  <polyline points="${wavePoints.trim()}" fill="none" stroke="#000000" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Waveform (bottom half / mirror) -->
  <polyline points="${waveMirrorPoints.trim()}" fill="none" stroke="#000000" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- QR Code -->
  <g id="qr-code">
    ${qrRects}
  </g>

  <!-- Scan label -->
  <text x="${cx}" y="1520" text-anchor="middle" font-family="'Inter', sans-serif" font-size="36" fill="#000000" letter-spacing="8">SCAN TO HEAR</text>
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
