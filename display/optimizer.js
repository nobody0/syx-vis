// Room Planner Auto-Optimizer — strip-based deterministic placement + lightweight SA polish
import {
  AVAIL_IMPASSABLE, getAllowedRotations, DIRS, DIRS8,
  SUPPORT_RADIUS, STABILITY_THRESHOLD,
  getCachedTiles,
  createRoomContext, buildOccupancyGrid, rebuildOccupancyInPlace, setOccupancy, clearOccupancy,
  canPlaceFast, checkWalkability, checkRoomConnectivity,
  computeStats, computeIsolation, tileSupport, countGroupPlacements,
} from "./planner-core.js";

// ── Seeded PRNG (mulberry32) ─────────────────────────────
function createRNG(seed) {
  let s = seed | 0;
  const rng = function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.save = () => s;
  rng.restore = (state) => { s = state; };
  return rng;
}

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return h;
}

function countUnstableTiles(ctx) {
  if (!ctx.furnitureSet.mustBeIndoors) return 0;
  const { gridW, gridH, room } = ctx;
  let count = 0;
  for (let r = 0; r < gridH; r++)
    for (let c = 0; c < gridW; c++)
      if (room[r][c] && tileSupport(room, gridW, gridH, r, c) < STABILITY_THRESHOLD) count++;
  return count;
}

function getStats(ctx) {
  if (ctx.statsDirty || !ctx.currentStats) {
    ctx.currentStats = computeStats(ctx);
    ctx.statsDirty = false;
  }
  return ctx.currentStats;
}

// ── Snapshot helpers ─────────────────────────────────────
function takeSnapshot(ctx) {
  return {
    placements: ctx.placements.map(p => ({ ...p })),
    room: ctx.room.map(row => [...row]),
    doors: new Set(ctx.doors),
    reservedTiles: new Set(ctx.reservedTiles),
  };
}

function restoreSnapshot(ctx, snapshot) {
  ctx.placements = snapshot.placements.map(p => ({ ...p }));
  ctx.room = snapshot.room.map(row => [...row]);
  ctx.doors = new Set(snapshot.doors);
  ctx.reservedTiles = new Set(snapshot.reservedTiles);
  ctx.occupancy = buildOccupancyGrid(ctx);
  rebuildRoomTiles(ctx);
  ctx._doorCandidateCache = undefined;
}

// Light snapshots: save only placements (grids are rebuilt on restore).
// Skips room, doors, reservedTiles, roomTiles, roomTileSet — these are STATIC during SA/strategy loops.
function takeLightSnapshot(ctx) {
  return {
    placements: ctx.placements.map(p => ({ ...p })),
  };
}

function restoreLightSnapshot(ctx, snap) {
  ctx.placements = snap.placements.map(p => ({ ...p }));
  rebuildOccupancyInPlace(ctx);
  rebuildGroupCounts(ctx);
  ctx._doorCandidateCache = undefined;
}

function rebuildRoomTiles(ctx) {
  ctx.roomTiles = [];
  ctx.roomTileSet = new Set();
  for (let r = 0; r < ctx.gridH; r++)
    for (let c = 0; c < ctx.gridW; c++)
      if (ctx.room[r][c]) {
        ctx.roomTiles.push({ r, c });
        ctx.roomTileSet.add(r * ctx.gridW + c);
      }
  rebuildGroupCounts(ctx);
}

function removeRoomTile(ctx, r, c) {
  ctx.room[r][c] = false;
  const key = r * ctx.gridW + c;
  ctx.roomTileSet.delete(key);
  const idx = ctx.roomTiles.findIndex(t => t.r === r && t.c === c);
  if (idx >= 0) ctx.roomTiles.splice(idx, 1);
  ctx.stabilityDirty = true;
  ctx._doorCandidateCache = undefined;
  ctx._walkabilityValid = false;
}

function restoreRoomTile(ctx, r, c) {
  ctx.room[r][c] = true;
  ctx.roomTiles.push({ r, c });
  ctx.roomTileSet.add(r * ctx.gridW + c);
  ctx.stabilityDirty = true;
  ctx._doorCandidateCache = undefined;
  ctx._walkabilityValid = false;
}

function rebuildGroupCounts(ctx) {
  const numGroups = ctx.furnitureSet.groups.length;
  ctx.groupCounts = new Int16Array(numGroups);
  for (const p of ctx.placements)
    if (p.groupIdx >= 0 && p.groupIdx < numGroups) ctx.groupCounts[p.groupIdx]++;
}

/** Check if a placement would put a blocker on a reserved tile. */
function overlapsReserved(ctx, groupIdx, itemIdx, rotation, row, col) {
  if (ctx.reservedTiles.size === 0) return false;
  const tiles = getCachedTiles(ctx, groupIdx, itemIdx, rotation);
  const fs = ctx.furnitureSet;
  for (let r = 0; r < tiles.length; r++)
    for (let c = 0; c < (tiles[r]?.length ?? 0); c++) {
      const tileKey = tiles[r][c];
      if (tileKey === null) continue;
      if (!ctx.reservedTiles.has((row + r) * ctx.gridW + (col + c))) continue;
      const tt = fs.tileTypes[tileKey];
      if (tt && AVAIL_IMPASSABLE.has(tt.availability)) return true;
    }
  return false;
}

// ── Stability check ──────────────────────────────────────
function checkStabilityOpt(ctx) {
  if (!ctx.furnitureSet.mustBeIndoors) return true;
  const { gridW, gridH, room } = ctx;
  for (let r = 0; r < gridH; r++)
    for (let c = 0; c < gridW; c++)
      if (room[r][c] && tileSupport(room, gridW, gridH, r, c) < STABILITY_THRESHOLD) return false;
  return true;
}

// ── Constraint helpers ───────────────────────────────────
function hasStorageTile(ctx) {
  const { furnitureSet: fs, placements } = ctx;
  for (const p of placements) {
    const tiles = getCachedTiles(ctx, p.groupIdx, p.itemIdx, p.rotation);
    for (let r = 0; r < tiles.length; r++)
      for (let c = 0; c < (tiles[r]?.length ?? 0); c++) {
        const tileKey = tiles[r][c];
        if (tileKey === null) continue;
        if (fs.tileTypes[tileKey]?.data === 2) return true;
      }
  }
  return false;
}

function hasAnyDoorCandidate(ctx) {
  if (!ctx.furnitureSet.mustBeIndoors) return true;
  if (ctx._doorCandidateCache !== undefined) return ctx._doorCandidateCache;
  const result = _hasAnyDoorCandidateImpl(ctx);
  ctx._doorCandidateCache = result;
  return result;
}

function _hasAnyDoorCandidateImpl(ctx) {
  const outside = findOutsideTiles(ctx);
  for (let r = 0; r < ctx.gridH; r++)
    for (let c = 0; c < ctx.gridW; c++) {
      if (ctx.room[r][c] || !outside[r][c]) continue;
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < ctx.gridH && nc >= 0 && nc < ctx.gridW && ctx.room[nr][nc]) return true;
      }
    }
  for (let r = 0; r < ctx.gridH; r++)
    for (let c = 0; c < ctx.gridW; c++) {
      if (ctx.room[r][c]) continue;
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < ctx.gridH && nc >= 0 && nc < ctx.gridW && ctx.room[nr][nc]) return true;
      }
    }
  return false;
}

// ── Async yield ──────────────────────────────────────────
function yieldToUI() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (typeof scheduler !== 'undefined' && scheduler.yield) return scheduler.yield();
  return new Promise(resolve => setTimeout(resolve, 0));
}

// ── Performance tracing ─────────────────────────────────
const _perf = (typeof performance !== 'undefined') ? performance : { now: Date.now, mark(){}, measure(){} };
const _traces = [];
let _traceEnabled = false;

function traceStart(label) {
  if (!_traceEnabled) return;
  _perf.mark(label + ':start');
}
function traceEnd(label) {
  if (!_traceEnabled) return;
  _perf.mark(label + ':end');
  try {
    const m = _perf.measure(label, label + ':start', label + ':end');
    _traces.push({ name: label, ms: m.duration });
  } catch { /* ignore if marks missing */ }
}
function traceSummary() {
  if (!_traceEnabled || _traces.length === 0) return null;
  // Aggregate by name
  const agg = new Map();
  for (const t of _traces) {
    const a = agg.get(t.name);
    if (a) { a.calls++; a.totalMs += t.ms; a.maxMs = Math.max(a.maxMs, t.ms); }
    else agg.set(t.name, { calls: 1, totalMs: t.ms, maxMs: t.ms });
  }
  // Sort by total time descending
  const rows = [...agg.entries()]
    .map(([name, a]) => ({ name, ...a, avgMs: a.totalMs / a.calls }))
    .sort((a, b) => b.totalMs - a.totalMs);
  return rows;
}

// ── Primary stat detection ───────────────────────────────
function findPrimaryStatIndex(fs, _building) {
  if (!fs.stats || fs.stats.length === 0) return 0;
  let servicesIdx = -1, employeesIdx = -1, customIdx = -1;
  for (let i = 0; i < fs.stats.length; i++) {
    const s = fs.stats[i];
    if (s.type === "services" && servicesIdx < 0) servicesIdx = i;
    if (s.type === "employees" && employeesIdx < 0) employeesIdx = i;
    if (s.type === "custom" && (s.name === "workers" || s.name === "men") && customIdx < 0) customIdx = i;
  }
  if (servicesIdx >= 0) return servicesIdx;
  if (employeesIdx >= 0) return employeesIdx;
  if (customIdx >= 0) return customIdx;
  return 0;
}

function countItemTiles(item) {
  let count = 0;
  for (const row of item.tiles) for (const t of row) if (t !== null) count++;
  return count;
}

function getValueDensity(ctx, gi, ii) {
  const { furnitureSet: fs, building: bld, primaryStatIdx } = ctx;
  const item = fs.groups[gi]?.items[ii];
  if (!item) return 0;
  const bItem = bld.items?.[gi];
  if (!bItem?.stats) return 0;
  const mult = item.multiplierStats ?? item.multiplier;
  const statContrib = (bItem.stats[primaryStatIdx] ?? 0) * mult;
  let tileCount = 0;
  for (const row of item.tiles) for (const t of row) if (t !== null) tileCount++;
  if (tileCount === 0) return 0;
  if (statContrib === 0 && ctx.effIdx >= 0) {
    const effContrib = (bItem.stats[ctx.effIdx] ?? 0) * mult;
    if (effContrib > 0) return (effContrib * 10) / tileCount;
  }
  if (statContrib === 0 && ctx.relativeIndices.length > 0) {
    let relContrib = 0;
    for (const rel of ctx.relativeIndices) relContrib += (bItem.stats[rel.statIdx] ?? 0) * mult;
    if (relContrib > 0) return (relContrib * 8) / tileCount;
  }
  return statContrib / tileCount;
}

// ── Room pre-cleanup ─────────────────────────────────────
function preCleanRoom(ctx) {
  for (let pass = 0; pass < 20; pass++) {
    let changed = false;
    for (let i = ctx.roomTiles.length - 1; i >= 0; i--) {
      const { r, c } = ctx.roomTiles[i];
      let nonRoom = 0;
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= ctx.gridH || nc < 0 || nc >= ctx.gridW || !ctx.room[nr][nc]) nonRoom++;
      }
      if (nonRoom < 3) continue;
      if (ctx.occupancy[r][c] >= 0) continue;
      removeRoomTile(ctx, r, c);
      if (checkRoomConnectivity(ctx)) { changed = true; }
      else { restoreRoomTile(ctx, r, c); }
    }
    if (!changed) break;
  }
}

// ── Pre-place support pillars ────────────────────────────
async function placeRegularPillars(ctx) {
  if (!ctx.furnitureSet.mustBeIndoors) return;
  for (let pass = 0; pass < 20; pass++) {
    const unstable = countUnstableTiles(ctx);
    if (unstable === 0) break;
    if (pass % 5 === 0) await yieldToUI();
    let worstR = -1, worstC = -1, worstSupport = Infinity;
    for (let r = 0; r < ctx.gridH; r++)
      for (let c = 0; c < ctx.gridW; c++) {
        if (!ctx.room[r][c]) continue;
        const sup = tileSupport(ctx.room, ctx.gridW, ctx.gridH, r, c);
        if (sup < STABILITY_THRESHOLD && sup < worstSupport) { worstSupport = sup; worstR = r; worstC = c; }
      }
    if (worstR < 0) break;
    let bestCandidate = null, bestCuredCount = 0;
    const searchRadius = SUPPORT_RADIUS + 1;
    for (let dr = -searchRadius; dr <= searchRadius; dr++)
      for (let dc = -searchRadius; dc <= searchRadius; dc++) {
        const tr = worstR + dr, tc = worstC + dc;
        if (tr < 0 || tr >= ctx.gridH || tc < 0 || tc >= ctx.gridW) continue;
        if (!ctx.room[tr][tc]) continue;
        ctx.room[tr][tc] = false;
        const newUnstable = countUnstableTiles(ctx);
        const connected = checkRoomConnectivity(ctx);
        ctx.room[tr][tc] = true;
        if (!connected) continue;
        const cured = unstable - newUnstable;
        if (cured > bestCuredCount) { bestCuredCount = cured; bestCandidate = { r: tr, c: tc }; }
      }
    if (!bestCandidate || bestCuredCount <= 0) break;
    removeRoomTile(ctx, bestCandidate.r, bestCandidate.c);
  }
}

// ── Early door placement ─────────────────────────────────

