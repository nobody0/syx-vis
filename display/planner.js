// Room Planner tab — interactive furniture placement editor with stat computation
import { buildings } from "../data/buildings.js";
import { furniture } from "../data/furniture.js";
import { capitalize, formatResourceName } from "./config.js";
import {
  parseSavedPrints, generateSavedPrints, loadBlueprints, saveBlueprints,
  sosDataToPlanObj, encodePlanObj, planEncodedToSosEntry,
} from "./blueprint.js";
import { createAutocomplete } from "./filters.js";
import { runOptimizer } from "./optimizer.js";
import { replacePlannerRoute, clearPlannerRoute } from "./router.js";
import {
  AVAIL_BLOCKING, AVAIL_IMPASSABLE, DIRS, getRotatedTiles, getAllowedRotations,
  fromBase64url, toBase64url, parseBinaryPlan, serializePlanObj,
  compress, decompress,
} from "./planner-core.js";

// Re-export for backward compatibility
export { AVAIL_BLOCKING, AVAIL_IMPASSABLE, getRotatedTiles, getAllowedRotations, DIRS };

const LS_KEY = "syx-vis-planner-state";

// ── Data lookup ─────────────────────────────────────────

/** @type {Map<string, import('../types.js').FurnitureSet>} */
const furnitureByBuilding = new Map();
for (const set of furniture) {
  if (set.id === "home") continue; // citizens furnish homes themselves
  for (const bid of set.buildingIds) furnitureByBuilding.set(bid, set);
}

/** @type {Map<string, import('../types.js').Building>} */
const buildingById = new Map();
for (const b of buildings) buildingById.set(b.id, b);

function formatCosts(costs) {
  return costs.map(c => `${c.amount} ${formatResourceName(c.resource)}`).join(", ");
}

// ── Availability colors / labels ────────────────────────

// ── Undo ─────────────────────────────────────────────────

const undoStack = [];
const MAX_UNDO = 50;

function pushUndo() {
  undoStack.push({
    room: state.room.map(row => [...row]),
    placements: state.placements.map(p => ({ ...p })),
    doors: new Set(state.doors),
  });
  if (undoStack.length > MAX_UNDO) undoStack.shift();
}

function undo() {
  if (undoStack.length === 0) return;
  const snapshot = undoStack.pop();
  state.room = snapshot.room;
  state.placements = snapshot.placements;
  state.doors = snapshot.doors;
  recomputeWallMetrics();
  computeStats();
  refreshGrid();
  refreshPalette();
  refreshStats();
  refreshValidation();
  syncUrl();
}

// ── Sprite view toggle ──────────────────────────────────

function toggleSpriteView() {
  state.spriteView = !state.spriteView;
  updateSpriteToggle();
  if (gridEl) gridEl.classList.toggle("sprite-mode", state.spriteView);
  refreshGrid();
}

function updateSpriteToggle() {
  if (!toolbarEl) return;
  const btn = toolbarEl.querySelector(".planner-sprite-btn");
  if (btn) btn.classList.toggle("active", state.spriteView);
}

function preloadBuildingSprites(buildingId, building) {
  if (!building.sprites) return;
  for (const sprite of building.sprites) {
    const img = new Image();
    img.src = `data/sprites/${buildingId}/${sprite.type.toLowerCase()}.png`;
  }
}

// ── URL serialization ───────────────────────────────────
// toBase64url, fromBase64url → imported from planner-core.js

// ── Binary format ────────────────────────────────────────
// Version bytes: 0x01 = uncompressed binary, 0x02 = deflate-raw compressed, 0x7B = legacy JSON
//
// Binary payload:
//   [buildingIdLen:1] [buildingId:N UTF-8] [width:1] [height:1]
//   [roomBitmap: ceil(w*h/8) bytes, MSB-first]
//   [numPlacements:1] ([groupIdx:1] [itemIdx:1] [rotation:1] [row:1] [col:1]) ×N
//   [numDoors:1] ([row:1] [col:1]) ×N

/** Compute bounding box of room tiles + 1-cell wall margin, returning trimmed sub-region. */
function trimGrid() {
  let minR = state.gridH, maxR = -1, minC = state.gridW, maxC = -1;
  for (let r = 0; r < state.gridH; r++) {
    for (let c = 0; c < state.gridW; c++) {
      if (state.room[r][c]) {
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      }
    }
  }
  if (maxR < 0) return { offR: 0, offC: 0, w: state.gridW, h: state.gridH, room: state.room };
  // Add 1-cell margin for walls, clamped to grid bounds
  minR = Math.max(0, minR - 1);
  maxR = Math.min(state.gridH - 1, maxR + 1);
  minC = Math.max(0, minC - 1);
  maxC = Math.min(state.gridW - 1, maxC + 1);
  const tw = maxC - minC + 1;
  const th = maxR - minR + 1;
  const trimmedRoom = [];
  for (let r = minR; r <= maxR; r++) {
    const row = [];
    for (let c = minC; c <= maxC; c++) {
      row.push(state.room[r][c]);
    }
    trimmedRoom.push(row);
  }
  return { offR: minR, offC: minC, w: tw, h: th, room: trimmedRoom };
}

/** Serialize current planner state to a binary Uint8Array (no version byte). */
function serializeToBinary() {
  const trim = trimGrid();
  const doorList = [...state.doors].map(k => k.split(",").map(Number))
    .map(([r, c]) => [r - trim.offR, c - trim.offC]);
  const placements = state.placements.map(p =>
    [p.groupIdx, p.itemIdx, p.rotation, p.row - trim.offR, p.col - trim.offC]);
  return serializePlanObj({
    b: state.buildingId,
    w: trim.w,
    h: trim.h,
    room: trim.room,
    placements,
    doors: doorList,
  });
}

// parseBinaryPlan, compress, decompress → imported from planner-core.js

/**
 * Serialize the current planner state to a compressed base64url string (async).
 * Returns null if no building is selected or no room tiles are drawn.
 * @returns {Promise<string|null>}
 */
export async function serializePlan() {
  if (!state.buildingId || !state.furnitureSet) return null;
  const hasRoom = state.room.flat().some(Boolean);
  if (!hasRoom) return null;

  const binary = serializeToBinary();
  const compressed = await compress(binary);
  const versioned = new Uint8Array(1 + compressed.length);
  versioned[0] = 0x02;
  versioned.set(compressed, 1);
  return toBase64url(versioned);
}

/**
 * Serialize the current planner state synchronously (uncompressed binary).
 * Used for beforeunload where async is not reliable.
 * @returns {string|null}
 */
export function serializePlanSync() {
  if (!state.buildingId || !state.furnitureSet) return null;
  const hasRoom = state.room.flat().some(Boolean);
  if (!hasRoom) return null;

  const binary = serializeToBinary();
  const versioned = new Uint8Array(1 + binary.length);
  versioned[0] = 0x01;
  versioned.set(binary, 1);
  return toBase64url(versioned);
}

/**
 * Restore planner state from a parsed plan object (shared by binary + legacy paths).
 * @param {{ b: string, w: number, h: number, room: boolean[][], placements: number[][], doors: number[][] }} obj
 * @returns {{ ok: boolean, error?: string }}
 */
function restoreFromPlanObj(obj) {
  const bid = obj.b;
  if (!bid || !buildingById.has(bid) || !furnitureByBuilding.has(bid)) {
    return { ok: false, error: `Unknown building: ${bid}` };
  }

  let w = Number(obj.w) || 20;
  let h = Number(obj.h) || 15;
  w = Math.max(5, Math.min(40, w));
  h = Math.max(5, Math.min(40, h));

  // Compute offset to center smaller plans in the 40x40 canvas
  const offR = Math.floor((state.gridH - h) / 2);
  const offC = Math.floor((state.gridW - w) / 2);

  // Suppress route/localStorage clearing during restoration
  _restoring = true;
  try {
    selectBuilding(bid);

    // Restore room grid, centered if plan is smaller than canvas
    if (obj.room) {
      for (let r = 0; r < h && r < obj.room.length; r++) {
        for (let c = 0; c < w && c < (obj.room[r]?.length ?? 0); c++) {
          if (obj.room[r][c]) state.room[r + offR][c + offC] = true;
        }
      }
    }

    // Restore doors (shifted by offset)
    state.doors = new Set();
    if (Array.isArray(obj.doors)) {
      for (const pair of obj.doors) {
        if (Array.isArray(pair) && pair.length === 2) {
          const [r, c] = pair.map(Number);
          if (r >= 0 && r < h && c >= 0 && c < w) {
            const gr = r + offR, gc = c + offC;
            if (!state.room[gr]?.[gc]) {
              state.doors.add(`${gr},${gc}`);
            }
          }
        }
      }
    }

    // Restore placements (shifted by offset)
    state.placements = [];
    const fs = state.furnitureSet;
    if (Array.isArray(obj.placements) && fs) {
      for (const arr of obj.placements) {
        if (!Array.isArray(arr) || arr.length < 5) continue;
        const [gi, ii, rot, row, col] = arr.map(Number);
        if (gi < 0 || gi >= fs.groups.length) continue;
        if (ii < 0 || ii >= fs.groups[gi].items.length) continue;
        if (rot < 0 || rot > 3) continue;
        if (row < 0 || row >= h || col < 0 || col >= w) continue;
        state.placements.push({ groupIdx: gi, itemIdx: ii, rotation: rot, row: row + offR, col: col + offC });
      }
    }

    recomputeWallMetrics();
    computeStats();
    if (gridParent) buildGrid(gridParent);
    refreshGrid();
    refreshPalette();
    refreshStats();
    refreshValidation();
    refreshInfoPanel();
    updateToolbarActive();
    updateOptimizeBtn();
    updateAutocompleteValue(bid);

    // Auto-scroll to center the restored content
    if (gridParent) {
      requestAnimationFrame(() => {
        gridParent.scrollLeft = (gridParent.scrollWidth - gridParent.clientWidth) / 2;
        gridParent.scrollTop = (gridParent.scrollHeight - gridParent.clientHeight) / 2;
      });
    }
  } finally {
    _restoring = false;
  }

  return { ok: true };
}

/**
 * Deserialize a base64url-encoded plan and restore the planner state.
 * Supports v1 (uncompressed binary), v2 (compressed binary), and legacy JSON.
 * @param {string} encoded
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function deserializePlan(encoded) {
  try {
    const bytes = fromBase64url(encoded);
    if (bytes.length === 0) return { ok: false, error: "Empty plan data" };

    const version = bytes[0];
    const payload = bytes.slice(1);

    if (version === 0x7B) {
      // Legacy JSON format — byte 0x7B is '{', decode entire bytes as JSON
      const json = new TextDecoder().decode(bytes);
      const obj = JSON.parse(json);
      // Convert legacy JSON fields to plan object
      const legacyRoom = obj.r ? unpackLegacyRoomBits(obj.r, Number(obj.w) || 20, Number(obj.h) || 15) : [];
      const planObj = {
        b: obj.b,
        w: Number(obj.w) || 20,
        h: Number(obj.h) || 15,
        room: legacyRoom,
        placements: Array.isArray(obj.p) ? obj.p : [],
        doors: Array.isArray(obj.d) ? obj.d : [],
      };
      return restoreFromPlanObj(planObj);
    }

    let binary;
    if (version === 0x01) {
      binary = payload;
    } else if (version === 0x02) {
      binary = await decompress(payload);
    } else {
      return { ok: false, error: `Unknown format version: 0x${version.toString(16)}` };
    }

    const planObj = parseBinaryPlan(binary);
    return restoreFromPlanObj(planObj);
  } catch (err) {
    console.warn("Failed to deserialize plan:", err);
    return { ok: false, error: err.message || "Deserialization failed" };
  }
}

/** Unpack legacy base64url-encoded room bits into a boolean grid. */
function unpackLegacyRoomBits(encoded, w, h) {
  const bytes = fromBase64url(encoded);
  const room = [];
  let bitIdx = 0;
  for (let r = 0; r < h; r++) {
    const row = [];
    for (let c = 0; c < w; c++) {
      const bytePos = bitIdx >> 3;
      const bitPos = 7 - (bitIdx & 7);
      row.push(bytePos < bytes.length ? ((bytes[bytePos] >> bitPos) & 1) === 1 : false);
      bitIdx++;
    }
    room.push(row);
  }
  return room;
}


/** Update the autocomplete input to show the building name after deserialization. */
function updateAutocompleteValue(buildingId) {
  const bld = buildingById.get(buildingId);
  if (!bld) return;
  const input = document.querySelector(".planner-selector .search-autocomplete input");
  if (input) input.value = bld.name;
}

/** True while restoreFromPlanObj is running — suppresses route/localStorage clearing. */
let _restoring = false;

/** Debounce timer for URL sync. */
let _syncTimer = 0;
/** True when a syncUrl debounce is pending (state changed but URL not yet updated). */
let _syncPending = false;

/** Sync the URL to reflect current planner state (async, debounced). */
function syncUrl() {
  clearTimeout(_syncTimer);
  _syncPending = true;
  _syncTimer = setTimeout(async () => {
    _syncPending = false;
    const encoded = await serializePlan();
    if (encoded) {
      replacePlannerRoute(encoded);
      try { localStorage.setItem(LS_KEY, encoded); } catch { /* quota */ }
    } else {
      clearPlannerRoute();
      try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
    }
  }, 150);
}

/**
 * Flush any pending debounced URL sync immediately (sync, for beforeunload).
 * Uses uncompressed binary format since we can't await compression.
 * No-op if there is no pending state change.
 */
export function flushSyncUrl() {
  if (!_syncPending) return;
  clearTimeout(_syncTimer);
  _syncPending = false;
  const encoded = serializePlanSync();
  if (encoded) {
    replacePlannerRoute(encoded);
    try { localStorage.setItem(LS_KEY, encoded); } catch { /* quota */ }
  } else {
    clearPlannerRoute();
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
  }
}

// ── State ───────────────────────────────────────────────

