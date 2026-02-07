#!/usr/bin/env node
// Systematically find the actual icon bounding box within each spritesheet cell
// by detecting the background color and finding where content starts/ends.
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { PNG } from "pngjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from project root (no dependencies)
try {
  const env = readFileSync(resolve(__dirname, "..", ".env"), "utf-8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([^#=]+?)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch { /* .env is optional */ }

const DATA_ZIP = process.argv[2] || process.env.DATA_ZIP;
if (!DATA_ZIP) {
  console.error("Error: No path to data.zip provided.");
  console.error("Set DATA_ZIP in .env (see .env.example) or pass as CLI argument.");
  process.exit(1);
}

function unzipBinary(zipPath, entryPath) {
  try {
    return execSync(`unzip -p "${zipPath}" "${entryPath}"`, { encoding: "buffer", maxBuffer: 5 * 1024 * 1024 });
  } catch { return null; }
}

function listZipPaths(zipPath, dirPattern) {
  const raw = execSync(`unzip -l "${zipPath}"`, { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
  const paths = [];
  for (const line of raw.split("\n")) {
    const match = line.match(/\d+\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+(.*)/);
    if (match && dirPattern.test(match[1])) paths.push(match[1].trim());
  }
  return paths;
}

// Check if a pixel matches a reference color
function isColor(data, idx, r, g, b) {
  return data[idx] === r && data[idx+1] === g && data[idx+2] === b;
}

// Find bounding box of non-background content in a region
function findContentBox(png, cellX, cellY, cellW, cellH) {
  // The bg color is always at the corner of the cell
  const cornerIdx = (cellY * png.width + cellX) * 4;
  const bgR = png.data[cornerIdx], bgG = png.data[cornerIdx+1], bgB = png.data[cornerIdx+2];

  let minX = cellW, minY = cellH, maxX = -1, maxY = -1;
  for (let y = 0; y < cellH; y++) {
    for (let x = 0; x < cellW; x++) {
      const px = cellX + x, py = cellY + y;
      if (px >= png.width || py >= png.height) continue;
      const idx = (py * png.width + px) * 4;
      if (!isColor(png.data, idx, bgR, bgG, bgB)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX === -1) return null; // entirely bg
  return {
    left: minX, top: minY,
    right: cellW - 1 - maxX, bottom: cellH - 1 - maxY,
    contentW: maxX - minX + 1, contentH: maxY - minY + 1,
    bg: `${bgR},${bgG},${bgB}`
  };
}

// === 32px Building Sheets ===
console.log("=== 32px Building Sheets (cell = 44x44) ===");
const sheets32 = listZipPaths(DATA_ZIP, /^data\/assets\/sprite\/icon\/32\/[A-Z_]+\.png$/);
for (const p of sheets32) {
  const buf = unzipBinary(DATA_ZIP, p);
  if (!buf) continue;
  const png = PNG.sync.read(buf);
  const name = p.split("/").pop().replace(".png", "");

  // Skip non-icon sheets
  if (["SEASONS", "TECH", "_ICONS", "_UI", "_BANNER"].includes(name)) continue;

  const cols = 2;
  const maxRow = Math.floor(png.height / 44);
  const maxIdx = cols * maxRow - 1;

  const boxes = [];
  for (let idx = 0; idx <= maxIdx; idx++) {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const cx = col * 44, cy = row * 44;
    if (cy + 44 > png.height) break;
    const box = findContentBox(png, cx, cy, 44, 44);
    if (box) boxes.push({ idx, ...box });
  }

  if (boxes.length === 0) continue;

  // Find min/max of all content boxes
  const leftPads = boxes.map(b => b.left);
  const topPads = boxes.map(b => b.top);
  const rightPads = boxes.map(b => b.right);
  const bottomPads = boxes.map(b => b.bottom);

  const minLeft = Math.min(...leftPads), maxLeft = Math.max(...leftPads);
  const minTop = Math.min(...topPads), maxTop = Math.max(...topPads);
  const minRight = Math.min(...rightPads), maxRight = Math.max(...rightPads);
  const minBottom = Math.min(...bottomPads), maxBottom = Math.max(...bottomPads);

  console.log(`${name.padEnd(14)} ${png.width}x${png.height}  ${boxes.length} cells  bg=${boxes[0].bg}`);
  console.log(`  left: ${minLeft}-${maxLeft}  top: ${minTop}-${maxTop}  right: ${minRight}-${maxRight}  bottom: ${minBottom}-${maxBottom}`);

  if (minLeft !== maxLeft || minTop !== maxTop || minRight !== maxRight || minBottom !== maxBottom) {
    console.log("  WARNING: inconsistent padding!");
    for (const b of boxes) {
      if (b.left !== minLeft || b.top !== minTop || b.right !== minRight || b.bottom !== minBottom) {
        console.log(`    idx ${b.idx}: L=${b.left} T=${b.top} R=${b.right} B=${b.bottom} (${b.contentW}x${b.contentH})`);
      }
    }
  }
}

// === 32px sub-sheets (animal, race, religion) ===
console.log("\n=== 32px Sub-sheets ===");
const subSheets = listZipPaths(DATA_ZIP, /^data\/assets\/sprite\/icon\/32\/(animal|race|religion)\/.*\.png$/);
for (const p of subSheets) {
  const buf = unzipBinary(DATA_ZIP, p);
  if (!buf) continue;
  const png = PNG.sync.read(buf);
  const name = p.replace("data/assets/sprite/icon/32/", "").replace(".png", "");

  const box = findContentBox(png, 0, 0, Math.min(44, png.width), Math.min(44, png.height));
  if (box) {
    console.log(`${name.padEnd(25)} ${png.width}x${png.height}  L=${box.left} T=${box.top} R=${box.right} B=${box.bottom}  bg=${box.bg}`);
  }
}

// === 24px Resource Sheets ===
console.log("\n=== 24px Resource Sheets ===");
const resSheets = listZipPaths(DATA_ZIP, /^data\/assets\/sprite\/icon\/24\/resource\/.*\.png$/);
for (const p of resSheets) {
  const buf = unzipBinary(DATA_ZIP, p);
  if (!buf) continue;
  const png = PNG.sync.read(buf);
  const name = p.split("/").pop().replace(".png", "");

  // Determine number of rows from height
  // Most are 36 (1 row), Alcohol is 66 (2 rows)
  // Row pitch = 36 for 1 row, 33 for 2 rows
  const numRows = png.height <= 36 ? 1 : Math.round(png.height / 33);
  const rowPitch = Math.floor(png.height / numRows);

  for (let row = 0; row < numRows; row++) {
    // Check all 3 columns (variants) but focus on col 0
    const box = findContentBox(png, 0, row * rowPitch, 24, rowPitch);
    if (box) {
      console.log(`${name.padEnd(18)} row${row}  ${png.width}x${png.height} pitch=${rowPitch}  L=${box.left} T=${box.top} R=${box.right} B=${box.bottom}  content=${box.contentW}x${box.contentH}  bg=${box.bg}`);
    }
  }
}

// === 24px Race Sheets (used in composite FG) ===
console.log("\n=== 24px Race Sheets ===");
const raceSheets = listZipPaths(DATA_ZIP, /^data\/assets\/sprite\/icon\/24\/race\/.*\.png$/);
for (const p of raceSheets) {
  const buf = unzipBinary(DATA_ZIP, p);
  if (!buf) continue;
  const png = PNG.sync.read(buf);
  const name = p.split("/").pop().replace(".png", "");
  const rowPitch = png.height; // single row
  const box = findContentBox(png, 0, 0, 24, rowPitch);
  if (box) {
    console.log(`${name.padEnd(18)} ${png.width}x${png.height}  L=${box.left} T=${box.top} R=${box.right} B=${box.bottom}  content=${box.contentW}x${box.contentH}  bg=${box.bg}`);
  }
}