// Collect all valid door candidates, sorted by geometric score (descending)
function collectDoorCandidates(ctx) {
  if (!ctx.furnitureSet.mustBeIndoors) return [];
  if (ctx.doors.size > 0) return []; // user already placed doors
  if (ctx.roomTiles.length > 500) return []; // large rooms — doorPhase handles naturally

  const outside = findOutsideTiles(ctx);
  const { gridW, gridH, room } = ctx;

  let minR = gridH, maxR = 0, minC = gridW, maxC = 0;
  for (let r = 0; r < gridH; r++)
    for (let c = 0; c < gridW; c++)
      if (room[r][c]) {
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      }
  if (minR > maxR) return [];

  const roomW = maxC - minC + 1, roomH = maxR - minR + 1;
  const midR = (minR + maxR) / 2, midC = (minC + maxC) / 2;

  const candidates = [];
  for (let r = 0; r < gridH; r++)
    for (let c = 0; c < gridW; c++) {
      if (room[r][c] || !outside[r][c]) continue;
      let adjRoom = 0;
      const adjWalkable = [];
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < gridH && nc >= 0 && nc < gridW && room[nr][nc]) {
          adjRoom++;
          adjWalkable.push({ r: nr, c: nc });
        }
      }
      if (adjRoom === 0) continue;

      let validDoor = false;
      for (const [dr, dc] of DIRS) {
        const ar = r + dr, ac = c + dc;
        const br = r - dr, bc = c - dc;
        const aIsRoom = ar >= 0 && ar < gridH && ac >= 0 && ac < gridW && room[ar][ac];
        const bIsRoom = br >= 0 && br < gridH && bc >= 0 && bc < gridW && room[br][bc];
        const aIsOpen = isOpenTile(ctx, ar, ac);
        const bIsOpen = isOpenTile(ctx, br, bc);
        if ((aIsRoom && bIsOpen) || (bIsRoom && aIsOpen)) {
          const pr1 = r + dc, pc1 = c + dr;
          const pr2 = r - dc, pc2 = c - dr;
          const perp1Room = pr1 >= 0 && pr1 < gridH && pc1 >= 0 && pc1 < gridW && room[pr1][pc1];
          const perp2Room = pr2 >= 0 && pr2 < gridH && pc2 >= 0 && pc2 < gridW && room[pr2][pc2];
          if (!perp1Room && !perp2Room) { validDoor = true; break; }
        }
      }
      if (!validDoor) continue;

      // Score: prefer middle of longer edge
      let edgeScore = 0;
      if (roomW >= roomH) {
        if (r <= minR || r >= maxR) edgeScore += 2;
        edgeScore += 1 - Math.abs(c - midC) / Math.max(1, roomW / 2);
      } else {
        if (c <= minC || c >= maxC) edgeScore += 2;
        edgeScore += 1 - Math.abs(r - midR) / Math.max(1, roomH / 2);
      }

      // Sort adjWalkable: closest to room center first
      adjWalkable.sort((a, b) =>
        (Math.abs(a.r - midR) + Math.abs(a.c - midC)) - (Math.abs(b.r - midR) + Math.abs(b.c - midC))
      );

      candidates.push({ r, c, score: edgeScore, adjWalkable });
    }

  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

// Apply a door candidate: set door (no reservation — doorPhase's relaxed fallback
// ensures doors are always found even when all perimeter tiles get blocked)
function applyDoorCandidate(ctx, cand) {
  ctx.doors.add(`${cand.r},${cand.c}`);
}

// Select spatially diverse candidates (at least minDist manhattan distance apart)
function selectDiverseCandidates(candidates, maxCount, minDist) {
  const selected = [];
  for (const c of candidates) {
    if (selected.length >= maxCount) break;
    let tooClose = false;
    for (const s of selected) {
      if (Math.abs(c.r - s.r) + Math.abs(c.c - s.c) < minDist) {
        tooClose = true; break;
      }
    }
    if (!tooClose) selected.push(c);
  }
  return selected;
}

// ── Create support pillars (post-placement) ──────────────
async function createSupportPillars(ctx) {
  for (let pass = 0; pass < 10; pass++) {
    const unstable = countUnstableTiles(ctx);
    if (unstable === 0) break;
    await yieldToUI();
    let worstR = -1, worstC = -1, worstSupport = Infinity;
    for (let r = 0; r < ctx.gridH; r++)
      for (let c = 0; c < ctx.gridW; c++) {
        if (!ctx.room[r][c]) continue;
        const sup = tileSupport(ctx.room, ctx.gridW, ctx.gridH, r, c);
        if (sup < STABILITY_THRESHOLD && sup < worstSupport) { worstSupport = sup; worstR = r; worstC = c; }
      }
    if (worstR < 0) break;
    let bestCandidate = null, bestCuredCount = 0;
    const searchRadius = SUPPORT_RADIUS + 1;
    for (let dr = -searchRadius; dr <= searchRadius; dr++)
      for (let dc = -searchRadius; dc <= searchRadius; dc++) {
        const tr = worstR + dr, tc = worstC + dc;
        if (tr < 0 || tr >= ctx.gridH || tc < 0 || tc >= ctx.gridW) continue;
        if (!ctx.room[tr][tc] || ctx.occupancy[tr][tc] >= 0) continue;
        ctx.room[tr][tc] = false;
        const newUnstable = countUnstableTiles(ctx);
        const connected = checkRoomConnectivity(ctx);
        const walkable = connected && checkWalkability(ctx);
        ctx.room[tr][tc] = true;
        if (!connected || !walkable) continue;
        const cured = unstable - newUnstable;
        if (cured > bestCuredCount) { bestCuredCount = cured; bestCandidate = { r: tr, c: tc }; }
      }
    if (!bestCandidate || bestCuredCount <= 0) break;
    removeRoomTile(ctx, bestCandidate.r, bestCandidate.c);
  }
}

// ── Outside tiles / door helpers ─────────────────────────
function findOutsideTiles(ctx) {
  const { gridW, gridH, room } = ctx;
  const outside = Array.from({ length: gridH }, () => Array(gridW).fill(false));
  const q = ctx.bfsQueue;
  q.reset();
  for (let r = 0; r < gridH; r++)
    for (let c = 0; c < gridW; c++) {
      if (room[r][c]) continue;
      if (r === 0 || r === gridH - 1 || c === 0 || c === gridW - 1) {
        outside[r][c] = true;
        q.push(r, c);
      }
    }
  if (q.length === 0) {
    for (let r = 0; r < gridH; r++)
      for (let c = 0; c < gridW; c++) {
        if (room[r][c] || outside[r][c]) continue;
        for (const [dr, dc] of DIRS) {
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW) {
            outside[r][c] = true; q.push(r, c); break;
          }
        }
      }
  }
  while (q.length > 0) {
    const [cr, cc] = q.shift();
    for (const [dr, dc] of DIRS) {
      const nr = cr + dr, nc = cc + dc;
      if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW) continue;
      if (outside[nr][nc] || room[nr][nc]) continue;
      outside[nr][nc] = true;
      q.push(nr, nc);
    }
  }
  return outside;
}

function isOpenTile(ctx, r, c) {
  if (r < 0 || r >= ctx.gridH || c < 0 || c >= ctx.gridW) return true;
  if (ctx.room[r][c]) return false;
  for (const [dr, dc] of DIRS) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < ctx.gridH && nc >= 0 && nc < ctx.gridW && ctx.room[nr][nc]) return false;
  }
  return true;
}

// ══════════════════════════════════════════════════════════
// Phase 0: Analysis & tile profile computation
// ══════════════════════════════════════════════════════════

/**
 * Compute tile profile for an item at a given rotation.
 * @returns {{ totalTiles: number, blockerTiles: number, mrTiles: number, hasStorage: boolean, mrEdges: number[], width: number, height: number }}
 */
function computeTileProfile(ctx, groupIdx, itemIdx, rotation) {
  const tiles = getCachedTiles(ctx, groupIdx, itemIdx, rotation);
  const fs = ctx.furnitureSet;
  const height = tiles.length;
  let width = 0;
  for (const row of tiles) width = Math.max(width, row?.length ?? 0);

  let totalTiles = 0, blockerTiles = 0, mrTiles = 0, hasStorage = false;
  // Track which perimeter edges have MR tiles
  // Edge 0=top, 1=right, 2=bottom, 3=left
  const mrEdges = [];
  const mrPositions = [];

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const tileKey = tiles[r]?.[c];
      if (tileKey === null || tileKey === undefined) continue;
      totalTiles++;
      const tt = fs.tileTypes[tileKey];
      if (!tt) continue;
      if (AVAIL_IMPASSABLE.has(tt.availability)) blockerTiles++;
      if (tt.mustBeReachable) {
        mrTiles++;
        mrPositions.push({ r, c });
      }
      if (tt.data === 2) hasStorage = true;
    }
  }

  // Determine which edges have MR tiles on the perimeter
  for (const { r, c } of mrPositions) {
    if (r === 0 && !mrEdges.includes(0)) mrEdges.push(0);
    if (c === width - 1 && !mrEdges.includes(1)) mrEdges.push(1);
    if (r === height - 1 && !mrEdges.includes(2)) mrEdges.push(2);
    if (c === 0 && !mrEdges.includes(3)) mrEdges.push(3);
  }

  return { totalTiles, blockerTiles, mrTiles, hasStorage, mrEdges, width, height };
}

/**
 * Check if an item is "self-corridored" — has null gaps that provide inherent walkability.
 */
function isSelfCorridored(ctx, groupIdx, itemIdx, rotation) {
  const tiles = getCachedTiles(ctx, groupIdx, itemIdx, rotation);
  const height = tiles.length;
  let width = 0;
  for (const row of tiles) width = Math.max(width, row?.length ?? 0);
  if (height <= 1) return false;

  // Check if any row has null tiles within the bounding box
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const tileKey = tiles[r]?.[c];
      if (tileKey === null || tileKey === undefined) return true;
    }
  }
  return false;
}

function analyzePhase(ctx) {
  const { furnitureSet: fs, building: bld } = ctx;

  ctx.empIdx = -1;
  ctx.effIdx = -1;
  if (fs.stats) {
    for (let i = 0; i < fs.stats.length; i++) {
      const s = fs.stats[i];
      if (s.type === "employees") ctx.empIdx = i;
      else if (s.type === "custom" && (s.name === "workers" || s.name === "men") && ctx.empIdx < 0) ctx.empIdx = i;
      if (s.type === "efficiency") ctx.effIdx = i;
    }
  }

  rebuildRoomTiles(ctx);

  // Pre-compute all rotated tile arrays
  for (let gi = 0; gi < fs.groups.length; gi++) {
    const group = fs.groups[gi];
    const rots = getAllowedRotations(group);
    for (let ii = 0; ii < group.items.length; ii++)
      for (const rot of rots) getCachedTiles(ctx, gi, ii, rot);
  }

  // Classify groups
  ctx.groupInfo = [];
  for (let gi = 0; gi < fs.groups.length; gi++) {
    const group = fs.groups[gi];
    const bItem = bld.items?.[gi];
    let hasPrimary = false, hasEfficiency = false, hasRelative = false, isDecorative = true;
    if (bItem?.stats) {
      for (let s = 0; s < bItem.stats.length && s < (fs.stats?.length ?? 0); s++) {
        if (bItem.stats[s] !== 0) {
          isDecorative = false;
          if (s === ctx.primaryStatIdx) hasPrimary = true;
          if (s === ctx.effIdx) hasEfficiency = true;
          if (ctx.relativeIndices.some(rel => rel.statIdx === s)) hasRelative = true;
        }
      }
    }
    if (hasRelative) isDecorative = false;

    let hasBlockers = false, isStorage = false;
    for (const item of group.items)
      for (const row of item.tiles)
        for (const tileKey of row) {
          if (tileKey === null) continue;
          const tt = fs.tileTypes[tileKey];
          if (tt && AVAIL_IMPASSABLE.has(tt.availability)) hasBlockers = true;
          if (tt?.data === 2) isStorage = true;
        }

    let priority = 3;
    if (group.min > 0) priority = 0;
    else if (hasPrimary) priority = 1;
    else if (hasEfficiency || hasRelative) priority = 2;

    // Hero items
    const densities = group.items.map((_, ii) => ({
      ii, density: getValueDensity(ctx, gi, ii), tileCount: countItemTiles(group.items[ii]),
    }));
    const maxDensity = Math.max(...densities.map(d => d.density), 0);
    const heroThreshold = maxDensity * 0.85;
    const heroItems = densities.filter(d => d.density >= heroThreshold && d.density > 0)
      .sort((a, b) => b.density - a.density || a.tileCount - b.tileCount);
    const fillerItems = densities.filter(d => d.density < heroThreshold || d.density === 0)
      .sort((a, b) => a.tileCount - b.tileCount);
    const bestHeroIdx = heroItems.length > 0 ? heroItems[0].ii : -1;

    ctx.groupInfo.push({
      groupIdx: gi, isDecorative, hasPrimary, hasEfficiency, hasRelative,
      hasBlockers, isStorage, priority,
      heroItems: heroItems.map(h => h.ii), bestHeroIdx,
      fillerItems: fillerItems.map(f => f.ii),
    });
  }

  // Build groupIdx → gInfo lookup map for O(1) access
  ctx.groupInfoMap = new Map();
  for (const gi of ctx.groupInfo) ctx.groupInfoMap.set(gi.groupIdx, gi);
}

// ══════════════════════════════════════════════════════════
// Phase 1: Strip Pattern Discovery
// ══════════════════════════════════════════════════════════

/**
 * @typedef {Object} StripCandidate
 * @property {number} groupIdx
 * @property {number} itemIdx
 * @property {number} rotation
 * @property {boolean} backToBack - can mirror-pair items back-to-back?
 * @property {number} pitch - total rows per repeating unit (incl corridor)
 * @property {number} statPerTile - primary stat density
 * @property {boolean} selfCorridored
 * @property {number[]} corridorEdges - which edges need corridors (0=top, 2=bottom)
 * @property {number} width - item width
 * @property {number} height - item height
 * @property {number} wallSavings - rows saved when against a wall
 */

function discoverStripCandidates(ctx) {
  const { furnitureSet: fs, building: bld, primaryStatIdx } = ctx;
  const candidates = [];

  for (const gInfo of ctx.groupInfo) {
    if (!gInfo.hasPrimary && gInfo.priority > 1) continue;
    const gi = gInfo.groupIdx;
    const group = fs.groups[gi];
    const rots = getAllowedRotations(group);
    const bItem = bld.items?.[gi];

    for (let ii = 0; ii < group.items.length; ii++) {
      const item = group.items[ii];
      const mult = item.multiplierStats ?? item.multiplier;
      const statContrib = bItem?.stats ? (bItem.stats[primaryStatIdx] ?? 0) * mult : 0;
      if (statContrib <= 0 && gInfo.hasPrimary) continue;

      for (const rot of rots) {
        const profile = computeTileProfile(ctx, gi, ii, rot);
        if (profile.totalTiles === 0) continue;

        const selfCorr = isSelfCorridored(ctx, gi, ii, rot);

        // Determine corridor needs based on MR edges
        let corridorEdges = [];
        if (profile.mrTiles > 0) {
          corridorEdges = [...profile.mrEdges];
        }

        // Calculate pitch (strip height including corridors)
        let pitch, backToBack = false, wallSavings = 0;

        if (selfCorr) {
          // Self-corridored: no extra corridor rows needed
          pitch = profile.height;
          wallSavings = 0;
        } else if (corridorEdges.length === 0) {
          // No MR tiles — pure blockers, stack directly
          pitch = profile.height;
          wallSavings = 0;
        } else if (corridorEdges.length === 1) {
          // Single-sided MR: can pack back-to-back with mirrored copy
          // [corridor] [MR] [blockers] [blockers_mirrored] [MR_mirrored] [corridor]
          // Pitch for a pair = 2 * height + 1 corridor (shared between pairs)
          // Single strip pitch = height + 1 corridor
          backToBack = true;
          pitch = profile.height + 1; // one corridor row per item
          wallSavings = 1; // wall replaces the non-MR side corridor
        } else {
          // Double-sided MR: need corridors on both sides
          pitch = profile.height + 1; // one shared corridor between strips
          wallSavings = 0; // both sides need access
        }

        const statPerTile = statContrib / (pitch * profile.width);

        candidates.push({
          groupIdx: gi, itemIdx: ii, rotation: rot,
          backToBack, pitch, statPerTile, selfCorridored: selfCorr,
          corridorEdges, width: profile.width, height: profile.height,
          wallSavings, statContrib,
        });
      }
    }
  }

  // Sort by stat density (best first)
  candidates.sort((a, b) => b.statPerTile - a.statPerTile);
  return candidates;
}