const state = {
  buildingId: null,
  building: null,
  furnitureSet: null,
  gridW: 40,
  gridH: 40,
  room: [],          // boolean[][] — true = room tile
  placements: [],    // {groupIdx, itemIdx, rotation, row, col}
  mode: "draw",      // "draw"|"erase"|"remove"|"place"|"door"
  shape: "rect",     // "rect"|"brush" — applies to draw/erase
  selectedGroupIdx: -1,
  selectedItemIdx: -1,
  rotation: 0,       // 0-3, 90° CW increments
  stats: [],         // computed, parallel to furnitureSet.stats
  doors: new Set(),      // Set of "r,c" strings — door positions (gaps in auto-wall)
  walls: [],             // boolean[][] — computed wall tiles (not room, adjacent to room)
  stability: [],         // boolean[][] — true = stable, false = expensive
  isolation: 0,          // computed isolation score 0-1
  spriteView: false,     // toggle: show sprite images vs colored blocks
};

function initRoom() {
  state.room = Array.from({ length: state.gridH }, () => Array(state.gridW).fill(false));
  state.placements = [];
  state.stats = [];
  state.doors = new Set();
  state.walls = Array.from({ length: state.gridH }, () => Array(state.gridW).fill(false));
  state.stability = Array.from({ length: state.gridH }, () => Array(state.gridW).fill(true));
  state.isolation = 0;
}

/** Whether the current building needs walls (indoor buildings). */
function needsWalls() {
  return state.furnitureSet?.mustBeIndoors === true;
}

// ── Wall / Isolation / Stability ─────────────────────────

const DIRS8 = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];

function computeWalls() {
  state.walls = Array.from({ length: state.gridH }, () => Array(state.gridW).fill(false));
  if (!needsWalls()) return;
  for (let r = 0; r < state.gridH; r++) {
    for (let c = 0; c < state.gridW; c++) {
      if (state.room[r][c]) continue; // walls are outside the room
      let adjRoom = false;
      for (const [dr, dc] of DIRS8) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < state.gridH && nc >= 0 && nc < state.gridW && state.room[nr][nc]) {
          adjRoom = true; break;
        }
      }
      if (adjRoom && !state.doors.has(`${r},${c}`)) {
        state.walls[r][c] = true;
      }
    }
  }
  // Clean up doors no longer on perimeter
  for (const key of [...state.doors]) {
    const [r, c] = key.split(",").map(Number);
    let adj = false;
    for (const [dr, dc] of DIRS8) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < state.gridH && nc >= 0 && nc < state.gridW && state.room[nr][nc]) {
        adj = true; break;
      }
    }
    if (!adj || state.room[r]?.[c]) state.doors.delete(key);
  }
}

function computeIsolation() {
  if (!needsWalls()) { state.isolation = 1; return; }
  let edgeTiles = 0, total = 0, unwalled = 0;
  for (let r = 0; r < state.gridH; r++) {
    for (let c = 0; c < state.gridW; c++) {
      if (!state.room[r][c]) continue;
      let isEdge = false;
      for (const [dr, dc] of DIRS8) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= state.gridH || nc < 0 || nc >= state.gridW || !state.room[nr][nc]) {
          isEdge = true; break;
        }
      }
      if (!isEdge) continue;
      edgeTiles++;
      for (const [dr, dc] of DIRS8) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= state.gridH || nc < 0 || nc >= state.gridW) {
          total++; unwalled++;
        } else if (!state.room[nr][nc]) {
          total++;
          if (!state.walls[nr][nc]) {
            unwalled += state.doors.has(`${nr},${nc}`) ? 0.34 : 1;
          }
        }
      }
    }
  }
  if (total === 0) { state.isolation = 1; return; }
  const bonus = Math.ceil(edgeTiles / 10);
  const raw = Math.min(1, Math.max(0, (total - unwalled + bonus) / total));
  state.isolation = Math.pow(raw, 1.5);
}

// Pre-compute stability rays using DDA matching game's TileRayTracer.java
const SUPPORT_RADIUS = 4;
const SUPPORT_RAYS = [];
{
  const has = Array.from({ length: SUPPORT_RADIUS * 2 + 1 }, () => new Uint8Array(SUPPORT_RADIUS * 2 + 1));
  function ddaRay(fromx, fromy) {
    let x = fromx, y = fromy;
    const ax = Math.abs(x), ay = Math.abs(y);
    const divider = ax > ay ? ax : (ax < ay ? ay : ax);
    if (divider === 0) return;
    const dx = -x / divider, dy = -y / divider;
    let i = 0;
    // Skip tiles outside Euclidean radius
    while (i < divider) {
      const tx = Math.trunc(x), ty = Math.trunc(y);
      if (Math.floor(Math.sqrt(x * x + y * y)) <= SUPPORT_RADIUS) {
        if (has[ty + SUPPORT_RADIUS][tx + SUPPORT_RADIUS]) return;
        has[ty + SUPPORT_RADIUS][tx + SUPPORT_RADIUS] = 1;
        break;
      }
      x += dx; y += dy; i++;
    }
    // Collect tiles from here to origin
    const coos = [];
    while (true) {
      const tx = Math.trunc(x), ty = Math.trunc(y);
      if (tx === 0 && ty === 0) break;
      coos.push({ dx: tx, dy: ty });
      x += dx; y += dy;
    }
    // Reverse so ray[0] = nearest to center (matches game)
    coos.reverse();
    if (coos.length > 0) SUPPORT_RAYS.push(coos);
  }
  // Iterate edges in game order: left/right edges, then top/bottom edges
  for (let gy = -SUPPORT_RADIUS; gy <= SUPPORT_RADIUS; gy++) {
    ddaRay(-SUPPORT_RADIUS, gy);
    ddaRay(SUPPORT_RADIUS, gy);
  }
  for (let gx = -SUPPORT_RADIUS; gx <= SUPPORT_RADIUS; gx++) {
    ddaRay(gx, -SUPPORT_RADIUS);
    ddaRay(gx, SUPPORT_RADIUS);
  }
}

function computeStability() {
  state.stability = Array.from({ length: state.gridH }, () => Array(state.gridW).fill(true));
  if (!needsWalls()) return;
  for (let r = 0; r < state.gridH; r++) {
    for (let c = 0; c < state.gridW; c++) {
      if (!state.room[r][c]) continue;
      const checked = new Set();
      let support = 0;
      for (const ray of SUPPORT_RAYS) {
        for (let i = 0; i < ray.length; i++) {
          const tr = r + ray[i].dy, tc = c + ray[i].dx;
          if (tr < 0 || tr >= state.gridH || tc < 0 || tc >= state.gridW) break;
          if (!state.room[tr][tc]) {
            const key = `${tr},${tc}`;
            if (!checked.has(key)) {
              checked.add(key);
              support += Math.max(0, (3.5 - i) / 3.5);
            }
            break;
          }
        }
      }
      state.stability[r][c] = support >= 1.0;
    }
  }
}

function recomputeWallMetrics() {
  computeWalls();
  computeIsolation();
  computeStability();
}

// ── Rotation ────────────────────────────────────────────
// rotateTiles90CW, getRotatedTiles, getAllowedRotations → imported from planner-core.js

// ── Stat computation ────────────────────────────────────

function computeStats() {
  const fs = state.furnitureSet;
  const bld = state.building;
  if (!fs || !fs.stats || !bld || !bld.items) { state.stats = []; return; }

  const totals = new Array(fs.stats.length).fill(0);
  for (const p of state.placements) {
    const item = fs.groups[p.groupIdx]?.items[p.itemIdx];
    if (!item) continue;
    const bItem = bld.items[p.groupIdx];
    if (!bItem || !bItem.stats) continue;
    const mult = item.multiplierStats ?? item.multiplier;
    for (let s = 0; s < bItem.stats.length && s < totals.length; s++) {
      totals[s] += bItem.stats[s] * mult;
    }
  }
  state.stats = totals;
}

// ── Placement validation helpers ─────────────────────────
// DIRS → imported from planner-core.js

/** Build a 2D boolean map of all tiles blocked by existing furniture. */
function buildBlockerMap() {
  const fs = state.furnitureSet;
  const blocked = Array.from({ length: state.gridH }, () => Array(state.gridW).fill(false));
  if (!fs) return blocked;
  for (const p of state.placements) {
    const item = fs.groups[p.groupIdx]?.items[p.itemIdx];
    if (!item) continue;
    const tiles = getRotatedTiles(item, p.rotation);
    for (let r = 0; r < tiles.length; r++) {
      for (let c = 0; c < (tiles[r]?.length ?? 0); c++) {
        const tileKey = tiles[r][c];
        if (tileKey === null) continue;
        const gr = p.row + r;
        const gc = p.col + c;
        if (gr < 0 || gr >= state.gridH || gc < 0 || gc >= state.gridW) continue;
        const tt = fs.tileTypes[tileKey];
        if (tt && AVAIL_IMPASSABLE.has(tt.availability)) {
          blocked[gr][gc] = true;
        }
      }
    }
  }
  return blocked;
}

/** Get the FurnitureTileType at (r,c) from existing placements, or null. */
function getFurnitureTileAt(r, c) {
  const fs = state.furnitureSet;
  if (!fs) return null;
  for (const p of state.placements) {
    const item = fs.groups[p.groupIdx]?.items[p.itemIdx];
    if (!item) continue;
    const tiles = getRotatedTiles(item, p.rotation);
    const lr = r - p.row;
    const lc = c - p.col;
    const tileKey = tiles[lr]?.[lc];
    if (tileKey != null) {
      return fs.tileTypes[tileKey] || null;
    }
  }
  return null;
}

/**
 * Check if tile (r,c) is blocked, considering existing furniture + proposed new blocker tiles.
 * @param {number} r
 * @param {number} c
 * @param {Set<string>} proposedBlockers - Set of "r,c" keys for proposed blocker tiles
 */
function isBlockerAt(r, c, proposedBlockers) {
  if (proposedBlockers.has(`${r},${c}`)) return true;
  const tt = getFurnitureTileAt(r, c);
  return tt !== null && AVAIL_IMPASSABLE.has(tt.availability);
}

/**
 * Check if an existing mustBeReachable tile at (r,c) would be fully blocked
 * given existing furniture + proposed new blocker tiles.
 * @param {number} r
 * @param {number} c
 * @param {Set<string>} proposedBlockers - Set of "r,c" keys for proposed blocker tiles
 */
function wouldBeFullyBlocked(r, c, proposedBlockers) {
  let blockedCount = 0;
  for (const [dr, dc] of DIRS) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nr >= state.gridH || nc < 0 || nc >= state.gridW || !state.room[nr][nc]) {
      blockedCount++;
    } else if (isBlockerAt(nr, nc, proposedBlockers)) {
      blockedCount++;
    }
  }
  return blockedCount >= 4;
}

// ── Placement validation ────────────────────────────────

function canPlace(groupIdx, itemIdx, rotation, row, col) {
  const fs = state.furnitureSet;
  const item = fs.groups[groupIdx].items[itemIdx];
  const tiles = getRotatedTiles(item, rotation);

  // Collect proposed tile positions and which are blockers
  const proposedBlockers = new Set();
  const proposedTiles = []; // {gr, gc, tileKey}

  // Pass 1: bounds, room membership, overlap
  for (let r = 0; r < tiles.length; r++) {
    for (let c = 0; c < (tiles[r]?.length ?? 0); c++) {
      const tileKey = tiles[r][c];
      if (tileKey === null) continue;
      const gr = row + r;
      const gc = col + c;
      if (gr < 0 || gr >= state.gridH || gc < 0 || gc >= state.gridW) return { ok: false, reason: "Out of bounds" };
      if (!state.room[gr][gc]) return { ok: false, reason: "Not on room tile" };
      if (getPlacementAt(gr, gc) !== null) return { ok: false, reason: "Overlaps furniture" };
      proposedTiles.push({ gr, gc, tileKey });
      const tt = fs.tileTypes[tileKey];
      if (tt && AVAIL_IMPASSABLE.has(tt.availability)) {
        proposedBlockers.add(`${gr},${gc}`);
      }
    }
  }

  // Pass 2: per-tile mustBeReachable — each such tile needs >= 1 non-blocked neighbor
  for (const { gr, gc, tileKey } of proposedTiles) {
    const tt = fs.tileTypes[tileKey];
    if (!tt?.mustBeReachable) continue;
    let blockedCount = 0;
    for (const [dr, dc] of DIRS) {
      const nr = gr + dr;
      const nc = gc + dc;
      if (nr < 0 || nr >= state.gridH || nc < 0 || nc >= state.gridW || !state.room[nr][nc]) {
        blockedCount++;
      } else if (isBlockerAt(nr, nc, proposedBlockers)) {
        blockedCount++;
      }
    }
    if (blockedCount >= 4) return { ok: false, reason: "Would block a reachable tile" };
  }

  // Pass 3: will-block-other-items — placing a blocker must not fully surround existing mustBeReachable
  for (const { gr, gc, tileKey } of proposedTiles) {
    const tt = fs.tileTypes[tileKey];
    if (!tt || !AVAIL_IMPASSABLE.has(tt.availability)) continue;
    for (const [dr, dc] of DIRS) {
      const nr = gr + dr;
      const nc = gc + dc;
      if (nr < 0 || nr >= state.gridH || nc < 0 || nc >= state.gridW) continue;
      const existingTT = getFurnitureTileAt(nr, nc);
      if (existingTT?.mustBeReachable) {
        if (wouldBeFullyBlocked(nr, nc, proposedBlockers)) return { ok: false, reason: "Would block existing furniture" };
      }
    }
  }

  // Pass 4: furniture reachability — the piece as a whole must have at least one
  // walkable (non-blocked) neighbor on its perimeter. Workers can walk on
  // non-blocking occupied tiles, so only blockers prevent reachability.
  const proposedSet = new Set(proposedTiles.map(t => `${t.gr},${t.gc}`));
  let hasWalkableNeighbor = false;
  for (const { gr, gc } of proposedTiles) {
    if (hasWalkableNeighbor) break;
    for (const [dr, dc] of DIRS) {
      const nr = gr + dr, nc = gc + dc;
      if (nr < 0 || nr >= state.gridH || nc < 0 || nc >= state.gridW) continue;
      if (!state.room[nr][nc]) continue;
      if (proposedSet.has(`${nr},${nc}`)) continue; // part of this piece
      if (isBlockerAt(nr, nc, proposedBlockers)) continue;
      hasWalkableNeighbor = true;
      break;
    }
  }
  if (!hasWalkableNeighbor) return { ok: false, reason: "Furniture would be fully enclosed" };

  // Pass 5: room connectivity — placement must not split room into disconnected regions
  if (proposedBlockers.size > 0) {
    if (wouldDisconnectRoom(proposedBlockers)) return { ok: false, reason: "Would split room" };
  }

  return { ok: true, reason: "" };
}

