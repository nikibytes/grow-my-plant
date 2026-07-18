import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

// ── 20 reusable, transparent leaf silhouettes for the Community Plant ──
// Each is a self-contained SVG (viewBox 0 0 100 100) with a soft organic shape,
// a vein, and a leaf-color fill that can be themed via CSS currentColor.
// Style indices 0-19 map 1:1 with calculateLeafStyle() output.

const PALETTE = [
  "#5cb85c", "#4caf50", "#66bb6a", "#43a047", "#7cb342",
  "#8bc34a", "#9ccc65", "#388e3c", "#2e9e5b", "#57bb8f",
  "#3f9d54", "#6ab04c", "#27ae60", "#52be80", "#48c9b0",
  "#73c990", "#45b36b", "#1e9e6a", "#62c370", "#3aa76d",
];

function leafSvg(i: number): string {
  const c = PALETTE[i];
  const vein = "#2e7d32";
  // slight silhouette variety by shifting a control point
  const wob = (i % 5) - 2; // -2..2
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <path d="M50 6 C${74 + wob} 22 ${78 + wob} 64 50 94 C${22 - wob} 64 ${26 - wob} 22 50 6 Z"
        fill="${c}" stroke="${vein}" stroke-width="2" stroke-opacity="0.5"/>
  <path d="M50 12 L50 88" stroke="${vein}" stroke-width="2" stroke-opacity="0.55" fill="none"/>
  <path d="M50 30 L${38 - wob} 22 M50 46 L${36 - wob} 38 M50 62 L${38 - wob} 54 M50 30 L${62 + wob} 22 M50 46 L${64 + wob} 38 M50 62 L${62 + wob} 54"
        stroke="${vein}" stroke-width="1.6" stroke-opacity="0.45" fill="none"/>
</svg>`;
}

const outDir = "public/leaves";
mkdirSync(outDir, { recursive: true });
for (let i = 0; i < 20; i++) {
  writeFileSync(`${outDir}/leaf-${String(i + 1).padStart(2, "0")}.svg`, leafSvg(i));
}
console.log(`Wrote ${20} leaf SVGs to ${outDir}`);