// ══════════════════════════════════════════════════════════
// Phase 2: Room Filling with Strips
// ══════════════════════════════════════════════════════════

/**
 * Find the largest axis-aligned rectangle of room tiles.
 * Uses the standard maximal rectangle in histogram approach.
 * @returns {{ minR: number, minC: number, maxR: number, maxC: number, area: number }}
 */
function findLargestRect(ctx) {
  const { gridW, gridH, room } = ctx;
  // Heights histogram: height[c] = consecutive room tiles above (including current row)
  const height = new Int32Array(gridW);
  let bestArea = 0, bestMinR = 0, bestMinC = 0, bestMaxR = 0, bestMaxC = 0;

  for (let r = 0; r < gridH; r++) {
    for (let c = 0; c < gridW; c++) {
      height[c] = room[r][c] ? height[c] + 1 : 0;
    }

    // Largest rectangle in histogram (stack-based)
    const stack = []; // indices into height array
    for (let c = 0; c <= gridW; c++) {
      const h = c < gridW ? height[c] : 0;
      while (stack.length > 0 && height[stack[stack.length - 1]] > h) {
        const top = stack.pop();
        const w = stack.length === 0 ? c : c - stack[stack.length - 1] - 1;
        const area = height[top] * w;
        if (area > bestArea) {
          bestArea = area;
          bestMaxR = r;
          bestMinR = r - height[top] + 1;
          bestMinC = stack.length === 0 ? 0 : stack[stack.length - 1] + 1;
          bestMaxC = c - 1;
        }
      }
      stack.push(c);
    }
  }

  return { minR: bestMinR, minC: bestMinC, maxR: bestMaxR, maxC: bestMaxC, area: bestArea };
}

/**
 * Place one item at the given position. Returns true if placed successfully.
 */
function placeItem(ctx, groupIdx, itemIdx, rotation, row, col) {
  if (!canPlaceFast(ctx,groupIdx, itemIdx, rotation, row, col, undefined)) return false;
  const pi = ctx.placements.length;
  ctx.placements.push({ groupIdx, itemIdx, rotation, row, col });
  setOccupancy(ctx, pi);

  if (!hasAnyDoorCandidate(ctx) || !checkWalkability(ctx)) {
    clearOccupancy(ctx, pi);
    ctx.placements.pop();
    return false;
  }
  if (ctx.groupCounts) ctx.groupCounts[groupIdx]++;
  return true;
}

/**
 * Try to find the largest item variant from the same group+rotation that fits
 * along a strip line at position (row, col).
 * Returns the placed item index or -1.
 */
function _placeBestFittingItem(ctx, strip, row, col) {
  const group = ctx.furnitureSet.groups[strip.groupIdx];
  const maxP = group.max ?? 100;
  if (countGroupPlacements(ctx, strip.groupIdx) >= maxP) return -1;

  // Try items from largest to smallest (items are typically ordered by multiplier/size)
  const items = group.items;
  const rots = [strip.rotation];

  // Collect items with same rotation and sort by multiplier descending
  const candidates = [];
  for (let ii = 0; ii < items.length; ii++) {
    const tiles = getCachedTiles(ctx, strip.groupIdx, ii, strip.rotation);
    // Must have compatible height with the strip
    if (tiles.length !== strip.height) continue;
    candidates.push({ ii, mult: items[ii].multiplierStats ?? items[ii].multiplier });
  }
  candidates.sort((a, b) => b.mult - a.mult);

  for (const { ii } of candidates) {
    for (const rot of rots) {
      if (placeItem(ctx, strip.groupIdx, ii, rot, row, col)) return ii;
    }
  }
  return -1;
}

/**
 * Get the mirror rotation for back-to-back placement.
 * Rotation 0→2 (flip vertical), 1→3 (flip horizontal).
 */
function getMirrorRotation(rot) {
  return (rot + 2) % 4;
}

/**
 * Fill the room with strips of the given candidate.
 * Tries placing items along rows/cols with proper spacing for corridors.
 * @param {object} ctx
 * @param {StripCandidate} strip
 * @param {boolean} horizontal - true = strips run horizontally, false = vertical
 * @param {object} rect - bounding rectangle {minR, minC, maxR, maxC}
 */
function fillWithStrips(ctx, strip, horizontal, rect) {
  const { minR, minC, maxR, maxC } = rect;
  const group = ctx.furnitureSet.groups[strip.groupIdx];
  const rots = getAllowedRotations(group);

  // Collect items sorted by multiplier descending for each compatible rotation
  function getItemsByHeight(targetHeight, rot) {
    const items = [];
    for (let ii = group.items.length - 1; ii >= 0; ii--) {
      const tiles = getCachedTiles(ctx, strip.groupIdx, ii, rot);
      if (tiles.length === targetHeight) items.push(ii);
    }
    return items;
  }

  function fillStripLine(rot, row, col, horizontal2) {
    const items = getItemsByHeight(strip.height, rot);
    if (horizontal2) {
      let c = col;
      while (c <= maxC) {
        const maxP = group.max ?? 100;
        if (countGroupPlacements(ctx, strip.groupIdx) >= maxP) return;
        let placed = false;
        for (const ii of items) {
          const tiles = getCachedTiles(ctx, strip.groupIdx, ii, rot);
          const w = tiles[0]?.length ?? 0;
          if (c + w - 1 > maxC) continue;
          if (placeItem(ctx, strip.groupIdx, ii, rot, row, c)) { c += w; placed = true; break; }
        }
        if (!placed) c++;
      }
    } else {
      let r = row;
      while (r <= maxR) {
        const maxP = group.max ?? 100;
        if (countGroupPlacements(ctx, strip.groupIdx) >= maxP) return;
        let placed = false;
        for (const ii of items) {
          const tiles = getCachedTiles(ctx, strip.groupIdx, ii, rot);
          const h = tiles.length;
          if (r + h - 1 > maxR) continue;
          if (placeItem(ctx, strip.groupIdx, ii, rot, r, col)) { r += h; placed = true; break; }
        }
        if (!placed) r++;
      }
    }
  }

  if (horizontal) {
    let currentRow = minR;
    while (currentRow + strip.height - 1 <= maxR) {
      fillStripLine(strip.rotation, currentRow, minC, true);

      // Back-to-back: place mirrored strip
      if (strip.backToBack) {
        const mirrorRot = getMirrorRotation(strip.rotation);
        if (rots.includes(mirrorRot)) {
          const mirrorRow = currentRow + strip.height;
          if (mirrorRow + strip.height - 1 <= maxR) {
            fillStripLine(mirrorRot, mirrorRow, minC, true);
            currentRow += strip.height * 2 + 1;
            continue;
          }
        }
      }
      currentRow += strip.pitch;
    }
  } else {
    let currentCol = minC;
    while (currentCol + strip.width - 1 <= maxC) {
      fillStripLine(strip.rotation, minR, currentCol, false);

      if (strip.backToBack) {
        const mirrorRot = getMirrorRotation(strip.rotation);
        if (rots.includes(mirrorRot)) {
          const mirrorCol = currentCol + strip.width;
          if (mirrorCol + strip.width - 1 <= maxC) {
            fillStripLine(mirrorRot, minR, mirrorCol, false);
            currentCol += strip.width * 2 + 1;
            continue;
          }
        }
      }
      currentCol += strip.selfCorridored ? strip.width : strip.width + 1;
    }
  }
}

/**
 * Main strip-based filling for primary stat groups.
 */
async function stripFillPhase(ctx) {
  const candidates = discoverStripCandidates(ctx);
  if (candidates.length === 0) return;

  const rect = findLargestRect(ctx);
  if (rect.area === 0) return;

  const _rectW = rect.maxC - rect.minC + 1;
  const _rectH = rect.maxR - rect.minR + 1;

  // Try the best strip candidates in both orientations, keep the best result
  let bestSnapshot = null;
  let bestPrimaryVal = -Infinity;
  const initialSnap = takeLightSnapshot(ctx);

  // Try top N strip candidates in both orientations
  const topCandidates = candidates.slice(0, Math.min(8, candidates.length));

  for (const strip of topCandidates) {
    // Try horizontal fill
    restoreLightSnapshot(ctx, initialSnap);
    fillWithStrips(ctx, strip, true, rect);
    let stats = getStats(ctx);
    let primaryVal = stats[ctx.primaryStatIdx] ?? 0;
    if (primaryVal > bestPrimaryVal) {
      bestPrimaryVal = primaryVal;
      bestSnapshot = takeLightSnapshot(ctx);
    }

    // Try vertical fill with same strip
    restoreLightSnapshot(ctx, initialSnap);
    fillWithStrips(ctx, strip, false, rect);
    stats = getStats(ctx);
    primaryVal = stats[ctx.primaryStatIdx] ?? 0;
    if (primaryVal > bestPrimaryVal) {
      bestPrimaryVal = primaryVal;
      bestSnapshot = takeLightSnapshot(ctx);
    }

    // Try rotated strip in both orientations
    const group = ctx.furnitureSet.groups[strip.groupIdx];
    const rots = getAllowedRotations(group);
    for (const altRot of rots) {
      if (altRot === strip.rotation) continue;
      const vProfile = computeTileProfile(ctx, strip.groupIdx, strip.itemIdx, altRot);
      const altStrip = {
        ...strip, rotation: altRot,
        width: vProfile.width, height: vProfile.height,
        corridorEdges: vProfile.mrEdges,
      };

      for (const horiz of [true, false]) {
        restoreLightSnapshot(ctx, initialSnap);
        fillWithStrips(ctx, altStrip, horiz, rect);
        stats = getStats(ctx);
        primaryVal = stats[ctx.primaryStatIdx] ?? 0;
        if (primaryVal > bestPrimaryVal) {
          bestPrimaryVal = primaryVal;
          bestSnapshot = takeLightSnapshot(ctx);
        }
      }
    }

    await yieldToUI();
  }

  // Restore best strip fill result
  if (bestSnapshot) {
    restoreLightSnapshot(ctx, bestSnapshot);
  }
}

// ══════════════════════════════════════════════════════════
// Phase 3: Stat Balancing (efficiency, relative, storage)
// ══════════════════════════════════════════════════════════

function placeEfficiencyItems(ctx) {
  const { furnitureSet: fs } = ctx;
  const stats = getStats(ctx);
  if (ctx.effIdx < 0 || ctx.empIdx < 0) return;
  if (stats[ctx.effIdx] >= stats[ctx.empIdx]) return;

  for (const gInfo of ctx.groupInfo) {
    if (!gInfo.hasEfficiency) continue;
    const gi = gInfo.groupIdx;
    const group = fs.groups[gi];
    const maxP = group.max ?? 100;
    let placed = countGroupPlacements(ctx, gi);
    const rots = getAllowedRotations(group);

    const rankedItems = group.items.map((_, ii) => ({
      ii, density: getValueDensity(ctx, gi, ii),
    })).sort((a, b) => b.density - a.density);

    for (const { ii } of rankedItems) {
      if (placed >= maxP) break;
      for (const rot of rots) {
        if (placed >= maxP) break;
        let bestPos = null, bestScore = -Infinity;
        for (const { r, c } of ctx.roomTiles) {
          if (!ctx.freeBitmap[r * ctx.gridW + c]) continue;
          if (!canPlaceFast(ctx,gi, ii, rot, r, c, undefined)) continue;
          const posScore = scorePlacementPosition(ctx, gi, ii, rot, r, c);
          if (posScore > bestScore) { bestScore = posScore; bestPos = { rot, row: r, col: c }; }
        }
        if (bestPos) {
          if (placeItem(ctx, gi, ii, bestPos.rot, bestPos.row, bestPos.col)) {
            placed++;
            const st = getStats(ctx);
            if (st[ctx.effIdx] >= st[ctx.empIdx]) return;
          }
        }
      }
      const st = getStats(ctx);
      if (st[ctx.effIdx] >= st[ctx.empIdx]) return;
    }
  }
}

function placeRelativeItems(ctx) {
  const { furnitureSet: fs } = ctx;
  if (ctx.relativeIndices.length === 0) return;
  const stats = getStats(ctx);
  const primaryVal = stats[ctx.primaryStatIdx] ?? 0;
  let allMet = true;
  for (const rel of ctx.relativeIndices)
    if ((stats[rel.statIdx] ?? 0) < primaryVal) { allMet = false; break; }
  if (allMet) return;

  for (const gInfo of ctx.groupInfo) {
    if (!gInfo.hasRelative || gInfo.hasPrimary) continue;
    const gi = gInfo.groupIdx;
    const group = fs.groups[gi];
    const maxP = group.max ?? 100;
    let placed = countGroupPlacements(ctx, gi);
    const rots = getAllowedRotations(group);

    const rankedItems = group.items.map((_, ii) => ({
      ii, density: getValueDensity(ctx, gi, ii),
    })).sort((a, b) => b.density - a.density);

    for (const { ii } of rankedItems) {
      if (placed >= maxP) break;
      for (const rot of rots) {
        if (placed >= maxP) break;
        let bestPos = null, bestScore = -Infinity;
        for (const { r, c } of ctx.roomTiles) {
          if (!ctx.freeBitmap[r * ctx.gridW + c]) continue;
          if (!canPlaceFast(ctx,gi, ii, rot, r, c, undefined)) continue;
          const posScore = scorePlacementPosition(ctx, gi, ii, rot, r, c);
          if (posScore > bestScore) { bestScore = posScore; bestPos = { rot, row: r, col: c }; }
        }
        if (bestPos) {
          if (placeItem(ctx, gi, ii, bestPos.rot, bestPos.row, bestPos.col)) {
            placed++;
            const st = getStats(ctx);
            const pv = st[ctx.primaryStatIdx] ?? 0;
            let done = true;
            for (const rel of ctx.relativeIndices)
              if ((st[rel.statIdx] ?? 0) < pv) { done = false; break; }
            if (done) return;
          }
        }
      }
    }
  }
}