/** Check if adding proposed blocker tiles would split the room into disconnected regions. */
function wouldDisconnectRoom(proposedBlockers) {
  // Build combined blocker map: existing + proposed
  const blocked = buildBlockerMap();
  for (const key of proposedBlockers) {
    const [r, c] = key.split(",").map(Number);
    blocked[r][c] = true;
  }

  // Count non-blocked room tiles and BFS from first one
  let totalOpen = 0;
  let startR = -1;
  let startC = -1;
  for (let r = 0; r < state.gridH; r++) {
    for (let c = 0; c < state.gridW; c++) {
      if (state.room[r][c] && !blocked[r][c]) {
        totalOpen++;
        if (startR < 0) { startR = r; startC = c; }
      }
    }
  }
  if (totalOpen === 0) return false; // all tiles are blockers, ok

  const visited = Array.from({ length: state.gridH }, () => Array(state.gridW).fill(false));
  const queue = [[startR, startC]];
  visited[startR][startC] = true;
  let reached = 1;

  while (queue.length > 0) {
    const [cr, cc] = queue.shift();
    for (const [dr, dc] of DIRS) {
      const nr = cr + dr;
      const nc = cc + dc;
      if (nr < 0 || nr >= state.gridH || nc < 0 || nc >= state.gridW) continue;
      if (visited[nr][nc] || !state.room[nr][nc] || blocked[nr][nc]) continue;
      visited[nr][nc] = true;
      reached++;
      queue.push([nr, nc]);
    }
  }

  return reached < totalOpen;
}

function getPlacementAt(row, col) {
  for (let i = 0; i < state.placements.length; i++) {
    const p = state.placements[i];
    const tiles = getRotatedTiles(state.furnitureSet.groups[p.groupIdx].items[p.itemIdx], p.rotation);
    for (let r = 0; r < tiles.length; r++) {
      for (let c = 0; c < (tiles[r]?.length ?? 0); c++) {
        if (tiles[r][c] !== null && p.row + r === row && p.col + c === col) return i;
      }
    }
  }
  return null;
}

function countGroupPlacements(groupIdx) {
  return state.placements.filter(p => p.groupIdx === groupIdx).length;
}

function countItemPlacements(groupIdx, itemIdx) {
  return state.placements.filter(p => p.groupIdx === groupIdx && p.itemIdx === itemIdx).length;
}

// ── Walkability check (BFS flood fill) ──────────────────

function checkWalkability() {
  const fs = state.furnitureSet;
  if (!fs) return { ok: true, unreachable: [], disconnected: 0 };

  // Build occupancy map using shared helper
  const blocked = buildBlockerMap();
  // Track which tiles need reachability (mustBeReachable)
  const mustReach = [];

  for (const p of state.placements) {
    const item = fs.groups[p.groupIdx]?.items[p.itemIdx];
    if (!item) continue;
    const tiles = getRotatedTiles(item, p.rotation);
    for (let r = 0; r < tiles.length; r++) {
      for (let c = 0; c < (tiles[r]?.length ?? 0); c++) {
        const tileKey = tiles[r][c];
        if (tileKey === null) continue;
        const gr = p.row + r;
        const gc = p.col + c;
        if (gr < 0 || gr >= state.gridH || gc < 0 || gc >= state.gridW) continue;
        const tt = fs.tileTypes[tileKey];
        if (tt?.mustBeReachable) {
          mustReach.push({ row: gr, col: gc });
        }
      }
    }
  }

  // BFS flood fill from first walkable room tile
  const visited = Array.from({ length: state.gridH }, () => Array(state.gridW).fill(false));
  const queue = [];
  let totalOpen = 0;

  // Seed BFS from every connected component
  let reached = 0;
  for (let r = 0; r < state.gridH; r++) {
    for (let c = 0; c < state.gridW; c++) {
      if (state.room[r][c] && !blocked[r][c]) {
        totalOpen++;
        if (!visited[r][c]) {
          visited[r][c] = true;
          reached++;
          queue.push([r, c]);
          // Drain this component
          while (queue.length > 0) {
            const [cr, cc] = queue.shift();
            for (const [dr, dc] of DIRS) {
              const nr = cr + dr, nc = cc + dc;
              if (nr < 0 || nr >= state.gridH || nc < 0 || nc >= state.gridW) continue;
              if (visited[nr][nc] || !state.room[nr][nc] || blocked[nr][nc]) continue;
              visited[nr][nc] = true;
              reached++;
              queue.push([nr, nc]);
            }
          }
        }
      }
    }
  }

  // Check mustBeReachable tiles: each needs at least one adjacent visited walkable cell
  const unreachable = [];
  for (const { row, col } of mustReach) {
    let reachable = false;
    for (const [dr, dc] of DIRS) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < state.gridH && nc >= 0 && nc < state.gridW && visited[nr][nc]) {
        reachable = true;
        break;
      }
    }
    if (!reachable) unreachable.push({ row, col });
  }

  // Furniture piece reachability: every placement must have at least one
  // walkable neighbor on its perimeter. Fully enclosed pieces are unusable.
  const enclosed = [];
  for (const p of state.placements) {
    const item = fs.groups[p.groupIdx]?.items[p.itemIdx];
    if (!item) continue;
    const pTiles = getRotatedTiles(item, p.rotation);
    let pieceReachable = false;
    for (let r = 0; r < pTiles.length && !pieceReachable; r++) {
      for (let c = 0; c < (pTiles[r]?.length ?? 0) && !pieceReachable; c++) {
        if (pTiles[r][c] === null) continue;
        const gr = p.row + r, gc = p.col + c;
        for (const [dr, dc] of DIRS) {
          const nr = gr + dr, nc = gc + dc;
          if (nr >= 0 && nr < state.gridH && nc >= 0 && nc < state.gridW && visited[nr][nc]) {
            pieceReachable = true;
            break;
          }
        }
      }
    }
    if (!pieceReachable) {
      // Report the top-left tile of the enclosed piece
      for (let r = 0; r < pTiles.length; r++) {
        for (let c = 0; c < (pTiles[r]?.length ?? 0); c++) {
          if (pTiles[r][c] !== null) {
            enclosed.push({ row: p.row + r, col: p.col + c });
            break;
          }
        }
        if (enclosed.length > unreachable.length) break; // only need one tile per piece
      }
    }
  }
  // Merge enclosed into unreachable for unified reporting
  for (const e of enclosed) unreachable.push(e);

  // Room connectivity: count disconnected tiles
  const disconnected = totalOpen - reached;

  return {
    ok: unreachable.length === 0 && disconnected === 0,
    unreachable,
    disconnected,
  };
}

// ── Hover / drag state ───────────────────────────────────

let hoveredPlacementIdx = -1;
let tooltipEl = null;
let dimLabelEl = null;
let dragging = null; // { placementIdx, origRow, origCol, origPlacement, offsetR, offsetC }

// ── Cursor tracking (for preview refresh on rotation/size change) ────

let lastHoverRow = -1, lastHoverCol = -1;

// ── DOM references ──────────────────────────────────────

let gridEl = null;
let feedbackEl = null;
let cellEls = [];
let paletteEl = null;
let statsEl = null;
let validationEl = null;
let toolbarEl = null;
let infoPanelEl = null;
let optimizeBtnRef = null;
let sidebarEl = null;

// ── Grid rendering ──────────────────────────────────────

function buildGrid(container) {
  hoveredPlacementIdx = -1;
  if (gridEl) gridEl.remove();
  gridEl = el("div", "planner-grid");
  gridEl.style.gridTemplateColumns = `repeat(${state.gridW}, 24px)`;
  gridEl.style.gridTemplateRows = `repeat(${state.gridH}, 24px)`;
  if (state.spriteView) gridEl.classList.add("sprite-mode");

  cellEls = [];
  for (let r = 0; r < state.gridH; r++) {
    const row = [];
    for (let c = 0; c < state.gridW; c++) {
      const cell = el("div", "planner-cell cell-outside");
      cell.dataset.r = String(r);
      cell.dataset.c = String(c);
      row.push(cell);
      gridEl.appendChild(cell);
    }
    cellEls.push(row);
  }

  // Mouse interaction
  let painting = false;
  let paintValue = true; // draw=true, erase=false
  let rectStart = null;  // {r, c} for rectangle shape

  gridEl.addEventListener("mousedown", (e) => {
    const cell = e.target.closest(".planner-cell");
    if (!cell) return;
    const r = Number(cell.dataset.r), c = Number(cell.dataset.c);

    // 1. Right-click = undo (all modes)
    if (e.button === 2) { undo(); return; }

    // 2. Shift+click = remove furniture (all modes)
    if (e.shiftKey && e.button === 0) {
      removeFurnitureAt(r, c);
      return;
    }

    // 3. Ctrl+click on furniture = copy (enter place mode with same item)
    if (e.ctrlKey && e.button === 0 && state.mode !== "place") {
      const pi = getPlacementAt(r, c);
      if (pi !== null) {
        const p = state.placements[pi];
        state.selectedGroupIdx = p.groupIdx;
        state.selectedItemIdx = p.itemIdx;
        state.rotation = p.rotation;
        state.mode = "place";
        updateToolbarActive();
        refreshPalette();
        clearHoverFeedback();
        showPreview(r, c);
        return;
      }
    }

    // 4. Click on furniture in draw/erase = start drag
    if ((state.mode === "draw" || state.mode === "erase") && e.button === 0 && !e.ctrlKey) {
      const pi = getPlacementAt(r, c);
      if (pi !== null) {
        const p = state.placements[pi];
        pushUndo();
        dragging = {
          origPlacement: { ...p },
          groupIdx: p.groupIdx,
          itemIdx: p.itemIdx,
          rotation: p.rotation,
          offsetR: r - p.row,
          offsetC: c - p.col,
        };
        // Remove from placements so preview can be shown freely
        state.placements.splice(pi, 1);
        state.selectedGroupIdx = p.groupIdx;
        state.selectedItemIdx = p.itemIdx;
        state.rotation = p.rotation;
        computeStats();
        refreshGrid();
        refreshPalette();
        refreshStats();
        clearHoverFeedback();
        gridEl.classList.add("dragging");
        showPreview(r, c);
        return;
      }
    }

    // 5. Standard mode handlers
    if (state.mode === "place") {
      attemptPlace(r, c);
      return;
    }
    if (state.mode === "remove") {
      removeFurnitureAt(r, c);
      return;
    }
    if (state.mode === "door") {
      toggleDoor(r, c);
      return;
    }

    // draw or erase
    pushUndo();
    paintValue = state.mode === "draw";
    if (state.shape === "rect") {
      rectStart = { r, c };
      showRectPreview(r, c, r, c, paintValue);
    } else {
      painting = true;
      paintCell(r, c, paintValue);
    }
  });

  gridEl.addEventListener("mousemove", (e) => {
    const cell = e.target.closest(".planner-cell");
    if (!cell) return;
    const r = Number(cell.dataset.r), c = Number(cell.dataset.c);
    lastHoverRow = r;
    lastHoverCol = c;

    // Dragging: update preview ghost
    if (dragging) {
      clearPreview();
      showPreview(r, c);
      return;
    }

    // Shift-hover or remove mode: highlight furniture under cursor for removal
    clearRemoveHighlight();
    if (e.shiftKey || state.mode === "remove") {
      clearHoverFeedback();
      showRemoveHighlight(r, c);
    } else if (state.mode === "place") {
      // Place-mode preview (suppress hover feedback)
      clearHoverFeedback();
      if (e.shiftKey) {
        clearPreview();
      } else {
        showPreview(r, c);
      }
    } else if (!painting && !rectStart) {
      // Hover feedback in idle draw/erase/door modes
      showHoverFeedback(r, c);
      if (hoveredPlacementIdx >= 0) {
        showTooltip(e, hoveredPlacementIdx);
      } else {
        hideTooltip();
      }
    }

    if (rectStart) {
      showRectPreview(rectStart.r, rectStart.c, r, c, paintValue);
    } else if (painting) {
      paintCell(r, c, paintValue);
    }
  });

  gridEl.addEventListener("mouseup", (e) => {
    // Drag drop
    if (dragging) {
      const cell = e.target.closest(".planner-cell");
      let placed = false;
      if (cell) {
        const r = Number(cell.dataset.r), c = Number(cell.dataset.c);
        const item = state.furnitureSet.groups[dragging.groupIdx].items[dragging.itemIdx];
        const origin = getCenteredOrigin(item, dragging.rotation, r, c);
        const result = canPlace(dragging.groupIdx, dragging.itemIdx, dragging.rotation, origin.row, origin.col);
        if (result.ok) {
          state.placements.push({
            groupIdx: dragging.groupIdx,
            itemIdx: dragging.itemIdx,
            rotation: dragging.rotation,
            row: origin.row,
            col: origin.col,
          });
          placed = true;
        }
      }
      if (!placed) {
        // Undo: restore the piece
        undo();
      } else {
        computeStats();
        refreshGrid();
        refreshPalette();
        refreshStats();
        refreshValidation();
        syncUrl();
      }
      clearPreview();
      gridEl.classList.remove("dragging");
      dragging = null;
      return;
    }

    if (rectStart) {
      const cell = e.target.closest(".planner-cell");
      if (cell) {
        const r = Number(cell.dataset.r), c = Number(cell.dataset.c);
        fillRect(rectStart.r, rectStart.c, r, c, paintValue);
      }
      rectStart = null;
      clearRectPreview();
    }
    if (painting) {
      painting = false;
      recomputeWallMetrics();
      refreshGrid();
      refreshStats();
      refreshValidation();
      updateOptimizeBtn();
      syncUrl();
    }
  });

  gridEl.addEventListener("mouseleave", () => {
    lastHoverRow = lastHoverCol = -1;

    // Cancel drag on leave
    if (dragging) {
      undo();
      clearPreview();
      gridEl.classList.remove("dragging");
      dragging = null;
    }

    if (rectStart) {
      rectStart = null;
      clearRectPreview();
    }
    if (painting) {
      painting = false;
      recomputeWallMetrics();
      refreshGrid();
      refreshStats();
      refreshValidation();
      updateOptimizeBtn();
      syncUrl();
    }
    clearPreview();
    clearRemoveHighlight();
    clearHoverFeedback();
  });

  gridEl.addEventListener("contextmenu", (e) => e.preventDefault());

  // Ctrl+wheel cycles through sizes within selected group
  gridEl.addEventListener("wheel", (e) => {
    if (!e.ctrlKey) return;
    if (state.selectedGroupIdx < 0) return;
    e.preventDefault();
    const group = state.furnitureSet.groups[state.selectedGroupIdx];
    const dir = e.deltaY < 0 ? 1 : -1;
    const newIdx = state.selectedItemIdx + dir;
    if (newIdx < 0 || newIdx >= group.items.length) return;
    state.selectedItemIdx = newIdx;
    refreshPalette();
    if (lastHoverRow >= 0) showPreview(lastHoverRow, lastHoverCol);
  }, { passive: false });

  // Dimension label (floating overlay inside grid)
  dimLabelEl = el("div", "planner-dim-label-live");
  dimLabelEl.style.display = "none";
  gridEl.appendChild(dimLabelEl);

  container.appendChild(gridEl);
}

