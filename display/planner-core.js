/* global Buffer */
// Planner core — pure utility functions shared by browser planner + Node.js scripts

/** Set of availability values that block tile passage. */
export const AVAIL_BLOCKING = new Set([
  "SOLID", "NOT_ACCESSIBLE", "ROOM_SOLID",  // player < 0
  "AVOID_PASS", "AVOID_LIKE_FUCK", "PENALTY4", // from > 0
]);

/** 4-directional neighbor offsets [row, col]. */
export const DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0]];

/** Rotate a 2D tile grid 90° clockwise. */
function rotateTiles90CW(tiles) {
  const rows = tiles.length;
  const cols = Math.max(...tiles.map(r => r.length));
  const out = [];
  for (let c = 0; c < cols; c++) {
    const newRow = [];
    for (let r = rows - 1; r >= 0; r--) {
      newRow.push(tiles[r]?.[c] ?? null);
    }
    out.push(newRow);
  }
  return out;
}

/**
 * Get the tile grid for an item at a given rotation (0–3).
 * @param {{ tiles: (string|null)[][] }} item
 * @param {number} rotation
 * @returns {(string|null)[][]}
 */
export function getRotatedTiles(item, rotation) {
  let tiles = item.tiles;
  for (let i = 0; i < rotation; i++) tiles = rotateTiles90CW(tiles);
  return tiles;
}

/**
 * Get the list of allowed rotation values for a furniture group.
 * @param {{ rotations: number }} group
 * @returns {number[]}
 */
export function getAllowedRotations(group) {
  switch (group.rotations) {
    case 0: return [0];
    case 1: return [0, 2];
    case 3: return [0, 1, 2, 3];
    default: return [0];
  }
}

/** Encode bytes to base64url (RFC 4648: + → -, / → _, no padding). */
export function toBase64url(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  // btoa is available in Node >= 16 via globalThis
  const b64 = typeof btoa === "function"
    ? btoa(binary)
    : Buffer.from(binary, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decode base64url string to Uint8Array. */
export function fromBase64url(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  let binary;
  if (typeof atob === "function") {
    binary = atob(padded);
  } else {
    binary = Buffer.from(padded, "base64").toString("binary");
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Parse a binary payload (no version byte) into a plan object.
 * @param {Uint8Array} bytes
 * @returns {{ b: string, w: number, h: number, room: boolean[][], placements: number[][], doors: number[][] }}
 */
export function parseBinaryPlan(bytes) {
  let off = 0;

  function need(n) {
    if (off + n > bytes.length) throw new Error("Truncated plan data");
  }

  need(1);
  const idLen = bytes[off++];
  need(idLen + 2); // id + w + h
  const b = new TextDecoder().decode(bytes.slice(off, off + idLen)); off += idLen;
  const w = bytes[off++];
  const h = bytes[off++];

  // Room bitmap
  const bitmapLen = Math.ceil((w * h) / 8);
  need(bitmapLen);
  const room = [];
  let bitIdx = 0;
  for (let r = 0; r < h; r++) {
    const row = [];
    for (let c = 0; c < w; c++) {
      const bytePos = off + (bitIdx >> 3);
      const bitPos = 7 - (bitIdx & 7);
      row.push(((bytes[bytePos] >> bitPos) & 1) === 1);
      bitIdx++;
    }
    room.push(row);
  }
  off += bitmapLen;

  // Placements
  need(1);
  const numPlacements = bytes[off++];
  need(numPlacements * 5);
  const placements = [];
  for (let i = 0; i < numPlacements; i++) {
    placements.push([bytes[off], bytes[off + 1], bytes[off + 2], bytes[off + 3], bytes[off + 4]]);
    off += 5;
  }

  // Doors
  need(1);
  const numDoors = bytes[off++];
  need(numDoors * 2);
  const doors = [];
  for (let i = 0; i < numDoors; i++) {
    doors.push([bytes[off], bytes[off + 1]]);
    off += 2;
  }

  return { b, w, h, room, placements, doors };
}

/**
 * Serialize a plan object to a binary Uint8Array (no version byte).
 * @param {{ b: string, w: number, h: number, room: boolean[][], placements: number[][], doors: number[][] }} plan
 * @returns {Uint8Array}
 */
export function serializePlanObj(plan) {
  const idBytes = new TextEncoder().encode(plan.b);
  const flat = plan.room.flat();
  const bitmapLen = Math.ceil(flat.length / 8);
  const doorList = plan.doors;
  const headerLen = 1 + idBytes.length + 2 + bitmapLen;
  const placementsLen = 1 + plan.placements.length * 5;
  const doorsLen = 1 + doorList.length * 2;
  const buf = new Uint8Array(headerLen + placementsLen + doorsLen);
  let off = 0;

  // Building ID
  buf[off++] = idBytes.length;
  buf.set(idBytes, off); off += idBytes.length;

  // Dimensions
  buf[off++] = plan.w;
  buf[off++] = plan.h;

  // Room bitmap (MSB-first)
  for (let i = 0; i < flat.length; i++) {
    if (flat[i]) buf[off + (i >> 3)] |= (0x80 >> (i & 7));
  }
  off += bitmapLen;

  // Placements
  buf[off++] = plan.placements.length;
  for (const p of plan.placements) {
    buf[off++] = p[0];
    buf[off++] = p[1];
    buf[off++] = p[2];
    buf[off++] = p[3];
    buf[off++] = p[4];
  }

  // Doors
  buf[off++] = doorList.length;
  for (const d of doorList) {
    buf[off++] = d[0];
    buf[off++] = d[1];
  }

  return buf;
}
