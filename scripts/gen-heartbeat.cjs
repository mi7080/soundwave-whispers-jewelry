// Synthesizes a soft "lub-dub" heartbeat WAV for the Soul Page demo sample.
// Run: node scripts/gen-heartbeat.cjs  -> writes public/demo-heartbeat.wav
const fs = require("fs");
const path = require("path");

const sampleRate = 22050;
const duration = 7; // seconds
const n = sampleRate * duration;
const data = new Float32Array(n);
const beatPeriod = 0.86; // ~70 bpm

const thump = (tRel, freq, amp, tau) =>
  tRel < 0 ? 0 : amp * Math.sin(2 * Math.PI * freq * tRel) * Math.exp(-tRel / tau);

for (let i = 0; i < n; i++) {
  const t = i / sampleRate;
  const phase = t % beatPeriod;
  let s = 0;
  s += thump(phase, 55, 0.9, 0.06); // lub
  s += thump(phase - 0.16, 72, 0.62, 0.05); // dub
  data[i] = s;
}

// gentle overall fade in / out
const fade = Math.floor(sampleRate * 0.25);
for (let i = 0; i < fade; i++) {
  const g = i / fade;
  data[i] *= g;
  data[n - 1 - i] *= g;
}

const buf = Buffer.alloc(44 + n * 2);
buf.write("RIFF", 0);
buf.writeUInt32LE(36 + n * 2, 4);
buf.write("WAVE", 8);
buf.write("fmt ", 12);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); // PCM
buf.writeUInt16LE(1, 22); // mono
buf.writeUInt32LE(sampleRate, 24);
buf.writeUInt32LE(sampleRate * 2, 28);
buf.writeUInt16LE(2, 32);
buf.writeUInt16LE(16, 34);
buf.write("data", 36);
buf.writeUInt32LE(n * 2, 40);
for (let i = 0; i < n; i++) {
  const v = Math.max(-1, Math.min(1, data[i]));
  buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
}

const out = path.join(__dirname, "..", "public", "demo-heartbeat.wav");
fs.writeFileSync(out, buf);
console.log("wrote", out, n, "samples");