function paintCell(r, c, isRoom) {
  if (r < 0 || r >= state.gridH || c < 0 || c >= state.gridW) return;
  if (state.room[r][c] === isRoom) return;

  // If erasing, remove any furniture on this tile
  if (!isRoom) {
    const pi = getPlacementAt(r, c);
    if (pi !== null) {
      state.placements.splice(pi, 1);
      computeStats();
      refreshPalette();
      refreshStats();
    }
  }

  state.room[r][c] = isRoom;
  updateCellVisual(r, c);
}

function fillRect(r1, c1, r2, c2, isRoom) {
  const minR = Math.max(0, Math.min(r1, r2));
  const maxR = Math.min(state.gridH - 1, Math.max(r1, r2));
  const minC = Math.max(0, Math.min(c1, c2));
  const maxC = Math.min(state.gridW - 1, Math.max(c1, c2));
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      paintCell(r, c, isRoom);
    }
  }
  recomputeWallMetrics();
  refreshGrid();
  refreshStats();
  refreshValidation();
  updateOptimizeBtn();
  syncUrl();
}

function showRectPreview(r1, c1, r2, c2, _isRoom) {
  clearRectPreview();
  const minR = Math.max(0, Math.min(r1, r2));
  const maxR = Math.min(state.gridH - 1, Math.max(r1, r2));
  const minC = Math.max(0, Math.min(c1, c2));
  const maxC = Math.min(state.gridW - 1, Math.max(c1, c2));
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      const cell = cellEls[r]?.[c];
      if (cell) cell.classList.add("rect-preview");
    }
  }
}

function clearRectPreview() {
  for (let r = 0; r < state.gridH; r++) {
    for (let c = 0; c < state.gridW; c++) {
      const cell = cellEls[r]?.[c];
      if (cell) cell.classList.remove("rect-preview");
    }
  }
}

function updateCellVisual(r, c) {
  const cell = cellEls[r]?.[c];
  if (!cell) return;

  // Clear classes
  cell.className = "planner-cell";
  cell.style.backgroundColor = "";
  cell.style.border = "";
  cell.textContent = "";

  if (!state.room[r][c]) {
    if (state.walls[r]?.[c]) {
      cell.classList.add("cell-wall");
    } else if (state.doors.has(`${r},${c}`)) {
      cell.classList.add("cell-door");
    } else {
      cell.classList.add("cell-outside");
    }
    return;
  }

  // Check if there's furniture here
  const pi = getPlacementAt(r, c);
  if (pi !== null) {
    const p = state.placements[pi];
    const group = state.furnitureSet.groups[p.groupIdx];
    const item = group.items[p.itemIdx];
    const tiles = getRotatedTiles(item, p.rotation);
    // Find which tile key this cell corresponds to
    const lr = r - p.row;
    const lc = c - p.col;
    const tileKey = tiles[lr]?.[lc];
    if (tileKey !== null && tileKey !== undefined) {
      const tt = state.furnitureSet.tileTypes[tileKey];
      if (tt) {
        const avail = tt.availability;
        cell.classList.add("cell-furniture");
        cell.dataset.avail = avail;

        // Sprite image (shown when sprite view is active)
        if (state.spriteView && tt.sprite) {
          const img = el("img", "cell-sprite-img");
          img.src = `data/sprites/${state.buildingId}/${tt.sprite.toLowerCase()}.png`;
          img.alt = tt.sprite;
          img.onerror = function() { this.style.display = "none"; };
          cell.appendChild(img);
        }

        // mustBeReachable indicator dot
        if (tt.mustBeReachable) {
          cell.appendChild(el("span", "cell-reachable-dot"));
        }

        // No native title — custom tooltip handles hover feedback
      }
    }
    // Outline edges where this piece borders non-same-placement tiles
    const groupLabel = getGroupLabel(state.furnitureSet, state.building, p.groupIdx);
    const rgb = getGroupColor(groupLabel);
    const borderStyle = `3px solid rgba(${rgb}, 0.85)`;
    for (const [dr, dc, side] of [[0, -1, "Left"], [0, 1, "Right"], [-1, 0, "Top"], [1, 0, "Bottom"]]) {
      const nr = r + dr, nc = c + dc;
      const neighborPi = (nr >= 0 && nr < state.gridH && nc >= 0 && nc < state.gridW)
        ? getPlacementAt(nr, nc) : null;
      if (neighborPi !== pi) {
        cell.style[`border${side}`] = borderStyle;
      }
    }
    if (!cell.classList.contains("cell-furniture")) {
      cell.classList.add("cell-room");
    }
  } else {
    cell.classList.add("cell-room");
  }

  // Stability overlay for indoor buildings
  if (needsWalls() && state.stability[r]?.[c] === false) {
    cell.classList.add("cell-unstable");
  }
}

function refreshGrid() {
  for (let r = 0; r < state.gridH; r++) {
    for (let c = 0; c < state.gridW; c++) {
      updateCellVisual(r, c);
    }
  }
  updateDimLabel();
}

// ── Preview ghost ───────────────────────────────────────

/** Compute top-left anchor so the cursor is at the center of the piece. */
function getCenteredOrigin(item, rotation, row, col) {
  const tiles = getRotatedTiles(item, rotation);
  const tileRows = tiles.length;
  const tileCols = Math.max(...tiles.map(r => r.length));
  return { row: row - Math.floor(tileRows / 2), col: col - Math.floor(tileCols / 2) };
}

/** Show/hide inline feedback message near the preview. */
function showPlacementFeedback(msg, row, col) {
  if (!feedbackEl) {
    feedbackEl = el("div", "planner-feedback");
    gridEl.appendChild(feedbackEl);
  }
  feedbackEl.textContent = msg;
  feedbackEl.style.display = "";
  // Position absolutely: each cell is 24px + 1px gap
  feedbackEl.style.left = (col * 25) + "px";
  feedbackEl.style.top = (row * 25) + "px";
}

function clearPlacementFeedback() {
  if (feedbackEl) feedbackEl.style.display = "none";
}

function showPreview(row, col) {
  clearPreview();
  clearPlacementFeedback();
  if (state.selectedGroupIdx < 0 || state.selectedItemIdx < 0) return;
  const group = state.furnitureSet.groups[state.selectedGroupIdx];
  const item = group.items[state.selectedItemIdx];
  const origin = getCenteredOrigin(item, state.rotation, row, col);
  const tiles = getRotatedTiles(item, state.rotation);
  const result = canPlace(state.selectedGroupIdx, state.selectedItemIdx, state.rotation, origin.row, origin.col);
  const valid = result.ok;

  for (let r = 0; r < tiles.length; r++) {
    for (let c = 0; c < (tiles[r]?.length ?? 0); c++) {
      if (tiles[r][c] === null) continue;
      const gr = origin.row + r;
      const gc = origin.col + c;
      if (gr < 0 || gr >= state.gridH || gc < 0 || gc >= state.gridW) continue;
      const cell = cellEls[gr][gc];
      cell.classList.add(valid ? "preview-valid" : "preview-invalid");
    }
  }

  if (!valid) {
    showPlacementFeedback(result.reason, origin.row + tiles.length, origin.col);
  }
}

function clearPreview() {
  for (let r = 0; r < state.gridH; r++) {
    for (let c = 0; c < state.gridW; c++) {
      const cell = cellEls[r]?.[c];
      if (cell) {
        cell.classList.remove("preview-valid", "preview-invalid");
      }
    }
  }
  clearPlacementFeedback();
}

// ── Shift-hover remove highlight ────────────────────────

/** Highlight all tiles of the placement under (r,c) for removal preview. */
function showRemoveHighlight(r, c) {
  const pi = getPlacementAt(r, c);
  if (pi === null) return;
  const p = state.placements[pi];
  const item = state.furnitureSet.groups[p.groupIdx]?.items[p.itemIdx];
  if (!item) return;
  const tiles = getRotatedTiles(item, p.rotation);
  for (let tr = 0; tr < tiles.length; tr++) {
    for (let tc = 0; tc < (tiles[tr]?.length ?? 0); tc++) {
      if (tiles[tr][tc] === null) continue;
      const gr = p.row + tr;
      const gc = p.col + tc;
      const cell = cellEls[gr]?.[gc];
      if (cell) cell.classList.add("cell-remove-target");
    }
  }
}

/** Clear all remove-highlight cells. */
function clearRemoveHighlight() {
  for (let r = 0; r < state.gridH; r++) {
    for (let c = 0; c < state.gridW; c++) {
      const cell = cellEls[r]?.[c];
      if (cell) cell.classList.remove("cell-remove-target");
    }
  }
}

// ── Hover outline + tooltip + reverse palette highlight ──

function showHoverFeedback(r, c) {
  const pi = getPlacementAt(r, c);
  if (pi === hoveredPlacementIdx) return;
  clearHoverFeedback();
  hoveredPlacementIdx = pi;
  if (pi === null) return;

  const p = state.placements[pi];
  const fs = state.furnitureSet;
  const item = fs.groups[p.groupIdx]?.items[p.itemIdx];
  if (!item) return;
  const tiles = getRotatedTiles(item, p.rotation);

  // Outline all tiles of this placement
  for (let tr = 0; tr < tiles.length; tr++) {
    for (let tc = 0; tc < (tiles[tr]?.length ?? 0); tc++) {
      if (tiles[tr][tc] === null) continue;
      const cell = cellEls[p.row + tr]?.[p.col + tc];
      if (cell) cell.classList.add("cell-hover-outline");
    }
  }

  // Reverse palette highlight
  highlightPaletteFromGrid(p.groupIdx, p.itemIdx);
}

function clearHoverFeedback() {
  if (hoveredPlacementIdx === -1) return;
  hoveredPlacementIdx = -1;
  // Clear outline
  const outlined = gridEl?.querySelectorAll(".cell-hover-outline");
  if (outlined) outlined.forEach(c => c.classList.remove("cell-hover-outline"));
  // Clear palette highlight
  clearPaletteGridHighlight();
  // Hide tooltip
  hideTooltip();
}

function showTooltip(e, pi) {
  if (!tooltipEl) return;
  const p = state.placements[pi];
  if (!p) return;
  const fs = state.furnitureSet;
  const bld = state.building;
  const group = fs.groups[p.groupIdx];
  const item = group.items[p.itemIdx];
  if (!item) return;

  const label = getGroupLabel(fs, bld, p.groupIdx);
  const tiles = getRotatedTiles(item, p.rotation);
  const rows = tiles.length;
  const cols = Math.max(...tiles.map(r => r.length));
  const mult = item.multiplierStats ?? item.multiplier;

  let html = `<div class="tip-label">${label}</div>`;
  html += `<div class="tip-detail">${cols}\u00d7${rows} tiles, \u00d7${mult} multiplier</div>`;

  // Stat contributions
  if (fs.stats && bld?.items?.[p.groupIdx]) {
    const bItem = bld.items[p.groupIdx];
    for (let s = 0; s < bItem.stats.length && s < fs.stats.length; s++) {
      if (bItem.stats[s] === 0) continue;
      const val = bItem.stats[s] * mult;
      const statName = getStatDisplayName(fs.stats[s]);
      const sign = val > 0 ? "+" : "";
      html += `<div class="tip-detail">${statName}: ${sign}${val.toFixed(1)}</div>`;
    }
  }

  tooltipEl.innerHTML = html;
  tooltipEl.style.display = "block";
  positionTooltip(e);
}

function positionTooltip(e) {
  if (!tooltipEl) return;
  let x = e.clientX + 15;
  let y = e.clientY + 10;
  // Clamp to viewport
  const rect = tooltipEl.getBoundingClientRect();
  if (x + rect.width > window.innerWidth - 8) x = e.clientX - rect.width - 8;
  if (y + rect.height > window.innerHeight - 8) y = e.clientY - rect.height - 8;
  tooltipEl.style.left = x + "px";
  tooltipEl.style.top = y + "px";
}

function hideTooltip() {
  if (tooltipEl) tooltipEl.style.display = "none";
}

function highlightPaletteFromGrid(groupIdx, itemIdx) {
  clearPaletteGridHighlight();
  if (!paletteEl) return;
  const thumbs = paletteEl.querySelectorAll(".planner-thumb");
  let thumbIdx = 0;
  const fs = state.furnitureSet;
  for (let gi = 0; gi < fs.groups.length; gi++) {
    for (let ii = 0; ii < fs.groups[gi].items.length; ii++) {
      if (gi === groupIdx && ii === itemIdx && thumbs[thumbIdx]) {
        thumbs[thumbIdx].classList.add("thumb-hover-from-grid");
        thumbs[thumbIdx].scrollIntoView({ block: "nearest", behavior: "smooth" });
        return;
      }
      thumbIdx++;
    }
  }
}

function clearPaletteGridHighlight() {
  if (!paletteEl) return;
  const highlighted = paletteEl.querySelectorAll(".thumb-hover-from-grid");
  highlighted.forEach(t => t.classList.remove("thumb-hover-from-grid"));
}

