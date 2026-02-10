// Blueprint export + management — SOS-format text for Songs of Syx + localStorage library
import {
  AVAIL_BLOCKING, getRotatedTiles, getAllowedRotations,
  fromBase64url, toBase64url, parseBinaryPlan, serializePlanObj,
  compress, decompress,
} from "./planner-core.js";

// ── localStorage CRUD ────────────────────────────────────

const BP_KEY = "syx-vis-blueprints";

/**
 * Load blueprints array from localStorage.
 * @returns {Array<{id: string, name: string, buildingId: string, savedAt: number, planEncoded: string, width: number, height: number}>}
 */
export function loadBlueprints() {
  try {
    const raw = localStorage.getItem(BP_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
}

/**
 * Save blueprints array to localStorage.
 * @param {Array<{id: string, name: string, buildingId: string, savedAt: number, planEncoded: string, width: number, height: number}>} arr
 */
export function saveBlueprints(arr) {
  try { localStorage.setItem(BP_KEY, JSON.stringify(arr)); } catch { /* quota */ }
}

// ── Parse SavedPrints.txt ────────────────────────────────

/**
 * Parse a SavedPrints.txt file into an array of blueprint-like objects.
 * Returns raw DATA arrays instead of reconstructed sosEntry text.
 * @param {string} text - file content
 * @returns {Array<{name: string, buildingId: string, width: number, height: number, data: number[]}>}
 */
export function parseSavedPrints(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const results = [];
  let inEntry = false;
  let inData = false;
  let entry = { name: "", room: "", width: 0, height: 0, check: "", structure: "_", data: [] };

  for (const line of lines) {
    const trimmed = line.replace(/^\t+/, "").trim();

    if (!inEntry) {
      if (trimmed === "{") {
        inEntry = true;
        inData = false;
        entry = { name: "", room: "", width: 0, height: 0, check: "", structure: "_", data: [] };
      }
      continue;
    }

    if (inData) {
      if (trimmed === "]," || trimmed === "]") {
        inData = false;
        continue;
      }
      // Parse data value (strip trailing comma)
      const val = trimmed.replace(/,$/, "");
      if (val !== "") entry.data.push(parseInt(val, 10));
      continue;
    }

    // Parse key: value lines
    const kv = trimmed.replace(/,$/, "");
    if (kv.startsWith("NAME:")) {
      // Strip quotes: NAME: "My Blueprint" → My Blueprint
      entry.name = kv.slice(5).trim().replace(/^"(.*)"$/, "$1");
    } else if (kv.startsWith("ROOM:")) {
      entry.room = kv.slice(5).trim();
    } else if (kv.startsWith("WIDTH:")) {
      entry.width = parseInt(kv.slice(6).trim(), 10) || 0;
    } else if (kv.startsWith("HEIGHT:")) {
      entry.height = parseInt(kv.slice(7).trim(), 10) || 0;
    } else if (kv.startsWith("CHECK:")) {
      entry.check = kv.slice(6).trim();
    } else if (kv.startsWith("STRUCTURE:")) {
      entry.structure = kv.slice(10).trim();
    } else if (kv.startsWith("DATA:") || trimmed === "DATA: [") {
      inData = true;
    } else if (trimmed === "}," || trimmed === "}") {
      // End of entry
      inEntry = false;
      if (entry.room && entry.width > 0 && entry.height > 0) {
        results.push({
          name: entry.name || entry.room,
          buildingId: entry.room.toLowerCase(),
          width: entry.width,
          height: entry.height,
          data: entry.data,
        });
      }
    }
  }

  return results;
}

/**
 * Generate a complete SavedPrints.txt from an array of SOS entry strings.
 * @param {string[]} sosEntries - array of SOS-format entry texts
 * @returns {string} complete file content with BLUEPRINTS wrapper
 */
export function generateSavedPrints(sosEntries) {
  const inner = sosEntries.join("\r\n");
  return `BLUEPRINTS: [\r\n${inner}\r\n],\r\n`;
}

/**
 * Compute the flat index of an item within the full furniture set.
 * @param {import('../types.js').FurnitureGroup[]} groups
 * @param {number} groupIdx
 * @param {number} itemIdx
 * @returns {number}
 */
function flatIndex(groups, groupIdx, itemIdx) {
  let idx = 0;
  for (let g = 0; g < groupIdx; g++) idx += groups[g].items.length;
  return idx + itemIdx;
}

/**
 * Reverse a flat furniture index to group + item indices.
 * @param {import('../types.js').FurnitureGroup[]} groups
 * @param {number} flatIdx
 * @returns {{groupIdx: number, itemIdx: number}|null}
 */
function reverseFlatIndex(groups, flatIdx) {
  let running = 0;
  for (let g = 0; g < groups.length; g++) {
    if (flatIdx < running + groups[g].items.length) {
      return { groupIdx: g, itemIdx: flatIdx - running };
    }
    running += groups[g].items.length;
  }
  return null;
}

/**
 * Infer the rotation for a furniture item placed at (masterR, masterC) within a room grid.
 * Tries each allowed rotation and returns the first where all tiles land on room cells.
 * @param {import('../types.js').FurnitureSet} furnitureSet
 * @param {number} groupIdx
 * @param {number} itemIdx
 * @param {number} masterR
 * @param {number} masterC
 * @param {boolean[][]} room
 * @param {number} w
 * @param {number} h
 * @returns {number}
 */
function inferRotation(furnitureSet, groupIdx, itemIdx, masterR, masterC, room, w, h) {
  const group = furnitureSet.groups[groupIdx];
  const item = group.items[itemIdx];
  const allowed = getAllowedRotations(group);

  for (const rot of allowed) {
    const tiles = getRotatedTiles(item, rot);
    let allFit = true;
    for (let dr = 0; dr < tiles.length && allFit; dr++) {
      for (let dc = 0; dc < (tiles[dr]?.length ?? 0) && allFit; dc++) {
        if (tiles[dr][dc] === null) continue;
        const r = masterR + dr, c = masterC + dc;
        if (r < 0 || r >= h || c < 0 || c >= w || !room[r][c]) {
          allFit = false;
        }
      }
    }
    if (allFit) return rot;
  }
  return 0; // fallback
}

/** 8-directional neighbor offsets. */
const DIRS8 = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];

/**
 * Compute wall cells from room grid + doors. Walls are non-room cells adjacent (8-dir) to room cells.
 * @param {boolean[][]} room
 * @param {number} w
 * @param {number} h
 * @param {Set<string>} doors
 * @param {boolean} isIndoors - if false, no walls computed
 * @returns {boolean[][]}
 */
function computeWallsFromRoom(room, w, h, doors, isIndoors) {
  const walls = Array.from({ length: h }, () => Array(w).fill(false));
  if (!isIndoors) return walls;
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      if (room[r][c]) continue;
      let adjRoom = false;
      for (const [dr, dc] of DIRS8) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < h && nc >= 0 && nc < w && room[nr][nc]) {
          adjRoom = true; break;
        }
      }
      if (adjRoom && !doors.has(`${r},${c}`)) {
        walls[r][c] = true;
      }
    }
  }
  return walls;
}

