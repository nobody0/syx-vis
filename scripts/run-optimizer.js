#!/usr/bin/env node
// Run the planner optimizer from the command line
import { fromBase64url, toBase64url, parseBinaryPlan, serializePlanObj } from "../display/planner-core.js";
import { runOptimizer } from "../display/optimizer.js";
import { buildings } from "../data/buildings.js";
import { furniture } from "../data/furniture.js";
import zlib from "node:zlib";
import { execFileSync } from "node:child_process";

// ── Build lookup maps ────────────────────────────────────

const buildingById = new Map();
for (const b of buildings) buildingById.set(b.id, b);

const furnitureByBuilding = new Map();
for (const set of furniture) {
  if (set.id === "home") continue;
  for (const bid of set.buildingIds) furnitureByBuilding.set(bid, set);
}

// ── Decode save string ───────────────────────────────────

function decodeSaveString(input) {
  let payload = input;
  const hashIdx = payload.indexOf("#planner/");
  if (hashIdx >= 0) payload = payload.slice(hashIdx + "#planner/".length);
  if (payload.startsWith("planner/")) payload = payload.slice("planner/".length);

  const raw = fromBase64url(payload);
  if (raw.length === 0) throw new Error("Empty payload");

  const version = raw[0];
  let binary;
  if (version === 0x7B) {
    const json = new TextDecoder().decode(raw);
    return JSON.parse(json);
  } else if (version === 0x02) {
    binary = zlib.inflateRawSync(raw.slice(1));
  } else if (version === 0x01) {
    binary = raw.slice(1);
  } else {
    throw new Error(`Unknown version byte: 0x${version.toString(16).padStart(2, "0")}`);
  }

  return parseBinaryPlan(new Uint8Array(binary));
}

// ── Main ──────────────────────────────────────────────────

const args = process.argv.slice(2);
const decode = args.includes("--decode");
const input = args.find(a => !a.startsWith("--"));

if (!input) {
  console.error("Usage: node scripts/run-optimizer.js <save-string-or-URL> [--decode]");
  process.exit(1);
}

const plan = decodeSaveString(input);
const bld = buildingById.get(plan.b);
const fs = furnitureByBuilding.get(plan.b);

if (!bld) {
  console.error(`Unknown building: ${plan.b}`);
  process.exit(1);
}
if (!fs) {
  console.error(`No furniture set for building: ${plan.b}`);
  process.exit(1);
}

console.error(`Optimizing: ${bld.name} (${plan.b}), ${plan.w}×${plan.h}, ${plan.placements.length} placements`);

// Convert plan to optimizer input format
const optimizerInput = {
  building: bld,
  furnitureSet: fs,
  gridW: plan.w,
  gridH: plan.h,
  room: plan.room,
  placements: plan.placements.map(p => ({
    groupIdx: p[0], itemIdx: p[1], rotation: p[2], row: p[3], col: p[4],
  })),
  doors: new Set(plan.doors.map(d => `${d[0]},${d[1]}`)),
};

const result = await runOptimizer(optimizerInput);

// Convert result back to plan object
const resultPlan = {
  b: plan.b,
  w: plan.w,
  h: plan.h,
  room: result.room,
  placements: result.placements.map(p => [p.groupIdx, p.itemIdx, p.rotation, p.row, p.col]),
  doors: [...result.doors].map(k => k.split(",").map(Number)),
};

// Serialize to save string (uncompressed binary, version 0x01)
const binary = serializePlanObj(resultPlan);
const versioned = new Uint8Array(1 + binary.length);
versioned[0] = 0x01;
versioned.set(binary, 1);
const saveString = toBase64url(versioned);

console.log(saveString);

console.error(`Result: ${result.placements.length} placements, ${result.room.flat().filter(Boolean).length} room tiles`);

// Optionally decode the result
if (decode) {
  console.error();
  try {
    execFileSync("node", ["scripts/decode-plan.js", saveString], { stdio: ["ignore", "inherit", "inherit"] });
  } catch {
    console.error("(decode-plan.js failed)");
  }
}