/** Place relative items using smallest items first (minimizes tile usage for relative coverage). */
function placeRelativeItemsSmallFirst(ctx) {
  const { furnitureSet: fs } = ctx;
  if (ctx.relativeIndices.length === 0) return;
  const stats = getStats(ctx);
  const primaryVal = stats[ctx.primaryStatIdx] ?? 0;
  let allMet = true;
  for (const rel of ctx.relativeIndices)
    if ((stats[rel.statIdx] ?? 0) < primaryVal) { allMet = false; break; }
  if (allMet) return;

  for (const gInfo of ctx.groupInfo) {
    if (!gInfo.hasRelative || gInfo.hasPrimary) continue;
    const gi = gInfo.groupIdx;
    const group = fs.groups[gi];
    const maxP = group.max ?? 100;
    let placed = countGroupPlacements(ctx, gi);
    const rots = getAllowedRotations(group);

    // Sort by tile count ascending (smallest items first)
    const rankedItems = group.items.map((_, ii) => ({
      ii, tileCount: countItemTiles(group.items[ii]),
    })).filter(d => d.tileCount > 0).sort((a, b) => a.tileCount - b.tileCount);

    for (const { ii } of rankedItems) {
      if (placed >= maxP) break;
      for (const rot of rots) {
        if (placed >= maxP) break;
        let keepGoing = true;
        while (keepGoing && placed < maxP) {
          keepGoing = false;
          let bestPos = null, bestScore = -Infinity;
          for (const { r, c } of ctx.roomTiles) {
            if (!ctx.freeBitmap[r * ctx.gridW + c]) continue;
            if (!canPlaceFast(ctx,gi, ii, rot, r, c, undefined)) continue;
            const posScore = scorePlacementPosition(ctx, gi, ii, rot, r, c);
            if (posScore > bestScore) { bestScore = posScore; bestPos = { rot, row: r, col: c }; }
          }
          if (bestPos) {
            if (placeItem(ctx, gi, ii, bestPos.rot, bestPos.row, bestPos.col)) {
              placed++;
              keepGoing = true;
              const st = getStats(ctx);
              const pv = st[ctx.primaryStatIdx] ?? 0;
              let done = true;
              for (const rel of ctx.relativeIndices)
                if ((st[rel.statIdx] ?? 0) < pv) { done = false; break; }
              if (done) return;
            }
          }
        }
      }
    }
  }
}

/** Place mandatory group items (min > 0) and storage. */
function placeMandatoryItems(ctx) {
  const { furnitureSet: fs } = ctx;
  for (const gInfo of ctx.groupInfo) {
    const gi = gInfo.groupIdx;
    const group = fs.groups[gi];
    if (group.min <= 0 && !gInfo.isStorage) continue;
    // Skip if already placed
    if (countGroupPlacements(ctx, gi) >= (group.min || 1)) continue;

    const rots = getAllowedRotations(group);
    // Use smallest item for mandatory placements
    const items = [...group.items.keys()].sort((a, b) => countItemTiles(group.items[a]) - countItemTiles(group.items[b]));

    for (const ii of items) {
      if (countGroupPlacements(ctx, gi) >= (group.min || 1)) break;
      for (const rot of rots) {
        if (countGroupPlacements(ctx, gi) >= (group.min || 1)) break;
        let bestPos = null, bestScore = -Infinity;
        for (const { r, c } of ctx.roomTiles) {
          if (!ctx.freeBitmap[r * ctx.gridW + c]) continue;
          if (!canPlaceFast(ctx,gi, ii, rot, r, c, undefined)) continue;
          const posScore = scorePlacementPosition(ctx, gi, ii, rot, r, c);
          if (posScore > bestScore) { bestScore = posScore; bestPos = { rot, row: r, col: c }; }
        }
        if (bestPos) placeItem(ctx, gi, ii, bestPos.rot, bestPos.row, bestPos.col);
      }
    }
  }
}

function scorePlacementPosition(ctx, gi, ii, rot, r, c) {
  let posScore = getValueDensity(ctx, gi, ii);
  const tiles = getCachedTiles(ctx, gi, ii, rot);
  const fs = ctx.furnitureSet;
  let wallAdj = 0, cornerAdj = 0, furnitureAdj = 0, facingBonus = 0;
  for (let tr = 0; tr < tiles.length; tr++)
    for (let tc = 0; tc < (tiles[tr]?.length ?? 0); tc++) {
      if (tiles[tr][tc] === null) continue;
      const gr = r + tr, gc = c + tc;
      let tileWallCount = 0;
      for (const [dr, dc] of DIRS) {
        const nr = gr + dr, nc = gc + dc;
        if (nr < 0 || nr >= ctx.gridH || nc < 0 || nc >= ctx.gridW || !ctx.room[nr][nc]) {
          wallAdj++;
          tileWallCount++;
        } else if (ctx.occupancy[nr][nc] >= 0) furnitureAdj++;
      }
      if (tileWallCount >= 2) cornerAdj++;

      // Neatness: blocker against wall is good, MR facing existing MR across 1-tile gap is good
      const tileKey = tiles[tr][tc];
      const tt = fs.tileTypes[tileKey];
      const isBlocking = tt && AVAIL_IMPASSABLE.has(tt.availability);
      const isMR = tt?.mustBeReachable;
      if (isBlocking && !isMR && tileWallCount > 0) facingBonus += tileWallCount;
      if (isMR && tileWallCount > 0) facingBonus -= 0.5 * tileWallCount;
      if (isMR) {
        for (const [dr, dc] of DIRS) {
          const nr2 = gr + dr * 2, nc2 = gc + dc * 2;
          if (nr2 >= 0 && nr2 < ctx.gridH && nc2 >= 0 && nc2 < ctx.gridW
              && ctx.mustReachGrid[nr2 * ctx.gridW + nc2] === 1) {
            const nr1 = gr + dr, nc1 = gc + dc;
            if (nr1 >= 0 && nr1 < ctx.gridH && nc1 >= 0 && nc1 < ctx.gridW
                && ctx.room[nr1][nc1] && ctx.blockerCount[nr1][nc1] === 0
                && ctx.occupancy[nr1][nc1] < 0) {
              facingBonus += 2.5;
            }
          }
        }
      }
    }
  return posScore + wallAdj * 3.0 + furnitureAdj + cornerAdj * 1.5 + facingBonus;
}

// ══════════════════════════════════════════════════════════
// Phase 4: Local Search Polish (hill-climbing)
// ══════════════════════════════════════════════════════════

function scoreLayout(ctx) {
  const stats = getStats(ctx);
  const primary = stats[ctx.primaryStatIdx] ?? 0;

  let effBonus = 0, effPenalty = 0;
  if (ctx.empIdx >= 0 && ctx.effIdx >= 0) {
    const emp = stats[ctx.empIdx] ?? 0;
    const eff = stats[ctx.effIdx] ?? 0;
    effBonus = Math.min(eff, emp) * 10000;
    if (eff < emp) { const d = emp - eff; effPenalty = d * d * 1000; }
  }

  let relBonus = 0, relPenalty = 0;
  for (const rel of ctx.relativeIndices) {
    const pv = stats[ctx.primaryStatIdx] ?? 0;
    const rv = stats[rel.statIdx] ?? 0;
    relBonus += Math.min(rv, pv) * 500;
    if (rv < pv) { const d = pv - rv; relPenalty += d * d * 200; }
  }

  const roomTileCount = ctx.roomTiles.length;
  const occupied = ctx.occupiedCount;
  const packingBonus = (occupied / Math.max(1, roomTileCount)) * 200;

  return primary * 1000 + effBonus + relBonus + packingBonus - effPenalty - relPenalty;
}