/**
 * Convert SOS DATA array to a plan object compatible with planner binary format.
 * @param {number[]} data - raw DATA values from SOS format
 * @param {number} w - grid width
 * @param {number} h - grid height
 * @param {string} buildingId
 * @param {import('../types.js').FurnitureSet|undefined} furnitureSet - if undefined, only room+doors are extracted
 * @returns {{ b: string, w: number, h: number, room: boolean[][], placements: number[][], doors: number[][] }}
 */
export function sosDataToPlanObj(data, w, h, buildingId, furnitureSet) {
  const room = Array.from({ length: h }, () => Array(w).fill(false));
  const doors = [];

  // First pass: extract room cells and doors
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const val = data[r * w + c] || 0;
      if (val & 1) room[r][c] = true;
      if (val & 4) {
        // Door — only record doors on non-room cells
        if (!(val & 1)) doors.push([r, c]);
      }
    }
  }

  // Second pass: extract furniture placements
  const placements = [];
  if (furnitureSet) {
    const groups = furnitureSet.groups;
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const val = data[r * w + c] || 0;
        const furnBits = val >> 6;
        if (furnBits === 0) continue;
        const fi = furnBits - 1; // flat index (0-based)
        const rev = reverseFlatIndex(groups, fi);
        if (!rev) continue; // out of range — game version mismatch
        const rot = inferRotation(furnitureSet, rev.groupIdx, rev.itemIdx, r, c, room, w, h);
        placements.push([rev.groupIdx, rev.itemIdx, rot, r, c]);
      }
    }
  }

  return { b: buildingId, w, h, room, placements, doors };
}

