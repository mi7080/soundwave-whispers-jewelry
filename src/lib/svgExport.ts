import QRCode from "qrcode";
import opentype, { Font } from "opentype.js";

interface SvgExportOptions {
  waveformData: number[];
  petName: string;
  soulPageUrl: string;
  includeBackEngraving?: boolean;
}

/**
 * PURE-VECTOR SVG generator for ShineOn Acrylic Heart pendant (1000×1788).
 *
 * Guarantees:
 * - NO <image> tags
 * - NO Base64 / data: URIs
 * - NO <text> elements (all text outlined to <path>)
 * - Waveform: <rect>, QR code: <rect>, Text: <path d="…">
 */

// ── Font loading (cached) ────────────────────────────────────────────
// Self-hosted via Google Fonts CDN — converted to paths at export time,
// so no font dependency in the final SVG.
const FONT_URLS = {
  inter: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50ojIa1ZL7.ttf",
  playfair: "https://fonts.gstatic.com/s/playfairdisplay/v37/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvUDQ.ttf",
};

const fontCache: Record<string, Promise<Font>> = {};

function loadFont(key: keyof typeof FONT_URLS): Promise<Font> {
  if (!fontCache[key]) {
    fontCache[key] = fetch(FONT_URLS[key])
      .then((r) => {
        if (!r.ok) throw new Error(`Font fetch failed: ${r.status}`);
        return r.arrayBuffer();
      })
      .then((buf) => opentype.parse(buf));
  }
  return fontCache[key];
}

/**
 * Render a string as one or more <path> elements, centered on (cx, baselineY).
 * Returns SVG markup with NO <text> tags.
 */
function textToPath(
  font: Font,
  text: string,
  cx: number,
  baselineY: number,
  fontSize: number,
  letterSpacing = 0,
): string {
  if (!text) return "";

  // Measure with letter-spacing
  const advances: number[] = [];
  let totalWidth = 0;
  const glyphs = font.stringToGlyphs(text);
  for (let i = 0; i < glyphs.length; i++) {
    const adv = (glyphs[i].advanceWidth / font.unitsPerEm) * fontSize;
    advances.push(adv);
    totalWidth += adv + (i < glyphs.length - 1 ? letterSpacing : 0);
  }

  let x = cx - totalWidth / 2;
  let pathData = "";
  for (let i = 0; i < glyphs.length; i++) {
    const path = glyphs[i].getPath(x, baselineY, fontSize);
    pathData += path.toPathData(2) + " ";
    x += advances[i] + letterSpacing;
  }

  return `<path d="${pathData.trim()}" fill="#000000"/>`;
}

// ── Main export ──────────────────────────────────────────────────────
export async function generateProductionSvg(options: SvgExportOptions): Promise<string> {
  const { waveformData, soulPageUrl } = options;
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

  // --- "SCAN TO HEAR" label as outlined paths ---
  let scanLabelPath = "";
  try {
    const inter = await loadFont("inter");
    scanLabelPath = textToPath(inter, "SCAN TO HEAR", cx, 1160, 20, 4);
  } catch (e) {
    console.warn("Font load failed for scan label — omitting text from SVG:", e);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <!-- FRONT SIDE: Pure-vector waveform + QR + outlined text (1000x1788) -->
  <g id="waveform">${waveRects}</g>
  <g id="qr-code">${qrRects}</g>
  <g id="scan-label">${scanLabelPath}</g>
</svg>`;
}

/**
 * Back-engraving: name in luxury serif, converted to <path>.
 */
export async function generateBackEngravingSvg(petName: string): Promise<string> {
  const width = 1000;
  const height = 1788;
  const cx = width / 2;
  const cy = height / 2;

  let namePath = "";
  try {
    const playfair = await loadFont("playfair");
    namePath = textToPath(playfair, petName, cx, cy + 28, 80);
  } catch (e) {
    console.warn("Font load failed for back engraving:", e);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <!-- BACK SIDE: Name outlined as path -->
  <g id="name-engraving">${namePath}</g>
</svg>`;
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