async function localSearchPhase(ctx) {
  const { furnitureSet: fs } = ctx;
  rebuildGroupCounts(ctx);

  traceStart('ls:A-upgrade');
  // Sub-pass A: Upgrade — try replacing each item with a larger variant (+ shift offsets)
  const SHIFT_OFFSETS = [[0,0],[0,1],[0,-1],[1,0],[-1,0]];
  for (let pi = ctx.lockedCount; pi < ctx.placements.length; pi++) {
    const p = ctx.placements[pi];
    const group = fs.groups[p.groupIdx];
    if (group.items.length <= 1) continue;
    const gInfo = ctx.groupInfo[p.groupIdx];
    const preStats = gInfo?.isStorage ? getStats(ctx) : null;
    const currentScore = scoreLayout(ctx);
    const origRow = p.row, origCol = p.col;
    let upgraded = false;

    for (let newII = p.itemIdx + 1; newII < group.items.length && !upgraded; newII++) {
      for (const [sr, sc] of SHIFT_OFFSETS) {
        clearOccupancy(ctx, pi);
        const oldII = p.itemIdx;
        p.itemIdx = newII;
        p.row = origRow + sr;
        p.col = origCol + sc;

        const tiles = getCachedTiles(ctx, p.groupIdx, newII, p.rotation);
        let fits = true;
        for (let r = 0; r < tiles.length && fits; r++)
          for (let c = 0; c < (tiles[r]?.length ?? 0) && fits; c++) {
            if (tiles[r][c] === null) continue;
            const gr = p.row + r, gc = p.col + c;
            if (gr < 0 || gr >= ctx.gridH || gc < 0 || gc >= ctx.gridW || !ctx.room[gr][gc]) fits = false;
            else if (ctx.occupancy[gr][gc] >= 0) fits = false;
          }

        if (fits && overlapsReserved(ctx, p.groupIdx, newII, p.rotation, p.row, p.col)) fits = false;
        if (fits) {
          setOccupancy(ctx, pi);
          let accept = checkWalkability(ctx) && scoreLayout(ctx) > currentScore && hasAnyDoorCandidate(ctx);
          if (accept && preStats) {
            const postStats = getStats(ctx);
            if (ctx.empIdx >= 0 && postStats[ctx.empIdx] < preStats[ctx.empIdx]) accept = false;
            if (ctx.effIdx >= 0 && postStats[ctx.effIdx] < preStats[ctx.effIdx]) accept = false;
          }
          if (accept) { upgraded = true; break; }
          clearOccupancy(ctx, pi);
        }

        p.itemIdx = oldII;
        p.row = origRow;
        p.col = origCol;
        setOccupancy(ctx, pi);
      }
    }
  }
  traceEnd('ls:A-upgrade');

  await yieldToUI();

  traceStart('ls:A2-relUpgrade');
  // Sub-pass A2: Relative-aware upgrade — clear relative items, try ONE primary upgrade,
  // re-place relative items. Unlocks upgrades blocked by adjacent relative items (e.g. basins).
  if (ctx.relativeIndices.length > 0) {
    const a2Stats = getStats(ctx);
    const a2Primary = a2Stats[ctx.primaryStatIdx] ?? 0;
    const a2Score = scoreLayout(ctx);
    const a2Snap = takeLightSnapshot(ctx);

    // Remove all relative-only placements
    for (let pi = ctx.placements.length - 1; pi >= ctx.lockedCount; pi--) {
      const gInfo = ctx.groupInfo[ctx.placements[pi].groupIdx];
      if (gInfo.hasRelative && !gInfo.hasPrimary) {
        clearOccupancy(ctx, pi);
        ctx.placements.splice(pi, 1);
      }
    }
    rebuildGroupCounts(ctx);
    const noRelSnap = takeLightSnapshot(ctx);
    const noRelCount = ctx.placements.length;

    // Try each single upgrade independently, pick the one with best final score
    let bestA2Score = a2Score;
    let bestA2Snap = a2Snap;

    for (let pi = ctx.lockedCount; pi < noRelCount; pi++) {
      restoreLightSnapshot(ctx, noRelSnap);
      const p = ctx.placements[pi];
      const group = fs.groups[p.groupIdx];
      if (group.items.length <= 1) continue;
      const origRow = p.row, origCol = p.col;

      for (let newII = p.itemIdx + 1; newII < group.items.length; newII++) {
        for (const [sr, sc] of SHIFT_OFFSETS) {
          restoreLightSnapshot(ctx, noRelSnap);
          const pp = ctx.placements[pi];
          clearOccupancy(ctx, pi);
          pp.itemIdx = newII;
          pp.row = origRow + sr;
          pp.col = origCol + sc;

          const tiles = getCachedTiles(ctx, pp.groupIdx, newII, pp.rotation);
          let fits = true;
          for (let r = 0; r < tiles.length && fits; r++)
            for (let c = 0; c < (tiles[r]?.length ?? 0) && fits; c++) {
              if (tiles[r][c] === null) continue;
              const gr = pp.row + r, gc = pp.col + c;
              if (gr < 0 || gr >= ctx.gridH || gc < 0 || gc >= ctx.gridW || !ctx.room[gr][gc]) fits = false;
              else if (ctx.occupancy[gr][gc] >= 0) fits = false;
            }
          if (fits && overlapsReserved(ctx, pp.groupIdx, newII, pp.rotation, pp.row, pp.col)) fits = false;

          if (fits) {
            setOccupancy(ctx, pi);
            if (checkWalkability(ctx) && hasAnyDoorCandidate(ctx)) {
              const upSnap = takeLightSnapshot(ctx);
              // Try both large-first and small-first relative placement
              for (const placeFn of [placeRelativeItems, placeRelativeItemsSmallFirst]) {
                restoreLightSnapshot(ctx, upSnap);
                if (ctx.empIdx >= 0 && ctx.effIdx >= 0) placeEfficiencyItems(ctx);
                placeFn(ctx);
                const sc2 = scoreLayout(ctx);
                const st2 = getStats(ctx);
                const prim2 = st2[ctx.primaryStatIdx] ?? 0;
                if (sc2 > bestA2Score && prim2 >= a2Primary) {
                  bestA2Score = sc2;
                  bestA2Snap = takeLightSnapshot(ctx);
                }
              }
            }
          }
        }
      }
    }

    restoreLightSnapshot(ctx, bestA2Snap);
  }
  traceEnd('ls:A2-relUpgrade');

  await yieldToUI();

  traceStart('ls:B-squeeze');
  // Sub-pass B: Greedy squeeze — slide pieces toward centroid
  for (let round = 0; round < 3; round++) {
    let centR = 0, centC = 0, centN = 0;
    for (let pi = ctx.lockedCount; pi < ctx.placements.length; pi++) {
      centR += ctx.placements[pi].row; centC += ctx.placements[pi].col; centN++;
    }
    if (centN === 0) break;
    centR /= centN; centC /= centN;

    let anyMoved = false;
    const currentScore = scoreLayout(ctx);
    for (let pi = ctx.lockedCount; pi < ctx.placements.length; pi++) {
      const p = ctx.placements[pi];
      const dr = Math.sign(centR - p.row), dc = Math.sign(centC - p.col);
      if (dr === 0 && dc === 0) continue;

      const shifts = [];
      if (dr !== 0) shifts.push([dr, 0]);
      if (dc !== 0) shifts.push([0, dc]);
      if (dr !== 0 && dc !== 0) shifts.push([dr, dc]);

      for (const [sr, sc] of shifts) {
        clearOccupancy(ctx, pi);
        const origRow = p.row, origCol = p.col;
        p.row += sr; p.col += sc;

        const tiles = getCachedTiles(ctx, p.groupIdx, p.itemIdx, p.rotation);
        let fits = true;
        for (let r = 0; r < tiles.length && fits; r++)
          for (let c = 0; c < (tiles[r]?.length ?? 0) && fits; c++) {
            if (tiles[r][c] === null) continue;
            const gr = p.row + r, gc = p.col + c;
            if (gr < 0 || gr >= ctx.gridH || gc < 0 || gc >= ctx.gridW || !ctx.room[gr][gc]) fits = false;
            else if (ctx.occupancy[gr][gc] >= 0) fits = false;
          }
        if (fits && overlapsReserved(ctx, p.groupIdx, p.itemIdx, p.rotation, p.row, p.col)) fits = false;

        if (fits) {
          setOccupancy(ctx, pi);
          if (scoreLayout(ctx) >= currentScore && checkWalkability(ctx) && hasAnyDoorCandidate(ctx)) {
            anyMoved = true; break;
          }
          clearOccupancy(ctx, pi);
        }

        p.row = origRow; p.col = origCol;
        setOccupancy(ctx, pi);
      }
    }
    if (!anyMoved) break;
  }
  traceEnd('ls:B-squeeze');

  await yieldToUI();

  traceStart('ls:C-rotate');
  // Sub-pass C: Neatness rotation+shift — try rotating each piece
  const A3_SHIFTS = [[0,0],[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
  for (let round = 0; round < 3; round++) {
    let anyChanged = false;
    const preStats = getStats(ctx);
    const prePrimary = preStats[ctx.primaryStatIdx] ?? 0;
    const preEff = ctx.effIdx >= 0 ? (preStats[ctx.effIdx] ?? 0) : -1;

    for (let pi = ctx.lockedCount; pi < ctx.placements.length; pi++) {
      const p = ctx.placements[pi];
      const group = fs.groups[p.groupIdx];
      const rots = getAllowedRotations(group);
      if (rots.length <= 1) continue;

      const origRot = p.rotation, origRow = p.row, origCol = p.col;
      let bestRot = origRot, bestRow = origRow, bestCol = origCol;
      let bestScore = scoreLayout(ctx);

      clearOccupancy(ctx, pi);
      for (const rot of rots) {
        for (const [sr, sc] of A3_SHIFTS) {
          if (rot === origRot && sr === 0 && sc === 0) continue;
          p.rotation = rot; p.row = origRow + sr; p.col = origCol + sc;

          const tiles = getCachedTiles(ctx, p.groupIdx, p.itemIdx, rot);
          let fits = true;
          for (let r = 0; r < tiles.length && fits; r++)
            for (let c = 0; c < (tiles[r]?.length ?? 0) && fits; c++) {
              if (tiles[r][c] === null) continue;
              const gr = p.row + r, gc = p.col + c;
              if (gr < 0 || gr >= ctx.gridH || gc < 0 || gc >= ctx.gridW || !ctx.room[gr][gc]) fits = false;
              else if (ctx.occupancy[gr][gc] >= 0) fits = false;
            }

          if (fits && overlapsReserved(ctx, p.groupIdx, p.itemIdx, rot, p.row, p.col)) fits = false;
          if (fits) {
            setOccupancy(ctx, pi);
            const postStats = getStats(ctx);
            const postPrimary = postStats[ctx.primaryStatIdx] ?? 0;
            const postEff = ctx.effIdx >= 0 ? (postStats[ctx.effIdx] ?? 0) : -1;
            if (postPrimary >= prePrimary && postEff >= preEff
                && checkWalkability(ctx) && hasAnyDoorCandidate(ctx)) {
              const sc2 = scoreLayout(ctx);
              if (sc2 > bestScore) {
                bestRot = rot; bestRow = p.row; bestCol = p.col; bestScore = sc2;
              }
            }
            clearOccupancy(ctx, pi);
          }
        }
      }

      p.rotation = bestRot; p.row = bestRow; p.col = bestCol;
      setOccupancy(ctx, pi);
      if (bestRot !== origRot || bestRow !== origRow || bestCol !== origCol) anyChanged = true;
    }
    if (!anyChanged) break;
  }
  traceEnd('ls:C-rotate');

  await yieldToUI();

  traceStart('ls:D-gapFill');
  // Sub-pass D: Gap fill with small items
  for (let pass = 0; pass < 3; pass++) {
    let filled = false;
    for (const gInfo of ctx.groupInfo) {
      if (gInfo.hasEfficiency && !gInfo.hasPrimary && ctx.empIdx >= 0 && ctx.effIdx >= 0) continue;
      if (gInfo.hasRelative && !gInfo.hasPrimary && ctx.relativeIndices.length > 0) continue;
      const gi = gInfo.groupIdx;
      const group = fs.groups[gi];
      const maxP = group.max ?? 100;
      if (countGroupPlacements(ctx, gi) >= maxP) continue;
      const rots = getAllowedRotations(group);
      const candidates = [...gInfo.fillerItems, ...gInfo.heroItems];

      for (const ii of candidates) {
        if (countGroupPlacements(ctx, gi) >= maxP) break;
        const currentScore = scoreLayout(ctx);
        let bestPos = null, bestScore = currentScore;
        for (const rot of rots) {
          for (const { r, c } of ctx.roomTiles) {
            if (!ctx.freeBitmap[r * ctx.gridW + c]) continue;
            if (!canPlaceFast(ctx,gi, ii, rot, r, c, undefined)) continue;
            const posScore = scorePlacementPosition(ctx, gi, ii, rot, r, c);
            if (posScore > bestScore - currentScore) { bestScore = currentScore + posScore; bestPos = { rot, row: r, col: c }; }
          }
        }
        if (bestPos) {
          const pi = ctx.placements.length;
          ctx.placements.push({ groupIdx: gi, itemIdx: ii, rotation: bestPos.rot, row: bestPos.row, col: bestPos.col });
          setOccupancy(ctx, pi);
          if (ctx.groupCounts) ctx.groupCounts[gi]++;
          if (!checkWalkability(ctx) || !hasAnyDoorCandidate(ctx) || scoreLayout(ctx) <= currentScore) {
            clearOccupancy(ctx, pi);
            if (ctx.groupCounts) ctx.groupCounts[gi]--;
            ctx.placements.pop();
          } else { filled = true; }
        }
      }
    }
    if (!filled) break;
    await yieldToUI();
  }
  traceEnd('ls:D-gapFill');

  traceStart('ls:E-repack');
  // Sub-pass E: Remove-and-repack — try removing small items to make room for bigger ones
  for (let round = 0; round < 3; round++) {
    let anyImproved = false;
    const preScore = scoreLayout(ctx);
    const snap = takeLightSnapshot(ctx);

    // Collect primary-stat items sorted by contribution (smallest first = best to remove)
    const primaryItems = [];
    for (let pi = ctx.lockedCount; pi < ctx.placements.length; pi++) {
      const p = ctx.placements[pi];
      const gInfo = ctx.groupInfo[p.groupIdx];
      if (!gInfo?.hasPrimary) continue;
      const item = fs.groups[p.groupIdx]?.items[p.itemIdx];
      if (!item) continue;
      const mult = item.multiplierStats ?? item.multiplier;
      primaryItems.push({ pi, mult });
    }
    primaryItems.sort((a, b) => a.mult - b.mult);

    // Try removing the smallest items and refilling
    for (const { pi } of primaryItems.slice(0, Math.min(5, primaryItems.length))) {
      const removedP = { ...ctx.placements[pi] };
      clearOccupancy(ctx, pi);
      // Move last placement into slot pi
      const lastPi = ctx.placements.length - 1;
      if (pi !== lastPi) {
        clearOccupancy(ctx, lastPi);
        ctx.placements[pi] = ctx.placements[lastPi];
        setOccupancy(ctx, pi);
      }
      ctx.placements.pop();
      if (ctx.groupCounts) ctx.groupCounts[removedP.groupIdx]--;
      rebuildGroupCounts(ctx);

      // Try to fill the freed space with better items
      let filled = false;
      for (const gInfo2 of ctx.groupInfo) {
        if (!gInfo2.hasPrimary) continue;
        const gi2 = gInfo2.groupIdx;
        const group2 = fs.groups[gi2];
        const rots2 = getAllowedRotations(group2);
        const maxP2 = group2.max ?? 100;
        for (const ii2 of gInfo2.heroItems) {
          const item2 = group2.items[ii2];
          if (!item2) continue;
          const mult2 = item2.multiplierStats ?? item2.multiplier;
          const removedMult = removedP.groupIdx === gi2
            ? (fs.groups[gi2].items[removedP.itemIdx]?.multiplierStats ?? fs.groups[gi2].items[removedP.itemIdx]?.multiplier ?? 0)
            : 0;
          if (mult2 <= removedMult) continue;
          if (countGroupPlacements(ctx, gi2) >= maxP2) continue;
          for (const rot2 of rots2) {
            let bestPos2 = null, bestScore2 = -Infinity;
            for (const { r, c } of ctx.roomTiles) {
              if (!ctx.freeBitmap[r * ctx.gridW + c]) continue;
              if (!canPlaceFast(ctx,gi2, ii2, rot2, r, c, undefined)) continue;
              const s = scorePlacementPosition(ctx, gi2, ii2, rot2, r, c);
              if (s > bestScore2) { bestScore2 = s; bestPos2 = { rot: rot2, row: r, col: c }; }
            }
            if (bestPos2 && placeItem(ctx, gi2, ii2, bestPos2.rot, bestPos2.row, bestPos2.col)) { filled = true; break; }
          }
          if (filled) break;
        }
        if (filled) break;
      }

      // Also try to place MORE items in the freed + adjacent space
      if (filled) {
        for (const gInfo2 of ctx.groupInfo) {
          if (!gInfo2.hasPrimary) continue;
          const gi2 = gInfo2.groupIdx;
          const group2 = fs.groups[gi2];
          const rots2 = getAllowedRotations(group2);
          const maxP2 = group2.max ?? 100;
          for (const ii2 of [...gInfo2.fillerItems, ...gInfo2.heroItems]) {
            if (countGroupPlacements(ctx, gi2) >= maxP2) break;
            let bestPos2 = null, bestScore2 = -Infinity;
            for (const rot2 of rots2) {
              for (const { r, c } of ctx.roomTiles) {
                if (!ctx.freeBitmap[r * ctx.gridW + c]) continue;
                if (!canPlaceFast(ctx,gi2, ii2, rot2, r, c, undefined)) continue;
                const s = scorePlacementPosition(ctx, gi2, ii2, rot2, r, c);
                if (s > bestScore2) { bestScore2 = s; bestPos2 = { rot: rot2, row: r, col: c }; }
              }
            }
            if (bestPos2) placeItem(ctx, gi2, ii2, bestPos2.rot, bestPos2.row, bestPos2.col);
          }
        }
      }

      const postScore = scoreLayout(ctx);
      if (postScore > preScore) {
        anyImproved = true;
        break; // restart from new state
      }
      // Revert
      restoreLightSnapshot(ctx, snap);
    }
    if (!anyImproved) break;
    await yieldToUI();
  }
  traceEnd('ls:E-repack');

  traceStart('ls:F-SA');
  // Sub-pass F: Lightweight SA — escape local optima with temperature-based acceptance
  {
    const rng = ctx.rng;
    let currentScore = scoreLayout(ctx);
    let bestKnown = currentScore;
    let bestSnap = takeLightSnapshot(ctx);
    let currentSnap = takeLightSnapshot(ctx);

    const saIter = ctx.roomTiles.length > 500 ? 800 : 2000;
    const T0 = 3000;
    let stateClean = true;
    for (let iter = 0; iter < saIter; iter++) {
      if (iter % 200 === 0 && iter > 0) await yieldToUI();
      const temp = T0 * (1 - iter / saIter);

      if (!stateClean) {
        traceStart('ls:F-restore');
        restoreLightSnapshot(ctx, currentSnap);
        traceEnd('ls:F-restore');
      }
      stateClean = false;

      const curRange = ctx.placements.length - ctx.lockedCount;
      if (curRange <= 1) break;

      // Pick a random move type
      const moveType = rng();
      let moved = false;

      if (moveType < 0.45) {
        traceStart('ls:F-moveA');
        // MOVE A: Remove 1-2 items, reinsert with possibly different sizes
        const numRem = rng() < 0.5 ? 1 : Math.min(2, curRange);
        const remIndices = [];
        const firstIdx = ctx.lockedCount + Math.floor(rng() * curRange);
        remIndices.push(firstIdx);

        if (numRem > 1 && curRange > 1) {
          // Prefer adjacent
          const p0 = ctx.placements[firstIdx];
          let bestDist = Infinity, bestPi = -1;
          for (let tries = 0; tries < 5; tries++) {
            const range2 = ctx.placements.length - ctx.lockedCount;
            if (range2 <= 1) break;
            const pi2 = ctx.lockedCount + Math.floor(rng() * range2);
            if (remIndices.includes(pi2) || !ctx.placements[pi2]) continue;
            const p2 = ctx.placements[pi2];
            const d = Math.abs(p2.row - p0.row) + Math.abs(p2.col - p0.col);
            if (d < bestDist) { bestDist = d; bestPi = pi2; }
          }
          if (bestPi >= 0) remIndices.push(bestPi);
        }

        // Save removed item info
        const removedInfo = remIndices.map(idx => ({ ...ctx.placements[idx] }));
        // Remove in reverse order
        remIndices.sort((a, b) => b - a);
        for (const idx of remIndices) {
          clearOccupancy(ctx, idx);
          const last = ctx.placements.length - 1;
          if (idx !== last) {
            clearOccupancy(ctx, last);
            ctx.placements[idx] = ctx.placements[last];
            setOccupancy(ctx, idx);
          }
          ctx.placements.pop();
        }
        rebuildGroupCounts(ctx);

        // Reinsert — try different item sizes
        for (const rem of removedInfo) {
          const gInfo = ctx.groupInfoMap.get(rem.groupIdx);
          if (!gInfo) continue;
          const group = fs.groups[rem.groupIdx];
          const rots = getAllowedRotations(group);
          const maxP = group.max ?? 100;
          if (countGroupPlacements(ctx, rem.groupIdx) >= maxP) continue;

          const itemCandidates = [...gInfo.heroItems, ...gInfo.fillerItems];
          if (!itemCandidates.includes(rem.itemIdx)) itemCandidates.push(rem.itemIdx);

          let placed2 = false;
          for (let attempt = 0; attempt < 20; attempt++) {
            const dr = Math.floor(rng() * 9) - 4;
            const dc = Math.floor(rng() * 9) - 4;
            const rot = rots[Math.floor(rng() * rots.length)];
            const ii = itemCandidates[Math.floor(rng() * itemCandidates.length)];
            if (placeItem(ctx, rem.groupIdx, ii, rot, rem.row + dr, rem.col + dc)) {
              placed2 = true; break;
            }
          }
          if (!placed2) {
            let bestPos3 = null, bestScore3 = -Infinity, bestII3 = -1;
            for (const ii of itemCandidates) {
              for (const rot of rots) {
                for (const { r, c } of ctx.roomTiles) {
                  if (!ctx.freeBitmap[r * ctx.gridW + c]) continue;
                  if (!canPlaceFast(ctx,rem.groupIdx, ii, rot, r, c, undefined)) continue;
                  const s = scorePlacementPosition(ctx, rem.groupIdx, ii, rot, r, c);
                  if (s > bestScore3) { bestScore3 = s; bestPos3 = { rot, row: r, col: c }; bestII3 = ii; }
                }
              }
            }
            if (bestPos3 && bestII3 >= 0) placeItem(ctx, rem.groupIdx, bestII3, bestPos3.rot, bestPos3.row, bestPos3.col);
          }
        }

        // Gap fill freed space
        for (const gInfo2 of ctx.groupInfo) {
          if (!gInfo2.hasPrimary && gInfo2.priority > 1) continue;
          const gi2 = gInfo2.groupIdx;
          const group2 = fs.groups[gi2];
          const rots2 = getAllowedRotations(group2);
          const maxP2 = group2.max ?? 100;
          for (const ii of [...gInfo2.heroItems, ...gInfo2.fillerItems]) {
            if (countGroupPlacements(ctx, gi2) >= maxP2) break;
            let bestPos = null, bestScore = -Infinity;
            for (const rot of rots2) {
              for (const { r, c } of ctx.roomTiles) {
                if (!ctx.freeBitmap[r * ctx.gridW + c]) continue;
                if (!canPlaceFast(ctx,gi2, ii, rot, r, c, undefined)) continue;
                const s = scorePlacementPosition(ctx, gi2, ii, rot, r, c);
                if (s > bestScore) { bestScore = s; bestPos = { rot, row: r, col: c }; }
              }
            }
            if (bestPos) placeItem(ctx, gi2, ii, bestPos.rot, bestPos.row, bestPos.col);
          }
        }
        if (ctx.empIdx >= 0 && ctx.effIdx >= 0) placeEfficiencyItems(ctx);
        moved = true;
        traceEnd('ls:F-moveA');

      } else if (moveType < 0.75) {
        traceStart('ls:F-moveB');
        // MOVE B: Shift a random item ±1-2 tiles
        const pi = ctx.lockedCount + Math.floor(rng() * curRange);
        const p = ctx.placements[pi];
        const shift = Math.floor(rng() * 4) + 1;
        const sr = (Math.floor(rng() * (2 * shift + 1)) - shift);
        const sc = (Math.floor(rng() * (2 * shift + 1)) - shift);
        if (sr !== 0 || sc !== 0) {
          clearOccupancy(ctx, pi);
          const origR = p.row, origC = p.col;
          p.row += sr; p.col += sc;
          const tiles = getCachedTiles(ctx, p.groupIdx, p.itemIdx, p.rotation);
          let fits = true;
          for (let tr = 0; tr < tiles.length && fits; tr++)
            for (let tc = 0; tc < (tiles[tr]?.length ?? 0) && fits; tc++) {
              if (tiles[tr][tc] === null) continue;
              const gr = p.row + tr, gc = p.col + tc;
              if (gr < 0 || gr >= ctx.gridH || gc < 0 || gc >= ctx.gridW || !ctx.room[gr][gc]) fits = false;
              else if (ctx.occupancy[gr][gc] >= 0) fits = false;
            }
          if (fits && overlapsReserved(ctx, p.groupIdx, p.itemIdx, p.rotation, p.row, p.col)) fits = false;
          if (fits) { setOccupancy(ctx, pi); moved = true; }
          else { p.row = origR; p.col = origC; setOccupancy(ctx, pi); }
        }
        traceEnd('ls:F-moveB');

      } else {
        traceStart('ls:F-moveC');
        // MOVE C: Resize — swap a random item for a different size variant
        const pi = ctx.lockedCount + Math.floor(rng() * curRange);
        const p = ctx.placements[pi];
        const group = fs.groups[p.groupIdx];
        if (group.items.length > 1) {
          const newII = Math.floor(rng() * group.items.length);
          if (newII !== p.itemIdx) {
            clearOccupancy(ctx, pi);
            const origII = p.itemIdx;
            p.itemIdx = newII;
            // Try with small shifts
            const shifts2 = [[0,0],[0,1],[0,-1],[1,0],[-1,0]];
            let found = false;
            for (const [sr2, sc2] of shifts2) {
              const oR = p.row, oC = p.col;
              p.row += sr2; p.col += sc2;
              const tiles = getCachedTiles(ctx, p.groupIdx, newII, p.rotation);
              let fits = true;
              for (let tr = 0; tr < tiles.length && fits; tr++)
                for (let tc = 0; tc < (tiles[tr]?.length ?? 0) && fits; tc++) {
                  if (tiles[tr][tc] === null) continue;
                  const gr = p.row + tr, gc = p.col + tc;
                  if (gr < 0 || gr >= ctx.gridH || gc < 0 || gc >= ctx.gridW || !ctx.room[gr][gc]) fits = false;
                  else if (ctx.occupancy[gr][gc] >= 0) fits = false;
                }
              if (fits && overlapsReserved(ctx, p.groupIdx, newII, p.rotation, p.row, p.col)) fits = false;
              if (fits) { setOccupancy(ctx, pi); moved = true; found = true; break; }
              p.row = oR; p.col = oC;
            }
            if (!found) { p.itemIdx = origII; setOccupancy(ctx, pi); }
          }
        }
        traceEnd('ls:F-moveC');
      }

      if (!moved) { stateClean = true; continue; }

      // Evaluate
      traceStart('ls:F-eval');
      const walkOk = checkWalkability(ctx) && hasAnyDoorCandidate(ctx);
      const newScore = walkOk ? scoreLayout(ctx) : -Infinity;
      const delta = newScore - currentScore;

      if (delta > 0 || (temp > 0 && Math.exp(delta / temp) > rng())) {
        currentScore = newScore;
        const snap = takeLightSnapshot(ctx);
        currentSnap = snap;
        stateClean = true;
        if (newScore > bestKnown) {
          bestKnown = newScore;
          bestSnap = snap;
        }
      }
      traceEnd('ls:F-eval');
    }
    restoreLightSnapshot(ctx, bestSnap);
  }
  traceEnd('ls:F-SA');

  // Sub-pass G: Final efficiency/relative rebalance
  if (ctx.empIdx >= 0 && ctx.effIdx >= 0) placeEfficiencyItems(ctx);
  if (ctx.relativeIndices.length > 0) placeRelativeItems(ctx);
}

// ══════════════════════════════════════════════════════════
// Phase 5: Trim, Doors, Validation
// ══════════════════════════════════════════════════════════

async function trimPhase(ctx) {
  // Pass 1: Create support pillars
  if (ctx.furnitureSet.mustBeIndoors) await createSupportPillars(ctx);

  // Pass 2: Trim unoccupied tiles
  for (let pass = 0; pass < 5; pass++) {
    let trimmed = false;
    await yieldToUI();

    const wallRef = Array.from({ length: ctx.gridH }, () => new Int8Array(ctx.gridW));
    for (let r = 0; r < ctx.gridH; r++)
      for (let c = 0; c < ctx.gridW; c++) {
        if (ctx.room[r][c]) continue;
        let count = 0;
        for (const [dr, dc] of DIRS8) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < ctx.gridH && nc >= 0 && nc < ctx.gridW && ctx.room[nr][nc]) count++;
        }
        wallRef[r][c] = count;
      }

    const candidates = [];
    for (let r = 0; r < ctx.gridH; r++)
      for (let c = 0; c < ctx.gridW; c++) {
        if (!ctx.room[r][c] || ctx.occupancy[r][c] >= 0) continue;
        let fpReduction = 0;
        let hasRoomNeighbor8 = false;
        for (const [dr, dc] of DIRS8) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < ctx.gridH && nc >= 0 && nc < ctx.gridW && ctx.room[nr][nc]) {
            hasRoomNeighbor8 = true; break;
          }
        }
        if (!hasRoomNeighbor8) fpReduction++;
        for (const [dr, dc] of DIRS8) {
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nr >= ctx.gridH || nc < 0 || nc >= ctx.gridW) continue;
          if (ctx.room[nr][nc]) continue;
          if (wallRef[nr][nc] === 1) fpReduction++;
        }
        if (fpReduction > 0) candidates.push({ r, c, fpReduction });
      }

    candidates.sort((a, b) => b.fpReduction - a.fpReduction);
    for (const cand of candidates) {
      if (canEraseTile(ctx, cand.r, cand.c)) {
        removeRoomTile(ctx, cand.r, cand.c);
        trimmed = true;
      }
    }
    if (!trimmed) break;
  }

  // Pass 3: Re-check stability
  if (ctx.furnitureSet.mustBeIndoors) await createSupportPillars(ctx);
}