/**
 * Serialize a plan object to compressed base64url string (version 0x02).
 * @param {{ b: string, w: number, h: number, room: boolean[][], placements: number[][], doors: number[][] }} planObj
 * @returns {Promise<string>}
 */
export async function encodePlanObj(planObj) {
  const binary = serializePlanObj(planObj);
  const compressed = await compress(binary);
  const versioned = new Uint8Array(1 + compressed.length);
  versioned[0] = 0x02;
  versioned.set(compressed, 1);
  return toBase64url(versioned);
}

/**
 * Decode a planEncoded string and generate SOS-format blueprint text.
 * Returns null if the building has no furniture set (unknown building).
 * @param {string} planEncoded - base64url compressed plan
 * @param {string} name - blueprint name
 * @param {import('../types.js').FurnitureSet|undefined} furnitureSet
 * @returns {Promise<string|null>}
 */
export async function planEncodedToSosEntry(planEncoded, name, furnitureSet) {
  if (!furnitureSet) return null;
  try {
    const bytes = fromBase64url(planEncoded);
    if (bytes.length === 0) return null;
    const version = bytes[0];
    const payload = bytes.slice(1);
    let binary;
    if (version === 0x01) {
      binary = payload;
    } else if (version === 0x02) {
      binary = await decompress(payload);
    } else {
      return null;
    }
    const plan = parseBinaryPlan(binary);
    const buildingId = plan.b;

    // Reconstruct doors as Set<string> for wall computation
    const doorSet = new Set(plan.doors.map(([r, c]) => `${r},${c}`));
    const isIndoors = furnitureSet.mustBeIndoors === true;
    const walls = computeWallsFromRoom(plan.room, plan.w, plan.h, doorSet, isIndoors);

    // Build exportable state
    const exportState = {
      buildingId,
      furnitureSet,
      room: plan.room,
      walls,
      doors: doorSet,
      placements: plan.placements.map(([gi, ii, rot, row, col]) => ({
        groupIdx: gi, itemIdx: ii, rotation: rot, row, col,
      })),
      gridW: plan.w,
      gridH: plan.h,
    };
    return exportBlueprint(exportState, name);
  } catch (err) {
    console.warn("planEncodedToSosEntry failed:", err);
    return null;
  }
}

/**
 * Compute the CHECK field for a furniture set.
 * Format: numGroups, then per group: min, max (2147483647 if undefined), rotations+1, numItems,
 * then per item: width (max row length), height (tiles.length).
 * @param {import('../types.js').FurnitureSet} furnitureSet
 * @returns {string}
 */
export function computeCheck(furnitureSet) {
  const groups = furnitureSet.groups;
  let check = String(groups.length);
  for (const g of groups) {
    check += String(g.min);
    check += String(g.max ?? 2147483647);
    check += String(g.rotations + 1);
    check += String(g.items.length);
    for (const item of g.items) {
      const height = item.tiles.length;
      const width = Math.max(...item.tiles.map(r => r.length));
      check += String(width);
      check += String(height);
    }
  }
  return check;
}