/** Compute and show/hide the live room dimension label. */
function updateDimLabel() {
  if (!dimLabelEl || !gridEl) return;
  let minR = state.gridH, maxR = -1, minC = state.gridW, maxC = -1;
  for (let r = 0; r < state.gridH; r++) {
    for (let c = 0; c < state.gridW; c++) {
      if (state.room[r][c]) {
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      }
    }
  }
  if (maxR < 0) {
    dimLabelEl.style.display = "none";
    return;
  }
  const rw = maxC - minC + 1;
  const rh = maxR - minR + 1;
  dimLabelEl.textContent = `${rw}\u00d7${rh}`;
  // Position at bottom-right of bounding box. Each cell = 24px + 1px gap = 25px.
  dimLabelEl.style.left = ((maxC + 1) * 25 + 2) + "px";
  dimLabelEl.style.top = ((maxR + 1) * 25 + 2) + "px";
  dimLabelEl.style.display = "";
}

// ── Placement actions ───────────────────────────────────

function attemptPlace(row, col) {
  if (state.selectedGroupIdx < 0 || state.selectedItemIdx < 0) return;
  const group = state.furnitureSet.groups[state.selectedGroupIdx];
  const item = group.items[state.selectedItemIdx];
  const origin = getCenteredOrigin(item, state.rotation, row, col);

  // Check max
  if (group.max != null && countGroupPlacements(state.selectedGroupIdx) >= group.max) {
    showPlacementFeedback(`Max ${group.max} placed`, origin.row + getRotatedTiles(item, state.rotation).length, origin.col);
    return;
  }

  const result = canPlace(state.selectedGroupIdx, state.selectedItemIdx, state.rotation, origin.row, origin.col);
  if (!result.ok) {
    showPlacementFeedback(result.reason, origin.row + getRotatedTiles(item, state.rotation).length, origin.col);
    return;
  }

  pushUndo();
  state.placements.push({
    groupIdx: state.selectedGroupIdx,
    itemIdx: state.selectedItemIdx,
    rotation: state.rotation,
    row: origin.row,
    col: origin.col,
  });

  computeStats();
  refreshGrid();
  refreshPalette();
  refreshStats();
  refreshValidation();
  syncUrl();
}

function removeFurnitureAt(row, col) {
  const pi = getPlacementAt(row, col);
  if (pi === null) return;
  pushUndo();
  state.placements.splice(pi, 1);
  computeStats();
  refreshGrid();
  refreshPalette();
  refreshStats();
  refreshValidation();
  syncUrl();
}

// ── Door toggle ─────────────────────────────────────────

function toggleDoor(r, c) {
  if (state.room[r]?.[c]) return; // can't door a room tile
  // Must be adjacent to room
  let adj = false;
  for (const [dr, dc] of DIRS) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < state.gridH && nc >= 0 && nc < state.gridW && state.room[nr][nc]) {
      adj = true; break;
    }
  }
  if (!adj) return;
  pushUndo();
  const key = `${r},${c}`;
  if (state.doors.has(key)) state.doors.delete(key);
  else state.doors.add(key);
  recomputeWallMetrics();
  refreshGrid();
  refreshValidation();
  syncUrl();
}

// ── Palette highlight helpers ────────────────────────────

function highlightMatchingPlacements(groupIdx, itemIdx) {
  clearHighlights();
  for (let pi = 0; pi < state.placements.length; pi++) {
    const p = state.placements[pi];
    if (p.groupIdx !== groupIdx || p.itemIdx !== itemIdx) continue;
    const tiles = getRotatedTiles(
      state.furnitureSet.groups[p.groupIdx].items[p.itemIdx], p.rotation);
    for (let r = 0; r < tiles.length; r++) {
      for (let c = 0; c < (tiles[r]?.length ?? 0); c++) {
        if (tiles[r][c] === null) continue;
        const cell = cellEls[p.row + r]?.[p.col + c];
        if (cell) cell.classList.add("cell-guide-highlight");
      }
    }
  }
}

function clearHighlights() {
  const highlighted = gridEl?.querySelectorAll(".cell-guide-highlight");
  if (highlighted) highlighted.forEach(c => c.classList.remove("cell-guide-highlight"));
}

// ── Palette ─────────────────────────────────────────────

function buildPalette(container) {
  paletteEl = el("div", "planner-palette");

  paletteEl.appendChild(elText("div", "Furniture Palette", "planner-section-header"));

  if (!state.furnitureSet) {
    paletteEl.appendChild(elText("div", "Select a building to see furniture.", "planner-palette-empty"));
    container.appendChild(paletteEl);
    return;
  }

  const fs = state.furnitureSet;
  const bld = state.building;

  for (let gi = 0; gi < fs.groups.length; gi++) {
    const group = fs.groups[gi];
    const groupDiv = el("div", "planner-group");

    // Group header: derive label from primary stat, preferring non-employees
    const label = getGroupLabel(fs, bld, gi);

    const count = countGroupPlacements(gi);
    const minLabel = group.min > 0 ? ` (min: ${group.min})` : "";
    const maxLabel = group.max != null ? ` (max: ${group.max})` : "";
    const countLabel = count > 0 ? ` [${count} placed]` : "";
    const headerText = `${label}${minLabel}${maxLabel}${countLabel}`;
    const hdr = elText("div", headerText, "planner-group-header");
    hdr.style.borderLeftColor = `rgba(${getGroupColor(label)}, 0.7)`;
    if (group.min > 0 && count < group.min) hdr.classList.add("group-unfulfilled");
    groupDiv.appendChild(hdr);

    const itemsRow = el("div", "planner-group-items");
    for (let ii = 0; ii < group.items.length; ii++) {
      const item = group.items[ii];
      const thumb = buildThumbnail(fs, item, gi, ii);
      const itemCount = countItemPlacements(gi, ii);
      if (itemCount > 0) {
        thumb.appendChild(elText("span", String(itemCount), "thumb-count"));
      }
      if (state.selectedGroupIdx === gi && state.selectedItemIdx === ii) {
        thumb.classList.add("thumb-selected");
      }
      // Disable if max reached and not currently selected
      if (group.max != null && count >= group.max &&
          !(state.selectedGroupIdx === gi && state.selectedItemIdx === ii)) {
        thumb.classList.add("thumb-disabled");
      }
      thumb.addEventListener("click", () => {
        if (thumb.classList.contains("thumb-disabled")) return;
        state.mode = "place";
        state.selectedGroupIdx = gi;
        state.selectedItemIdx = ii;
        // Reset rotation to first allowed
        const allowed = getAllowedRotations(group);
        if (!allowed.includes(state.rotation)) state.rotation = allowed[0];
        refreshPalette();
        updateToolbarActive();
      });
      thumb.addEventListener("mouseenter", () => highlightMatchingPlacements(gi, ii));
      thumb.addEventListener("mouseleave", () => clearHighlights());
      itemsRow.appendChild(thumb);
    }
    groupDiv.appendChild(itemsRow);
    paletteEl.appendChild(groupDiv);
  }

  container.appendChild(paletteEl);
}

function buildThumbnail(fs, item, groupIdx, _itemIdx) {
  const wrap = el("div", "planner-thumb");
  const tiles = item.tiles;
  const rows = tiles.length;
  const cols = Math.max(...tiles.map(r => r.length));
  const thumbGrid = el("div", "thumb-grid");
  thumbGrid.style.gridTemplateColumns = `repeat(${cols}, 6px)`;
  thumbGrid.style.gridTemplateRows = `repeat(${rows}, 6px)`;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tileKey = tiles[r]?.[c] ?? null;
      const tc = el("div", "thumb-cell");
      if (tileKey === null) {
        tc.classList.add("thumb-empty");
      } else {
        const tt = fs.tileTypes[tileKey];
        if (tt) {
          tc.dataset.avail = tt.availability;
        } else {
          tc.classList.add("thumb-empty");
        }
      }
      thumbGrid.appendChild(tc);
    }
  }
  wrap.appendChild(thumbGrid);

  // Multiplier and size label
  const mult = item.multiplierStats ?? item.multiplier;
  wrap.appendChild(elText("span", `×${mult}`, "thumb-mult"));
  wrap.appendChild(elText("span", `${cols}×${rows}`, "thumb-size"));
  const group = fs.groups?.[groupIdx];
  const rotDesc = !group ? "" :
    group.rotations === 0 ? ", no rotation" :
    group.rotations === 1 ? ", 2-way rotation" : ", 4-way rotation";
  wrap.title = `${cols}x${rows} tiles, x${mult}${rotDesc}`;
  return wrap;
}

function refreshPalette() {
  if (!paletteEl) return;
  const parent = paletteEl.parentElement;
  paletteEl.remove();
  buildPalette(parent);
}

// ── Stats panel ─────────────────────────────────────────

const STAT_DISPLAY_NAMES = {
  workers: "Employees",
  output: "Workstation",
  production: "Workstation",
  stations: "Workstation",
  efficiency: "Auxiliary",
};
function getStatDisplayName(stat) {
  return STAT_DISPLAY_NAMES[stat.name] || capitalize(stat.name);
}

/** RGB triplets for category-colored group borders and palette accents. */
const GROUP_COLORS = {
  Workstation: "90, 158, 255",
  Storage:     "108, 212, 90",
  Auxiliary:   "255, 170, 68",
  Employees:   "152, 112, 200",
  Seating:     "72, 200, 160",
  Bed:         "180, 140, 200",
  Lighting:    "240, 220, 100",
  Decoration:  "200, 160, 120",
};
const GROUP_COLOR_FALLBACK = "160, 160, 160";

/** Resolve the display label for a furniture group. */
function getGroupLabel(fs, bld, groupIdx) {
  let label = `Group ${groupIdx + 1}`;
  if (fs.stats && bld && bld.items && bld.items[groupIdx]) {
    const bItem = bld.items[groupIdx];
    let bestIdx = -1, fallbackIdx = -1;
    for (let si = 0; si < bItem.stats.length && si < fs.stats.length; si++) {
      if (bItem.stats[si] <= 0) continue;
      if (fs.stats[si].type === "employees") {
        if (fallbackIdx < 0) fallbackIdx = si;
      } else if (bestIdx < 0 || bItem.stats[si] > bItem.stats[bestIdx]) {
        bestIdx = si;
      }
    }
    const labelIdx = bestIdx >= 0 ? bestIdx : fallbackIdx;
    if (labelIdx >= 0 && fs.stats[labelIdx]) {
      label = getStatDisplayName(fs.stats[labelIdx]);
    }
  }
  if (label.startsWith("Group ")) {
    const spriteLabel = deriveGroupLabelFromSprites(fs, groupIdx);
    if (spriteLabel) label = spriteLabel;
  }
  return label;
}

/** Look up the RGB color triplet for a resolved group label. */
function getGroupColor(label) {
  return GROUP_COLORS[label] || GROUP_COLOR_FALLBACK;
}

/** Map sprite prefixes to human-readable group labels. */
const SPRITE_LABEL_MAP = {
  TABLE: "Workstation", CHAIR: "Seating", STOOL: "Seating", SIT: "Seating",
  BENCH: "Seating", SEAT: "Seating", STORAGE: "Storage", CRATE: "Storage",
  BOX: "Storage", SHELF: "Shelving", BED: "Bed", TORCH: "Lighting",
  CANDLE: "Lighting", CARPET: "Carpet", DECOR: "Decoration", NICKNACK: "Decoration",
  FLOWER: "Decoration", WORK: "Workstation", GATE: "Gate", SLAB: "Slab",
  TARGET: "Target", LANE: "Lane", FENCE: "Fence", PIPE: "Piping",
  MONUMENT: "Monument", ALTAR: "Altar", PODIUM: "Podium", PEDISTAL: "Pedestal",
  AUX: "Equipment", MISC: "Furnishing",
};

/** Derive a group label from the dominant sprite prefix in its tiles. */
function deriveGroupLabelFromSprites(fs, groupIdx) {
  const group = fs.groups[groupIdx];
  const prefixCounts = new Map();
  for (const item of group.items) {
    for (const row of item.tiles) {
      for (const tileKey of row) {
        if (tileKey === null) continue;
        const tt = fs.tileTypes[tileKey];
        if (!tt?.sprite) continue;
        // Extract prefix: strip trailing _1X1, _COMBO, _BOTTOM, _TOP, _A, etc.
        const prefix = tt.sprite.replace(/_(1X1|COMBO|BOTTOM|TOP|MID|END|IN|OUT|[A-C])(_.*)?$/, "")
          .replace(/_\d+$/, "");
        prefixCounts.set(prefix, (prefixCounts.get(prefix) || 0) + 1);
      }
    }
  }
  let bestPrefix = null, bestCount = 0;
  for (const [prefix, count] of prefixCounts) {
    if (count > bestCount) { bestPrefix = prefix; bestCount = count; }
  }
  if (!bestPrefix) return null;
  // Try exact match, then try first word
  if (SPRITE_LABEL_MAP[bestPrefix]) return SPRITE_LABEL_MAP[bestPrefix];
  const firstWord = bestPrefix.split("_")[0];
  return SPRITE_LABEL_MAP[firstWord] || capitalize(firstWord.toLowerCase());
}

function buildStatsPanel(container) {
  statsEl = el("div", "planner-stats");
  refreshStatsContent();
  container.appendChild(statsEl);
}

