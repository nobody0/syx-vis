#!/usr/bin/env node
// Parse a Songs of Syx .save file and list detected buildings.
// Usage: node scripts/parse-save.js <path-to-save> [--json]
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { resolve } from "node:path";
import { buildings } from "../data/buildings.js";

// Build lookup: uppercase game room name → building data
const ROOM_TO_BUILDING = new Map();
for (const b of buildings) {
  ROOM_TO_BUILDING.set(b.id.toUpperCase(), b);
}

// Infrastructure rooms always present in every city
const ALWAYS_PRESENT = new Set(["_BUILDER", "_HAULER", "_TRANSPORT", "_HOME", "_STATION"]);

// Parse args
const args = process.argv.slice(2);
const jsonMode = args.includes("--json");
const savePath = args.find(a => !a.startsWith("--"));

if (!savePath) {
  console.error("Usage: node scripts/parse-save.js <path-to-save> [--json]");
  console.error("  e.g. node scripts/parse-save.js %APPDATA%/songsofsyx/saves/saves/MyCit.save");
  process.exit(1);
}

// Read and decompress
const compressed = readFileSync(resolve(savePath));
const decompressed = inflateSync(compressed);

// Skip 4-byte size header
const data = decompressed.subarray(4);

/**
 * Encode a string in the game's chars() format: [00 00 00 00][length_BE][UTF-16 BE chars].
 */
function encodeChars(str) {
  const buf = Buffer.alloc(4 + 4 + str.length * 2);
  buf.writeInt32BE(str.length, 4);
  for (let i = 0; i < str.length; i++) {
    buf[8 + i * 2] = 0;
    buf[8 + i * 2 + 1] = str.charCodeAt(i);
  }
  return buf;
}

// Scan for built rooms
const found = [];

for (const [upperName, building] of ROOM_TO_BUILDING) {
  const pattern = encodeChars(upperName);

  // Find first occurrence (type registry)
  const first = data.indexOf(pattern);
  if (first < 0) continue;

  // Always-present infrastructure
  if (ALWAYS_PRESENT.has(upperName)) {
    found.push(building);
    continue;
  }

  // Find second occurrence (room data block)
  const second = data.indexOf(pattern, first + pattern.length);
  if (second < 0) continue;

  // Read instance count at offset +14 after chars() entry
  const afterPos = second + pattern.length;
  if (afterPos + 18 > data.length) continue;

  const instanceCount = data.readInt32BE(afterPos + 14);

  if (instanceCount > 0 && instanceCount < 10000) {
    found.push(building);
  }
}

found.sort((a, b) => a.name.localeCompare(b.name));

// Parse filename
const filename = savePath.split(/[\\/]/).pop();
const base = filename.replace(/\.save$/i, "");
const match = base.match(/^(.+?)-[0-9a-f]+-[0-9a-f]+-[0-9a-f]+-([0-9a-f]+)$/i);
const cityName = match ? match[1] : base;
const population = match ? parseInt(match[2], 16) : null;

if (jsonMode) {
  console.log(JSON.stringify({
    cityName,
    population,
    buildings: found.map(b => ({ id: b.id, name: b.name, category: b.category })),
    count: found.length,
  }, null, 2));
} else {
  console.log(`City: ${cityName}`);
  if (population != null) console.log(`Population: ${population.toLocaleString()}`);
  console.log(`Found ${found.length} / ${buildings.length} buildings:\n`);

  // Group by category
  const groups = new Map();
  for (const b of found) {
    const cat = b.category;
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(b);
  }
  for (const cat of [...groups.keys()].sort()) {
    const items = groups.get(cat);
    console.log(`  ${cat.toUpperCase()} (${items.length})`);
    for (const b of items) {
      console.log(`    - ${b.name} (${b.id})`);
    }
  }
}
