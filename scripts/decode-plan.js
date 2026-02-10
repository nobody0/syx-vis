#!/usr/bin/env node
// Decode a planner save string (or URL) into a human-readable layout
import { fromBase64url, parseBinaryPlan, getRotatedTiles } from "../display/planner-core.js";
import { buildings } from "../data/buildings.js";
import { furniture } from "../data/furniture.js";
import zlib from "node:zlib";

const STAT_DISPLAY_NAMES = {
  workers: "Employees",
  output: "Workstation",
  production: "Workstation",
  stations: "Workstation",
  efficiency: "Auxiliary",
};

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function getStatDisplayName(stat) { return STAT_DISPLAY_NAMES[stat.name] || capitalize(stat.name); }

// ── Build lookup maps ────────────────────────────────────

const buildingById = new Map();
for (const b of buildings) buildingById.set(b.id, b);

const furnitureByBuilding = new Map();
for (const set of furniture) {
  if (set.id === "home") continue;
  for (const bid of set.buildingIds) furnitureByBuilding.set(bid, set);
}

// ── Find primary stat index (same logic as optimizer.js) ─

function findPrimaryStatIndex(fs) {
  if (!fs.stats || fs.stats.length === 0) return 0;
  let servIdx = -1, empIdx = -1, custIdx = -1;
  for (let i = 0; i < fs.stats.length; i++) {
    const s = fs.stats[i];
    if (s.type === "services" && servIdx < 0) servIdx = i;
    if (s.type === "employees" && empIdx < 0) empIdx = i;
    if (s.type === "custom" && (s.name === "workers" || s.name === "men") && custIdx < 0) custIdx = i;
  }
  if (servIdx >= 0) return servIdx;
  if (empIdx >= 0) return empIdx;
  if (custIdx >= 0) return custIdx;
  return 0;
}

// ── Decode save string ───────────────────────────────────

function decodeSaveString(input) {
  // Strip URL prefix
  let payload = input;
  const hashIdx = payload.indexOf("#planner/");
  if (hashIdx >= 0) payload = payload.slice(hashIdx + "#planner/".length);
  // Also handle bare #planner/
  if (payload.startsWith("planner/")) payload = payload.slice("planner/".length);

  const raw = fromBase64url(payload);
  if (raw.length === 0) throw new Error("Empty payload");

  const version = raw[0];
  let binary;
  if (version === 0x7B) {
    // Legacy JSON (0x7B = '{')
    const json = new TextDecoder().decode(raw);
    return { plan: JSON.parse(json), format: "json" };
  } else if (version === 0x02) {
    // Deflate-raw compressed
    binary = zlib.inflateRawSync(raw.slice(1));
  } else if (version === 0x01) {
    // Uncompressed binary
    binary = raw.slice(1);
  } else {
    throw new Error(`Unknown version byte: 0x${version.toString(16).padStart(2, "0")}`);
  }

  return { plan: parseBinaryPlan(new Uint8Array(binary)), format: `binary v${version}` };
}

// ── Compute stats ─────────────────────────────────────────

function computeStats(plan, bld, fs) {
  if (!fs.stats || fs.stats.length === 0 || !bld.items) return [];
  const totals = new Array(fs.stats.length).fill(0);
  for (const p of plan.placements) {
    const [groupIdx, itemIdx] = p;
    const item = fs.groups[groupIdx]?.items[itemIdx];
    if (!item) continue;
    const bItem = bld.items[groupIdx];
    if (!bItem || !bItem.stats) continue;
    const mult = item.multiplierStats ?? item.multiplier;
    for (let s = 0; s < bItem.stats.length && s < totals.length; s++) {
      totals[s] += bItem.stats[s] * mult;
    }
  }
  return totals;
}

// ── ASCII grid ────────────────────────────────────────────

function buildAsciiGrid(plan, fs) {
  const { w, h, room, placements, doors } = plan;
  // Initialize grid
  const grid = [];
  for (let r = 0; r < h; r++) {
    const row = [];
    for (let c = 0; c < w; c++) {
      row.push(room[r][c] ? "." : " ");
    }
    grid.push(row);
  }

  // Mark doors
  for (const d of doors) {
    if (d[0] < h && d[1] < w) grid[d[0]][d[1]] = "D";
  }

  // Mark placements with group letter (A, B, C, ...)
  for (const p of placements) {
    const [groupIdx, itemIdx, rotation, row, col] = p;
    const item = fs.groups[groupIdx]?.items[itemIdx];
    if (!item) continue;
    const tiles = getRotatedTiles(item, rotation);
    const letter = String.fromCharCode(65 + (groupIdx % 26));
    for (let r = 0; r < tiles.length; r++) {
      for (let c = 0; c < (tiles[r]?.length ?? 0); c++) {
        if (tiles[r][c] === null) continue;
        const gr = row + r;
        const gc = col + c;
        if (gr >= 0 && gr < h && gc >= 0 && gc < w) {
          grid[gr][gc] = letter;
        }
      }
    }
  }

  return grid;
}

// ── Main ──────────────────────────────────────────────────

const args = process.argv.slice(2);
const verbose = args.includes("--verbose");
const input = args.find(a => !a.startsWith("--"));