function canEraseTile(ctx, r, c) {
  if (!ctx.room[r][c]) return false;
  if (ctx.occupancy[r][c] >= 0) return false;
  if (ctx.reservedTiles.has(r * ctx.gridW + c)) return false;
  if (ctx.roomTiles.length <= 1) return false;
  ctx.room[r][c] = false;
  const connected = checkRoomConnectivity(ctx);
  const walkable = connected && checkWalkability(ctx);
  ctx.room[r][c] = true;
  return connected && walkable;
}

function doorPhase(ctx) {
  if (!ctx.furnitureSet.mustBeIndoors) return;
  ctx.doors = new Set();
  const outside = findOutsideTiles(ctx);

  // Collect door candidates: valid geometry + at least one adjacent room tile
  const allGeomValid = [];
  const candidates = [];
  for (let r = 0; r < ctx.gridH; r++)
    for (let c = 0; c < ctx.gridW; c++) {
      if (ctx.room[r][c] || !outside[r][c]) continue;
      let hasAdj = false;
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < ctx.gridH && nc >= 0 && nc < ctx.gridW && ctx.room[nr][nc]) { hasAdj = true; break; }
      }
      if (!hasAdj) continue;

      let validDoor = false;
      for (const [dr, dc] of DIRS) {
        const ar = r + dr, ac = c + dc;
        const br = r - dr, bc = c - dc;
        const aIsRoom = ar >= 0 && ar < ctx.gridH && ac >= 0 && ac < ctx.gridW && ctx.room[ar][ac];
        const bIsRoom = br >= 0 && br < ctx.gridH && bc >= 0 && bc < ctx.gridW && ctx.room[br][bc];
        const aIsOpen = isOpenTile(ctx, ar, ac);
        const bIsOpen = isOpenTile(ctx, br, bc);
        if ((aIsRoom && bIsOpen) || (bIsRoom && aIsOpen)) {
          const pr1 = r + dc, pc1 = c + dr;
          const pr2 = r - dc, pc2 = c - dr;
          const perp1Room = pr1 >= 0 && pr1 < ctx.gridH && pc1 >= 0 && pc1 < ctx.gridW && ctx.room[pr1][pc1];
          const perp2Room = pr2 >= 0 && pr2 < ctx.gridH && pc2 >= 0 && pc2 < ctx.gridW && ctx.room[pr2][pc2];
          if (!perp1Room && !perp2Room) { validDoor = true; break; }
        }
      }
      if (!validDoor) continue;

      allGeomValid.push({ r, c });

      let hasWalkable = false;
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < ctx.gridH && nc >= 0 && nc < ctx.gridW
            && ctx.room[nr][nc] && ctx.blockerCount[nr][nc] === 0) {
          hasWalkable = true; break;
        }
      }
      if (!hasWalkable) continue;

      candidates.push({ r, c });
    }

  // If strict hasWalkable filter yielded 0 candidates, fall back to geometry-only
  // candidates — but ensure at least one adjacent tile is made walkable
  if (candidates.length === 0 && allGeomValid.length > 0) {
    // Sort by blocker cost: prefer candidates where the cheapest adjacent blocker
    // has the lowest multiplier (least score loss to remove)
    for (const cand of allGeomValid) {
      let minCost = Infinity;
      for (const [dr, dc] of DIRS) {
        const nr = cand.r + dr, nc = cand.c + dc;
        if (nr < 0 || nr >= ctx.gridH || nc < 0 || nc >= ctx.gridW || !ctx.room[nr][nc]) continue;
        if (ctx.blockerCount[nr][nc] === 0) { minCost = 0; break; } // already walkable
        const pi = ctx.occupancy[nr][nc];
        if (pi >= 0 && pi < ctx.placements.length) {
          const p = ctx.placements[pi];
          const item = ctx.furnitureSet.groups[p.groupIdx]?.items[p.itemIdx];
          const mult = item?.multiplierStats ?? item?.multiplier ?? 1;
          if (mult < minCost) minCost = mult;
        }
      }
      cand.blockerCost = minCost;
    }
    allGeomValid.sort((a, b) => a.blockerCost - b.blockerCost);
    candidates.push(...allGeomValid);
  }

  if (candidates.length === 0) return;

  while (candidates.length > 0) {
    for (let i = candidates.length - 1; i >= 0; i--) {
      const cand = candidates[i];
      ctx.doors.add(`${cand.r},${cand.c}`);
      const iso = computeIsolation(ctx);
      ctx.doors.delete(`${cand.r},${cand.c}`);
      if (iso < 0.995) candidates.splice(i, 1);
    }
    if (candidates.length === 0) break;

    const target = ctx.doors.size === 0 ? "storage" : "work";
    let bestIdx = -1, bestAvg = Infinity;
    for (let i = 0; i < candidates.length; i++) {
      const cand = candidates[i];
      ctx.doors.add(`${cand.r},${cand.c}`);
      const avg = computeAvgWalkDistance(ctx, target);
      ctx.doors.delete(`${cand.r},${cand.c}`);
      if (avg < bestAvg) { bestAvg = avg; bestIdx = i; }
    }
    if (bestIdx < 0) {
      if (ctx.doors.size === 0) bestIdx = 0;
      else break;
    }
    const best = candidates[bestIdx];
    ctx.doors.add(`${best.r},${best.c}`);
    candidates.splice(bestIdx, 1);
  }

  // Ensure each door has at least one walkable adjacent room tile.
  // If a door was placed via the allGeomValid fallback, all adjacent tiles may be
  // blocked. Remove the cheapest blocking piece to guarantee accessibility.
  for (const key of ctx.doors) {
    const [dr, dc] = key.split(",").map(Number);
    let hasWalk = false;
    for (const [ddr, ddc] of DIRS) {
      const nr = dr + ddr, nc = dc + ddc;
      if (nr >= 0 && nr < ctx.gridH && nc >= 0 && nc < ctx.gridW
          && ctx.room[nr][nc] && ctx.blockerCount[nr][nc] === 0) {
        hasWalk = true; break;
      }
    }
    if (hasWalk) continue;
    // Find cheapest adjacent blocking piece to remove
    let cheapestPi = -1, cheapestMult = Infinity;
    for (const [ddr, ddc] of DIRS) {
      const nr = dr + ddr, nc = dc + ddc;
      if (nr < 0 || nr >= ctx.gridH || nc < 0 || nc >= ctx.gridW || !ctx.room[nr][nc]) continue;
      const pi = ctx.occupancy[nr][nc];
      if (pi < ctx.lockedCount || pi >= ctx.placements.length) continue;
      const p = ctx.placements[pi];
      const item = ctx.furnitureSet.groups[p.groupIdx]?.items[p.itemIdx];
      const mult = item?.multiplierStats ?? item?.multiplier ?? 1;
      if (mult < cheapestMult) { cheapestMult = mult; cheapestPi = pi; }
    }
    if (cheapestPi < 0) continue;
    clearOccupancy(ctx, cheapestPi);
    const lastPi = ctx.placements.length - 1;
    if (cheapestPi !== lastPi) {
      clearOccupancy(ctx, lastPi);
      ctx.placements[cheapestPi] = ctx.placements[lastPi];
      setOccupancy(ctx, cheapestPi);
    }
    ctx.placements.pop();
    rebuildGroupCounts(ctx);
  }
}