function refreshStatsContent() {
  if (!statsEl) return;
  statsEl.innerHTML = "";

  const fs = state.furnitureSet;
  const bld = state.building;

  statsEl.appendChild(elText("div", "Room Stats", "planner-section-header"));

  if (!fs) return;
  // Room tile count
  const roomTileCount = state.room.flat().filter(Boolean).length;
  if (roomTileCount > 0) {
    const tileRow = el("div", "planner-stat-row");
    tileRow.appendChild(elText("span", "Room Tiles", "planner-stat-name"));
    tileRow.appendChild(elText("span", String(roomTileCount), "planner-stat-value"));
    statsEl.appendChild(tileRow);
  }

  if (!fs.stats || fs.stats.length === 0) {
    statsEl.appendChild(elText("div", "No stat tracking for this building.", "planner-stats-empty"));
    return;
  }

  statsEl.appendChild(elText("div", "Stats", "planner-stats-title"));

  // Find employees stat index for efficiency percentage display
  let employeesIdx = -1;
  for (let i = 0; i < fs.stats.length; i++) {
    const s = fs.stats[i];
    if (s.type === "employees") employeesIdx = i;
    else if (s.type === "custom" && (s.name === "workers" || s.name === "men") && employeesIdx < 0) employeesIdx = i;
  }

  // Find primary stat index for relative stat percentage display
  let primaryIdx = 0;
  {
    let servIdx = -1, empIdx2 = -1, custIdx = -1;
    for (let i = 0; i < fs.stats.length; i++) {
      const s = fs.stats[i];
      if (s.type === "services" && servIdx < 0) servIdx = i;
      if (s.type === "employees" && empIdx2 < 0) empIdx2 = i;
      if (s.type === "custom" && (s.name === "workers" || s.name === "men") && custIdx < 0) custIdx = i;
    }
    if (servIdx >= 0) primaryIdx = servIdx;
    else if (empIdx2 >= 0) primaryIdx = empIdx2;
    else if (custIdx >= 0) primaryIdx = custIdx;
  }

  // Pre-compute which stats any furniture group contributes to
  const statHasContributor = new Array(fs.stats.length).fill(false);
  if (bld?.items) {
    for (let gi = 0; gi < bld.items.length; gi++) {
      const bItem = bld.items[gi];
      if (!bItem?.stats) continue;
      for (let s = 0; s < bItem.stats.length && s < fs.stats.length; s++) {
        if (bItem.stats[s] !== 0) statHasContributor[s] = true;
      }
    }
  }

  for (let s = 0; s < fs.stats.length; s++) {
    const stat = fs.stats[s];
    const val = state.stats[s] ?? 0;

    // Hide stats that no furniture group contributes to
    if (state.placements.length > 0 && !statHasContributor[s]) continue;

    const row = el("div", "planner-stat-row");

    const name = elText("span", getStatDisplayName(stat), "planner-stat-name");
    row.appendChild(name);

    let formatted;
    let colorClass = "";
    if (stat.type === "efficiency" && employeesIdx >= 0) {
      const empVal = state.stats[employeesIdx] ?? 0;
      const pct = 0.5 + 0.5 * Math.min(1, val / Math.max(1, empVal));
      const pctRound = Math.round(pct * 100);
      formatted = pctRound + "%";
      colorClass = pctRound >= 100 ? "stat-eff-green" : pctRound >= 75 ? "stat-eff-yellow" : "stat-eff-red";
    } else if (stat.type === "relative" || stat.type === "employeesRelative") {
      const primaryVal = state.stats[primaryIdx] ?? 0;
      const pct = primaryVal > 0 ? Math.round(val / primaryVal * 100) : 0;
      formatted = pct + "%";
      colorClass = pct >= 100 ? "stat-eff-green" : pct >= 75 ? "stat-eff-yellow" : "stat-eff-red";
    } else {
      const isInt = stat.type === "employees" || stat.type === "services" || stat.type === "integer"
          || (stat.type === "custom" && (stat.name === "workers" || stat.name === "men"));
      formatted = isInt ? String(Math.round(val)) : val.toFixed(1);
    }
    const valSpan = elText("span", formatted, "planner-stat-value" + (colorClass ? " " + colorClass : ""));
    row.appendChild(valSpan);

    const badge = elText("span", stat.type, "planner-stat-badge");
    badge.dataset.type = stat.type;
    row.appendChild(badge);

    statsEl.appendChild(row);
  }

  // Furniture costs (= ress[] base resource totals for the room)
  const costTotals = new Map();
  if (bld && bld.items && state.placements.length > 0) {
    for (const p of state.placements) {
      const bItem = bld.items[p.groupIdx];
      if (!bItem || !bItem.costs) continue;
      const item = fs.groups[p.groupIdx]?.items[p.itemIdx];
      if (!item) continue;
      const mult = item.multiplier;
      for (const cost of bItem.costs) {
        const prev = costTotals.get(cost.resource) || 0;
        costTotals.set(cost.resource, prev + cost.amount * mult);
      }
    }
    if (costTotals.size > 0) {
      statsEl.appendChild(elText("div", "Cost", "planner-stats-title"));
      for (const [resId, amount] of costTotals) {
        const row = el("div", "planner-stat-row");
        const nameSpan = el("span", "planner-stat-name");
        const icon = document.createElement("img");
        icon.src = `data/icons/${resId}.png`;
        icon.alt = "";
        icon.className = "inline-icon";
        nameSpan.appendChild(icon);
        nameSpan.appendChild(document.createTextNode(" " + formatResourceName(resId)));
        row.appendChild(nameSpan);
        row.appendChild(elText("span", amount.toFixed(1), "planner-stat-value"));
        statsEl.appendChild(row);
      }
    }
  }

  // Upgrade costs: ceil(ress[R] * nextMask[R]) - ceil(ress[R] * prevMask[R])
  // ress[] = costTotals (furniture base resource totals for the room)
  if (bld?.upgradeCosts?.length > 0 && costTotals.size > 0) {
    const toMask = (arr) => { const m = new Map(); for (const c of arr) m.set(c.resource, c.amount); return m; };
    let prevMask = toMask(bld.constructionCosts || []);
    for (let i = 0; i < bld.upgradeCosts.length; i++) {
      const currMask = toMask(bld.upgradeCosts[i]);
      const boost = bld.upgradeBoosts?.[i + 1];
      const boostStr = boost ? ` (+${Math.round(boost * 100)}%)` : "";

      const delta = [];
      for (const [res, ress] of costTotals) {
        const prev = Math.ceil(ress * (prevMask.get(res) || 0));
        const curr = Math.ceil(ress * (currMask.get(res) || 0));
        if (curr - prev > 0) delta.push({ resource: res, amount: curr - prev });
      }

      if (delta.length > 0) {
        statsEl.appendChild(elText("div", `Upgrade ${i + 1}${boostStr}`, "planner-stats-title"));
        for (const cost of delta) {
          const row = el("div", "planner-stat-row");
          const nameSpan = el("span", "planner-stat-name");
          const icon = document.createElement("img");
          icon.src = `data/icons/${cost.resource}.png`;
          icon.alt = "";
          icon.className = "inline-icon";
          nameSpan.appendChild(icon);
          nameSpan.appendChild(document.createTextNode(" " + formatResourceName(cost.resource)));
          row.appendChild(nameSpan);
          row.appendChild(elText("span", String(cost.amount), "planner-stat-value"));
          statsEl.appendChild(row);
        }
      }

      prevMask = currMask;
    }
  }
}

function refreshStats() {
  refreshStatsContent();
}

// ── Validation panel ────────────────────────────────────

function buildValidationPanel(container) {
  validationEl = el("div", "planner-validation");
  container.appendChild(validationEl);
}

function refreshValidation() {
  if (!validationEl) return;
  validationEl.innerHTML = "";

  const fs = state.furnitureSet;
  if (!fs) return;

  const warnings = [];

  // Group minimums
  for (let gi = 0; gi < fs.groups.length; gi++) {
    const group = fs.groups[gi];
    if (group.min > 0) {
      const count = countGroupPlacements(gi);
      if (count < group.min) {
        let label = `Group ${gi + 1}`;
        if (fs.stats && state.building?.items?.[gi]) {
          const bItem = state.building.items[gi];
          let bestI = -1, fallI = -1;
          for (let si = 0; si < bItem.stats.length && si < fs.stats.length; si++) {
            if (bItem.stats[si] <= 0) continue;
            if (fs.stats[si].type === "employees") { if (fallI < 0) fallI = si; }
            else if (bestI < 0 || bItem.stats[si] > bItem.stats[bestI]) bestI = si;
          }
          const li = bestI >= 0 ? bestI : fallI;
          if (li >= 0 && fs.stats[li]) label = getStatDisplayName(fs.stats[li]);
        }
        warnings.push({ type: "warn", msg: `${label}: need ${group.min - count} more (${count}/${group.min})` });
      }
    }
  }

  // Indoor/outdoor constraint + wall metrics
  if (needsWalls()) {
    const roomTiles = state.room.flat().filter(Boolean).length;
    if (roomTiles > 0) {
      const pct = Math.round(state.isolation * 100);
      const cls = pct >= 95 ? "info" : pct >= 70 ? "warn" : "error";
      warnings.push({ type: cls,
        msg: `Isolation: ${pct}%${pct < 100 ? " — add walls or close door gaps" : ""}` });
      let unstableCount = 0;
      for (let r = 0; r < state.gridH; r++)
        for (let c = 0; c < state.gridW; c++)
          if (state.room[r][c] && !state.stability[r][c]) unstableCount++;
      if (unstableCount > 0) {
        warnings.push({ type: "warn",
          msg: `${unstableCount} tile(s) need structural support (too far from walls)` });
      }
    } else {
      warnings.push({ type: "info", msg: "Indoor building — draw room tiles to see walls" });
    }
  } else if (fs?.mustBeOutdoors) {
    warnings.push({ type: "info", msg: "This building must be outdoors (no roof)" });
  }

  // Area costs
  const bld = state.building;
  if (bld?.areaCosts?.length > 0) {
    const roomTileCount = state.room.flat().filter(Boolean).length;
    if (roomTileCount > 0) {
      const totalCosts = bld.areaCosts.map(c =>
        `${(c.amount * roomTileCount).toFixed(1)} ${formatResourceName(c.resource)}`
      ).join(", ");
      warnings.push({ type: "info",
        msg: `Area cost: ${totalCosts} (${roomTileCount} tiles)` });
    }
  }

  // Walkability
  const walk = checkWalkability();
  if (walk.unreachable.length > 0) {
    warnings.push({ type: "error", msg: `${walk.unreachable.length} tile(s) unreachable — workers can't reach furniture` });
    // Highlight unreachable cells
    for (const { row, col } of walk.unreachable) {
      const cell = cellEls[row]?.[col];
      if (cell) cell.classList.add("cell-unreachable");
    }
  }
  if (walk.disconnected > 0) {
    warnings.push({ type: "warn", msg: `${walk.disconnected} room tile(s) disconnected — room has separate zones` });
  }

  if (warnings.length === 0 && state.placements.length > 0) {
    validationEl.appendChild(elText("div", "Room layout valid.", "planner-valid-ok"));
    return;
  }

  for (const w of warnings) {
    const d = elText("div", w.msg, `planner-valid-${w.type}`);
    validationEl.appendChild(d);
  }
}

// ── Toolbar ─────────────────────────────────────────────

function buildToolbar(container) {
  toolbarEl = el("div", "planner-toolbar-wrap");

  // Mode row
  const modeRow = el("div", "planner-toolbar");

  const modes = [
    { key: "draw", label: "Draw Room", icon: "\u25A0", kbd: "d" },
    { key: "erase", label: "Erase", icon: "\u25A1", kbd: "e" },
  ];

  for (const m of modes) {
    const btn = el("button", "planner-tool-btn");
    btn.dataset.mode = m.key;
    btn.appendChild(document.createTextNode(`${m.icon} ${m.label} `));
    btn.appendChild(elText("kbd", m.kbd, "planner-kbd"));
    if (state.mode === m.key) btn.classList.add("active");
    btn.addEventListener("click", () => {
      state.mode = m.key;
      state.selectedGroupIdx = -1;
      state.selectedItemIdx = -1;
      updateToolbarActive();
      refreshPalette();
    });
    modeRow.appendChild(btn);
  }

  // Door mode button (shown only for indoor buildings)
  const doorBtn = el("button", "planner-tool-btn planner-door-btn");
  doorBtn.dataset.mode = "door";
  doorBtn.appendChild(document.createTextNode("\u229E Door "));
  doorBtn.appendChild(elText("kbd", "w", "planner-kbd"));
  if (state.mode === "door") doorBtn.classList.add("active");
  doorBtn.addEventListener("click", () => {
    state.mode = "door";
    state.selectedGroupIdx = -1;
    state.selectedItemIdx = -1;
    updateToolbarActive();
    refreshPalette();
  });
  doorBtn.title = "Toggle doors (W key)";
  doorBtn.style.display = needsWalls() ? "" : "none";
  modeRow.appendChild(doorBtn);

  // Separator
  modeRow.appendChild(el("span", "planner-toolbar-sep"));

  // Hints
  const removeHint = el("span", "planner-remove-hint");
  removeHint.appendChild(document.createTextNode("Remove: "));
  removeHint.appendChild(elText("kbd", "Shift+Click", "planner-kbd"));
  modeRow.appendChild(removeHint);

  const moveHint = el("span", "planner-remove-hint");
  moveHint.appendChild(document.createTextNode("Move: "));
  moveHint.appendChild(elText("kbd", "Drag", "planner-kbd"));
  moveHint.appendChild(document.createTextNode("  Copy: "));
  moveHint.appendChild(elText("kbd", "Ctrl+Click", "planner-kbd"));
  modeRow.appendChild(moveHint);

  // Separator
  modeRow.appendChild(el("span", "planner-toolbar-sep"));

  // Rotation control
  const rotWrap = el("span", "planner-rot-wrap");
  rotWrap.appendChild(elText("span", "Rot:", "planner-rot-label"));
  const rotBtn = el("button", "planner-tool-btn planner-rot-btn");
  const rotLabel = document.createTextNode("R ");
  rotBtn.appendChild(rotLabel);
  const rotKbd = elText("kbd", "r", "planner-kbd");
  rotBtn.appendChild(rotKbd);
  rotBtn.title = "Rotate (R key)";
  rotBtn.addEventListener("click", () => cycleRotation());
  rotWrap.appendChild(rotBtn);
  modeRow.appendChild(rotWrap);

  // Undo button
  const undoBtn = el("button", "planner-tool-btn");
  undoBtn.appendChild(document.createTextNode("Undo "));
  undoBtn.appendChild(elText("kbd", "Ctrl+Z", "planner-kbd"));
  undoBtn.title = "Undo (Ctrl+Z)";
  undoBtn.addEventListener("click", () => undo());
  modeRow.appendChild(undoBtn);

  // Sprite view toggle button
  const spriteBtn = el("button", "planner-tool-btn planner-sprite-btn");
  spriteBtn.appendChild(document.createTextNode("Sprites "));
  spriteBtn.appendChild(elText("kbd", "v", "planner-kbd"));
  spriteBtn.title = "Toggle sprite view (V key)";
  spriteBtn.addEventListener("click", () => toggleSpriteView());
  if (state.spriteView) spriteBtn.classList.add("active");
  modeRow.appendChild(spriteBtn);

  toolbarEl.appendChild(modeRow);

  // Shape sub-bar (applies to draw/erase)
  const shapeRow = el("div", "planner-shape-bar");
  shapeRow.appendChild(elText("span", "Shape:", "planner-shape-label"));

  const shapes = [
    { key: "rect", label: "Rectangle" },
    { key: "brush", label: "Brush" },
  ];

  for (const s of shapes) {
    const btn = elText("button", s.label, "planner-shape-btn");
    btn.dataset.shape = s.key;
    if (state.shape === s.key) btn.classList.add("active");
    btn.addEventListener("click", () => {
      state.shape = s.key;
      updateShapeActive();
    });
    shapeRow.appendChild(btn);
  }

  toolbarEl.appendChild(shapeRow);
  container.appendChild(toolbarEl);
}