if (!input) {
  console.error("Usage: node scripts/decode-plan.js <save-string-or-URL> [--verbose]");
  process.exit(1);
}

const { plan, format } = decodeSaveString(input);
const bld = buildingById.get(plan.b);
const fs = furnitureByBuilding.get(plan.b);

if (!bld) {
  console.error(`Unknown building: ${plan.b}`);
  process.exit(1);
}

const roomCount = plan.room.flat().filter(Boolean).length;

// Header
console.log(`Building:   ${bld.name} (${plan.b})`);
console.log(`Format:     ${format}`);
console.log(`Dimensions: ${plan.w} × ${plan.h}`);
console.log(`Room tiles: ${roomCount}`);
console.log(`Placements: ${plan.placements.length}`);
console.log(`Doors:      ${plan.doors.length}`);
console.log();

// ASCII grid
if (fs) {
  const grid = buildAsciiGrid(plan, fs);
  // Column numbers header
  const colNums = "  " + Array.from({ length: plan.w }, (_, i) => (i % 10).toString()).join("");
  console.log(colNums);
  for (let r = 0; r < plan.h; r++) {
    console.log((r % 10).toString().padStart(2) + grid[r].join(""));
  }
  console.log();
}

// Placements table (verbose only)
if (verbose && plan.placements.length > 0 && fs) {
  console.log("Placements:");
  console.log("  #  Group       Item  Mult  Rot  Row,Col  Tiles");
  console.log("  " + "-".repeat(62));
  for (let i = 0; i < plan.placements.length; i++) {
    const [groupIdx, itemIdx, rotation, row, col] = plan.placements[i];
    const group = fs.groups[groupIdx];
    const item = group?.items[itemIdx];
    const groupLetter = String.fromCharCode(65 + (groupIdx % 26));
    const mult = item ? item.multiplier : "?";
    const tiles = item ? getRotatedTiles(item, rotation) : null;
    const tileH = tiles ? tiles.length : "?";
    const tileW = tiles ? Math.max(...tiles.map(r => r?.length ?? 0)) : "?";
    console.log(`  ${String(i + 1).padStart(2)}  ${groupLetter} (${String(groupIdx).padEnd(2)})  ${String(itemIdx).padStart(5)}  ${String(mult).padStart(4)}  ${String(rotation).padStart(3)}  ${String(row).padStart(3)},${String(col).padEnd(3)}  ${tileW}×${tileH}`);
  }
  console.log();
}

// Stats
if (fs?.stats && fs.stats.length > 0) {
  const stats = computeStats(plan, bld, fs);
  const primaryIdx = findPrimaryStatIndex(fs);

  // Find employees idx for efficiency
  let employeesIdx = -1;
  for (let i = 0; i < fs.stats.length; i++) {
    const s = fs.stats[i];
    if (s.type === "employees") employeesIdx = i;
    else if (s.type === "custom" && (s.name === "workers" || s.name === "men") && employeesIdx < 0) employeesIdx = i;
  }

  console.log("Stats:");
  for (let s = 0; s < fs.stats.length; s++) {
    const stat = fs.stats[s];
    const val = stats[s] ?? 0;
    const displayName = getStatDisplayName(stat);

    let formatted;
    if (stat.type === "efficiency" && employeesIdx >= 0) {
      const empVal = stats[employeesIdx] ?? 0;
      const pct = 0.5 + 0.5 * Math.min(1, val / Math.max(1, empVal));
      formatted = Math.round(pct * 100) + "%";
    } else if (stat.type === "relative" || stat.type === "employeesRelative") {
      const primaryVal = stats[primaryIdx] ?? 0;
      const pct = primaryVal > 0 ? Math.round(val / primaryVal * 100) : 0;
      formatted = `${pct}% (raw: ${val.toFixed(1)}, primary[${primaryIdx}]: ${primaryVal.toFixed(1)})`;
    } else {
      const isInt = stat.type === "employees" || stat.type === "services" || stat.type === "integer"
          || (stat.type === "custom" && (stat.name === "workers" || stat.name === "men"));
      formatted = isInt ? String(Math.round(val)) : val.toFixed(1);
    }
    console.log(`  ${displayName.padEnd(20)} ${formatted.padStart(8)}  [${stat.type}]`);
  }
  console.log();
}

// Verbose: tile type details, group info
if (verbose && fs) {
  console.log("Groups:");
  for (let g = 0; g < fs.groups.length; g++) {
    const group = fs.groups[g];
    const letter = String.fromCharCode(65 + (g % 26));
    console.log(`  ${letter} (${g}): ${group.items.length} items, min=${group.min ?? 0}, rotations=${group.rotations}`);
    if (group.max != null) console.log(`         max=${group.max}`);
  }
  console.log();

  console.log("Tile types:");
  for (const [key, tt] of Object.entries(fs.tileTypes)) {
    if (tt === null) { console.log(`  ${key}: (empty)`); continue; }
    const parts = [`avail=${tt.availability}`];
    if (tt.mustBeReachable) parts.push("reachable");
    if (tt.canGoCandle) parts.push("candle");
    if (tt.data != null) parts.push(`data=${tt.data}`);
    if (tt.sprite) parts.push(`sprite=${tt.sprite}`);
    console.log(`  ${key.padEnd(20)} ${parts.join(", ")}`);
  }
}