function computeAvgWalkDistance(ctx, target) {
  const { gridW, gridH, room, furnitureSet: fs, placements, doors } = ctx;
  if (doors.size === 0) return Infinity;
  const dist = Array.from({ length: gridH }, () => Array(gridW).fill(-1));
  const q = ctx.bfsQueue;
  q.reset();
  for (const key of doors) {
    const [dr, dc] = key.split(",").map(Number);
    for (const [ddr, ddc] of DIRS) {
      const nr = dr + ddr, nc = dc + ddc;
      if (nr >= 0 && nr < gridH && nc >= 0 && nc < gridW
          && room[nr][nc] && ctx.blockerCount[nr][nc] === 0 && dist[nr][nc] < 0) {
        dist[nr][nc] = 1;
        q.push(nr, nc);
      }
    }
  }
  while (q.length > 0) {
    const [cr, cc] = q.shift();
    for (const [dr, dc] of DIRS) {
      const nr = cr + dr, nc = cc + dc;
      if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW) continue;
      if (dist[nr][nc] >= 0 || !room[nr][nc] || ctx.blockerCount[nr][nc] > 0) continue;
      dist[nr][nc] = dist[cr][cc] + 1;
      q.push(nr, nc);
    }
  }
  let totalDist = 0, count = 0;
  for (const p of placements) {
    const tiles = getCachedTiles(ctx, p.groupIdx, p.itemIdx, p.rotation);
    for (let r = 0; r < tiles.length; r++)
      for (let c = 0; c < (tiles[r]?.length ?? 0); c++) {
        const tileKey = tiles[r][c];
        if (tileKey === null) continue;
        const tt = fs.tileTypes[tileKey];
        if (!tt) continue;
        const gr = p.row + r, gc = p.col + c;
        if (target === "storage" && tt.data !== 2) continue;
        if (target === "work" && !tt.mustBeReachable) continue;
        let minD = Infinity;
        for (const [dr, dc] of DIRS) {
          const nr = gr + dr, nc = gc + dc;
          if (nr >= 0 && nr < gridH && nc >= 0 && nc < gridW && dist[nr][nc] >= 0) minD = Math.min(minD, dist[nr][nc]);
        }
        if (dist[gr]?.[gc] >= 0) minD = Math.min(minD, dist[gr][gc]);
        if (minD < Infinity) { totalDist += minD; count++; }
      }
  }
  if (count === 0) return Infinity;
  return totalDist / count;
}

function validateFinal(ctx) {
  if (!checkWalkability(ctx)) return false;
  if (!checkStabilityOpt(ctx)) return false;
  if (ctx.building.storage > 0 && ctx.placements.length > 0 && !hasStorageTile(ctx)) return false;
  if (!checkRoomConnectivity(ctx)) return false;
  const fs = ctx.furnitureSet;
  for (let gi = 0; gi < fs.groups.length; gi++) {
    const group = fs.groups[gi];
    const count = countGroupPlacements(ctx, gi);
    if (group.min > 0 && count < group.min) return false;
    if (group.max != null && count > group.max) return false;
  }
  return true;
}

// ══════════════════════════════════════════════════════════
// Gap-fill: fill remaining empty space with additional items
// ══════════════════════════════════════════════════════════

async function gapFillPhase(ctx) {
  const { furnitureSet: fs } = ctx;

  // Sort groups by priority (primary stat first)
  const sortedGroups = [...ctx.groupInfo].sort((a, b) => a.priority - b.priority);

  for (let pass = 0; pass < 3; pass++) {
    let filled = false;
    for (const gInfo of sortedGroups) {
      if (gInfo.hasEfficiency && !gInfo.hasPrimary && ctx.empIdx >= 0 && ctx.effIdx >= 0) continue;
      if (gInfo.hasRelative && !gInfo.hasPrimary && ctx.relativeIndices.length > 0) continue;

      const gi = gInfo.groupIdx;
      const group = fs.groups[gi];
      const maxP = group.max ?? 100;
      if (countGroupPlacements(ctx, gi) >= maxP) continue;

      const rots = getAllowedRotations(group);
      // Try all items from largest to smallest
      const candidates = [...gInfo.heroItems, ...gInfo.fillerItems];

      for (const ii of candidates) {
        if (countGroupPlacements(ctx, gi) >= maxP) break;

        let bestPos = null, bestScore = -Infinity;
        for (const rot of rots) {
          for (const { r, c } of ctx.roomTiles) {
            if (!ctx.freeBitmap[r * ctx.gridW + c]) continue;
            if (!canPlaceFast(ctx,gi, ii, rot, r, c, undefined)) continue;
            const posScore = scorePlacementPosition(ctx, gi, ii, rot, r, c);
            if (posScore > bestScore) { bestScore = posScore; bestPos = { rot, row: r, col: c }; }
          }
        }

        if (bestPos) {
          if (placeItem(ctx, gi, ii, bestPos.rot, bestPos.row, bestPos.col)) filled = true;
        }
      }
    }
    if (!filled) break;
    await yieldToUI();
  }
}

// ══════════════════════════════════════════════════════════
// Fallback: Constructive placement (when strips don't produce good results)
// ══════════════════════════════════════════════════════════

/**
 * Sort room tiles with wall-adjacency priority, optionally reversed.
 * @param {object} ctx
 * @param {boolean} reverse - if true, reverse the sort (bottom-right priority)
 */
function sortRoomTilesForConstruction(ctx, reverse) {
  ctx.roomTiles.sort((a, b) => {
    let wallA = 0, wallB = 0;
    for (const [dr, dc] of DIRS) {
      let nr = a.r + dr, nc = a.c + dc;
      if (nr < 0 || nr >= ctx.gridH || nc < 0 || nc >= ctx.gridW || !ctx.room[nr][nc]) wallA++;
      nr = b.r + dr; nc = b.c + dc;
      if (nr < 0 || nr >= ctx.gridH || nc < 0 || nc >= ctx.gridW || !ctx.room[nr][nc]) wallB++;
    }
    if (wallA !== wallB) return reverse ? wallA - wallB : wallB - wallA;
    // Tiebreak: position (top-left first or bottom-right first)
    if (reverse) return (b.r * ctx.gridW + b.c) - (a.r * ctx.gridW + a.c);
    return (a.r * ctx.gridW + a.c) - (b.r * ctx.gridW + b.c);
  });
}

/**
 * Single constructive pass: place hero items then fillers.
 * @param {object} ctx
 * @param {object} options
 * @param {number} options.skipInterval - skip every Nth hero placement (0=no skip)
 * @param {number} options.heroRotate - rotate hero list by this many positions
 * @param {boolean} options.reverseScan - reverse room tile scan order
 * @param {boolean} options.tryAllHeroSizes - try all item sizes per group, not just heroes
 * @param {number} [options.maxItemHeight] - restrict primary group items to this max height
 * @param {boolean} [options.mixedSizing] - evaluate all items at each step, pick best globally
 * @param {boolean} [options.preferLarger] - score by raw multiplier instead of density (favors bigger items)
 * @param {boolean} [options.deferRelative] - defer relative item placement to end of pass (uses small-first)
 * @param {boolean} [options.deferSecondary] - defer both efficiency and relative item placement to end of pass
 */
async function constructivePass(ctx, options) {
  const { furnitureSet: fs } = ctx;
  const { skipInterval = 0, heroRotate = 0, reverseScan = false, tryAllHeroSizes = false, maxItemHeight, mixedSizing = false, preferLarger = false, deferRelative = false, deferSecondary = false } = options;
  const sortedGroups = [...ctx.groupInfo].sort((a, b) => a.priority - b.priority);

  sortRoomTilesForConstruction(ctx, reverseScan);

  let placementCount = 0;

  traceStart('cons:hero');
  // Pass 1: Hero items — place best item at best position iteratively
  for (const gInfo of sortedGroups) {
    const gi = gInfo.groupIdx;
    const group = fs.groups[gi];
    const maxP = group.max ?? 100;

    if (gInfo.hasEfficiency && !gInfo.hasPrimary && ctx.empIdx >= 0 && ctx.effIdx >= 0) continue;
    if (gInfo.hasRelative && !gInfo.hasPrimary && ctx.relativeIndices.length > 0) continue;

    let placed = countGroupPlacements(ctx, gi);
    const rots = getAllowedRotations(group);

    // Build candidate item list
    let itemList;
    if (tryAllHeroSizes) {
      itemList = group.items.map((_, ii) => ii).filter(ii => getValueDensity(ctx, gi, ii) > 0);
      // Filter by max item height if specified (only for primary groups)
      if (maxItemHeight !== undefined && gInfo.hasPrimary) {
        itemList = itemList.filter(ii => group.items[ii].tiles.length <= maxItemHeight);
      }
      itemList.sort((a, b) => getValueDensity(ctx, gi, b) - getValueDensity(ctx, gi, a));
    } else {
      itemList = gInfo.heroItems.length > 0 ? [...gInfo.heroItems] : (gInfo.bestHeroIdx >= 0 ? [gInfo.bestHeroIdx] : []);
    }
    if (itemList.length === 0 && group.min > 0 && gInfo.fillerItems.length > 0) {
      itemList = [gInfo.fillerItems[0]];
    }
    if (heroRotate > 0 && itemList.length > 1) {
      const rot2 = heroRotate % itemList.length;
      itemList = [...itemList.slice(rot2), ...itemList.slice(0, rot2)];
    }

    if (mixedSizing) {
      // Mixed sizing: at each step, evaluate ALL items and pick the globally best (item, rot, pos)
      let keepGoing = true;
      while (keepGoing && placed < maxP) {
        keepGoing = false;
        if (skipInterval > 0 && placementCount > 0 && placementCount % skipInterval === (skipInterval - 1)) {
          placementCount++;
          break;
        }

        let bestPos = null, bestScore = -Infinity, bestII = -1;
        for (const ii of itemList) {
          if (ii < 0) continue;
          const rawMult = preferLarger ? (fs.groups[gi].items[ii]?.multiplierStats ?? fs.groups[gi].items[ii]?.multiplier ?? 1) : 1;
          for (const rot of rots) {
            for (const { r, c } of ctx.roomTiles) {
              if (!ctx.freeBitmap[r * ctx.gridW + c]) continue;
              if (!canPlaceFast(ctx,gi, ii, rot, r, c, undefined)) continue;
              const posScore = scorePlacementPosition(ctx, gi, ii, rot, r, c) * rawMult;
              if (posScore > bestScore) { bestScore = posScore; bestPos = { rot, row: r, col: c }; bestII = ii; }
            }
          }
        }
        if (bestPos && bestII >= 0 && placeItem(ctx, gi, bestII, bestPos.rot, bestPos.row, bestPos.col)) {
          placed++;
          placementCount++;
          keepGoing = true;
          if (!deferSecondary && ctx.empIdx >= 0 && ctx.effIdx >= 0) placeEfficiencyItems(ctx);
          if (!(deferRelative || deferSecondary) && ctx.relativeIndices.length > 0) placeRelativeItems(ctx);
        }
      }
    } else {
      for (const ii of itemList) {
        if (ii < 0) continue;
        let keepGoing = true;
        while (keepGoing && placed < maxP) {
          keepGoing = false;

          if (skipInterval > 0 && placementCount > 0 && placementCount % skipInterval === (skipInterval - 1)) {
            placementCount++;
            break;
          }

          let bestPos = null, bestScore = -Infinity;
          for (const rot of rots) {
            for (const { r, c } of ctx.roomTiles) {
              if (!ctx.freeBitmap[r * ctx.gridW + c]) continue;
              if (!canPlaceFast(ctx,gi, ii, rot, r, c, undefined)) continue;
              const posScore = scorePlacementPosition(ctx, gi, ii, rot, r, c);
              if (posScore > bestScore) { bestScore = posScore; bestPos = { rot, row: r, col: c }; }
            }
          }
          if (bestPos && placeItem(ctx, gi, ii, bestPos.rot, bestPos.row, bestPos.col)) {
            placed++;
            placementCount++;
            keepGoing = true;
            if (!deferSecondary && ctx.empIdx >= 0 && ctx.effIdx >= 0) placeEfficiencyItems(ctx);
            if (!(deferRelative || deferSecondary) && ctx.relativeIndices.length > 0) placeRelativeItems(ctx);
          }
        }
      }
    }

    await yieldToUI();
  }
  traceEnd('cons:hero');

  traceStart('cons:filler');
  // Pass 2: Filler items
  for (const gInfo of sortedGroups) {
    const gi = gInfo.groupIdx;
    const group = fs.groups[gi];
    const maxP = group.max ?? 100;
    if (gInfo.hasEfficiency && !gInfo.hasPrimary && ctx.empIdx >= 0 && ctx.effIdx >= 0) continue;
    if (gInfo.hasRelative && !gInfo.hasPrimary && ctx.relativeIndices.length > 0) continue;

    let placed = countGroupPlacements(ctx, gi);
    if (placed >= maxP) continue;
    const rots = getAllowedRotations(group);

    for (const ii of gInfo.fillerItems) {
      if (placed >= maxP) break;
      let keepGoing = true;
      while (keepGoing && placed < maxP) {
        keepGoing = false;
        let bestPos = null, bestScore = -Infinity;
        for (const rot of rots) {
          for (const { r, c } of ctx.roomTiles) {
            if (!ctx.freeBitmap[r * ctx.gridW + c]) continue;
            if (!canPlaceFast(ctx,gi, ii, rot, r, c, undefined)) continue;
            const posScore = scorePlacementPosition(ctx, gi, ii, rot, r, c);
            if (posScore > bestScore) { bestScore = posScore; bestPos = { rot, row: r, col: c }; }
          }
        }
        if (bestPos && placeItem(ctx, gi, ii, bestPos.rot, bestPos.row, bestPos.col)) {
          placed++;
          keepGoing = true;
          if (!deferSecondary && ctx.empIdx >= 0 && ctx.effIdx >= 0) placeEfficiencyItems(ctx);
          if (!(deferRelative || deferSecondary) && ctx.relativeIndices.length > 0) placeRelativeItems(ctx);
        }
      }
    }

    await yieldToUI();
  }
  traceEnd('cons:filler');

  // Final stat passes — always run, catches up on deferred items
  traceStart('cons:efficiency');
  if (ctx.empIdx >= 0 && ctx.effIdx >= 0) placeEfficiencyItems(ctx);
  traceEnd('cons:efficiency');
  traceStart('cons:relative');
  if (ctx.relativeIndices.length > 0) {
    if (deferRelative || deferSecondary) placeRelativeItemsSmallFirst(ctx);
    else placeRelativeItems(ctx);
  }
  traceEnd('cons:relative');
}