function updateToolbarActive() {
  if (!toolbarEl) return;
  for (const btn of toolbarEl.querySelectorAll(".planner-tool-btn[data-mode]")) {
    btn.classList.toggle("active", btn.dataset.mode === state.mode);
  }
  // Show/hide door button based on indoor building
  const doorBtn = toolbarEl.querySelector(".planner-door-btn");
  if (doorBtn) {
    doorBtn.style.display = needsWalls() ? "" : "none";
  }
  // Shape bar visible only in draw/erase modes
  const shapeBar = toolbarEl.querySelector(".planner-shape-bar");
  if (shapeBar) {
    shapeBar.style.display = (state.mode === "draw" || state.mode === "erase") ? "" : "none";
  }
  // Show grab cursor on furniture in draw/erase modes
  if (gridEl) {
    gridEl.classList.toggle("drag-cursor", state.mode === "draw" || state.mode === "erase");
  }
  updateShapeActive();
}

function updateShapeActive() {
  if (!toolbarEl) return;
  for (const btn of toolbarEl.querySelectorAll(".planner-shape-btn")) {
    btn.classList.toggle("active", btn.dataset.shape === state.shape);
  }
}

function updateDisabledState() {
  const locked = !state.building;
  if (toolbarEl) toolbarEl.classList.toggle("planner-locked", locked);
  if (gridParent) gridParent.classList.toggle("planner-locked", locked);
  if (sidebarEl) sidebarEl.classList.toggle("planner-locked", locked);
  const overlay = document.querySelector(".planner-empty-overlay");
  if (overlay) overlay.style.display = locked ? "" : "none";
}

function cycleRotation() {
  if (state.selectedGroupIdx < 0) {
    state.rotation = (state.rotation + 1) % 4;
    return;
  }
  const group = state.furnitureSet.groups[state.selectedGroupIdx];
  const allowed = getAllowedRotations(group);
  const idx = allowed.indexOf(state.rotation);
  state.rotation = allowed[(idx + 1) % allowed.length];
}

// ── Building info panel ──────────────────────────────────

function buildInfoPanel(container) {
  infoPanelEl = el("div", "planner-info");
  container.appendChild(infoPanelEl);
}

function addInfoRow(parent, label, value) {
  parent.appendChild(elText("span", label, "planner-info-label"));
  parent.appendChild(elText("span", value, "planner-info-value"));
}

function refreshInfoPanel() {
  if (!infoPanelEl) return;
  infoPanelEl.innerHTML = "";

  const bld = state.building;
  if (!bld) return;

  // Description (full-width italic)
  if (bld.desc) {
    infoPanelEl.appendChild(elText("div", bld.desc, "planner-info-desc"));
  }

  if (bld.fence) addInfoRow(infoPanelEl, "Fence", capitalize(bld.fence));
  if (bld.maxEmployed) addInfoRow(infoPanelEl, "Max Workers", String(bld.maxEmployed));
  if (bld.storage) addInfoRow(infoPanelEl, "Storage", String(bld.storage));
  if (bld.serviceRadius) addInfoRow(infoPanelEl, "Service Radius", bld.serviceRadius + " tiles");
  if (bld.noise) addInfoRow(infoPanelEl, "Noise", "Yes");
  if (bld.usesTool) addInfoRow(infoPanelEl, "Uses Tool", "Yes");
  if (bld.nightShift) addInfoRow(infoPanelEl, "Night Shift", "Yes");

  if (bld.need) {
    addInfoRow(infoPanelEl, "Need", capitalize(bld.need.replace(/_/g, " ")));
  }

  if (bld.constructionCosts?.length > 0) {
    addInfoRow(infoPanelEl, "Construction", formatCosts(bld.constructionCosts));
  }

  if (bld.areaCosts?.length > 0) {
    addInfoRow(infoPanelEl, "Area Cost / Tile", formatCosts(bld.areaCosts));
  }

  if (bld.climateBonus && typeof bld.climateBonus === "object") {
    const parts = Object.entries(bld.climateBonus)
      .map(([k, v]) => `${capitalize(k.toLowerCase())}: ${v}x`);
    addInfoRow(infoPanelEl, "Climate", parts.join(", "));
  }
}

// ── Blueprint Management ─────────────────────────────────

/** Reference to the Blueprints button for updating badge count. */
let blueprintsBtnRef = null;

function showToast(message) {
  const toast = elText("div", message, "blueprint-toast");
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("visible"), 10);
  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

/** Update the Blueprints button badge with current count. */
function updateBlueprintsBtn() {
  if (!blueprintsBtnRef) return;
  const count = loadBlueprints().length;
  blueprintsBtnRef.textContent = `Blueprints (${count})`;
}

/** Save the current planner state as a blueprint in the library. */
async function saveBlueprintToLibrary() {
  if (!state.buildingId || !state.furnitureSet) return;
  if (!state.room.flat().some(Boolean)) return;

  const defaultName = capitalize(state.buildingId.replace(/_/g, " "));
  const name = prompt("Blueprint name:", defaultName);
  if (name === null) return; // cancelled
  const finalName = name.trim() || defaultName;

  // Generate compressed plan binary
  const planEncoded = await serializePlan();
  if (!planEncoded) return;

  // Get trimmed dimensions for display
  const trim = trimGrid();

  const bps = loadBlueprints();

  // If editing an existing blueprint, update it
  if (state._editingBlueprintId) {
    const idx = bps.findIndex(bp => bp.id === state._editingBlueprintId);
    if (idx >= 0) {
      bps[idx].name = finalName;
      bps[idx].planEncoded = planEncoded;
      bps[idx].width = trim.w;
      bps[idx].height = trim.h;
      bps[idx].savedAt = Date.now();
      saveBlueprints(bps);
      showToast(`Blueprint "${finalName}" updated`);
      updateBlueprintsBtn();
      return;
    }
  }

  // Create new blueprint
  const bp = {
    id: crypto.randomUUID(),
    name: finalName,
    buildingId: state.buildingId,
    savedAt: Date.now(),
    planEncoded,
    width: trim.w,
    height: trim.h,
  };
  bps.push(bp);
  saveBlueprints(bps);
  state._editingBlueprintId = bp.id;
  showToast(`Blueprint "${finalName}" saved`);
  updateBlueprintsBtn();
}

/** Load a blueprint into the planner from a library entry. */
async function loadBlueprintIntoPlanner(bp) {
  const result = await deserializePlan(bp.planEncoded);
  if (result.ok) {
    state._editingBlueprintId = bp.id;
    syncUrl();
  } else {
    showToast(`Failed to load: ${result.error}`);
  }
  return result;
}

/** Migrate legacy blueprints that have sosEntry but no planEncoded. */
async function migrateLegacyBlueprints() {
  const bps = loadBlueprints();
  let migrated = 0;
  for (const bp of bps) {
    if (bp.planEncoded || !bp.sosEntry) continue;
    try {
      // Re-parse the sosEntry to extract DATA array
      const parsed = parseSavedPrints(bp.sosEntry);
      if (parsed.length === 0) continue;
      const entry = parsed[0];
      const fs = furnitureByBuilding.get(entry.buildingId);
      const planObj = sosDataToPlanObj(entry.data, entry.width, entry.height, entry.buildingId, fs);
      bp.planEncoded = await encodePlanObj(planObj);
      bp.width = entry.width;
      bp.height = entry.height;
      delete bp.sosEntry;
      migrated++;
    } catch (err) {
      console.warn("Failed to migrate blueprint:", bp.name, err);
    }
  }
  if (migrated > 0) {
    saveBlueprints(bps);
  }
  return migrated;
}

/** Show the blueprint management modal. */
async function showBlueprintManager() {
  // Migrate legacy blueprints on first open
  const migrated = await migrateLegacyBlueprints();

  const overlay = el("div", "blueprint-overlay");
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });

  // Escape to close
  overlay.tabIndex = -1;
  overlay.addEventListener("keydown", (e) => {
    if (e.key === "Escape") overlay.remove();
  });

  const box = el("div", "blueprint-modal blueprint-manager");

  // Header with title + close ×
  const header = el("div", "blueprint-header");
  header.appendChild(elText("h3", "Blueprints"));
  const closeX = elText("button", "\u00D7", "blueprint-close-x");
  closeX.addEventListener("click", () => overlay.remove());
  header.appendChild(closeX);
  box.appendChild(header);

  // Blueprint list
  const listEl = el("div", "blueprint-list");
  box.appendChild(listEl);

  function renderList() {
    listEl.innerHTML = "";
    const bps = loadBlueprints();
    if (bps.length === 0) {
      const empty = elText("div", "No blueprints yet. Save from the planner or import a SavedPrints.txt file.", "blueprint-empty");
      listEl.appendChild(empty);
      return;
    }

    // Sort by building name, then savedAt within each building
    const sorted = [...bps].sort((a, b) => {
      const nameA = (buildingById.get(a.buildingId)?.name ?? a.buildingId).toLowerCase();
      const nameB = (buildingById.get(b.buildingId)?.name ?? b.buildingId).toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return (a.savedAt || 0) - (b.savedAt || 0);
    });

    let lastBuilding = null;
    for (const bp of sorted) {
      const buildingName = buildingById.get(bp.buildingId)?.name ?? bp.buildingId;

      // Group header when building type changes
      if (buildingName !== lastBuilding) {
        lastBuilding = buildingName;
        const groupHeader = elText("div", buildingName, "blueprint-group-header");
        listEl.appendChild(groupHeader);
      }

      const item = el("div", "blueprint-item");

      // Highlight the currently-loaded blueprint
      if (bp.id === state._editingBlueprintId) {
        item.classList.add("blueprint-item-active");
      }

      // Left: meta info
      const meta = el("div", "blueprint-item-meta");

      // Editable name
      const nameSpan = elText("span", bp.name, "blueprint-item-name");
      nameSpan.title = "Click to rename";
      nameSpan.addEventListener("click", () => {
        const input = el("input", "blueprint-item-name-edit");
        input.type = "text";
        input.value = bp.name;
        input.spellcheck = false;
        nameSpan.replaceWith(input);
        input.focus();
        input.select();
        let committed = false;
        const commit = () => {
          if (committed) return;
          committed = true;
          const newName = input.value.trim();
          if (newName && newName !== bp.name) {
            bp.name = newName;
            const all = loadBlueprints();
            const idx = all.findIndex(b => b.id === bp.id);
            if (idx >= 0) { all[idx].name = newName; saveBlueprints(all); }
          }
          renderList();
        };
        input.addEventListener("blur", commit);
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") input.blur();
          if (e.key === "Escape") { e.stopPropagation(); input.value = bp.name; input.blur(); }
        });
      });
      meta.appendChild(nameSpan);

      // Dimensions from stored width/height
      if (bp.width && bp.height) {
        meta.appendChild(elText("span", `${bp.width}\u00D7${bp.height}`, "blueprint-item-dims"));
      }

      item.appendChild(meta);

      // Actions
      const actions = el("div", "blueprint-item-actions");

      // Load button — all blueprints have planEncoded now
      const loadBtn = elText("button", "Load", "planner-tool-btn blueprint-load-btn");
      loadBtn.addEventListener("click", async () => {
        const result = await loadBlueprintIntoPlanner(bp);
        if (result?.ok !== false) overlay.remove();
      });
      actions.appendChild(loadBtn);

      // Delete button — small ×
      const deleteBtn = elText("button", "\u00D7", "blueprint-delete-x");
      deleteBtn.title = `Delete "${bp.name}"`;
      deleteBtn.addEventListener("click", () => {
        if (!confirm(`Delete "${bp.name}"?`)) return;
        const all = loadBlueprints();
        const filtered = all.filter(b => b.id !== bp.id);
        saveBlueprints(filtered);
        if (state._editingBlueprintId === bp.id) state._editingBlueprintId = null;
        updateBlueprintsBtn();
        renderList();
      });
      actions.appendChild(deleteBtn);

      item.appendChild(actions);
      listEl.appendChild(item);
    }
  }
  renderList();
  if (migrated > 0) showToast(`Migrated ${migrated} legacy blueprint${migrated !== 1 ? "s" : ""}`);

  // Footer: Import/Export buttons + path
  const footer = el("div", "blueprint-footer");

  const footerButtons = el("div", "blueprint-footer-buttons");

  const importBtn = elText("button", "Import from Game", "planner-tool-btn");
  importBtn.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".txt";
    input.addEventListener("change", async () => {
      const file = input.files[0];
      if (!file) return;
      if (file.name !== "SavedPrints.txt") {
        console.log(`Note: expected SavedPrints.txt, got "${file.name}"`);
      }
      const text = await file.text();
      const entries = parseSavedPrints(text);
      if (entries.length === 0) {
        showToast("No blueprints found in file");
        return;
      }
      const bps = loadBlueprints();
      let added = 0;
      for (const entry of entries) {
        // Skip exact duplicates by name+buildingId
        const dup = bps.some(bp => bp.name === entry.name && bp.buildingId === entry.buildingId);
        if (dup) continue;
        const fs = furnitureByBuilding.get(entry.buildingId);
        const planObj = sosDataToPlanObj(entry.data, entry.width, entry.height, entry.buildingId, fs);
        const planEncoded = await encodePlanObj(planObj);
        bps.push({
          id: crypto.randomUUID(),
          name: entry.name,
          buildingId: entry.buildingId,
          savedAt: Date.now(),
          planEncoded,
          width: entry.width,
          height: entry.height,
        });
        added++;
      }
      saveBlueprints(bps);
      showToast(`Imported ${added} blueprint${added !== 1 ? "s" : ""}${entries.length - added > 0 ? ` (${entries.length - added} duplicates skipped)` : ""}`);
      updateBlueprintsBtn();
      renderList();
    });
    input.click();
  });
  footerButtons.appendChild(importBtn);

  const exportBtn = elText("button", "Export to Game", "planner-tool-btn");
  exportBtn.addEventListener("click", async () => {
    const bps = loadBlueprints();
    if (bps.length === 0) {
      showToast("No blueprints to export");
      return;
    }
    exportBtn.disabled = true;
    exportBtn.textContent = "Exporting...";
    try {
      const results = await Promise.all(
        bps.map(bp => planEncodedToSosEntry(bp.planEncoded, bp.name, furnitureByBuilding.get(bp.buildingId)))
      );
      const sosEntries = results.filter(Boolean);
      if (sosEntries.length === 0) {
        showToast("No exportable blueprints (unknown buildings)");
        return;
      }
      const fileText = generateSavedPrints(sosEntries);
      const blob = new Blob([fileText], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "SavedPrints.txt";
      a.click();
      URL.revokeObjectURL(a.href);
      const skipped = bps.length - sosEntries.length;
      showToast(`SavedPrints.txt downloaded${skipped > 0 ? ` (${skipped} skipped)` : ""}`);
      // Show contextual path hint after successful export
      pathRow.style.display = "flex";
    } finally {
      exportBtn.disabled = false;
      exportBtn.textContent = "Export to Game";
    }
  });
  footerButtons.appendChild(exportBtn);
  footer.appendChild(footerButtons);

  // Path hint row — hidden by default, shown after export
  const pathRow = el("div", "blueprint-path-row");
  pathRow.style.display = "none";
  const pathHint = elText("span", "\u2713 SavedPrints.txt downloaded \u2014 move it to:", "blueprint-path-hint");
  pathRow.appendChild(pathHint);
  const pathText = elText("code", "%APPDATA%\\songsofsyx\\saves\\profile\\", "blueprint-path-text");
  pathRow.appendChild(pathText);
  const copyPathBtn = elText("button", "Copy", "planner-tool-btn blueprint-copy-path-btn");
  copyPathBtn.addEventListener("click", async () => {
    await navigator.clipboard.writeText("%APPDATA%\\songsofsyx\\saves\\profile\\");
    copyPathBtn.textContent = "Copied!";
    setTimeout(() => { copyPathBtn.textContent = "Copy"; }, 2000);
  });
  pathRow.appendChild(copyPathBtn);
  footer.appendChild(pathRow);

  box.appendChild(footer);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
  overlay.focus();
}