/**
 * Export the current planner state as SOS-format blueprint text.
 * @param {{
 *   buildingId: string,
 *   furnitureSet: import('../types.js').FurnitureSet,
 *   room: boolean[][],
 *   walls: boolean[][],
 *   doors: Set<string>,
 *   placements: { groupIdx: number, itemIdx: number, rotation: number, row: number, col: number }[],
 *   gridW: number,
 *   gridH: number,
 * }} state
 * @param {string} name - Blueprint name
 * @returns {string} SOS-format text for one blueprint entry
 */
export function exportBlueprint(state, name) {
  const { buildingId, furnitureSet, room, walls, doors, placements, gridW, gridH } = state;

  // Trim to bounding box of room+wall tiles with 1-cell margin
  let minR = gridH, maxR = -1, minC = gridW, maxC = -1;
  for (let r = 0; r < gridH; r++) {
    for (let c = 0; c < gridW; c++) {
      if (room[r][c] || walls[r][c] || doors.has(`${r},${c}`)) {
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      }
    }
  }
  if (maxR < 0) return ""; // empty

  const w = maxC - minC + 1;
  const h = maxR - minR + 1;

  // Build furniture occupancy map: [r][c] → { groupIdx, itemIdx, isMaster, tileType }
  const furnMap = Array.from({ length: h }, () => Array(w).fill(null));
  for (const p of placements) {
    const item = furnitureSet.groups[p.groupIdx]?.items[p.itemIdx];
    if (!item) continue;
    const rotated = getRotatedTiles(item, p.rotation);
    for (let dr = 0; dr < rotated.length; dr++) {
      for (let dc = 0; dc < rotated[dr].length; dc++) {
        const tileKey = rotated[dr][dc];
        if (tileKey === null) continue;
        const gr = p.row - minR + dr;
        const gc = p.col - minC + dc;
        if (gr < 0 || gr >= h || gc < 0 || gc >= w) continue;
        const tileType = furnitureSet.tileTypes[tileKey] ?? null;
        furnMap[gr][gc] = {
          groupIdx: p.groupIdx,
          itemIdx: p.itemIdx,
          isMaster: dr === 0 && dc === 0,
          tileType,
        };
      }
    }
  }

  // Encode DATA
  const data = [];
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const gr = r + minR;
      const gc = c + minC;
      const isRoom = room[gr]?.[gc] ?? false;
      const isWall = walls[gr]?.[gc] ?? false;
      const isDoor = doors.has(`${gr},${gc}`);
      const furn = furnMap[r][c];

      if (!isRoom && !isWall && !isDoor) {
        data.push(0);
        continue;
      }

      let flags = 0;
      if (isRoom) flags |= 1;
      if (isWall) flags |= 2;
      if (isDoor) flags |= 4;

      // Solid flag: walls are solid, blocking furniture tiles are solid
      if (isWall) flags |= 8;
      if (furn && furn.tileType && AVAIL_BLOCKING.has(furn.tileType.availability)) {
        flags |= 8;
      }

      // Furniture index: only at master position
      let furnBits = 0;
      if (furn && furn.isMaster) {
        const fi = flatIndex(furnitureSet.groups, furn.groupIdx, furn.itemIdx);
        furnBits = (fi + 1) << 6;
      }

      data.push(furnBits | flags);
    }
  }

  // Format SOS text — tabs + CRLF to match game parser
  const roomId = buildingId.toUpperCase();
  const check = computeCheck(furnitureSet);

  const lines = [];
  lines.push("\t{");
  lines.push(`\tNAME: "${name}",`);
  lines.push(`\tROOM: ${roomId},`);
  lines.push("\tSTRUCTURE: _,");
  lines.push(`\tCHECK: ${check},`);
  lines.push(`\tWIDTH: ${w},`);
  lines.push(`\tHEIGHT: ${h},`);
  lines.push("\tDATA: [");
  for (const v of data) {
    lines.push(`\t\t${v},`);
  }
  lines.push("\t],");
  lines.push("\t");  // blank line between ], and },
  lines.push("\t},");

  return lines.join("\r\n");
}