// ══════════════════════════════════════════════════════════
// Main entry point
// ══════════════════════════════════════════════════════════

/**
 * Run the v2 optimizer on the given room state.
 * @param {{
 *   building: import('../types.js').Building,
 *   furnitureSet: import('../types.js').FurnitureSet,
 *   gridW: number, gridH: number,
 *   room: boolean[][], placements: Array<{groupIdx:number, itemIdx:number, rotation:number, row:number, col:number}>,
 *   doors: Set<string>
 * }} input
 * @returns {Promise<{room: boolean[][], placements: Array<{groupIdx:number, itemIdx:number, rotation:number, row:number, col:number}>, doors: Set<string>}>}
 */
/**
 * Run a full strategy (constructive or strip) with gap fill and stat balancing.
 * Returns { score, snapshot }.
 */
async function runStrategy(ctx, strategyFn) {
  await strategyFn(ctx);
  placeMandatoryItems(ctx);
  if (ctx.empIdx >= 0 && ctx.effIdx >= 0) placeEfficiencyItems(ctx);
  if (ctx.relativeIndices.length > 0) placeRelativeItems(ctx);
  await gapFillPhase(ctx);
  if (ctx.empIdx >= 0 && ctx.effIdx >= 0) placeEfficiencyItems(ctx);
  if (ctx.relativeIndices.length > 0) placeRelativeItems(ctx);
  return { score: scoreLayout(ctx), snapshot: takeSnapshot(ctx) };
}

export async function runOptimizer(input) {
  const ctx = createContext(input);
  if (!ctx) return input;

  _traceEnabled = !!input.trace;
  _traces.length = 0;

  // Phase 0: Analysis & precomputation
  traceStart('analyzePhase');
  analyzePhase(ctx);
  traceEnd('analyzePhase');
  preCleanRoom(ctx);
  await placeRegularPillars(ctx);

  // Place one early door for indoor buildings (provides structural anchor)
  const doorCandidates = collectDoorCandidates(ctx);
  if (doorCandidates.length > 0) applyDoorCandidate(ctx, doorCandidates[0]);

  let bestScore = -Infinity;
  let bestSnapshot = null;

  const initialSnapshot = takeLightSnapshot(ctx);

  // Strategy A: Strip-based filling
  traceStart('strategy:strip');
  restoreLightSnapshot(ctx, initialSnapshot);
  const stripResult = await runStrategy(ctx, (c) => stripFillPhase(c));
  if (stripResult.score > bestScore) {
    bestScore = stripResult.score;
    bestSnapshot = stripResult.snapshot;
  }
  traceEnd('strategy:strip');

  // Strategy B–N: Multiple constructive restarts with variation
  const roomArea = ctx.roomTiles.length;
  const isLargeRoom = roomArea > 500;

  const constructiveConfigs = [
    { skipInterval: 0, heroRotate: 0, reverseScan: false, tryAllHeroSizes: false },  // baseline
    { skipInterval: 4, heroRotate: 0, reverseScan: false, tryAllHeroSizes: false },  // skip diversity
    { skipInterval: 0, heroRotate: 0, reverseScan: true,  tryAllHeroSizes: false },  // reversed scan
    { skipInterval: 0, heroRotate: 1, reverseScan: false, tryAllHeroSizes: false },  // rotated heroes
    { skipInterval: 0, heroRotate: 0, reverseScan: false, tryAllHeroSizes: true },   // all hero sizes
  ];

  if (!isLargeRoom) {
    // Per-height-class strategies (only for smaller rooms where item size diversity matters)
    for (const gInfo of ctx.groupInfo) {
      if (!gInfo.hasPrimary) continue;
      const group = ctx.furnitureSet.groups[gInfo.groupIdx];
      const heights = new Set();
      for (const item of group.items) heights.add(item.tiles.length);
      for (const h of heights) {
        constructiveConfigs.push(
          { skipInterval: 0, heroRotate: 0, reverseScan: false, tryAllHeroSizes: true, maxItemHeight: h },
          { skipInterval: 0, heroRotate: 0, reverseScan: true,  tryAllHeroSizes: true, maxItemHeight: h },
        );
      }
    }

    // Additional diversity for small/medium rooms
    constructiveConfigs.push(
      { skipInterval: 4, heroRotate: 0, reverseScan: true, tryAllHeroSizes: false },
      { skipInterval: 0, heroRotate: 2, reverseScan: false, tryAllHeroSizes: false },
      { skipInterval: 0, heroRotate: 3, reverseScan: false, tryAllHeroSizes: false },
      { skipInterval: 0, heroRotate: 4, reverseScan: false, tryAllHeroSizes: false },
      { skipInterval: 0, heroRotate: 1, reverseScan: true, tryAllHeroSizes: false },
      { skipInterval: 0, heroRotate: 2, reverseScan: true, tryAllHeroSizes: false },
      { skipInterval: 0, heroRotate: 3, reverseScan: true, tryAllHeroSizes: false },
      { skipInterval: 0, heroRotate: 4, reverseScan: true, tryAllHeroSizes: false },
      { skipInterval: 3, heroRotate: 0, reverseScan: false, tryAllHeroSizes: false },
      { skipInterval: 0, heroRotate: 0, reverseScan: false, tryAllHeroSizes: true, mixedSizing: true },
      { skipInterval: 0, heroRotate: 0, reverseScan: true,  tryAllHeroSizes: true, mixedSizing: true },
      { skipInterval: 0, heroRotate: 0, reverseScan: false, tryAllHeroSizes: true, mixedSizing: true, preferLarger: true },
      { skipInterval: 0, heroRotate: 0, reverseScan: true,  tryAllHeroSizes: true, mixedSizing: true, preferLarger: true },
    );
  } else {
    // For large rooms, just a few more configs
    constructiveConfigs.push(
      { skipInterval: 0, heroRotate: 2, reverseScan: false, tryAllHeroSizes: false },
      { skipInterval: 4, heroRotate: 0, reverseScan: true, tryAllHeroSizes: false },
    );
  }

  traceStart('strategies:constructive');
  for (const config of constructiveConfigs) {
    traceStart('strategy:constructive');
    restoreLightSnapshot(ctx, initialSnapshot);
    const result = await runStrategy(ctx, (c) => constructivePass(c, config));
    if (result.score > bestScore) {
      bestScore = result.score;
      bestSnapshot = result.snapshot;
    }
    traceEnd('strategy:constructive');
  }
  traceEnd('strategies:constructive');

  // Track best non-deferred result for fallback comparison
  let bestCoreSnapshot = bestSnapshot;

  // Deferred secondary strategies: place primary items without interleaved secondary items
  // (efficiency and/or relative), then place secondary items at end of pass.
  // Gives primary items maximum packing density.
  const hasSecondary = (ctx.empIdx >= 0 && ctx.effIdx >= 0) || ctx.relativeIndices.length > 0;
  if (hasSecondary && !isLargeRoom) {
    const deferredConfigs = [
      { skipInterval: 0, heroRotate: 0, reverseScan: false, tryAllHeroSizes: false, deferSecondary: true },
      { skipInterval: 0, heroRotate: 0, reverseScan: true,  tryAllHeroSizes: false, deferSecondary: true },
      { skipInterval: 0, heroRotate: 1, reverseScan: false, tryAllHeroSizes: false, deferSecondary: true },
      { skipInterval: 0, heroRotate: 0, reverseScan: false, tryAllHeroSizes: true, deferSecondary: true },
      { skipInterval: 0, heroRotate: 0, reverseScan: true,  tryAllHeroSizes: true, deferSecondary: true },
      { skipInterval: 0, heroRotate: 1, reverseScan: false, tryAllHeroSizes: true, deferSecondary: true },
      { skipInterval: 0, heroRotate: 0, reverseScan: false, tryAllHeroSizes: true, mixedSizing: true, deferSecondary: true },
      { skipInterval: 0, heroRotate: 0, reverseScan: false, tryAllHeroSizes: true, mixedSizing: true, preferLarger: true, deferSecondary: true },
    ];
    traceStart('strategies:deferred');
    for (const config of deferredConfigs) {
      traceStart('strategy:deferred');
      restoreLightSnapshot(ctx, initialSnapshot);
      const result = await runStrategy(ctx, (c) => constructivePass(c, config));
      if (result.score > bestScore) {
        bestScore = result.score;
        bestSnapshot = result.snapshot;
      }
      traceEnd('strategy:deferred');
    }
    traceEnd('strategies:deferred');
  }

  // Polish a snapshot with SA
  async function polishAndScore(snapshot) {
    restoreSnapshot(ctx, snapshot);
    traceStart('polish:localSearch');
    await localSearchPhase(ctx);
    traceEnd('polish:localSearch');
    traceStart('polish:trim');
    await trimPhase(ctx);
    traceEnd('polish:trim');
    traceStart('polish:door');
    doorPhase(ctx);
    traceEnd('polish:door');
    if (!validateFinal(ctx)) {
      restoreSnapshot(ctx, snapshot);
      doorPhase(ctx);
    }
    return { score: scoreLayout(ctx), snapshot: takeSnapshot(ctx) };
  }

  // Try polishing with multiple RNG seeds and keep the best result.
  // SA is sensitive to RNG trajectory — different seeds find different local optima.
  const polishSeeds = [ctx.rng.save(), ctx.baseSeed + 0x50015A];
  // For large rooms, skip multi-seed polish (too expensive)
  if (isLargeRoom) polishSeeds.length = 1;

  const candidates = [bestSnapshot];
  if (bestCoreSnapshot !== bestSnapshot) candidates.push(bestCoreSnapshot);

  let bestFinalScore = -Infinity;
  let bestFinalSnapshot = bestSnapshot;
  for (const seed of polishSeeds) {
    for (const snap of candidates) {
      ctx.rng.restore(seed);
      const result = await polishAndScore(snap);
      if (result.score > bestFinalScore) {
        bestFinalScore = result.score;
        bestFinalSnapshot = result.snapshot;
      }
    }
  }
  restoreSnapshot(ctx, bestFinalSnapshot);

  const trace = traceSummary();
  return { room: ctx.room, placements: ctx.placements, doors: ctx.doors, trace };
}

// ── Context creation ─────────────────────────────────────
function createContext(input) {
  const { building, furnitureSet, gridW, gridH, room, placements, doors } = input;
  if (!building || !furnitureSet) return null;

  let roomCount = 0;
  for (let r = 0; r < gridH; r++)
    for (let c = 0; c < gridW; c++)
      if (room[r][c]) roomCount++;
  if (roomCount === 0) return null;

  const clonedRoom = room.map(row => [...row]);
  const clonedPlacements = placements.map(p => ({ ...p }));
  const clonedDoors = new Set(doors);

  // Create base context with shared room-rule infrastructure
  const ctx = createRoomContext(furnitureSet, building, clonedRoom, clonedPlacements, gridW, gridH, clonedDoors);

  // Extend with optimizer-specific fields
  const primaryStatIdx = findPrimaryStatIndex(furnitureSet, building);
  const relativeIndices = [];
  if (furnitureSet.stats && building.items) {
    for (let i = 0; i < furnitureSet.stats.length; i++) {
      const s = furnitureSet.stats[i];
      if (s.type === "relative" || s.type === "employeesRelative") {
        let hasContributor = false;
        for (const bItem of building.items) {
          if (bItem?.stats && (bItem.stats[i] ?? 0) > 0) { hasContributor = true; break; }
        }
        if (hasContributor) relativeIndices.push({ statIdx: i });
      }
    }
  }
  const baseSeed = hashSeed(`${building.id}_${gridW}_${gridH}_${roomCount}`);

  ctx.lockedCount = clonedPlacements.length;
  ctx.primaryStatIdx = primaryStatIdx;
  ctx.relativeIndices = relativeIndices;
  ctx.relIdxSet = new Set(relativeIndices.map(rel => rel.statIdx));
  ctx.rng = createRNG(baseSeed);
  ctx.baseSeed = baseSeed;
  ctx.groupInfo = [];
  ctx.empIdx = -1;
  ctx.effIdx = -1;
  ctx.roomTiles = [];
  ctx.roomTileSet = new Set();
  ctx.unstableTileCount = 0;
  ctx.reservedTiles = new Set();

  return ctx;
}