// ── Auto-Optimize ────────────────────────────────────────

async function runAutoOptimize(btn) {
  if (!state.building || !state.furnitureSet) return;

  // Check if room has tiles
  const roomCount = state.room.flat().filter(Boolean).length;
  if (roomCount === 0) {
    if (validationEl) {
      validationEl.innerHTML = "";
      validationEl.appendChild(elText("div", "Draw room tiles first before optimizing.", "planner-valid-error"));
    }
    return;
  }

  btn.disabled = true;
  btn.textContent = "Optimizing...";

  pushUndo();

  try {
    const result = await runOptimizer({
      building: state.building,
      furnitureSet: state.furnitureSet,
      gridW: state.gridW,
      gridH: state.gridH,
      room: state.room.map(row => [...row]),
      placements: state.placements.map(p => ({ ...p })),
      doors: new Set(state.doors),
    });

    state.room = result.room;
    state.placements = result.placements;
    state.doors = result.doors;
    recomputeWallMetrics();
    computeStats();
    refreshGrid();
    refreshPalette();
    refreshStats();
    refreshValidation();
    syncUrl();
  } catch (err) {
    console.error("Optimizer error:", err);
    undo(); // revert on error
  }

  btn.textContent = "Auto-Optimize";
  btn.disabled = false;
}

function updateOptimizeBtn() {
  if (!optimizeBtnRef) return;
  const hasRoom = state.room.flat().some(Boolean);
  optimizeBtnRef.disabled = !state.building || !state.furnitureSet || !hasRoom;
}

// ── Building selector ───────────────────────────────────

function buildSelector(container) {
  const selectorWrap = el("div", "planner-selector");

  // Autocomplete items: only buildings with furniture
  const items = [];
  for (const [bid, _fs] of furnitureByBuilding) {
    const bld = buildingById.get(bid);
    if (!bld) continue;
    items.push({
      id: bid,
      name: bld.name,
      type: "building",
      category: bld.category,
      icon: bld.icon,
    });
  }
  items.sort((a, b) => a.name.localeCompare(b.name));

  createAutocomplete(selectorWrap, items, (id) => {
    if (state.placements.length > 0 && id !== state.buildingId) {
      if (!confirm("Switching buildings will clear all placements. Continue?")) {
        // Reset autocomplete input to current building name
        const inp = selectorWrap.querySelector(".search-autocomplete input");
        if (inp && state.building) inp.value = state.building.name;
        return;
      }
    }
    selectBuilding(id);
  }, {
    placeholder: "Select building...",
    keepValue: true,
    showAllOnEmpty: true,
  });

  container.appendChild(selectorWrap);

  // Actions row (below selector)
  const actionsRow = el("div", "planner-actions");

  // Auto-Optimize button
  const optimizeBtn = elText("button", "Auto-Optimize", "planner-tool-btn planner-optimize-btn");
  optimizeBtn.disabled = true;
  optimizeBtn.addEventListener("click", () => runAutoOptimize(optimizeBtn));
  actionsRow.appendChild(optimizeBtn);
  optimizeBtnRef = optimizeBtn;

  // Copy Link button
  const copyBtn = elText("button", "Copy Link", "planner-tool-btn planner-copy-btn");
  copyBtn.addEventListener("click", async () => {
    const encoded = await serializePlan();
    if (!encoded) return;
    const url = `${location.origin}${location.pathname}#planner/${encoded}`;
    await navigator.clipboard.writeText(url);
    copyBtn.textContent = "Copied!";
    setTimeout(() => { copyBtn.textContent = "Copy Link"; }, 2000);
  });
  actionsRow.appendChild(copyBtn);

  // Save Blueprint button
  const saveBtn = elText("button", "Save Blueprint", "planner-tool-btn planner-save-btn");
  saveBtn.addEventListener("click", () => saveBlueprintToLibrary());
  actionsRow.appendChild(saveBtn);

  // Blueprints (N) button — opens management modal
  const bpCount = loadBlueprints().length;
  const bpBtn = elText("button", `Blueprints (${bpCount})`, "planner-tool-btn planner-blueprints-btn");
  bpBtn.addEventListener("click", () => showBlueprintManager());
  actionsRow.appendChild(bpBtn);
  blueprintsBtnRef = bpBtn;

  // Clear Furniture button — removes placements but keeps room shape, walls, doors
  const clearFurnBtn = elText("button", "Clear Furniture", "planner-tool-btn planner-clear-btn");
  clearFurnBtn.addEventListener("click", () => {
    if (state.placements.length === 0) return;
    pushUndo();
    state.placements = [];
    computeStats();
    refreshGrid();
    refreshPalette();
    refreshStats();
    refreshValidation();
  });
  actionsRow.appendChild(clearFurnBtn);

  // Clear All button
  const clearBtn = elText("button", "Clear All", "planner-tool-btn planner-clear-btn");
  clearBtn.addEventListener("click", () => {
    state._editingBlueprintId = null;
    initRoom();
    recomputeWallMetrics();
    computeStats();
    refreshGrid();
    refreshPalette();
    refreshStats();
    refreshValidation();
    clearPlannerRoute();
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
  });
  actionsRow.appendChild(clearBtn);

  container.appendChild(actionsRow);
}


// Reference to grid parent for rebuild
let gridParent = null;


function selectBuilding(buildingId) {
  const bld = buildingById.get(buildingId);
  const fs = furnitureByBuilding.get(buildingId);
  if (!bld || !fs) return;

  state.buildingId = buildingId;
  state.building = bld;
  state.furnitureSet = fs;
  state.selectedGroupIdx = -1;
  state.selectedItemIdx = -1;
  state.rotation = 0;
  state.mode = "draw";
  state._editingBlueprintId = null;
  initRoom();
  undoStack.length = 0;
  preloadBuildingSprites(buildingId, bld);
  recomputeWallMetrics();
  computeStats();
  refreshGrid();
  refreshPalette();
  refreshStats();
  refreshValidation();
  refreshInfoPanel();
  updateToolbarActive();
  updateOptimizeBtn();
  updateDisabledState();
  if (!_restoring) {
    clearPlannerRoute();
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
  }
}

// ── Keyboard shortcuts ──────────────────────────────────

function onKeyDown(e) {
  // Don't capture when typing in inputs
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
  // Only handle when planner tab is active
  const plannerView = document.getElementById("view-planner");
  if (!plannerView || !plannerView.classList.contains("active")) return;

  if ((e.ctrlKey || e.metaKey) && e.key === "z") {
    e.preventDefault();
    undo();
    return;
  }

  if (e.key === "r" || e.key === "R") {
    e.preventDefault();
    cycleRotation();
    if (lastHoverRow >= 0) showPreview(lastHoverRow, lastHoverCol);
  } else if (e.key === "Escape") {
    state.mode = "draw";
    state.selectedGroupIdx = -1;
    state.selectedItemIdx = -1;
    updateToolbarActive();
    refreshPalette();
    clearPreview();
  } else if (e.key === "d" || e.key === "D") {
    state.mode = "draw";
    state.selectedGroupIdx = -1;
    state.selectedItemIdx = -1;
    updateToolbarActive();
    refreshPalette();
  } else if (e.key === "e" || e.key === "E") {
    state.mode = "erase";
    state.selectedGroupIdx = -1;
    state.selectedItemIdx = -1;
    updateToolbarActive();
    refreshPalette();
  } else if (e.key === "x" || e.key === "X") {
    state.mode = "remove";
    state.selectedGroupIdx = -1;
    state.selectedItemIdx = -1;
    updateToolbarActive();
    refreshPalette();
  } else if ((e.key === "w" || e.key === "W") && needsWalls()) {
    state.mode = "door";
    state.selectedGroupIdx = -1;
    state.selectedItemIdx = -1;
    updateToolbarActive();
    refreshPalette();
  } else if (e.key === "v" || e.key === "V") {
    e.preventDefault();
    toggleSpriteView();
  } else if (e.key >= "1" && e.key <= "9") {
    // Number keys: quick-select furniture group and enter place mode
    const gi = parseInt(e.key, 10) - 1;
    if (state.furnitureSet && gi < state.furnitureSet.groups.length) {
      state.selectedGroupIdx = gi;
      state.selectedItemIdx = 0;
      state.mode = "place";
      const group = state.furnitureSet.groups[gi];
      const allowed = getAllowedRotations(group);
      if (!allowed.includes(state.rotation)) state.rotation = allowed[0];
      updateToolbarActive();
      refreshPalette();
      if (lastHoverRow >= 0) showPreview(lastHoverRow, lastHoverCol);
    }
  }
}

// ── Main entry point ────────────────────────────────────

/**
 * Render the Room Planner tab.
 * @param {HTMLElement} container
 */
export function renderPlanner(container) {
  container.innerHTML = "";

  const content = el("div", "planner-content");

  // Header
  const headerEl = el("div", "planner-header");
  headerEl.appendChild(elText("h2", "Room Planner"));
  headerEl.appendChild(elText("span", "Draw room tiles, then place furniture from the palette", "planner-subtitle"));
  content.appendChild(headerEl);

  // Building selector row
  buildSelector(content);

  // Toolbar
  buildToolbar(content);

  // Main layout: grid + sidebar
  const main = el("div", "planner-main");

  const gridWrap = el("div", "planner-grid-wrap");
  gridParent = gridWrap;
  initRoom();
  buildGrid(gridWrap);
  // Auto-scroll to center of the 40x40 grid
  requestAnimationFrame(() => {
    gridWrap.scrollLeft = (gridWrap.scrollWidth - gridWrap.clientWidth) / 2;
    gridWrap.scrollTop = (gridWrap.scrollHeight - gridWrap.clientHeight) / 2;
  });
  main.appendChild(gridWrap);

  const sidebar = el("div", "planner-sidebar");
  sidebarEl = sidebar;
  buildPalette(sidebar);
  buildStatsPanel(sidebar);
  buildValidationPanel(sidebar);
  main.appendChild(sidebar);

  // Empty-state overlay
  const overlay = el("div", "planner-empty-overlay");
  overlay.appendChild(elText("div", "\u25A6", "empty-icon"));
  overlay.appendChild(elText("div", "Select a building above to start planning", "empty-title"));
  overlay.appendChild(elText("div", "Draw rooms, place furniture, optimize layouts", "empty-hint"));
  main.appendChild(overlay);

  content.appendChild(main);

  // Building info panel (below the grid)
  buildInfoPanel(content);

  container.appendChild(content);

  // Create persistent tooltip element
  tooltipEl = el("div", "planner-tooltip");
  document.body.appendChild(tooltipEl);

  // Apply disabled state if no building selected
  updateDisabledState();

  // Install keyboard handler
  document.addEventListener("keydown", onKeyDown);

  // Clear shift-hover highlight on shift release
  document.addEventListener("keyup", (e) => {
    if (e.key === "Shift") clearRemoveHighlight();
  });

  // Flush pending URL sync on page unload
  window.addEventListener("beforeunload", () => flushSyncUrl());
}

// ── DOM helpers ─────────────────────────────────────────

function el(tag, className) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  return e;
}

function elText(tag, text, className) {
  const e = el(tag, className);
  e.textContent = text;
  return e;
}
