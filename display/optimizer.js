// Room Planner Auto-Optimizer — simulated annealing placement with constraint checking
import { AVAIL_BLOCKING, getRotatedTiles, getAllowedRotations, DIRS } from "./planner-core.js";

const DIRS8 = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
const SUPPORT_RADIUS = 4;
const DEBUG_OPTIMIZER = false;

// ── Efficient BFS queue (pointer-based, avoids O(n) Array.shift) ────
function createBFSQueue(capacity) {
  const buf = new Int32Array(capacity * 2);
  let head = 0, tail = 0;
  return {
    push(r, c) { buf[tail++] = r; buf[tail++] = c; },
    shift() { const r = buf[head++], c = buf[head++]; return [r, c]; },
    get length() { return (tail - head) >> 1; },
    reset() { head = 0; tail = 0; },
  };
}

/** B1: Stamp-based visited — O(1) reset by incrementing stamp instead of clearing array. */
function freshVisited(ctx) {
  ctx.visitedStamp++;
  if (ctx.visitedStamp === 0) { ctx.visitedBuf.fill(0); ctx.visitedStamp = 1; }
  return { buf: ctx.visitedBuf, stamp: ctx.visitedStamp, w: ctx.gridW };
}
function visitedHas(v, r, c) { return v.buf[r * v.w + c] === v.stamp; }
function visitedSet(v, r, c) { v.buf[r * v.w + c] = v.stamp; }

// ── Seeded PRNG (mulberry32) ─────────────────────────────

function createRNG(seed) {
  let s = seed | 0;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return h;
}

// Pre-allocated buffer for tileSupport (replaces per-call Set allocation)
const _tileSupportBuf = new Int32Array(128);

// Pre-compute stability rays (same as planner.js)
const SUPPORT_RAYS = [];
function bresenhamLine(x0, y0, x1, y1) {
  const steps = [];
  let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let cx = x0, cy = y0;
  while (cx !== x1 || cy !== y1) {
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; cx += sx; }
    if (e2 < dx) { err += dx; cy += sy; }
    steps.push({ dx: cx - x0, dy: cy - y0 });
  }
  return steps;
}
for (let dx = -SUPPORT_RADIUS; dx <= SUPPORT_RADIUS; dx++) {
  for (let dy = -SUPPORT_RADIUS; dy <= SUPPORT_RADIUS; dy++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== SUPPORT_RADIUS) continue;
    const steps = bresenhamLine(0, 0, dx, dy);
    if (steps.length > 0) SUPPORT_RAYS.push(steps);
  }
}

/** E1: Debug invariant check — rebuild state from scratch and compare with live state. */
function debugValidateState(ctx) {
  if (!DEBUG_OPTIMIZER) return;
  const { gridW, gridH, placements, furnitureSet: fs } = ctx;
  const refOcc = Array.from({ length: gridH }, () => Array(gridW).fill(-1));
  const refBc = Array.from({ length: gridH }, () => new Int8Array(gridW));
  const refGg = Array.from({ length: gridH }, () => new Int16Array(gridW).fill(-1));
  const refMrg = new Int8Array(gridW * gridH);
  let refOccCount = 0;
  for (let pi = 0; pi < placements.length; pi++) {
    const p = placements[pi];
    const tiles = getCachedTiles(ctx, p.groupIdx, p.itemIdx, p.rotation);
    for (let r = 0; r < tiles.length; r++) {
      for (let c = 0; c < (tiles[r]?.length ?? 0); c++) {
        const tileKey = tiles[r][c];
        if (tileKey === null) continue;
        const gr = p.row + r, gc = p.col + c;
        if (gr >= 0 && gr < gridH && gc >= 0 && gc < gridW) {
          if (refOcc[gr][gc] < 0) refOccCount++;
          refOcc[gr][gc] = pi;
          refGg[gr][gc] = p.groupIdx;
          const tt = fs.tileTypes[tileKey];
          if (tt && AVAIL_BLOCKING.has(tt.availability)) refBc[gr][gc]++;
          if (tt?.mustBeReachable) refMrg[gr * gridW + gc] = 1;
        }
      }
    }
  }
  for (let r = 0; r < gridH; r++) {
    for (let c = 0; c < gridW; c++) {
      if (ctx.occupancy[r][c] !== refOcc[r][c])
        console.error(`[DBG] occupancy mismatch at ${r},${c}: live=${ctx.occupancy[r][c]} ref=${refOcc[r][c]}`);
      if (ctx.blockerCount[r][c] !== refBc[r][c])
        console.error(`[DBG] blockerCount mismatch at ${r},${c}: live=${ctx.blockerCount[r][c]} ref=${refBc[r][c]}`);
      if (ctx.groupGrid[r][c] !== refGg[r][c])
        console.error(`[DBG] groupGrid mismatch at ${r},${c}: live=${ctx.groupGrid[r][c]} ref=${refGg[r][c]}`);
      if (ctx.mustReachGrid[r * gridW + c] !== refMrg[r * gridW + c])
        console.error(`[DBG] mustReachGrid mismatch at ${r},${c}: live=${ctx.mustReachGrid[r * gridW + c]} ref=${refMrg[r * gridW + c]}`);
    }
  }
  if (ctx.occupiedCount !== refOccCount)
    console.error(`[DBG] occupiedCount mismatch: live=${ctx.occupiedCount} ref=${refOccCount}`);
  let rtCount = 0;
  for (let r = 0; r < gridH; r++)
    for (let c = 0; c < gridW; c++)
      if (ctx.room[r][c]) {
        rtCount++;
        if (!ctx.roomTileSet.has(r * gridW + c))
          console.error(`[DBG] roomTileSet missing tile ${r},${c}`);
      }
  if (ctx.roomTiles.length !== rtCount)
    console.error(`[DBG] roomTiles.length=${ctx.roomTiles.length} vs actual=${rtCount}`);
}

/**
 * Run the optimizer on the given room state.
 * @param {{
 *   building: import('../types.js').Building,
 *   furnitureSet: import('../types.js').FurnitureSet,
 *   gridW: number, gridH: number,
 *   room: boolean[][], placements: Array<{groupIdx:number, itemIdx:number, rotation:number, row:number, col:number}>,
 *   doors: Set<string>
 * }} input
 * @returns {Promise<{room: boolean[][], placements: Array<{groupIdx:number, itemIdx:number, rotation:number, row:number, col:number}>, doors: Set<string>}>}
 */
export async function runOptimizer(input) {
  const ctx = createContext(input);
  if (!ctx) return input;

  // Phase 0: Analysis & precomputation
  analyzePhase(ctx);

  // Phase 0-: Trim dead-end tendrils before SA
  preCleanRoom(ctx);

  // Phase 0.5: Pre-place support pillars (before any furniture)
  await prePlacePillars(ctx);

  // Save initial state (post-pillar) for multi-restart
  const initialSnapshot = takeSnapshot(ctx);

  // Multi-restart: run constructive+SA+polish 3 times, keep best
  // Restart 0: standard constructive
  // Restart 1: diversity (skip every 4th hero)
  // Restart 2: neatness-aware constructive (H4/H5 facing heuristics)
  let bestResult = null;
  let bestResultScore = -Infinity;

  for (let restart = 0; restart < 3; restart++) {
    if (restart > 0) {
      restoreSnapshot(ctx, initialSnapshot);
      ctx.rng = createRNG(ctx.baseSeed + restart);
    }

    // Phase 1: Smart constructive phase (hero-first)
    const skipInterval = restart === 1 ? 4 : 0;
    const isNeatnessRestart = restart === 2;
    ctx.useNeatnessPlacement = isNeatnessRestart;
    ctx.useNeatnessSA = isNeatnessRestart;
    await constructivePhase(ctx, skipInterval);
    ctx.useNeatnessPlacement = false;
    ctx.constructiveSnapshot = takeSnapshot(ctx);

    // Phase 2: Simulated annealing
    await simulatedAnnealing(ctx);
    ctx.useNeatnessSA = false;

    // Phase 2.5: Post-SA polish
    await polishPhase(ctx);

    const score = scoreLayoutSA(ctx);
    if (score > bestResultScore) {
      bestResultScore = score;
      bestResult = takeSnapshot(ctx);
    }
  }

  // Restore the best result
  restoreSnapshot(ctx, bestResult);
  ctx.constructiveSnapshot = bestResult; // for validation fallback

  // Phase 3: Room trimming (run once on winner)
  await trimPhase(ctx);

  // Phase 3c: Micro gap-fill pass
  await microGapFill(ctx);

  // Phase 4: Door optimization
  doorPhase(ctx);

  // Phase 5: Final validation
  if (!validateFinal(ctx)) {
    restoreSnapshot(ctx, ctx.constructiveSnapshot);
  }

  return { room: ctx.room, placements: ctx.placements, doors: ctx.doors };
}

// ── Context ──────────────────────────────────────────────

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
  const lockedCount = clonedPlacements.length;
  const primaryStatIdx = findPrimaryStatIndex(furnitureSet, building);

  // Detect relative stat indices that have at least one contributing group.
  // Skip stats where no group provides positive contribution (e.g. employeesRelative
  // with all-zero item stats) — penalizing an unsatisfiable stat would discourage
  // placing primary items.
  const relativeIndices = [];
  if (furnitureSet.stats && building.items) {
    for (let i = 0; i < furnitureSet.stats.length; i++) {
      const s = furnitureSet.stats[i];
      if (s.type === "relative" || s.type === "employeesRelative") {
        let hasContributor = false;
        for (const bItem of building.items) {
          if (bItem?.stats && (bItem.stats[i] ?? 0) > 0) {
            hasContributor = true;
            break;
          }
        }
        if (hasContributor) relativeIndices.push({ statIdx: i });
      }
    }
  }
  const relIdxSet = new Set(relativeIndices.map(rel => rel.statIdx));

  const baseSeed = hashSeed(`${building.id}_${gridW}_${gridH}_${roomCount}`);

  const ctx = {
    building,
    furnitureSet,
    gridW,
    gridH,
    room: clonedRoom,
    placements: clonedPlacements,
    doors: clonedDoors,
    lockedCount,
    primaryStatIdx,
    relativeIndices,
    relIdxSet,
    occupancy: null,
    // Seeded PRNG
    rng: createRNG(baseSeed),
    baseSeed,
    // New fields populated in analyzePhase
    tileCache: new Map(),
    groupInfo: [],
    empIdx: -1,
    effIdx: -1,
    roomTiles: [],
    roomTileSet: new Set(), // Phase 1e: O(1) add/delete for room tiles
    bestSnapshot: null,
    constructiveSnapshot: null,
    // Phase 1a: Reusable BFS queue
    bfsQueue: createBFSQueue(gridW * gridH),
    // Phase 1b: Incremental blocker tracking
    blockerCount: Array.from({ length: gridH }, () => new Int8Array(gridW)),
    // Phase 1c: Incremental stability tracking
    unstableTileCount: 0,
    stabilityDirty: true, // force initial computation
    // Phase 1d: Incremental stats, group counts, occupied count
    currentStats: null,
    statsDirty: true,
    groupCounts: null,
    occupiedCount: 0,
    // Incremental group-identity grid for type-aware alignment scoring
    groupGrid: Array.from({ length: gridH }, () => new Int16Array(gridW).fill(-1)),
    // H1/H2: mustBeReachable grid for walkable-sharing and blocker-packing heuristics
    mustReachGrid: new Int8Array(gridW * gridH),
    // B1: Stamp-based visited buffer (shared across BFS functions)
    visitedBuf: new Uint32Array(gridW * gridH),
    visitedStamp: 0,
    // Stamp-based blocked buffer (for wouldDisconnectRoomOpt)
    blockedBuf: new Uint32Array(gridW * gridH),
    blockedStamp: 0,
    // B4: mustReach cache
    mustReachCache: null,
    mustReachDirty: true,
    // Walkability cache — valid until next state mutation
    _walkabilityValid: false,
  };

  ctx.occupancy = buildOccupancyGrid(ctx);
  return ctx;
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

// ── Snapshot helpers ─────────────────────────────────────

function takeSnapshot(ctx) {
  return {
    placements: ctx.placements.map(p => ({ ...p })),
    room: ctx.room.map(row => [...row]),
    doors: new Set(ctx.doors),
  };
}

function restoreSnapshot(ctx, snapshot) {
  ctx.placements = snapshot.placements.map(p => ({ ...p }));
  ctx.room = snapshot.room.map(row => [...row]);
  ctx.doors = new Set(snapshot.doors);
  ctx.occupancy = buildOccupancyGrid(ctx);
  rebuildRoomTiles(ctx);
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
  // Rebuild group counts
  rebuildGroupCounts(ctx);
}

/** Remove a single room tile and update room, roomTileSet, roomTiles. */
function removeRoomTile(ctx, r, c) {
  ctx.room[r][c] = false;
  const key = r * ctx.gridW + c;
  ctx.roomTileSet.delete(key);
  const idx = ctx.roomTiles.findIndex(t => t.r === r && t.c === c);
  if (idx >= 0) ctx.roomTiles.splice(idx, 1);
  markStabilityDirty(ctx);
  ctx._doorCandidateCache = undefined;
  ctx._walkabilityValid = false;
}

/** Restore a room tile and update room, roomTileSet, roomTiles. */
function restoreRoomTile(ctx, r, c) {
  ctx.room[r][c] = true;
  ctx.roomTiles.push({ r, c });
  ctx.roomTileSet.add(r * ctx.gridW + c);
  markStabilityDirty(ctx);
  ctx._doorCandidateCache = undefined;
  ctx._walkabilityValid = false;
}

function rebuildGroupCounts(ctx) {
  const numGroups = ctx.furnitureSet.groups.length;
  ctx.groupCounts = new Int16Array(numGroups);
  for (const p of ctx.placements) {
    if (p.groupIdx >= 0 && p.groupIdx < numGroups) {
      ctx.groupCounts[p.groupIdx]++;
    }
  }
}

// ── Occupancy grid ───────────────────────────────────────

function buildOccupancyGrid(ctx) {
  const { gridW, gridH, placements, furnitureSet: fs } = ctx;
  const grid = Array.from({ length: gridH }, () => Array(gridW).fill(-1));
  // Reset blocker count, occupied count, group grid, and mustReachGrid
  const bc = Array.from({ length: gridH }, () => new Int8Array(gridW));
  const gg = Array.from({ length: gridH }, () => new Int16Array(gridW).fill(-1));
  const mrg = new Int8Array(gridW * gridH);
  let occCount = 0;
  for (let pi = 0; pi < placements.length; pi++) {
    const p = placements[pi];
    const tiles = getCachedTiles(ctx, p.groupIdx, p.itemIdx, p.rotation);
    for (let r = 0; r < tiles.length; r++) {
      for (let c = 0; c < (tiles[r]?.length ?? 0); c++) {
        const tileKey = tiles[r][c];
        if (tileKey === null) continue;
        const gr = p.row + r, gc = p.col + c;
        if (gr >= 0 && gr < gridH && gc >= 0 && gc < gridW) {
          if (grid[gr][gc] < 0) occCount++;
          grid[gr][gc] = pi;
          gg[gr][gc] = p.groupIdx;
          const tt = fs.tileTypes[tileKey];
          if (tt && AVAIL_BLOCKING.has(tt.availability)) {
            bc[gr][gc]++;
          }
          if (tt?.mustBeReachable) {
            mrg[gr * gridW + gc] = 1;
          }
        }
      }
    }
  }
  ctx.blockerCount = bc;
  ctx.groupGrid = gg;
  ctx.mustReachGrid = mrg;
  ctx.occupiedCount = occCount;
  ctx.statsDirty = true;
  ctx.stabilityDirty = true;
  ctx.mustReachDirty = true;
  ctx._walkabilityValid = false;
  return grid;
}

/** Set occupancy for a specific placement index. Returns false if overlap detected. */
function setOccupancy(ctx, pi) {
  const p = ctx.placements[pi];
  const fs = ctx.furnitureSet;
  const tiles = getCachedTiles(ctx, p.groupIdx, p.itemIdx, p.rotation);
  let overlap = false;
  for (let r = 0; r < tiles.length; r++) {
    for (let c = 0; c < (tiles[r]?.length ?? 0); c++) {
      const tileKey = tiles[r][c];
      if (tileKey === null) continue;
      const gr = p.row + r, gc = p.col + c;
      if (gr < 0 || gr >= ctx.gridH || gc < 0 || gc >= ctx.gridW) { overlap = true; continue; }
      if (!ctx.room[gr][gc]) { overlap = true; continue; }
      if (ctx.occupancy[gr][gc] >= 0 && ctx.occupancy[gr][gc] !== pi) overlap = true;
      if (ctx.occupancy[gr][gc] < 0) ctx.occupiedCount++;
      ctx.occupancy[gr][gc] = pi;
      ctx.groupGrid[gr][gc] = p.groupIdx;
      // Phase 1b: Update blocker tracking
      const tt = fs.tileTypes[tileKey];
      if (tt && AVAIL_BLOCKING.has(tt.availability)) {
        ctx.blockerCount[gr][gc]++;
      }
      // H1/H2: Update mustReachGrid
      if (tt?.mustBeReachable) {
        ctx.mustReachGrid[gr * ctx.gridW + gc] = 1;
      }
    }
  }
  ctx.statsDirty = true;
  ctx.mustReachDirty = true;
  ctx._walkabilityValid = false;
  return !overlap;
}

/** Clear occupancy for a specific placement index.
 *  Only decrements blockerCount when occupancy actually matches,
 *  preventing desync from mismatched clear/set pairs. */
function clearOccupancy(ctx, pi) {
  const p = ctx.placements[pi];
  const fs = ctx.furnitureSet;
  const tiles = getCachedTiles(ctx, p.groupIdx, p.itemIdx, p.rotation);
  for (let r = 0; r < tiles.length; r++) {
    for (let c = 0; c < (tiles[r]?.length ?? 0); c++) {
      const tileKey = tiles[r][c];
      if (tileKey === null) continue;
      const gr = p.row + r, gc = p.col + c;
      if (gr >= 0 && gr < ctx.gridH && gc >= 0 && gc < ctx.gridW) {
        if (ctx.occupancy[gr][gc] === pi) {
          ctx.occupancy[gr][gc] = -1;
          ctx.groupGrid[gr][gc] = -1;
          ctx.occupiedCount--;
          // Only decrement blocker when this piece actually owns the tile
          const tt = fs.tileTypes[tileKey];
          if (tt && AVAIL_BLOCKING.has(tt.availability)) {
            ctx.blockerCount[gr][gc]--;
          }
          // H1/H2: Clear mustReachGrid
          if (tt?.mustBeReachable) {
            ctx.mustReachGrid[gr * ctx.gridW + gc] = 0;
          }
        }
      }
    }
  }
  ctx.statsDirty = true;
  ctx.mustReachDirty = true;
  ctx._walkabilityValid = false;
}

// ── Tile cache ───────────────────────────────────────────

function getCachedTiles(ctx, groupIdx, itemIdx, rotation) {
  const key = `${groupIdx}_${itemIdx}_${rotation}`;
  let cached = ctx.tileCache.get(key);
  if (!cached) {
    const item = ctx.furnitureSet.groups[groupIdx]?.items[itemIdx];
    if (!item) return [];
    cached = getRotatedTiles(item, rotation);
    ctx.tileCache.set(key, cached);
  }
  return cached;
}

// ── Stat computation ─────────────────────────────────────

function computeStats(ctx) {
  const { furnitureSet: fs, building: bld, placements } = ctx;
  if (!fs.stats || !bld.items) return new Array(fs.stats?.length ?? 0).fill(0);
  const totals = new Array(fs.stats.length).fill(0);
  for (const p of placements) {
    const item = fs.groups[p.groupIdx]?.items[p.itemIdx];
    if (!item) continue;
    const bItem = bld.items[p.groupIdx];
    if (!bItem || !bItem.stats) continue;
    const mult = item.multiplierStats ?? item.multiplier;
    for (let s = 0; s < bItem.stats.length && s < totals.length; s++) {
      totals[s] += bItem.stats[s] * mult;
    }
  }
  return totals;
}

/** B3: Cached stats — recomputes only when dirty. */
function getStats(ctx) {
  if (ctx.statsDirty || !ctx.currentStats) {
    ctx.currentStats = computeStats(ctx);
    ctx.statsDirty = false;
  }
  return ctx.currentStats;
}

// ── Score function ───────────────────────────────────────

function scoreLayoutSA(ctx) {
  const stats = getStats(ctx);
  const primary = stats[ctx.primaryStatIdx] ?? 0;

  // Secondary stats (excluding efficiency and relative which are handled separately)
  const relIdxSet = ctx.relIdxSet;
  let secondary = 0;
  for (let i = 0; i < stats.length; i++) {
    if (i !== ctx.primaryStatIdx && i !== ctx.effIdx && !relIdxSet.has(i)) secondary += stats[i];
  }

  // Total build cost
  let totalCost = 0;
  const { building: bld, furnitureSet: fs, placements } = ctx;
  for (const p of placements) {
    const bItem = bld.items?.[p.groupIdx];
    if (!bItem?.costs) continue;
    const item = fs.groups[p.groupIdx]?.items[p.itemIdx];
    if (!item) continue;
    for (const cost of bItem.costs) {
      totalCost += cost.amount * item.multiplier;
    }
  }

  // Efficiency: huge bonus up to employee count, worthless beyond
  let effBonus = 0;
  let effPenalty = 0;
  if (ctx.empIdx >= 0 && ctx.effIdx >= 0) {
    const emp = stats[ctx.empIdx] ?? 0;
    const eff = stats[ctx.effIdx] ?? 0;
    effBonus = Math.min(eff, emp) * 10000;
    if (eff < emp) {
      const deficit = emp - eff;
      effPenalty = deficit * deficit * 1000;
    }
  }

  // Relative stats: bonus for coverage, quadratic penalty for deficit
  let relBonus = 0, relPenalty = 0;
  for (const rel of ctx.relativeIndices) {
    const primaryVal = stats[ctx.primaryStatIdx] ?? 0;
    const relVal = stats[rel.statIdx] ?? 0;
    relBonus += Math.min(relVal, primaryVal) * 500;
    if (relVal < primaryVal) {
      const deficit = primaryVal - relVal;
      relPenalty += deficit * deficit * 200;
    }
  }

  // Stability penalty (heavy — each unstable tile is very bad)
  const unstableCount = getCachedUnstableCount(ctx);
  const stabilityPenalty = unstableCount * 500;

  // Room size penalty: progressive — tiles beyond needed get penalized harder (Phase 3b)
  const roomTileCount = ctx.roomTiles.length;
  const occupied = ctx.occupiedCount;
  const minNeeded = occupied + Math.ceil(occupied * 0.3);
  const excess = Math.max(0, roomTileCount - minNeeded);
  const roomPenalty = minNeeded * 10 + excess * 25;

  // Packing density bonus: increased weight (Phase 2f)
  const packingBonus = (occupied / Math.max(1, roomTileCount)) * 200;

  // Phase 2d: Alignment bonus — reward contiguous occupied runs along rows/cols
  let alignBonus = 0;
  const { gridW, gridH } = ctx;
  // Horizontal runs
  for (let r = 0; r < gridH; r++) {
    let runLen = 0;
    for (let c = 0; c < gridW; c++) {
      if (ctx.room[r][c] && ctx.occupancy[r][c] >= 0) {
        runLen++;
      } else {
        if (runLen >= 2) alignBonus += runLen * 0.5;
        runLen = 0;
      }
    }
    if (runLen >= 2) alignBonus += runLen * 0.5;
  }
  // Vertical runs
  for (let c = 0; c < gridW; c++) {
    let runLen = 0;
    for (let r = 0; r < gridH; r++) {
      if (ctx.room[r][c] && ctx.occupancy[r][c] >= 0) {
        runLen++;
      } else {
        if (runLen >= 2) alignBonus += runLen * 0.5;
        runLen = 0;
      }
    }
    if (runLen >= 2) alignBonus += runLen * 0.5;
  }

  // Type-aware alignment bonus — reward runs of same groupIdx along rows/cols
  let typeAlignBonus = 0;
  // Horizontal runs
  for (let r = 0; r < gridH; r++) {
    let runLen = 0, runGroup = -1;
    for (let c = 0; c < gridW; c++) {
      const g = ctx.groupGrid[r][c];
      if (g >= 0 && g === runGroup) {
        runLen++;
      } else {
        if (runLen >= 2) typeAlignBonus += runLen * 0.3;
        runLen = g >= 0 ? 1 : 0;
        runGroup = g;
      }
    }
    if (runLen >= 2) typeAlignBonus += runLen * 0.3;
  }
  // Vertical runs
  for (let c = 0; c < gridW; c++) {
    let runLen = 0, runGroup = -1;
    for (let r = 0; r < gridH; r++) {
      const g = ctx.groupGrid[r][c];
      if (g >= 0 && g === runGroup) {
        runLen++;
      } else {
        if (runLen >= 2) typeAlignBonus += runLen * 0.3;
        runLen = g >= 0 ? 1 : 0;
        runGroup = g;
      }
    }
    if (runLen >= 2) typeAlignBonus += runLen * 0.3;
  }

  // Phase 2e: Walkway corridor bonus — reward straight runs of open tiles
  let walkwayBonus = 0;
  // Horizontal walkways
  for (let r = 0; r < gridH; r++) {
    let runLen = 0;
    for (let c = 0; c < gridW; c++) {
      if (ctx.room[r][c] && ctx.occupancy[r][c] < 0 && ctx.blockerCount[r][c] === 0) {
        runLen++;
      } else {
        if (runLen >= 3) walkwayBonus += runLen;
        runLen = 0;
      }
    }
    if (runLen >= 3) walkwayBonus += runLen;
  }
  // Vertical walkways
  for (let c = 0; c < gridW; c++) {
    let runLen = 0;
    for (let r = 0; r < gridH; r++) {
      if (ctx.room[r][c] && ctx.occupancy[r][c] < 0 && ctx.blockerCount[r][c] === 0) {
        runLen++;
      } else {
        if (runLen >= 3) walkwayBonus += runLen;
        runLen = 0;
      }
    }
    if (runLen >= 3) walkwayBonus += runLen;
  }

  // H1/H2/H3: Neatness bonuses — only computed during neatness restart (restart 2).
  // Skipping the grid scan entirely on restarts 0/1 avoids ~gridW*gridH wasted iterations
  // per scoring call (significant for large rooms like 40x40 Smithy).
  let neatBonus = 0;
  if (ctx.useNeatnessSA) {
    let walkableSharingBonus = 0;
    let blockerPackingBonus = 0;
    let deadSpacePenalty = 0;

    for (let r = 0; r < gridH; r++) {
      for (let c = 0; c < gridW; c++) {
        if (!ctx.room[r][c]) continue;

        const isOccupied = ctx.occupancy[r][c] >= 0;
        const isBlocked = ctx.blockerCount[r][c] > 0;
        const isMustReach = ctx.mustReachGrid[r * gridW + c] === 1;

        if (!isOccupied && !isBlocked) {
          // H1: Walkable tile — count adjacent mustBeReachable tiles
          let adjMR = 0;
          for (const [dr, dc] of DIRS) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < gridH && nc >= 0 && nc < gridW
                && ctx.mustReachGrid[nr * gridW + nc] === 1) {
              adjMR++;
            }
          }
          if (adjMR >= 2) walkableSharingBonus += adjMR * (adjMR - 1) / 2;

          // H3: Dead space — 3+ blocked/wall neighbors, no adjacent mustReachable
          if (adjMR === 0) {
            let blockedNeighbors = 0;
            for (const [dr, dc] of DIRS) {
              const nr = r + dr, nc = c + dc;
              if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW || !ctx.room[nr][nc]) {
                blockedNeighbors++;
              } else if (ctx.blockerCount[nr][nc] > 0) {
                blockedNeighbors++;
              }
            }
            if (blockedNeighbors >= 3) deadSpacePenalty++;
          }
        } else if (isBlocked && !isMustReach) {
          // H2: Blocking non-mustReachable tile — count adjacent blockers/walls
          let packedNeighbors = 0;
          for (const [dr, dc] of DIRS) {
            const nr = r + dr, nc = c + dc;
            if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW || !ctx.room[nr][nc]) {
              packedNeighbors++;
            } else if (ctx.blockerCount[nr][nc] > 0) {
              packedNeighbors++;
            }
          }
          blockerPackingBonus += packedNeighbors;
        }
      }
    }

    neatBonus = walkableSharingBonus * 4 + blockerPackingBonus - deadSpacePenalty * 2;
  }

  return primary * 1000 + secondary + effBonus + relBonus + packingBonus
         + alignBonus * 2 + typeAlignBonus * 2 + walkwayBonus * 0.5
         + neatBonus
         - totalCost * 0.001 - effPenalty - relPenalty
         - stabilityPenalty - roomPenalty;
}

// ── Placement validation (optimizer-local) ───────────────

function canPlaceOpt(ctx, groupIdx, itemIdx, rotation, row, col, skipPi) {
  const { furnitureSet: fs, gridW, gridH, room, occupancy } = ctx;
  const tiles = getCachedTiles(ctx, groupIdx, itemIdx, rotation);
  if (tiles.length === 0) return false;

  const proposedBlockers = new Set();
  const proposedTiles = [];

  for (let r = 0; r < tiles.length; r++) {
    for (let c = 0; c < (tiles[r]?.length ?? 0); c++) {
      const tileKey = tiles[r][c];
      if (tileKey === null) continue;
      const gr = row + r, gc = col + c;
      if (gr < 0 || gr >= gridH || gc < 0 || gc >= gridW) return false;
      if (!room[gr][gc]) return false;
      const occ = occupancy[gr][gc];
      if (occ >= 0 && occ !== skipPi) return false;
      proposedTiles.push({ gr, gc, tileKey });
      const tt = fs.tileTypes[tileKey];
      if (tt && AVAIL_BLOCKING.has(tt.availability)) {
        proposedBlockers.add(gr * gridW + gc);
      }
    }
  }

  // mustBeReachable check for proposed tiles
  for (const { gr, gc, tileKey } of proposedTiles) {
    const tt = fs.tileTypes[tileKey];
    if (!tt?.mustBeReachable) continue;
    let blockedCount = 0;
    for (const [dr, dc] of DIRS) {
      const nr = gr + dr, nc = gc + dc;
      if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW || !room[nr][nc]) {
        blockedCount++;
      } else if (isBlockerAtOpt(ctx, nr, nc, proposedBlockers, skipPi)) {
        blockedCount++;
      }
    }
    if (blockedCount >= 4) return false;
  }

  // Don't fully block existing mustBeReachable tiles
  for (const { gr, gc, tileKey } of proposedTiles) {
    const tt = fs.tileTypes[tileKey];
    if (!tt || !AVAIL_BLOCKING.has(tt.availability)) continue;
    for (const [dr, dc] of DIRS) {
      const nr = gr + dr, nc = gc + dc;
      if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW) continue;
      const existingTT = getFurnitureTileAtOpt(ctx, nr, nc, skipPi);
      if (existingTT?.mustBeReachable) {
        if (wouldBeFullyBlockedOpt(ctx, nr, nc, proposedBlockers, skipPi)) return false;
      }
    }
  }

  // Furniture reachability: the piece as a whole must have at least one
  // walkable (non-blocked) neighbor on its perimeter. Workers can walk on
  // non-blocking occupied tiles, so only blockers prevent reachability.
  const proposedSet = new Set(proposedTiles.map(t => t.gr * gridW + t.gc));
  let hasWalkableNeighbor = false;
  for (const { gr, gc } of proposedTiles) {
    if (hasWalkableNeighbor) break;
    for (const [dr, dc] of DIRS) {
      const nr = gr + dr, nc = gc + dc;
      if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW) continue;
      if (!room[nr][nc]) continue;
      if (proposedSet.has(nr * gridW + nc)) continue; // part of this piece
      if (isBlockerAtOpt(ctx, nr, nc, proposedBlockers, skipPi)) continue;
      hasWalkableNeighbor = true;
      break;
    }
  }
  if (!hasWalkableNeighbor) return false;

  // Check that placing proposed blockers doesn't fully enclose adjacent existing pieces.
  // Only blocking tiles can cause enclosure (non-blocking don't prevent pathfinding).
  if (proposedBlockers.size > 0) {
    const checkedPieces = new Set();
    for (const { gr, gc, tileKey } of proposedTiles) {
      const tt = fs.tileTypes[tileKey];
      if (!tt || !AVAIL_BLOCKING.has(tt.availability)) continue;
      for (const [dr, dc] of DIRS) {
        const nr = gr + dr, nc = gc + dc;
        if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW) continue;
        const adjPi = occupancy[nr][nc];
        if (adjPi < 0 || adjPi === skipPi || checkedPieces.has(adjPi)) continue;
        checkedPieces.add(adjPi);
        // Verify this adjacent piece still has at least one non-blocked neighbor
        if (!pieceHasWalkableNeighbor(ctx, adjPi, proposedBlockers, proposedSet, skipPi)) return false;
      }
    }
  }

  // Connectivity check
  if (proposedBlockers.size > 0) {
    if (wouldDisconnectRoomOpt(ctx, proposedBlockers, skipPi)) return false;
  }

  return true;
}

/** Check if an existing placement still has at least one non-blocked neighbor,
 *  considering proposed blockers and proposed occupied tiles. */
function pieceHasWalkableNeighbor(ctx, pi, proposedBlockers, proposedSet, skipPi) {
  const { gridW, gridH, room } = ctx;
  const p = ctx.placements[pi];
  if (!p) return true;
  const tiles = getCachedTiles(ctx, p.groupIdx, p.itemIdx, p.rotation);
  for (let r = 0; r < tiles.length; r++) {
    for (let c = 0; c < (tiles[r]?.length ?? 0); c++) {
      if (tiles[r][c] === null) continue;
      const gr = p.row + r, gc = p.col + c;
      for (const [dr, dc] of DIRS) {
        const nr = gr + dr, nc = gc + dc;
        if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW) continue;
        if (!room[nr][nc]) continue;
        if (proposedSet.has(nr * gridW + nc)) continue; // part of the new piece
        if (isBlockerAtOpt(ctx, nr, nc, proposedBlockers, skipPi)) continue;
        return true; // found a walkable neighbor
      }
    }
  }
  return false;
}

function isBlockerAtOpt(ctx, r, c, proposedBlockers, skipPi) {
  if (proposedBlockers.has(r * ctx.gridW + c)) return true;
  const tt = getFurnitureTileAtOpt(ctx, r, c, skipPi);
  return tt !== null && AVAIL_BLOCKING.has(tt.availability);
}

function getFurnitureTileAtOpt(ctx, r, c, skipPi) {
  const pi = ctx.occupancy[r]?.[c];
  if (pi === undefined || pi < 0 || pi === skipPi) return null;
  const p = ctx.placements[pi];
  if (!p) return null;
  const tiles = getCachedTiles(ctx, p.groupIdx, p.itemIdx, p.rotation);
  const lr = r - p.row, lc = c - p.col;
  const tileKey = tiles[lr]?.[lc];
  if (tileKey == null) return null;
  return ctx.furnitureSet.tileTypes[tileKey] || null;
}

function wouldBeFullyBlockedOpt(ctx, r, c, proposedBlockers, skipPi) {
  let blockedCount = 0;
  for (const [dr, dc] of DIRS) {
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nr >= ctx.gridH || nc < 0 || nc >= ctx.gridW || !ctx.room[nr][nc]) {
      blockedCount++;
    } else if (isBlockerAtOpt(ctx, nr, nc, proposedBlockers, skipPi)) {
      blockedCount++;
    }
  }
  return blockedCount >= 4;
}

function wouldDisconnectRoomOpt(ctx, proposedBlockers, skipPi) {
  const { gridW, gridH, room } = ctx;
  // Build blocked view using stamp-based buffer (avoids 2D array allocation)
  ctx.blockedStamp++;
  if (ctx.blockedStamp === 0) { ctx.blockedBuf.fill(0); ctx.blockedStamp = 1; }
  const bStamp = ctx.blockedStamp;
  const bBuf = ctx.blockedBuf;
  for (let r = 0; r < gridH; r++) {
    for (let c = 0; c < gridW; c++) {
      if (ctx.blockerCount[r][c] > 0) bBuf[r * gridW + c] = bStamp;
    }
  }
  // Clear blockers from the skipped placement
  if (skipPi !== undefined && skipPi >= 0) {
    const sp = ctx.placements[skipPi];
    if (sp) {
      const stiles = getCachedTiles(ctx, sp.groupIdx, sp.itemIdx, sp.rotation);
      for (let r = 0; r < stiles.length; r++) {
        for (let c = 0; c < (stiles[r]?.length ?? 0); c++) {
          if (stiles[r][c] === null) continue;
          const gr = sp.row + r, gc = sp.col + c;
          if (gr >= 0 && gr < gridH && gc >= 0 && gc < gridW) bBuf[gr * gridW + gc] = 0;
        }
      }
    }
  }
  // proposedBlockers keys are numeric (r * gridW + c)
  for (const key of proposedBlockers) {
    bBuf[key] = bStamp;
  }

  let totalOpen = 0, startR = -1, startC = -1;
  for (let r = 0; r < gridH; r++) {
    for (let c = 0; c < gridW; c++) {
      if (room[r][c] && bBuf[r * gridW + c] !== bStamp) {
        totalOpen++;
        if (startR < 0) { startR = r; startC = c; }
      }
    }
  }
  if (totalOpen === 0) return false;

  const v = freshVisited(ctx);
  const q = ctx.bfsQueue;
  q.reset();
  q.push(startR, startC);
  visitedSet(v, startR, startC);
  let reached = 1;

  while (q.length > 0) {
    const [cr, cc] = q.shift();
    for (const [dr, dc] of DIRS) {
      const nr = cr + dr, nc = cc + dc;
      if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW) continue;
      if (visitedHas(v, nr, nc) || !room[nr][nc] || bBuf[nr * gridW + nc] === bStamp) continue;
      visitedSet(v, nr, nc);
      reached++;
      q.push(nr, nc);
    }
  }
  return reached < totalOpen;
}

// ── Walkability check ────────────────────────────────────

function checkWalkabilityOpt(ctx) {
  const { furnitureSet: fs, gridW, gridH, room, placements, blockerCount } = ctx;

  // B4: Cache mustReach positions
  let mustReach;
  if (!ctx.mustReachDirty && ctx.mustReachCache) {
    mustReach = ctx.mustReachCache;
  } else {
    mustReach = [];
    for (const p of placements) {
      const tiles = getCachedTiles(ctx, p.groupIdx, p.itemIdx, p.rotation);
      for (let r = 0; r < tiles.length; r++) {
        for (let c = 0; c < (tiles[r]?.length ?? 0); c++) {
          const tileKey = tiles[r][c];
          if (tileKey === null) continue;
          const gr = p.row + r, gc = p.col + c;
          if (gr < 0 || gr >= gridH || gc < 0 || gc >= gridW) continue;
          const tt = fs.tileTypes[tileKey];
          if (tt?.mustBeReachable) mustReach.push({ row: gr, col: gc });
        }
      }
    }
    ctx.mustReachCache = mustReach;
    ctx.mustReachDirty = false;
  }

  const v = freshVisited(ctx);
  const q = ctx.bfsQueue;
  q.reset();
  let totalOpen = 0;
  let seeded = false;

  for (let r = 0; r < gridH; r++) {
    for (let c = 0; c < gridW; c++) {
      if (room[r][c] && blockerCount[r][c] === 0) {
        totalOpen++;
        if (!seeded) {
          q.push(r, c);
          visitedSet(v, r, c);
          seeded = true;
        }
      }
    }
  }

  let reached = seeded ? 1 : 0;
  while (q.length > 0) {
    const [cr, cc] = q.shift();
    for (const [dr, dc] of DIRS) {
      const nr = cr + dr, nc = cc + dc;
      if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW) continue;
      if (visitedHas(v, nr, nc) || !room[nr][nc] || blockerCount[nr][nc] > 0) continue;
      visitedSet(v, nr, nc);
      reached++;
      q.push(nr, nc);
    }
  }

  for (const { row, col } of mustReach) {
    let reachable = false;
    for (const [dr, dc] of DIRS) {
      const nr = row + dr, nc = col + dc;
      if (nr >= 0 && nr < gridH && nc >= 0 && nc < gridW && visitedHas(v, nr, nc)) {
        reachable = true;
        break;
      }
    }
    if (!reachable) return false;
  }

  // Every furniture piece must have at least one walkable neighbor on its perimeter.
  // A fully enclosed piece can never be interacted with by workers.
  for (const p of placements) {
    const pTiles = getCachedTiles(ctx, p.groupIdx, p.itemIdx, p.rotation);
    let pieceReachable = false;
    for (let r = 0; r < pTiles.length && !pieceReachable; r++) {
      for (let c = 0; c < (pTiles[r]?.length ?? 0) && !pieceReachable; c++) {
        if (pTiles[r][c] === null) continue;
        const gr = p.row + r, gc = p.col + c;
        for (const [dr, dc] of DIRS) {
          const nr = gr + dr, nc = gc + dc;
          if (nr >= 0 && nr < gridH && nc >= 0 && nc < gridW && visitedHas(v, nr, nc)) {
            pieceReachable = true;
            break;
          }
        }
      }
    }
    if (!pieceReachable) return false;
  }

  const walkable = reached >= totalOpen;
  if (walkable) ctx._walkabilityValid = true;
  return walkable;
}

// ── Stability check ──────────────────────────────────────

function checkStabilityOpt(ctx) {
  if (!ctx.furnitureSet.mustBeIndoors) return true;
  const { gridW, gridH, room } = ctx;
  for (let r = 0; r < gridH; r++) {
    for (let c = 0; c < gridW; c++) {
      if (!room[r][c]) continue;
      if (tileSupport(room, gridW, gridH, r, c) < 1.0) return false;
    }
  }
  return true;
}

/** Compute support score for a single tile. */
function tileSupport(room, gridW, gridH, r, c) {
  let checkedLen = 0;
  let support = 0;
  for (const ray of SUPPORT_RAYS) {
    for (let i = 0; i < ray.length; i++) {
      const tr = r + ray[i].dy, tc = c + ray[i].dx;
      if (tr < 0 || tr >= gridH || tc < 0 || tc >= gridW) break;
      if (!room[tr][tc]) {
        const key = tr * gridW + tc;
        let found = false;
        for (let j = 0; j < checkedLen; j++) {
          if (_tileSupportBuf[j] === key) { found = true; break; }
        }
        if (!found) {
          _tileSupportBuf[checkedLen++] = key;
          support += Math.max(0, (3.5 - i) / 3.5);
        }
        break;
      }
    }
  }
  return support;
}

/** Count unstable tiles (for scoring penalty). Returns 0 for outdoor buildings. */
function countUnstableTiles(ctx) {
  if (!ctx.furnitureSet.mustBeIndoors) return 0;
  const { gridW, gridH, room } = ctx;
  let count = 0;
  for (let r = 0; r < gridH; r++) {
    for (let c = 0; c < gridW; c++) {
      if (!room[r][c]) continue;
      if (tileSupport(room, gridW, gridH, r, c) < 1.0) count++;
    }
  }
  return count;
}

/** Get cached unstable tile count, recomputing only when dirty. */
function getCachedUnstableCount(ctx) {
  if (ctx.stabilityDirty) {
    ctx.unstableTileCount = countUnstableTiles(ctx);
    ctx.stabilityDirty = false;
  }
  return ctx.unstableTileCount;
}

/** Mark stability as dirty within SUPPORT_RADIUS+1 of changed tile.
 *  Since we cache only the total count, just mark dirty. */
function markStabilityDirty(ctx) {
  ctx.stabilityDirty = true;
}

// ── Isolation check ──────────────────────────────────────

function computeIsolationOpt(ctx) {
  if (!ctx.furnitureSet.mustBeIndoors) return 1;
  const { gridW, gridH, room, doors } = ctx;
  const walls = Array.from({ length: gridH }, () => Array(gridW).fill(false));
  for (let r = 0; r < gridH; r++) {
    for (let c = 0; c < gridW; c++) {
      if (room[r][c]) continue;
      let adjRoom = false;
      for (const [dr, dc] of DIRS8) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < gridH && nc >= 0 && nc < gridW && room[nr][nc]) {
          adjRoom = true; break;
        }
      }
      if (adjRoom && !doors.has(`${r},${c}`)) walls[r][c] = true;
    }
  }

  let edgeTiles = 0, total = 0, unwalled = 0;
  for (let r = 0; r < gridH; r++) {
    for (let c = 0; c < gridW; c++) {
      if (!room[r][c]) continue;
      let isEdge = false;
      for (const [dr, dc] of DIRS8) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW || !room[nr][nc]) {
          isEdge = true; break;
        }
      }
      if (!isEdge) continue;
      edgeTiles++;
      for (const [dr, dc] of DIRS8) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW) {
          total++; unwalled++;
        } else if (!room[nr][nc]) {
          total++;
          if (!walls[nr][nc]) {
            unwalled += doors.has(`${nr},${nc}`) ? 0.34 : 1;
          }
        }
      }
    }
  }
  if (total === 0) return 1;
  const bonus = Math.ceil(edgeTiles / 10);
  const raw = Math.min(1, Math.max(0, (total - unwalled + bonus) / total));
  return Math.pow(raw, 1.5);
}

// ── Constraint checks ────────────────────────────────────

function hasStorageTile(ctx) {
  const { furnitureSet: fs, placements } = ctx;
  for (const p of placements) {
    const tiles = getCachedTiles(ctx, p.groupIdx, p.itemIdx, p.rotation);
    for (let r = 0; r < tiles.length; r++) {
      for (let c = 0; c < (tiles[r]?.length ?? 0); c++) {
        const tileKey = tiles[r][c];
        if (tileKey === null) continue;
        const tt = fs.tileTypes[tileKey];
        if (tt?.data === 2) return true;
      }
    }
  }
  return false;
}

function countGroupPlacements(ctx, groupIdx) {
  if (ctx.groupCounts) return ctx.groupCounts[groupIdx] ?? 0;
  let count = 0;
  for (const p of ctx.placements) {
    if (p.groupIdx === groupIdx) count++;
  }
  return count;
}

// ── Room connectivity ────────────────────────────────────

function checkRoomConnectivity(ctx) {
  const { gridW, gridH, room } = ctx;
  let totalRoom = 0, startR = -1, startC = -1;
  for (let r = 0; r < gridH; r++) {
    for (let c = 0; c < gridW; c++) {
      if (room[r][c]) {
        totalRoom++;
        if (startR < 0) { startR = r; startC = c; }
      }
    }
  }
  if (totalRoom === 0) return true;

  const v = freshVisited(ctx);
  const q = ctx.bfsQueue;
  q.reset();
  q.push(startR, startC);
  visitedSet(v, startR, startC);
  let reached = 1;

  while (q.length > 0) {
    const [cr, cc] = q.shift();
    for (const [dr, dc] of DIRS) {
      const nr = cr + dr, nc = cc + dc;
      if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW) continue;
      if (visitedHas(v, nr, nc) || !room[nr][nc]) continue;
      visitedSet(v, nr, nc);
      reached++;
      q.push(nr, nc);
    }
  }
  return reached >= totalRoom;
}

/** After an ERASE move disconnects the room, try to auto-clean the smaller fragment.
 *  Returns true if fragments were cleaned (move is safe), false if rejected.
 *  Stores cleaned tiles in move.autoCleanedTiles for revert. */
function findAndCleanFragments(ctx, move) {
  const { gridW, gridH, room } = ctx;
  // BFS from first room tile to find the main component
  let startR = -1, startC = -1;
  for (let r = 0; r < gridH && startR < 0; r++)
    for (let c = 0; c < gridW && startR < 0; c++)
      if (room[r][c]) { startR = r; startC = c; }
  if (startR < 0) return false;

  const v = freshVisited(ctx);
  const q = ctx.bfsQueue;
  q.reset();
  q.push(startR, startC);
  visitedSet(v, startR, startC);
  while (q.length > 0) {
    const [cr, cc] = q.shift();
    for (const [dr, dc] of DIRS) {
      const nr = cr + dr, nc = cc + dc;
      if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW) continue;
      if (visitedHas(v, nr, nc) || !room[nr][nc]) continue;
      visitedSet(v, nr, nc);
      q.push(nr, nc);
    }
  }

  // Collect disconnected tiles
  const disconnected = [];
  for (let r = 0; r < gridH; r++)
    for (let c = 0; c < gridW; c++)
      if (room[r][c] && !visitedHas(v, r, c))
        disconnected.push({ r, c });

  if (disconnected.length === 0) return true; // already connected
  if (disconnected.length > 3) return false; // too many to auto-clean

  // Safety: none occupied, none are doors
  for (const { r, c } of disconnected) {
    if (ctx.occupancy[r][c] >= 0) return false;
    if (ctx.doors.has(`${r},${c}`)) return false;
  }

  // Erase all disconnected tiles
  move.autoCleanedTiles = [];
  for (const { r, c } of disconnected) {
    removeRoomTile(ctx, r, c);
    move.autoCleanedTiles.push({ r, c });
  }
  return true;
}

function canEraseTile(ctx, r, c) {
  if (!ctx.room[r][c]) return false;
  if (ctx.occupancy[r][c] >= 0) return false;
  if (ctx.roomTiles.length <= 1) return false;

  ctx.room[r][c] = false;
  const connected = checkRoomConnectivity(ctx);
  const walkable = connected && checkWalkabilityOpt(ctx);
  ctx.room[r][c] = true;

  // Stability is handled by createSupportPillars pass after trimming
  return connected && walkable;
}

// ── Async yield ──────────────────────────────────────────

function yieldToUI() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

// ── Phase 0-: Room pre-cleanup (trim tendrils) ───────────

/** Remove dead-end room tiles (>= 3 non-room cardinal neighbors) before SA. */
function preCleanRoom(ctx) {
  for (let pass = 0; pass < 20; pass++) {
    let changed = false;
    for (let i = ctx.roomTiles.length - 1; i >= 0; i--) {
      const { r, c } = ctx.roomTiles[i];
      // Count non-room cardinal neighbors
      let nonRoom = 0;
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= ctx.gridH || nc < 0 || nc >= ctx.gridW || !ctx.room[nr][nc]) {
          nonRoom++;
        }
      }
      if (nonRoom < 3) continue;
      // Skip if occupied
      if (ctx.occupancy[r][c] >= 0) continue;
      // Temporarily erase, check connectivity
      removeRoomTile(ctx, r, c);
      if (checkRoomConnectivity(ctx)) {
        changed = true;
      } else {
        restoreRoomTile(ctx, r, c);
      }
    }
    if (!changed) break;
  }
}

// ── Phase 0: Analysis & Precomputation ───────────────────

function analyzePhase(ctx) {
  const { furnitureSet: fs, building: bld } = ctx;

  // Find employees/efficiency stat indices
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

  // Build room tile list
  rebuildRoomTiles(ctx);

  // Pre-compute all rotated tile arrays
  for (let gi = 0; gi < fs.groups.length; gi++) {
    const group = fs.groups[gi];
    const rots = getAllowedRotations(group);
    for (let ii = 0; ii < group.items.length; ii++) {
      for (const rot of rots) {
        getCachedTiles(ctx, gi, ii, rot); // populates cache
      }
    }
  }

  // Classify groups
  ctx.groupInfo = [];
  for (let gi = 0; gi < fs.groups.length; gi++) {
    const group = fs.groups[gi];
    const bItem = bld.items?.[gi];
    let hasPrimary = false;
    let hasEfficiency = false;
    let hasRelative = false;
    let isDecorative = true;

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

    // Relative-contributing groups are not decorative
    if (hasRelative) isDecorative = false;

    // Check if group has blocking tiles or storage tiles
    let hasBlockers = false;
    let isStorage = false;
    for (const item of group.items) {
      for (const row of item.tiles) {
        for (const tileKey of row) {
          if (tileKey === null) continue;
          const tt = fs.tileTypes[tileKey];
          if (tt && AVAIL_BLOCKING.has(tt.availability)) hasBlockers = true;
          if (tt?.data === 2) isStorage = true;
        }
      }
    }

    // Priority: required > primary-stat > efficiency/relative > decorative
    let priority = 3;
    if (group.min > 0) priority = 0;
    else if (hasPrimary) priority = 1;
    else if (hasEfficiency || hasRelative) priority = 2;

    // Hero item analysis: identify high-density items vs fillers
    const densities = group.items.map((_, ii) => ({
      ii,
      density: getValueDensity(ctx, gi, ii),
      tileCount: countItemTiles(group.items[ii]),
    }));
    const maxDensity = Math.max(...densities.map(d => d.density), 0);
    const heroThreshold = maxDensity * 0.85;

    const heroItems = densities
      .filter(d => d.density >= heroThreshold && d.density > 0)
      .sort((a, b) => b.density - a.density || a.tileCount - b.tileCount);
    const fillerItems = densities
      .filter(d => d.density < heroThreshold || d.density === 0)
      .sort((a, b) => a.tileCount - b.tileCount); // smallest first for gap fill

    const bestHeroIdx = heroItems.length > 0 ? heroItems[0].ii : -1;

    ctx.groupInfo.push({
      groupIdx: gi, isDecorative, hasPrimary, hasEfficiency, hasRelative, hasBlockers, isStorage, priority,
      heroItems: heroItems.map(h => h.ii),
      bestHeroIdx,
      fillerItems: fillerItems.map(f => f.ii),
    });
  }
}

/** Count wall/non-room neighbors for a room tile (for wall-priority sorting). */
function countWallNeighbors(ctx, r, c) {
  let count = 0;
  for (const [dr, dc] of DIRS) {
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nr >= ctx.gridH || nc < 0 || nc >= ctx.gridW || !ctx.room[nr][nc]) {
      count++;
    }
  }
  return count;
}

/** Count non-null tiles in an item. */
function countItemTiles(item) {
  let count = 0;
  for (const row of item.tiles) {
    for (const t of row) {
      if (t !== null) count++;
    }
  }
  return count;
}

// ── Pre-place support pillars ────────────────────────────

async function prePlacePillars(ctx) {
  if (!ctx.furnitureSet.mustBeIndoors) return;

  for (let pass = 0; pass < 20; pass++) {
    const unstable = countUnstableTiles(ctx);
    if (unstable === 0) break;
    if (pass % 5 === 0) await yieldToUI();

    // Find the worst unstable tile (lowest support)
    let worstR = -1, worstC = -1, worstSupport = Infinity;
    for (let r = 0; r < ctx.gridH; r++) {
      for (let c = 0; c < ctx.gridW; c++) {
        if (!ctx.room[r][c]) continue;
        const sup = tileSupport(ctx.room, ctx.gridW, ctx.gridH, r, c);
        if (sup < 1.0 && sup < worstSupport) {
          worstSupport = sup;
          worstR = r;
          worstC = c;
        }
      }
    }
    if (worstR < 0) break;

    // Find best tile to erase near the unstable zone (no furniture yet, only check connectivity)
    let bestCandidate = null;
    let bestCuredCount = 0;
    const searchRadius = SUPPORT_RADIUS + 1;

    for (let dr = -searchRadius; dr <= searchRadius; dr++) {
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
        if (cured > bestCuredCount) {
          bestCuredCount = cured;
          bestCandidate = { r: tr, c: tc };
        }
      }
    }

    if (!bestCandidate || bestCuredCount <= 0) break;

    removeRoomTile(ctx, bestCandidate.r, bestCandidate.c);
  }
}

// ── Value density computation ────────────────────────────

function getValueDensity(ctx, gi, ii) {
  const { furnitureSet: fs, building: bld, primaryStatIdx } = ctx;
  const item = fs.groups[gi]?.items[ii];
  if (!item) return 0;
  const bItem = bld.items?.[gi];
  if (!bItem?.stats) return 0;

  const mult = item.multiplierStats ?? item.multiplier;
  const statContrib = (bItem.stats[primaryStatIdx] ?? 0) * mult;

  // Count non-null tiles
  let tileCount = 0;
  for (const row of item.tiles) {
    for (const t of row) {
      if (t !== null) tileCount++;
    }
  }
  if (tileCount === 0) return 0;

  // If group has no primary stat but HAS efficiency, use efficiency density (scaled 10x)
  if (statContrib === 0 && ctx.effIdx >= 0) {
    const effContrib = (bItem.stats[ctx.effIdx] ?? 0) * mult;
    if (effContrib > 0) return (effContrib * 10) / tileCount;
  }

  // If group has no primary stat but HAS relative stats, use relative density (scaled 8x)
  if (statContrib === 0 && ctx.relativeIndices.length > 0) {
    let relContrib = 0;
    for (const rel of ctx.relativeIndices) {
      relContrib += (bItem.stats[rel.statIdx] ?? 0) * mult;
    }
    if (relContrib > 0) return (relContrib * 8) / tileCount;
  }

  return statContrib / tileCount;
}

/** Compute neatness score in the neighborhood of a placed piece.
 *  Used by polish rotation pass to compare orientations with full neatness weights.
 *  Evaluates H1 (walkable-sharing), H2 (blocker-packing), H3 (dead-space) within ±2 tiles of the piece.
 *  NOTE: The H1/H2/H3 logic is intentionally duplicated from scoreLayoutSA's neatness scan —
 *  this version operates on a local bounding box for O(piece_area) instead of O(grid_area). */
function computeLocalNeatness(ctx, pi) {
  const p = ctx.placements[pi];
  const tiles = getCachedTiles(ctx, p.groupIdx, p.itemIdx, p.rotation);
  const { gridW, gridH } = ctx;

  // Collect unique cells in the neighborhood (piece tiles + 2-cell border)
  const minR = Math.max(0, p.row - 2), maxR = Math.min(gridH - 1, p.row + tiles.length + 1);
  const minC = Math.max(0, p.col - 2);
  let maxC = p.col + 1;
  for (let r = 0; r < tiles.length; r++) {
    const rowLen = tiles[r]?.length ?? 0;
    if (p.col + rowLen + 1 > maxC) maxC = p.col + rowLen + 1;
  }
  maxC = Math.min(gridW - 1, maxC);

  let walkableSharingBonus = 0;
  let blockerPackingBonus = 0;
  let deadSpacePenalty = 0;

  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      if (!ctx.room[r][c]) continue;

      const isOccupied = ctx.occupancy[r][c] >= 0;
      const isBlocked = ctx.blockerCount[r][c] > 0;
      const isMustReach = ctx.mustReachGrid[r * gridW + c] === 1;

      if (!isOccupied && !isBlocked) {
        let adjMR = 0;
        for (const [dr, dc] of DIRS) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < gridH && nc >= 0 && nc < gridW
              && ctx.mustReachGrid[nr * gridW + nc] === 1) adjMR++;
        }
        if (adjMR >= 2) walkableSharingBonus += adjMR * (adjMR - 1) / 2;
        if (adjMR === 0) {
          let blockedNeighbors = 0;
          for (const [dr, dc] of DIRS) {
            const nr = r + dr, nc = c + dc;
            if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW || !ctx.room[nr][nc]) blockedNeighbors++;
            else if (ctx.blockerCount[nr][nc] > 0) blockedNeighbors++;
          }
          if (blockedNeighbors >= 3) deadSpacePenalty++;
        }
      } else if (isBlocked && !isMustReach) {
        let packedNeighbors = 0;
        for (const [dr, dc] of DIRS) {
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW || !ctx.room[nr][nc]) packedNeighbors++;
          else if (ctx.blockerCount[nr][nc] > 0) packedNeighbors++;
        }
        blockerPackingBonus += packedNeighbors;
      }
    }
  }

  return walkableSharingBonus * 4 + blockerPackingBonus - deadSpacePenalty * 2;
}

/** Score a candidate placement position: value density + wall/corner adjacency + furniture proximity.
 *  Phase 2a: Wall-first rebalancing. When ctx.useNeatnessPlacement is set, also adds H5 facing bonus. */
function scorePlacementPosition(ctx, gi, ii, rot, r, c) {
  let posScore = getValueDensity(ctx, gi, ii);
  const tiles = getCachedTiles(ctx, gi, ii, rot);
  let wallAdj = 0;
  let cornerAdj = 0;
  let furnitureAdj = 0;
  let facingBonus = 0;
  for (let tr = 0; tr < tiles.length; tr++) {
    for (let tc = 0; tc < (tiles[tr]?.length ?? 0); tc++) {
      if (tiles[tr][tc] === null) continue;
      const gr = r + tr, gc = c + tc;
      let tileWallCount = 0;
      for (const [dr, dc] of DIRS) {
        const nr = gr + dr, nc = gc + dc;
        if (nr < 0 || nr >= ctx.gridH || nc < 0 || nc >= ctx.gridW || !ctx.room[nr][nc]) {
          wallAdj++;
          tileWallCount++;
        } else if (ctx.occupancy[nr][nc] >= 0) {
          furnitureAdj++;
        }
      }
      if (tileWallCount >= 2) cornerAdj++;

      // H5: MR tiles facing existing MR across a 1-tile walkable gap (neatness restart only)
      if (ctx.useNeatnessPlacement) {
        const tileKey = tiles[tr][tc];
        const tt = ctx.furnitureSet.tileTypes[tileKey];
        const isBlocking = tt && AVAIL_BLOCKING.has(tt.availability);
        const isMR = tt?.mustBeReachable;
        // Blocker against wall = good; MR against wall = prefer open access
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
    }
  }
  return posScore + wallAdj * 3.0 + furnitureAdj + cornerAdj * 1.5 + facingBonus;
}

// ── Phase 1: Smart Constructive Phase ────────────────────

async function constructivePhase(ctx, skipInterval) {
  const { furnitureSet: fs } = ctx;

  // Disable incremental groupCounts during constructive phase — use linear scan fallback.
  // This avoids stale counts since constructive doesn't maintain groupCounts incrementally.
  ctx.groupCounts = null;

  // Phase 2g: Sort roomTiles for wall-priority constructive scan
  // Corner tiles first (2+ wall neighbors), then wall-adjacent, then interior
  ctx.roomTiles.sort((a, b) => {
    const wallA = countWallNeighbors(ctx, a.r, a.c);
    const wallB = countWallNeighbors(ctx, b.r, b.c);
    return wallB - wallA; // more wall neighbors first
  });

  // Sort groups by priority
  const sortedGroups = [...ctx.groupInfo].sort((a, b) => a.priority - b.priority);

  // Pass 1 — Hero placement: place best hero items exhaustively
  let placementCount = 0;
  for (const gInfo of sortedGroups) {
    const gi = gInfo.groupIdx;
    const group = fs.groups[gi];
    const maxPlacements = group.max ?? 100;

    // Pure efficiency groups handled by interleaving
    if (gInfo.hasEfficiency && !gInfo.hasPrimary && ctx.empIdx >= 0 && ctx.effIdx >= 0) {
      continue;
    }

    // Pure relative groups handled by interleaving
    if (gInfo.hasRelative && !gInfo.hasPrimary && ctx.relativeIndices.length > 0) {
      continue;
    }

    let placed = countGroupPlacements(ctx, gi);
    const rots = getAllowedRotations(group);

    // Try hero items from best to worst.
    // For required groups with no heroes (all zero density), use fillers to meet min.
    let heroList = gInfo.heroItems.length > 0 ? gInfo.heroItems : [gInfo.bestHeroIdx];
    if (heroList.length === 1 && heroList[0] < 0 && group.min > 0 && gInfo.fillerItems.length > 0) {
      // Use smallest filler for required zero-density groups (e.g. storage shelves)
      // SA UPGRADE/RESIZE can grow it later only if it doesn't hurt the score
      heroList = [gInfo.fillerItems[0]];
    }
    for (const ii of heroList) {
      if (ii < 0) continue;
      // Repeatedly place this hero item until it can't fit
      let keepGoing = true;
      while (keepGoing && placed < maxPlacements) {
        keepGoing = false;

        // Diversity: for restart variants, skip every Nth placement
        if (skipInterval > 0 && placementCount % skipInterval === (skipInterval - 1)) {
          placementCount++;
          break;
        }

        let bestPos = null;
        let bestScore = -Infinity;
        for (const rot of rots) {
          for (const { r, c } of ctx.roomTiles) {
            if (!canPlaceOpt(ctx, gi, ii, rot, r, c, undefined)) continue;
            const posScore = scorePlacementPosition(ctx, gi, ii, rot, r, c);
            if (posScore > bestScore) {
              bestScore = posScore;
              bestPos = { rot, row: r, col: c };
            }
          }
        }

        if (bestPos) {
          const pi = ctx.placements.length;
          ctx.placements.push({ groupIdx: gi, itemIdx: ii, rotation: bestPos.rot, row: bestPos.row, col: bestPos.col });
          setOccupancy(ctx, pi);

          // Reject if this breaks walkability or blocks all door candidates
          if (!hasAnyDoorCandidate(ctx) || !checkWalkabilityOpt(ctx)) {
            clearOccupancy(ctx, pi);
            ctx.placements.pop();
          } else {
            placed++;
            placementCount++;
            keepGoing = true;

            if (ctx.empIdx >= 0 && ctx.effIdx >= 0) {
              placeEfficiencyItems(ctx, fs);
            }
            if (ctx.relativeIndices.length > 0) {
              placeRelativeItems(ctx, fs);
            }
          }
        }
      }
    }

    await yieldToUI();
  }

  // Pass 2 — Filler placement: fill gaps with smaller items
  for (const gInfo of sortedGroups) {
    const gi = gInfo.groupIdx;
    const group = fs.groups[gi];
    const maxPlacements = group.max ?? 100;

    if (gInfo.hasEfficiency && !gInfo.hasPrimary && ctx.empIdx >= 0 && ctx.effIdx >= 0) {
      continue;
    }

    // Skip pure relative groups in filler pass too
    if (gInfo.hasRelative && !gInfo.hasPrimary && ctx.relativeIndices.length > 0) {
      continue;
    }

    let placed = countGroupPlacements(ctx, gi);
    if (placed >= maxPlacements) continue;

    const rots = getAllowedRotations(group);

    // Try filler items (smallest first) to fill remaining gaps
    for (const ii of gInfo.fillerItems) {
      if (placed >= maxPlacements) break;
      let keepGoing = true;
      while (keepGoing && placed < maxPlacements) {
        keepGoing = false;
        let bestPos = null;
        let bestScore = -Infinity;
        for (const rot of rots) {
          for (const { r, c } of ctx.roomTiles) {
            if (!canPlaceOpt(ctx, gi, ii, rot, r, c, undefined)) continue;
            const posScore = scorePlacementPosition(ctx, gi, ii, rot, r, c);
            if (posScore > bestScore) {
              bestScore = posScore;
              bestPos = { rot, row: r, col: c };
            }
          }
        }
        if (bestPos) {
          const pi = ctx.placements.length;
          ctx.placements.push({ groupIdx: gi, itemIdx: ii, rotation: bestPos.rot, row: bestPos.row, col: bestPos.col });
          setOccupancy(ctx, pi);

          if (!hasAnyDoorCandidate(ctx) || !checkWalkabilityOpt(ctx)) {
            clearOccupancy(ctx, pi);
            ctx.placements.pop();
          } else {
            placed++;
            keepGoing = true;

            if (ctx.empIdx >= 0 && ctx.effIdx >= 0) {
              placeEfficiencyItems(ctx, fs);
            }
            if (ctx.relativeIndices.length > 0) {
              placeRelativeItems(ctx, fs);
            }
          }
        }
      }
    }

    await yieldToUI();
  }

  // Final efficiency pass
  if (ctx.empIdx >= 0 && ctx.effIdx >= 0) {
    placeEfficiencyItems(ctx, fs);
  }

  // Final relative pass
  if (ctx.relativeIndices.length > 0) {
    placeRelativeItems(ctx, fs);
  }
}

/** Place efficiency items until eff >= emp or no more can fit. */
function placeEfficiencyItems(ctx, fs) {
  const stats = getStats(ctx);
  if (stats[ctx.effIdx] >= stats[ctx.empIdx]) return;

  for (const gInfo of ctx.groupInfo) {
    if (!gInfo.hasEfficiency) continue;
    const gi = gInfo.groupIdx;
    const group = fs.groups[gi];
    const maxP = group.max ?? 100;
    let placed = countGroupPlacements(ctx, gi);

    const rots = getAllowedRotations(group);
    // Rank items by efficiency density (highest first)
    const rankedItems = group.items.map((_, ii) => ({
      ii,
      density: getValueDensity(ctx, gi, ii),
    })).sort((a, b) => b.density - a.density);

    for (const { ii } of rankedItems) {
      if (placed >= maxP) break;
      for (const rot of rots) {
        if (placed >= maxP) break;
        // Find best position with furniture adjacency preference
        let bestPos = null;
        let bestScore = -Infinity;
        for (const { r, c } of ctx.roomTiles) {
          if (!canPlaceOpt(ctx, gi, ii, rot, r, c, undefined)) continue;
          const posScore = scorePlacementPosition(ctx, gi, ii, rot, r, c);
          if (posScore > bestScore) {
            bestScore = posScore;
            bestPos = { rot, row: r, col: c };
          }
        }
        if (bestPos) {
          const pi = ctx.placements.length;
          ctx.placements.push({ groupIdx: gi, itemIdx: ii, rotation: bestPos.rot, row: bestPos.row, col: bestPos.col });
          setOccupancy(ctx, pi);

          if (!hasAnyDoorCandidate(ctx) || !checkWalkabilityOpt(ctx)) {
            clearOccupancy(ctx, pi);
            ctx.placements.pop();
          } else {
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

/** Place relative-stat items until relVal >= primaryVal for all relative stats, or no more can fit. */
function placeRelativeItems(ctx, fs) {
  if (ctx.relativeIndices.length === 0) return;
  const stats = getStats(ctx);
  const primaryVal = stats[ctx.primaryStatIdx] ?? 0;
  // Check if all relative stats already meet target
  let allMet = true;
  for (const rel of ctx.relativeIndices) {
    if ((stats[rel.statIdx] ?? 0) < primaryVal) { allMet = false; break; }
  }
  if (allMet) return;

  for (const gInfo of ctx.groupInfo) {
    if (!gInfo.hasRelative) continue;
    // Skip groups that also contribute primary stat — they're placed in the main loop
    if (gInfo.hasPrimary) continue;
    const gi = gInfo.groupIdx;
    const group = fs.groups[gi];
    const maxP = group.max ?? 100;
    let placed = countGroupPlacements(ctx, gi);

    const rots = getAllowedRotations(group);
    // Rank items by relative density (highest first)
    const rankedItems = group.items.map((_, ii) => ({
      ii,
      density: getValueDensity(ctx, gi, ii),
    })).sort((a, b) => b.density - a.density);

    for (const { ii } of rankedItems) {
      if (placed >= maxP) break;
      for (const rot of rots) {
        if (placed >= maxP) break;
        let bestPos = null;
        let bestScore = -Infinity;
        for (const { r, c } of ctx.roomTiles) {
          if (!canPlaceOpt(ctx, gi, ii, rot, r, c, undefined)) continue;
          const posScore = scorePlacementPosition(ctx, gi, ii, rot, r, c);
          if (posScore > bestScore) {
            bestScore = posScore;
            bestPos = { rot, row: r, col: c };
          }
        }
        if (bestPos) {
          const pi = ctx.placements.length;
          ctx.placements.push({ groupIdx: gi, itemIdx: ii, rotation: bestPos.rot, row: bestPos.row, col: bestPos.col });
          setOccupancy(ctx, pi);

          if (!hasAnyDoorCandidate(ctx) || !checkWalkabilityOpt(ctx)) {
            clearOccupancy(ctx, pi);
            ctx.placements.pop();
          } else {
            placed++;
            const st = getStats(ctx);
            const pv = st[ctx.primaryStatIdx] ?? 0;
            let done = true;
            for (const rel of ctx.relativeIndices) {
              if ((st[rel.statIdx] ?? 0) < pv) { done = false; break; }
            }
            if (done) return;
          }
        }
      }
      const st = getStats(ctx);
      const pv = st[ctx.primaryStatIdx] ?? 0;
      let done = true;
      for (const rel of ctx.relativeIndices) {
        if ((st[rel.statIdx] ?? 0) < pv) { done = false; break; }
      }
      if (done) return;
    }
  }
}

// ── Phase 2: Simulated Annealing ─────────────────────────

// Move weights (Phase 2c: added SLIDE, rebalanced RELOCATE)
const MOVE_WEIGHTS = {
  RELOCATE: 15,
  SLIDE: 20,
  RESIZE: 15,
  UPGRADE: 10,
  ADD: 15,
  REMOVE: 10,
  SWAP: 5,
  ROTATE: 5,
  ERASE: 10,
  ADD_ROOM: 5,
};

const MOVE_TYPES = Object.keys(MOVE_WEIGHTS);

/** Phase 3e: Pick move type with dynamic weights based on packing density. */
function pickMoveType(ctx) {
  const roomTileCount = ctx.roomTiles.length;
  const density = roomTileCount > 0 ? ctx.occupiedCount / roomTileCount : 0;

  // Dynamic weights: adapt all move types based on packing density
  let addW = MOVE_WEIGHTS.ADD;
  let relocateW = MOVE_WEIGHTS.RELOCATE;
  let slideW = MOVE_WEIGHTS.SLIDE;
  let removeW = MOVE_WEIGHTS.REMOVE;
  let rotateW = MOVE_WEIGHTS.ROTATE;
  let eraseW = MOVE_WEIGHTS.ERASE;
  let addRoomW = MOVE_WEIGHTS.ADD_ROOM;

  if (density < 0.4) {
    // Very sparse: focus on adding furniture, NOT shrinking room
    addW = 35;
    relocateW = 20;
    slideW = 10;
    removeW = 3;
    eraseW = 1;     // near-zero: fill space first, trim later
    addRoomW = 1;
  } else if (density < 0.6) {
    // Filling up: still favor adding, light trimming allowed
    addW = 25;
    eraseW = 5;
    addRoomW = 2;
  } else if (density > 0.8) {
    // Very dense: fine-tune and trim edges
    slideW = 30;
    relocateW = 8;
    rotateW = 12;
    removeW = 15;
    addW = 5;
    eraseW = 12;
  } else {
    // Moderately dense (0.6-0.8): fine-tuning moves, moderate trimming
    slideW = 25;
    relocateW = 10;
    rotateW = 10;
    eraseW = 8;
  }

  const weights = {
    ...MOVE_WEIGHTS,
    ADD: addW, RELOCATE: relocateW, SLIDE: slideW, REMOVE: removeW,
    ROTATE: rotateW, ERASE: eraseW, ADD_ROOM: addRoomW,
  };
  let totalWeight = 0;
  for (const t of MOVE_TYPES) totalWeight += weights[t];

  let r = ctx.rng() * totalWeight;
  for (const type of MOVE_TYPES) {
    r -= weights[type];
    if (r <= 0) return type;
  }
  return "RELOCATE";
}

/** Gaussian random number (Box-Muller). */
function gaussRand(rng, sigma) {
  const u = 1 - rng();
  const v = rng();
  return sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

async function simulatedAnnealing(ctx) {
  // Rebuild groupCounts — constructive phase doesn't maintain them incrementally
  rebuildGroupCounts(ctx);

  const roomTileCount = ctx.roomTiles.length;
  const budget = Math.min(30000, 8000 + Math.max(0, roomTileCount - 80) * 25);

  const T_INITIAL = 500;
  const T_FINAL = 0.1;
  const COOL_RATE = 0.997;
  const REHEAT_THRESHOLD = 150;
  const REHEAT_FACTOR = 1.5;
  const MAX_T_REHEAT = T_INITIAL * 0.5;

  let T = T_INITIAL;
  let bestScore = scoreLayoutSA(ctx);
  ctx.bestSnapshot = takeSnapshot(ctx);
  let currentScore = bestScore;
  let consecutiveRejects = 0;
  let lastBestStep = 0;

  for (let step = 0; step < budget; step++) {
    if (step % 50 === 0) await yieldToUI();
    if (DEBUG_OPTIMIZER && step % 500 === 0) debugValidateState(ctx);

    // Early termination: plateau detection
    if (step - lastBestStep > 2000 && step > budget * 0.4) break;

    // Reheat if stuck
    if (consecutiveRejects >= REHEAT_THRESHOLD) {
      T = Math.min(MAX_T_REHEAT, T * REHEAT_FACTOR);
      consecutiveRejects = 0;
    }

    // Cool
    T = Math.max(T_FINAL, T * COOL_RATE);

    const move = generateMove(ctx);
    if (!move) { consecutiveRejects++; continue; }

    const applied = applyMove(ctx, move);
    if (!applied) { consecutiveRejects++; continue; }

    // Check hard constraints that can't be softened
    const feasible = checkMoveConstraints(ctx, move);

    if (feasible) {
      const newScore = scoreLayoutSA(ctx);
      const delta = newScore - currentScore;

      if (delta > 0 || ctx.rng() < Math.exp(delta / T)) {
        // Accept
        currentScore = newScore;
        consecutiveRejects = 0;

        if (newScore > bestScore && passesHardConstraints(ctx)) {
          bestScore = newScore;
          ctx.bestSnapshot = takeSnapshot(ctx);
          lastBestStep = step;
        }
      } else {
        revertMove(ctx, move);
        consecutiveRejects++;
      }
    } else {
      revertMove(ctx, move);
      consecutiveRejects++;
    }
  }

  // Restore best
  if (ctx.bestSnapshot) {
    restoreSnapshot(ctx, ctx.bestSnapshot);
  }
}

function passesHardConstraints(ctx) {
  // Efficiency is a SOFT constraint — handled by scoring penalties, not hard rejection.
  // This lets SA explore layouts that trade workers for efficiency.
  if (!ctx._walkabilityValid && !checkWalkabilityOpt(ctx)) return false;
  if (!checkStabilityOpt(ctx)) return false;
  if (ctx.building.storage > 0 && ctx.placements.length > 0 && !hasStorageTile(ctx)) return false;
  if (!hasAnyDoorCandidate(ctx)) return false;
  // Group mins and maxes
  const fs = ctx.furnitureSet;
  for (let gi = 0; gi < fs.groups.length; gi++) {
    const group = fs.groups[gi];
    const count = countGroupPlacements(ctx, gi);
    if (group.min > 0 && count < group.min) return false;
    if (group.max != null && count > group.max) return false;
  }
  return true;
}

function checkMoveConstraints(ctx, move) {
  // Walkability check — for all moves that change furniture or room geometry.
  // ROTATE can turn blocking tiles, REMOVE can shift indices via swap.
  if (move.type === "RELOCATE" || move.type === "SLIDE" || move.type === "RESIZE"
      || move.type === "UPGRADE" || move.type === "ADD" || move.type === "SWAP"
      || move.type === "ROTATE") {
    if (!checkWalkabilityOpt(ctx)) return false;
  }
  if (move.type === "ERASE") {
    if (!checkRoomConnectivity(ctx)) {
      // Only auto-clean fragments when room is moderately filled —
      // at low density, reject disconnecting erases to preserve room space
      const eraseDensity = ctx.roomTiles.length > 0 ? ctx.occupiedCount / ctx.roomTiles.length : 0;
      if (eraseDensity < 0.4 || !findAndCleanFragments(ctx, move)) return false;
    }
    if (!checkWalkabilityOpt(ctx)) return false;
  }
  if (move.type === "ADD_ROOM") {
    if (!checkRoomConnectivity(ctx)) return false;
  }
  // Group max check for ADD
  if (move.type === "ADD") {
    const group = ctx.furnitureSet.groups[move.groupIdx];
    if (group.max != null && countGroupPlacements(ctx, move.groupIdx) > group.max) return false;
  }
  // Group min check for REMOVE
  if (move.type === "REMOVE") {
    const group = ctx.furnitureSet.groups[move.groupIdx];
    if (group.min > 0 && countGroupPlacements(ctx, move.groupIdx) < group.min) return false;
  }
  // Storage check
  if (ctx.building.storage > 0 && ctx.placements.length > 0 && !hasStorageTile(ctx)) return false;
  return true;
}

// ── Move generation ──────────────────────────────────────

function generateMove(ctx) {
  const type = pickMoveType(ctx);
  const unlocked = ctx.placements.length - ctx.lockedCount;

  switch (type) {
    case "RELOCATE": return generateRelocate(ctx, unlocked);
    case "SLIDE": return generateSlide(ctx, unlocked);
    case "RESIZE": return generateResize(ctx, unlocked);
    case "UPGRADE": return generateUpgrade(ctx, unlocked);
    case "ADD": return generateAdd(ctx);
    case "REMOVE": return generateRemove(ctx, unlocked);
    case "SWAP": return generateSwap(ctx, unlocked);
    case "ROTATE": return generateRotate(ctx, unlocked);
    case "ERASE": return generateErase(ctx);
    case "ADD_ROOM": return generateAddRoom(ctx);
    default: return null;
  }
}

function pickUnlocked(ctx, unlocked) {
  if (unlocked <= 0) return -1;
  return ctx.lockedCount + Math.floor(ctx.rng() * unlocked);
}

function generateRelocate(ctx, unlocked) {
  const pi = pickUnlocked(ctx, unlocked);
  if (pi < 0) return null;
  const p = ctx.placements[pi];

  const dr = Math.round(gaussRand(ctx.rng, 2));
  const dc = Math.round(gaussRand(ctx.rng, 2));
  if (dr === 0 && dc === 0) return null;

  const newRow = p.row + dr;
  const newCol = p.col + dc;

  return {
    type: "RELOCATE",
    pi,
    oldRow: p.row,
    oldCol: p.col,
    newRow,
    newCol,
  };
}

function generateSlide(ctx, unlocked) {
  const pi = pickUnlocked(ctx, unlocked);
  if (pi < 0) return null;
  const p = ctx.placements[pi];

  // Pick a random cardinal direction
  const [dr, dc] = DIRS[Math.floor(ctx.rng() * 4)];
  const newRow = p.row + dr;
  const newCol = p.col + dc;

  return {
    type: "SLIDE",
    pi,
    oldRow: p.row,
    oldCol: p.col,
    newRow,
    newCol,
  };
}

function generateResize(ctx, unlocked) {
  const pi = pickUnlocked(ctx, unlocked);
  if (pi < 0) return null;
  const p = ctx.placements[pi];
  const group = ctx.furnitureSet.groups[p.groupIdx];
  if (group.items.length <= 1) return null;
  // Don't resize storage items — keep at minimum size
  if (ctx.groupInfo[p.groupIdx]?.isStorage) return null;

  let newItemIdx = p.itemIdx;
  while (newItemIdx === p.itemIdx) {
    newItemIdx = Math.floor(ctx.rng() * group.items.length);
  }

  return {
    type: "RESIZE",
    pi,
    oldItemIdx: p.itemIdx,
    newItemIdx,
    groupIdx: p.groupIdx,
  };
}

function generateUpgrade(ctx, unlocked) {
  const pi = pickUnlocked(ctx, unlocked);
  if (pi < 0) return null;
  const p = ctx.placements[pi];
  const group = ctx.furnitureSet.groups[p.groupIdx];
  if (group.items.length <= 1) return null;
  // Don't upgrade storage items during SA — handled in polish with stat checks
  if (ctx.groupInfo[p.groupIdx]?.isStorage) return null;
  // Try next larger variant (higher index = larger item typically)
  const newItemIdx = p.itemIdx + 1;
  if (newItemIdx >= group.items.length) return null;

  return {
    type: "UPGRADE",
    pi,
    oldItemIdx: p.itemIdx,
    newItemIdx,
    groupIdx: p.groupIdx,
  };
}

function generateAdd(ctx) {
  const fs = ctx.furnitureSet;
  // Weighted selection by value density
  const candidates = [];
  let totalDensity = 0;

  for (let gi = 0; gi < fs.groups.length; gi++) {
    const group = fs.groups[gi];
    const maxP = group.max ?? 100;
    if (countGroupPlacements(ctx, gi) >= maxP) continue;

    for (let ii = 0; ii < group.items.length; ii++) {
      const d = Math.max(0.01, getValueDensity(ctx, gi, ii));
      candidates.push({ gi, ii, density: d });
      totalDensity += d;
    }
  }

  if (candidates.length === 0) return null;

  // Weighted random pick
  let r = ctx.rng() * totalDensity;
  let pick = candidates[0];
  for (const c of candidates) {
    r -= c.density;
    if (r <= 0) { pick = c; break; }
  }

  // Pick from empty tiles only (targeted ADD)
  const emptyTiles = ctx.roomTiles.filter(t => ctx.occupancy[t.r][t.c] < 0);
  if (emptyTiles.length === 0) return null;
  const pos = emptyTiles[Math.floor(ctx.rng() * emptyTiles.length)];
  const rots = getAllowedRotations(fs.groups[pick.gi]);
  const rot = rots[Math.floor(ctx.rng() * rots.length)];

  return {
    type: "ADD",
    groupIdx: pick.gi,
    itemIdx: pick.ii,
    rotation: rot,
    row: pos.r,
    col: pos.c,
  };
}

function generateRemove(ctx, unlocked) {
  const pi = pickUnlocked(ctx, unlocked);
  if (pi < 0) return null;
  const p = ctx.placements[pi];

  return {
    type: "REMOVE",
    pi,
    groupIdx: p.groupIdx,
    saved: { ...p },
  };
}

function generateSwap(ctx, unlocked) {
  if (unlocked < 2) return null;
  const pi1 = pickUnlocked(ctx, unlocked);
  let pi2 = pickUnlocked(ctx, unlocked);
  let attempts = 0;
  while (pi1 === pi2 && attempts < 10) {
    pi2 = pickUnlocked(ctx, unlocked);
    attempts++;
  }
  if (pi1 === pi2) return null;

  return {
    type: "SWAP",
    pi1,
    pi2,
    oldRow1: ctx.placements[pi1].row,
    oldCol1: ctx.placements[pi1].col,
    oldRow2: ctx.placements[pi2].row,
    oldCol2: ctx.placements[pi2].col,
  };
}

function generateRotate(ctx, unlocked) {
  const pi = pickUnlocked(ctx, unlocked);
  if (pi < 0) return null;
  const p = ctx.placements[pi];
  const group = ctx.furnitureSet.groups[p.groupIdx];
  const allowed = getAllowedRotations(group);
  if (allowed.length <= 1) return null;

  let newRot = p.rotation;
  while (newRot === p.rotation) {
    newRot = allowed[Math.floor(ctx.rng() * allowed.length)];
  }

  return {
    type: "ROTATE",
    pi,
    oldRotation: p.rotation,
    newRotation: newRot,
  };
}

function generateErase(ctx) {
  // Find ANY unoccupied room tile (edge or interior) — unified trim + support pillar
  const candidates = [];
  const { gridW, gridH, room, occupancy } = ctx;

  // Compute centroid
  let cr = 0, cc = 0, cnt = 0;
  for (const t of ctx.roomTiles) { cr += t.r; cc += t.c; cnt++; }
  if (cnt === 0) return null;
  cr /= cnt; cc /= cnt;

  for (let r = 0; r < gridH; r++) {
    for (let c = 0; c < gridW; c++) {
      if (!room[r][c]) continue;
      if (occupancy[r][c] >= 0) continue;

      let isEdge = false;
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW || !room[nr][nc]) {
          isEdge = true; break;
        }
      }

      // Weight: edge tiles by distance from centroid, interior tiles near unstable zones higher
      const dist = Math.abs(r - cr) + Math.abs(c - cc);
      let weight = isEdge ? dist : 0.5;

      // Boost weight for tiles near unstable zones (support pillar candidates)
      if (!isEdge && ctx.furnitureSet.mustBeIndoors) {
        let nearUnstable = false;
        for (const [dr, dc] of DIRS8) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < gridH && nc >= 0 && nc < gridW && room[nr][nc]) {
            if (tileSupport(room, gridW, gridH, nr, nc) < 1.0) {
              nearUnstable = true; break;
            }
          }
        }
        if (nearUnstable) weight = dist + 10; // strongly prefer these
      }

      candidates.push({ r, c, weight });
    }
  }

  if (candidates.length === 0) return null;
  // Weighted random pick (higher weight = more likely)
  candidates.sort((a, b) => b.weight - a.weight);
  const pick = candidates[Math.floor(ctx.rng() * Math.min(8, candidates.length))];

  return {
    type: "ERASE",
    row: pick.r,
    col: pick.c,
  };
}

function generateAddRoom(ctx) {
  // Re-add a previously erased tile (non-room tile adjacent to room)
  const candidates = [];
  const { gridW, gridH, room } = ctx;

  for (let r = 0; r < gridH; r++) {
    for (let c = 0; c < gridW; c++) {
      if (room[r][c]) continue;
      // Must be adjacent to at least one room tile
      let adjRoom = false;
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < gridH && nc >= 0 && nc < gridW && room[nr][nc]) {
          adjRoom = true; break;
        }
      }
      if (adjRoom) candidates.push({ r, c });
    }
  }

  if (candidates.length === 0) return null;
  const pick = candidates[Math.floor(ctx.rng() * candidates.length)];

  return {
    type: "ADD_ROOM",
    row: pick.r,
    col: pick.c,
  };
}

// ── Move application ─────────────────────────────────────

function applyMove(ctx, move) {
  switch (move.type) {
    case "SLIDE":
    case "RELOCATE": {
      const p = ctx.placements[move.pi];
      clearOccupancy(ctx, move.pi);
      p.row = move.newRow;
      p.col = move.newCol;
      // Check bounds
      const tiles = getCachedTiles(ctx, p.groupIdx, p.itemIdx, p.rotation);
      for (let r = 0; r < tiles.length; r++) {
        for (let c = 0; c < (tiles[r]?.length ?? 0); c++) {
          if (tiles[r][c] === null) continue;
          const gr = p.row + r, gc = p.col + c;
          if (gr < 0 || gr >= ctx.gridH || gc < 0 || gc >= ctx.gridW || !ctx.room[gr][gc]) {
            // Revert position
            p.row = move.oldRow;
            p.col = move.oldCol;
            setOccupancy(ctx, move.pi);
            return false;
          }
          if (ctx.occupancy[gr][gc] >= 0 && ctx.occupancy[gr][gc] !== move.pi) {
            p.row = move.oldRow;
            p.col = move.oldCol;
            setOccupancy(ctx, move.pi);
            return false;
          }
        }
      }
      setOccupancy(ctx, move.pi);
      return true;
    }

    case "RESIZE":
    case "UPGRADE": {
      const p = ctx.placements[move.pi];
      clearOccupancy(ctx, move.pi);
      const oldItemIdx = p.itemIdx;
      p.itemIdx = move.newItemIdx;
      // Check if fits
      const tiles = getCachedTiles(ctx, p.groupIdx, p.itemIdx, p.rotation);
      for (let r = 0; r < tiles.length; r++) {
        for (let c = 0; c < (tiles[r]?.length ?? 0); c++) {
          if (tiles[r][c] === null) continue;
          const gr = p.row + r, gc = p.col + c;
          if (gr < 0 || gr >= ctx.gridH || gc < 0 || gc >= ctx.gridW || !ctx.room[gr][gc]) {
            p.itemIdx = oldItemIdx;
            setOccupancy(ctx, move.pi);
            return false;
          }
          if (ctx.occupancy[gr][gc] >= 0 && ctx.occupancy[gr][gc] !== move.pi) {
            p.itemIdx = oldItemIdx;
            setOccupancy(ctx, move.pi);
            return false;
          }
        }
      }
      setOccupancy(ctx, move.pi);
      return true;
    }

    case "ADD": {
      const pi = ctx.placements.length;
      ctx.placements.push({
        groupIdx: move.groupIdx,
        itemIdx: move.itemIdx,
        rotation: move.rotation,
        row: move.row,
        col: move.col,
      });
      move.pi = pi;
      // Check if fits
      const tiles = getCachedTiles(ctx, move.groupIdx, move.itemIdx, move.rotation);
      for (let r = 0; r < tiles.length; r++) {
        for (let c = 0; c < (tiles[r]?.length ?? 0); c++) {
          if (tiles[r][c] === null) continue;
          const gr = move.row + r, gc = move.col + c;
          if (gr < 0 || gr >= ctx.gridH || gc < 0 || gc >= ctx.gridW || !ctx.room[gr][gc]) {
            ctx.placements.pop();
            return false;
          }
          if (ctx.occupancy[gr][gc] >= 0) {
            ctx.placements.pop();
            return false;
          }
        }
      }
      setOccupancy(ctx, pi);
      if (ctx.groupCounts) ctx.groupCounts[move.groupIdx]++;
      return true;
    }

    case "REMOVE": {
      clearOccupancy(ctx, move.pi);
      if (ctx.groupCounts) ctx.groupCounts[move.groupIdx]--;
      // Swap with last for O(1) removal
      const lastIdx = ctx.placements.length - 1;
      if (move.pi !== lastIdx) {
        clearOccupancy(ctx, lastIdx);
        const tmp = ctx.placements[move.pi];
        ctx.placements[move.pi] = ctx.placements[lastIdx];
        ctx.placements[lastIdx] = tmp;
        move.swappedFrom = lastIdx;
        setOccupancy(ctx, move.pi);
      }
      ctx.placements.pop();
      return true;
    }

    case "SWAP": {
      const p1 = ctx.placements[move.pi1];
      const p2 = ctx.placements[move.pi2];
      clearOccupancy(ctx, move.pi1);
      clearOccupancy(ctx, move.pi2);
      // Exchange positions
      const tmpRow = p1.row, tmpCol = p1.col;
      p1.row = p2.row; p1.col = p2.col;
      p2.row = tmpRow; p2.col = tmpCol;
      // Check both fit
      const t1 = getCachedTiles(ctx, p1.groupIdx, p1.itemIdx, p1.rotation);
      const t2 = getCachedTiles(ctx, p2.groupIdx, p2.itemIdx, p2.rotation);
      let ok = true;
      for (let r = 0; r < t1.length && ok; r++) {
        for (let c = 0; c < (t1[r]?.length ?? 0) && ok; c++) {
          if (t1[r][c] === null) continue;
          const gr = p1.row + r, gc = p1.col + c;
          if (gr < 0 || gr >= ctx.gridH || gc < 0 || gc >= ctx.gridW || !ctx.room[gr][gc]) ok = false;
        }
      }
      for (let r = 0; r < t2.length && ok; r++) {
        for (let c = 0; c < (t2[r]?.length ?? 0) && ok; c++) {
          if (t2[r][c] === null) continue;
          const gr = p2.row + r, gc = p2.col + c;
          if (gr < 0 || gr >= ctx.gridH || gc < 0 || gc >= ctx.gridW || !ctx.room[gr][gc]) ok = false;
        }
      }
      if (!ok) {
        p2.row = p1.row; p2.col = p1.col;
        p1.row = move.oldRow1; p1.col = move.oldCol1;
        p2.row = move.oldRow2; p2.col = move.oldCol2;
        setOccupancy(ctx, move.pi1);
        setOccupancy(ctx, move.pi2);
        return false;
      }
      setOccupancy(ctx, move.pi1);
      // Check overlap with p2 after p1 is set
      const t2Check = getCachedTiles(ctx, p2.groupIdx, p2.itemIdx, p2.rotation);
      for (let r = 0; r < t2Check.length; r++) {
        for (let c = 0; c < (t2Check[r]?.length ?? 0); c++) {
          if (t2Check[r][c] === null) continue;
          const gr = p2.row + r, gc = p2.col + c;
          if (gr >= 0 && gr < ctx.gridH && gc >= 0 && gc < ctx.gridW) {
            if (ctx.occupancy[gr][gc] >= 0 && ctx.occupancy[gr][gc] !== move.pi2) {
              // Overlap — revert
              clearOccupancy(ctx, move.pi1);
              p1.row = move.oldRow1; p1.col = move.oldCol1;
              p2.row = move.oldRow2; p2.col = move.oldCol2;
              setOccupancy(ctx, move.pi1);
              setOccupancy(ctx, move.pi2);
              return false;
            }
          }
        }
      }
      setOccupancy(ctx, move.pi2);
      return true;
    }

    case "ROTATE": {
      const p = ctx.placements[move.pi];
      clearOccupancy(ctx, move.pi);
      p.rotation = move.newRotation;
      const tiles = getCachedTiles(ctx, p.groupIdx, p.itemIdx, p.rotation);
      for (let r = 0; r < tiles.length; r++) {
        for (let c = 0; c < (tiles[r]?.length ?? 0); c++) {
          if (tiles[r][c] === null) continue;
          const gr = p.row + r, gc = p.col + c;
          if (gr < 0 || gr >= ctx.gridH || gc < 0 || gc >= ctx.gridW || !ctx.room[gr][gc]) {
            p.rotation = move.oldRotation;
            setOccupancy(ctx, move.pi);
            return false;
          }
          if (ctx.occupancy[gr][gc] >= 0 && ctx.occupancy[gr][gc] !== move.pi) {
            p.rotation = move.oldRotation;
            setOccupancy(ctx, move.pi);
            return false;
          }
        }
      }
      setOccupancy(ctx, move.pi);
      return true;
    }

    case "ERASE": {
      removeRoomTile(ctx, move.row, move.col);
      return true;
    }

    case "ADD_ROOM": {
      restoreRoomTile(ctx, move.row, move.col);
      return true;
    }

    default: return false;
  }
}

// ── Move reversion ───────────────────────────────────────

function revertMove(ctx, move) {
  switch (move.type) {
    case "SLIDE":
    case "RELOCATE": {
      const p = ctx.placements[move.pi];
      clearOccupancy(ctx, move.pi);
      p.row = move.oldRow;
      p.col = move.oldCol;
      setOccupancy(ctx, move.pi);
      break;
    }

    case "RESIZE":
    case "UPGRADE": {
      const p = ctx.placements[move.pi];
      clearOccupancy(ctx, move.pi);
      p.itemIdx = move.oldItemIdx;
      setOccupancy(ctx, move.pi);
      break;
    }

    case "ADD": {
      clearOccupancy(ctx, move.pi);
      if (ctx.groupCounts) ctx.groupCounts[move.groupIdx]--;
      ctx.placements.pop();
      break;
    }

    case "REMOVE": {
      // Re-add: push saved placement
      if (ctx.groupCounts) ctx.groupCounts[move.groupIdx]++;
      ctx.placements.push(move.saved);
      const newPi = ctx.placements.length - 1;
      // If we swapped during removal, swap back
      if (move.swappedFrom !== undefined) {
        const tmp = ctx.placements[move.pi];
        ctx.placements[move.pi] = ctx.placements[newPi];
        ctx.placements[newPi] = tmp;
        // After the swap: placements[move.pi] = removed piece (was at -1 in occ grid)
        //                  placements[newPi] = swapped piece (occ grid still says move.pi)
        // Re-index the swapped piece's occupancy from move.pi → newPi (no blockerCount change)
        const pieceL = ctx.placements[newPi];
        const tilesL = getCachedTiles(ctx, pieceL.groupIdx, pieceL.itemIdx, pieceL.rotation);
        for (let r = 0; r < tilesL.length; r++) {
          for (let c = 0; c < (tilesL[r]?.length ?? 0); c++) {
            if (tilesL[r][c] === null) continue;
            const gr = pieceL.row + r, gc = pieceL.col + c;
            if (gr >= 0 && gr < ctx.gridH && gc >= 0 && gc < ctx.gridW) {
              ctx.occupancy[gr][gc] = newPi;
            }
          }
        }
        // Set the restored piece's occupancy + blockerCount (was cleared during apply)
        setOccupancy(ctx, move.pi);
      } else {
        setOccupancy(ctx, newPi);
      }
      break;
    }

    case "SWAP": {
      const p1 = ctx.placements[move.pi1];
      const p2 = ctx.placements[move.pi2];
      clearOccupancy(ctx, move.pi1);
      clearOccupancy(ctx, move.pi2);
      p1.row = move.oldRow1; p1.col = move.oldCol1;
      p2.row = move.oldRow2; p2.col = move.oldCol2;
      setOccupancy(ctx, move.pi1);
      setOccupancy(ctx, move.pi2);
      break;
    }

    case "ROTATE": {
      const p = ctx.placements[move.pi];
      clearOccupancy(ctx, move.pi);
      p.rotation = move.oldRotation;
      setOccupancy(ctx, move.pi);
      break;
    }

    case "ERASE": {
      // Restore auto-cleaned fragment tiles first
      if (move.autoCleanedTiles) {
        for (const { r, c } of move.autoCleanedTiles) {
          restoreRoomTile(ctx, r, c);
        }
      }
      restoreRoomTile(ctx, move.row, move.col);
      break;
    }

    case "ADD_ROOM": {
      removeRoomTile(ctx, move.row, move.col);
      break;
    }
  }
}

// ── Phase 2.5: Post-SA Polish ─────────────────────────────

async function polishPhase(ctx) {
  // Rebuild groupCounts — SA snapshot restore doesn't maintain them through polish
  rebuildGroupCounts(ctx);

  const { furnitureSet: fs } = ctx;

  // Sub-pass A: Upgrade — try replacing each item with a larger variant
  // Phase 3d: Also try shifting ±1 tile to accommodate larger variants
  const SHIFT_OFFSETS = [[0,0],[0,1],[0,-1],[1,0],[-1,0]];
  for (let pi = ctx.lockedCount; pi < ctx.placements.length; pi++) {
    const p = ctx.placements[pi];
    const group = fs.groups[p.groupIdx];
    if (group.items.length <= 1) continue;

    const currentScore = scoreLayoutSA(ctx);
    const origRow = p.row, origCol = p.col;
    let upgraded = false;
    const gInfo = ctx.groupInfo[p.groupIdx];
    // For storage groups, capture stats before upgrade to ensure no regression
    const preStats = gInfo?.isStorage ? getStats(ctx) : null;

    // Try progressively larger items
    for (let newII = p.itemIdx + 1; newII < group.items.length && !upgraded; newII++) {
      for (const [sr, sc] of SHIFT_OFFSETS) {
        clearOccupancy(ctx, pi);
        const oldII = p.itemIdx;
        p.itemIdx = newII;
        p.row = origRow + sr;
        p.col = origCol + sc;

        const tiles = getCachedTiles(ctx, p.groupIdx, newII, p.rotation);
        let fits = true;
        for (let r = 0; r < tiles.length && fits; r++) {
          for (let c = 0; c < (tiles[r]?.length ?? 0) && fits; c++) {
            if (tiles[r][c] === null) continue;
            const gr = p.row + r, gc = p.col + c;
            if (gr < 0 || gr >= ctx.gridH || gc < 0 || gc >= ctx.gridW || !ctx.room[gr][gc]) fits = false;
            else if (ctx.occupancy[gr][gc] >= 0) fits = false;
          }
        }

        if (fits) {
          setOccupancy(ctx, pi);
          let accept = checkWalkabilityOpt(ctx) && scoreLayoutSA(ctx) > currentScore
              && hasAnyDoorCandidate(ctx);
          // Storage upgrade: only if employees and efficiency don't decrease
          if (accept && preStats) {
            const postStats = getStats(ctx);
            if (ctx.empIdx >= 0 && postStats[ctx.empIdx] < preStats[ctx.empIdx]) accept = false;
            if (ctx.effIdx >= 0 && postStats[ctx.effIdx] < preStats[ctx.effIdx]) accept = false;
          }
          if (accept) {
            upgraded = true;
            break; // keep upgrade
          }
          clearOccupancy(ctx, pi);
        }

        p.itemIdx = oldII;
        p.row = origRow;
        p.col = origCol;
        setOccupancy(ctx, pi);
      }
    }
  }

  await yieldToUI();

  // Sub-pass A2: Greedy squeeze — slide pieces toward centroid to consolidate space
  for (let round = 0; round < 3; round++) {
    // Compute centroid of all placements
    let centR = 0, centC = 0, centN = 0;
    for (let pi = ctx.lockedCount; pi < ctx.placements.length; pi++) {
      const p = ctx.placements[pi];
      centR += p.row;
      centC += p.col;
      centN++;
    }
    if (centN === 0) break;
    centR /= centN;
    centC /= centN;

    let anyMoved = false;
    const currentScore = scoreLayoutSA(ctx);

    for (let pi = ctx.lockedCount; pi < ctx.placements.length; pi++) {
      const p = ctx.placements[pi];
      const dr = Math.sign(centR - p.row);
      const dc = Math.sign(centC - p.col);
      if (dr === 0 && dc === 0) continue;

      const shifts = [];
      if (dr !== 0) shifts.push([dr, 0]);
      if (dc !== 0) shifts.push([0, dc]);
      if (dr !== 0 && dc !== 0) shifts.push([dr, dc]);

      for (const [sr, sc] of shifts) {
        clearOccupancy(ctx, pi);
        const origRow = p.row, origCol = p.col;
        p.row += sr;
        p.col += sc;

        const tiles = getCachedTiles(ctx, p.groupIdx, p.itemIdx, p.rotation);
        let fits = true;
        for (let r = 0; r < tiles.length && fits; r++) {
          for (let c = 0; c < (tiles[r]?.length ?? 0) && fits; c++) {
            if (tiles[r][c] === null) continue;
            const gr = p.row + r, gc = p.col + c;
            if (gr < 0 || gr >= ctx.gridH || gc < 0 || gc >= ctx.gridW || !ctx.room[gr][gc]) fits = false;
            else if (ctx.occupancy[gr][gc] >= 0) fits = false;
          }
        }

        if (fits) {
          setOccupancy(ctx, pi);
          const newScore = scoreLayoutSA(ctx);
          if (newScore >= currentScore && checkWalkabilityOpt(ctx) && hasAnyDoorCandidate(ctx)) {
            anyMoved = true;
            break; // keep this shift
          }
          clearOccupancy(ctx, pi);
        }

        p.row = origRow;
        p.col = origCol;
        setOccupancy(ctx, pi);
      }
    }
    if (!anyMoved) break;
  }

  await yieldToUI();

  // Sub-pass A3: Neatness rotation+shift — try rotating and shifting each piece to improve
  // walkable-sharing. Uses dedicated neatness scoring with full weights. Primary stat must not decrease.
  // Runs multiple rounds since rotating one piece may enable better orientations for neighbors.
  {
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

        const origRot = p.rotation, origRow = p.row, origCol = p.col;
        const currentNeatness = computeLocalNeatness(ctx, pi);
        let bestRot = origRot, bestRow = origRow, bestCol = origCol;
        let bestNeatness = currentNeatness;

        clearOccupancy(ctx, pi);

        for (const rot of rots) {
          for (const [sr, sc] of A3_SHIFTS) {
            if (rot === origRot && sr === 0 && sc === 0) continue;
            p.rotation = rot;
            p.row = origRow + sr;
            p.col = origCol + sc;

            const tiles = getCachedTiles(ctx, p.groupIdx, p.itemIdx, rot);
            let fits = true;
            for (let r = 0; r < tiles.length && fits; r++) {
              for (let c = 0; c < (tiles[r]?.length ?? 0) && fits; c++) {
                if (tiles[r][c] === null) continue;
                const gr = p.row + r, gc = p.col + c;
                if (gr < 0 || gr >= ctx.gridH || gc < 0 || gc >= ctx.gridW || !ctx.room[gr][gc]) fits = false;
                else if (ctx.occupancy[gr][gc] >= 0) fits = false;
              }
            }

            if (fits) {
              setOccupancy(ctx, pi);
              const postStats = getStats(ctx);
              const postPrimary = postStats[ctx.primaryStatIdx] ?? 0;
              const postEff = ctx.effIdx >= 0 ? (postStats[ctx.effIdx] ?? 0) : -1;
              if (postPrimary >= prePrimary && postEff >= preEff
                  && checkWalkabilityOpt(ctx) && hasAnyDoorCandidate(ctx)) {
                const neatness = computeLocalNeatness(ctx, pi);
                if (neatness > bestNeatness) {
                  bestRot = rot;
                  bestRow = p.row;
                  bestCol = p.col;
                  bestNeatness = neatness;
                }
              }
              clearOccupancy(ctx, pi);
            }
          }
        }

        // Apply best configuration
        p.rotation = bestRot;
        p.row = bestRow;
        p.col = bestCol;
        setOccupancy(ctx, pi);
        if (bestRot !== origRot || bestRow !== origRow || bestCol !== origCol) {
          anyChanged = true;
        }
      }
      if (!anyChanged) break;
    }
  }

  await yieldToUI();

  // Sub-pass B: Gap-fill — place small items in empty spaces
  for (let pass = 0; pass < 3; pass++) {
    let filled = false;
    for (const gInfo of ctx.groupInfo) {
      // Skip pure efficiency groups — handled by sub-pass C
      if (gInfo.hasEfficiency && !gInfo.hasPrimary && ctx.empIdx >= 0 && ctx.effIdx >= 0) {
        continue;
      }
      // Skip pure relative groups — handled by sub-pass D
      if (gInfo.hasRelative && !gInfo.hasPrimary && ctx.relativeIndices.length > 0) {
        continue;
      }

      const gi = gInfo.groupIdx;
      const group = fs.groups[gi];
      const maxP = group.max ?? 100;
      if (countGroupPlacements(ctx, gi) >= maxP) continue;

      const rots = getAllowedRotations(group);
      // Use fillerItems (smallest first), then heroItems
      const candidates = [...gInfo.fillerItems, ...gInfo.heroItems];

      for (const ii of candidates) {
        if (countGroupPlacements(ctx, gi) >= maxP) break;

        let bestPos = null;
        let bestScore = -Infinity;
        const currentScore = scoreLayoutSA(ctx);

        for (const rot of rots) {
          for (const { r, c } of ctx.roomTiles) {
            if (ctx.occupancy[r][c] >= 0) continue;
            if (!canPlaceOpt(ctx, gi, ii, rot, r, c, undefined)) continue;
            const posScore = scorePlacementPosition(ctx, gi, ii, rot, r, c);
            if (posScore > bestScore) {
              bestScore = posScore;
              bestPos = { rot, row: r, col: c };
            }
          }
        }

        if (bestPos) {
          const pi = ctx.placements.length;
          ctx.placements.push({ groupIdx: gi, itemIdx: ii, rotation: bestPos.rot, row: bestPos.row, col: bestPos.col });
          setOccupancy(ctx, pi);
          if (ctx.groupCounts) ctx.groupCounts[gi]++;

          const ok = checkWalkabilityOpt(ctx)
            && scoreLayoutSA(ctx) > currentScore
            && hasAnyDoorCandidate(ctx);
          if (!ok) {
            clearOccupancy(ctx, pi);
            if (ctx.groupCounts) ctx.groupCounts[gi]--;
            ctx.placements.pop();
          } else {
            filled = true;
          }
        }
      }
    }
    if (!filled) break;
    await yieldToUI();
  }

  // Sub-pass C: Final efficiency rebalance
  if (ctx.empIdx >= 0 && ctx.effIdx >= 0) {
    placeEfficiencyItems(ctx, ctx.furnitureSet);
  }

  // Sub-pass D: Final relative rebalance
  if (ctx.relativeIndices.length > 0) {
    placeRelativeItems(ctx, ctx.furnitureSet);
  }
}

/** Quick check: is there at least one valid door candidate? For outdoor buildings, always true.
 *  Geometry-based — checks for outside tiles adjacent to room tiles, ignoring furniture. */
function hasAnyDoorCandidate(ctx) {
  if (!ctx.furnitureSet.mustBeIndoors) return true;
  if (ctx._doorCandidateCache !== undefined) return ctx._doorCandidateCache;
  const result = _hasAnyDoorCandidateImpl(ctx);
  ctx._doorCandidateCache = result;
  return result;
}

function _hasAnyDoorCandidateImpl(ctx) {
  const outside = findOutsideTiles(ctx);
  for (let r = 0; r < ctx.gridH; r++) {
    for (let c = 0; c < ctx.gridW; c++) {
      if (ctx.room[r][c] || !outside[r][c]) continue;
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < ctx.gridH && nc >= 0 && nc < ctx.gridW
            && ctx.room[nr][nc]) {
          return true;
        }
      }
    }
  }
  for (let r = 0; r < ctx.gridH; r++) {
    for (let c = 0; c < ctx.gridW; c++) {
      if (ctx.room[r][c]) continue;
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < ctx.gridH && nc >= 0 && nc < ctx.gridW
            && ctx.room[nr][nc]) {
          return true;
        }
      }
    }
  }
  return false;
}

// ── Phase 3: Room Trimming ───────────────────────────────

async function trimPhase(ctx) {
  // Pass 1: Create support pillars FIRST (while tiles are still available)
  if (ctx.furnitureSet.mustBeIndoors) {
    await createSupportPillars(ctx);
  }

  // Pass 2: Trim unoccupied tiles that actually reduce the building footprint.
  // The game places walls 8-directionally around room tiles. Removing a single edge
  // tile just converts it to a wall — no footprint reduction. We need to only trim
  // tiles whose removal frees wall tiles that were exclusively caused by that room tile.
  for (let pass = 0; pass < 5; pass++) {
    let trimmed = false;
    await yieldToUI();

    // Build wall reference count: for each non-room tile, count 8-dir adjacent room tiles.
    // Tiles with wallRef[r][c] == 1 are walls caused by a single room tile.
    const wallRef = Array.from({ length: ctx.gridH }, () => new Int8Array(ctx.gridW));
    for (let r = 0; r < ctx.gridH; r++) {
      for (let c = 0; c < ctx.gridW; c++) {
        if (ctx.room[r][c]) continue;
        let count = 0;
        for (const [dr, dc] of DIRS8) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < ctx.gridH && nc >= 0 && nc < ctx.gridW && ctx.room[nr][nc]) {
            count++;
          }
        }
        wallRef[r][c] = count;
      }
    }

    // Collect unoccupied room tiles and compute footprint reduction
    const candidates = [];
    for (let r = 0; r < ctx.gridH; r++) {
      for (let c = 0; c < ctx.gridW; c++) {
        if (!ctx.room[r][c]) continue;
        if (ctx.occupancy[r][c] >= 0) continue;

        // Compute how many footprint tiles would be freed by removing (r,c)
        let fpReduction = 0;

        // Check (r,c) itself: becomes free only if no remaining room tile is 8-dir adjacent
        let hasRoomNeighbor8 = false;
        for (const [dr, dc] of DIRS8) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < ctx.gridH && nc >= 0 && nc < ctx.gridW && ctx.room[nr][nc]) {
            hasRoomNeighbor8 = true;
            break;
          }
        }
        if (!hasRoomNeighbor8) fpReduction++; // position exits footprint entirely

        // Check 8-dir non-room neighbors: freed if their only room neighbor was (r,c)
        for (const [dr, dc] of DIRS8) {
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nr >= ctx.gridH || nc < 0 || nc >= ctx.gridW) continue;
          if (ctx.room[nr][nc]) continue; // room tile, not a wall
          if (wallRef[nr][nc] === 1) fpReduction++; // exclusively our wall → freed
        }

        if (fpReduction > 0) {
          candidates.push({ r, c, fpReduction });
        }
      }
    }

    // Most footprint reduction first
    candidates.sort((a, b) => b.fpReduction - a.fpReduction);

    for (const cand of candidates) {
      if (canEraseTile(ctx, cand.r, cand.c)) {
        removeRoomTile(ctx, cand.r, cand.c);
        trimmed = true;
      }
    }

    if (!trimmed) break;
  }

  // Pass 3: Re-check stability after trimming (trim might have improved or worsened it)
  if (ctx.furnitureSet.mustBeIndoors) {
    await createSupportPillars(ctx);
  }
}

/** Phase 3c: Fill isolated empty tiles (3+ occupied/wall neighbors) with 1x1 items. */
async function microGapFill(ctx) {
  const { furnitureSet: fs, gridW, gridH } = ctx;
  const currentScore = scoreLayoutSA(ctx);

  for (let r = 0; r < gridH; r++) {
    for (let c = 0; c < gridW; c++) {
      if (!ctx.room[r][c] || ctx.occupancy[r][c] >= 0) continue;
      // Count occupied + wall neighbors
      let solidCount = 0;
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW || !ctx.room[nr][nc]) {
          solidCount++;
        } else if (ctx.occupancy[nr][nc] >= 0) {
          solidCount++;
        }
      }
      if (solidCount < 3) continue;

      // Try placing a 1x1 item from any group under its max
      let bestGi = -1, bestIi = -1, bestRot = 0, bestScore = currentScore;
      for (let gi = 0; gi < fs.groups.length; gi++) {
        const group = fs.groups[gi];
        const maxP = group.max ?? 100;
        if (countGroupPlacements(ctx, gi) >= maxP) continue;
        const rots = getAllowedRotations(group);
        for (let ii = 0; ii < group.items.length; ii++) {
          if (countItemTiles(group.items[ii]) !== 1) continue;
          for (const rot of rots) {
            if (!canPlaceOpt(ctx, gi, ii, rot, r, c, undefined)) continue;
            const pi = ctx.placements.length;
            ctx.placements.push({ groupIdx: gi, itemIdx: ii, rotation: rot, row: r, col: c });
            setOccupancy(ctx, pi);
            if (ctx.groupCounts) ctx.groupCounts[gi]++;
            const s = scoreLayoutSA(ctx);
            if (s > bestScore && checkWalkabilityOpt(ctx)) {
              bestScore = s;
              bestGi = gi; bestIi = ii; bestRot = rot;
            }
            clearOccupancy(ctx, pi);
            if (ctx.groupCounts) ctx.groupCounts[gi]--;
            ctx.placements.pop();
          }
        }
      }
      if (bestGi >= 0) {
        const pi = ctx.placements.length;
        ctx.placements.push({ groupIdx: bestGi, itemIdx: bestIi, rotation: bestRot, row: r, col: c });
        setOccupancy(ctx, pi);
        if (ctx.groupCounts) ctx.groupCounts[bestGi]++;
        // Re-verify walkability (prior gap-fills may have changed the state)
        if (!checkWalkabilityOpt(ctx)) {
          clearOccupancy(ctx, pi);
          if (ctx.groupCounts) ctx.groupCounts[bestGi]--;
          ctx.placements.pop();
        }
      }
    }
  }
  await yieldToUI();
}

/** Erase interior tiles to create support pillars for unstable zones. */
async function createSupportPillars(ctx) {
  for (let pass = 0; pass < 10; pass++) {
    const unstable = countUnstableTiles(ctx);
    if (unstable === 0) break;
    await yieldToUI();

    // Find the unstable tile that's farthest from any wall (worst case)
    let worstR = -1, worstC = -1, worstSupport = Infinity;
    for (let r = 0; r < ctx.gridH; r++) {
      for (let c = 0; c < ctx.gridW; c++) {
        if (!ctx.room[r][c]) continue;
        const sup = tileSupport(ctx.room, ctx.gridW, ctx.gridH, r, c);
        if (sup < 1.0 && sup < worstSupport) {
          worstSupport = sup;
          worstR = r;
          worstC = c;
        }
      }
    }
    if (worstR < 0) break;

    // Try to erase an unoccupied tile near the unstable zone to create support
    // Search outward from the unstable tile
    let bestCandidate = null;
    let bestCuredCount = 0;
    const searchRadius = SUPPORT_RADIUS + 1;

    for (let dr = -searchRadius; dr <= searchRadius; dr++) {
      for (let dc = -searchRadius; dc <= searchRadius; dc++) {
        const tr = worstR + dr, tc = worstC + dc;
        if (tr < 0 || tr >= ctx.gridH || tc < 0 || tc >= ctx.gridW) continue;
        if (!ctx.room[tr][tc]) continue;
        if (ctx.occupancy[tr][tc] >= 0) continue;

        // Test: how many unstable tiles would this cure?
        ctx.room[tr][tc] = false;
        const newUnstable = countUnstableTiles(ctx);
        const connected = checkRoomConnectivity(ctx);
        const walkable = connected && checkWalkabilityOpt(ctx);
        ctx.room[tr][tc] = true;

        if (!connected || !walkable) continue;
        const cured = unstable - newUnstable;
        if (cured > bestCuredCount) {
          bestCuredCount = cured;
          bestCandidate = { r: tr, c: tc };
        }
      }
    }

    if (!bestCandidate || bestCuredCount <= 0) break;

    // Erase the tile
    removeRoomTile(ctx, bestCandidate.r, bestCandidate.c);
  }
}

// ── Phase 4: Door Optimization ───────────────────────────

/** BFS from grid boundary through non-room tiles to find "outside" tiles.
 *  Support pillars (interior holes) won't be reached. */
function findOutsideTiles(ctx) {
  const { gridW, gridH, room } = ctx;
  const outside = Array.from({ length: gridH }, () => Array(gridW).fill(false));
  const q = ctx.bfsQueue;
  q.reset();

  // Seed: all boundary non-room tiles + off-grid is implicitly outside
  for (let r = 0; r < gridH; r++) {
    for (let c = 0; c < gridW; c++) {
      if (room[r][c]) continue;
      if (r === 0 || r === gridH - 1 || c === 0 || c === gridW - 1) {
        outside[r][c] = true;
        q.push(r, c);
      }
    }
  }

  // If room fills entire boundary, also seed non-room tiles adjacent to off-grid
  if (q.length === 0) {
    for (let r = 0; r < gridH; r++) {
      for (let c = 0; c < gridW; c++) {
        if (room[r][c] || outside[r][c]) continue;
        for (const [dr, dc] of DIRS) {
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW) {
            outside[r][c] = true;
            q.push(r, c);
            break;
          }
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

/** Check if a 4-way neighbor is "open" — off-grid, or non-room with no room neighbor. */
function isOpenTile(ctx, r, c) {
  if (r < 0 || r >= ctx.gridH || c < 0 || c >= ctx.gridW) return true; // off-grid
  if (ctx.room[r][c]) return false;
  for (const [dr, dc] of DIRS) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < ctx.gridH && nc >= 0 && nc < ctx.gridW && ctx.room[nr][nc]) {
      return false; // it's a wall tile (adjacent to room), not open space
    }
  }
  return true;
}

function doorPhase(ctx) {
  if (!ctx.furnitureSet.mustBeIndoors) return;
  ctx.doors = new Set();

  const outside = findOutsideTiles(ctx);

  // Valid door: outer wall tile that connects room to open exterior
  const candidates = [];
  for (let r = 0; r < ctx.gridH; r++) {
    for (let c = 0; c < ctx.gridW; c++) {
      if (ctx.room[r][c]) continue;
      if (!outside[r][c]) continue;

      // Check if adjacent to any room tile
      let hasAdj = false;
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < ctx.gridH && nc >= 0 && nc < ctx.gridW && ctx.room[nr][nc]) {
          hasAdj = true; break;
        }
      }
      if (!hasAdj) continue;

      // Door must connect outside to room along the SAME axis:
      // one side is room, opposite side is open exterior.
      // Additionally, the perpendicular neighbors must NOT be room tiles —
      // this prevents doors at trimmed corners/notches where the wall
      // changes direction (diagonal-only connection to part of the room).
      let validDoor = false;
      for (const [dr, dc] of DIRS) {
        const ar = r + dr, ac = c + dc;
        const br = r - dr, bc = c - dc;
        const aIsRoom = ar >= 0 && ar < ctx.gridH && ac >= 0 && ac < ctx.gridW
            && ctx.room[ar][ac];
        const bIsRoom = br >= 0 && br < ctx.gridH && bc >= 0 && bc < ctx.gridW
            && ctx.room[br][bc];
        const aIsOpen = isOpenTile(ctx, ar, ac);
        const bIsOpen = isOpenTile(ctx, br, bc);
        if ((aIsRoom && bIsOpen) || (bIsRoom && aIsOpen)) {
          // Check perpendicular: neither side should be room (flat wall check)
          const pr1 = r + dc, pc1 = c + dr;
          const pr2 = r - dc, pc2 = c - dr;
          const perp1Room = pr1 >= 0 && pr1 < ctx.gridH && pc1 >= 0 && pc1 < ctx.gridW
              && ctx.room[pr1][pc1];
          const perp2Room = pr2 >= 0 && pr2 < ctx.gridH && pc2 >= 0 && pc2 < ctx.gridW
              && ctx.room[pr2][pc2];
          if (!perp1Room && !perp2Room) {
            validDoor = true;
            break;
          }
        }
      }
      if (!validDoor) continue;

      // Door must have at least one adjacent walkable room tile — a door behind
      // furniture is useless since workers can't reach it
      let hasWalkable = false;
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < ctx.gridH && nc >= 0 && nc < ctx.gridW
            && ctx.room[nr][nc] && ctx.blockerCount[nr][nc] === 0) {
          hasWalkable = true;
          break;
        }
      }
      if (!hasWalkable) continue;

      candidates.push({ r, c });
    }
  }

  if (candidates.length === 0) return;

  // Greedy marginal placement: each round, pick the door that most reduces
  // average walk distance from work/storage tiles to their nearest door.
  // This naturally spaces doors around the room perimeter.
  // All valid doors are placed (marginal scoring controls order, not count).
  while (candidates.length > 0) {
    // Pass 1: Filter candidates that would break isolation (with current doors)
    for (let i = candidates.length - 1; i >= 0; i--) {
      const cand = candidates[i];
      ctx.doors.add(`${cand.r},${cand.c}`);
      const iso = computeIsolationOpt(ctx);
      ctx.doors.delete(`${cand.r},${cand.c}`);
      if (iso < 0.995) {
        candidates.splice(i, 1);
      }
    }

    if (candidates.length === 0) break;

    // Pass 2: Score each remaining candidate by resulting avg walk distance
    // First door: minimize distance to storage; subsequent: minimize distance to workstations
    const target = ctx.doors.size === 0 ? "storage" : "work";
    let bestIdx = -1;
    let bestAvg = Infinity;
    for (let i = 0; i < candidates.length; i++) {
      const cand = candidates[i];
      ctx.doors.add(`${cand.r},${cand.c}`);
      const avg = computeAvgWalkDistance(ctx, target);
      ctx.doors.delete(`${cand.r},${cand.c}`);
      if (avg < bestAvg) {
        bestAvg = avg;
        bestIdx = i;
      }
    }

    if (bestIdx < 0) break;

    const best = candidates[bestIdx];
    ctx.doors.add(`${best.r},${best.c}`);
    candidates.splice(bestIdx, 1);
  }
}

/** Multi-source BFS from all placed doors. Returns avg walk distance to target tiles.
 *  @param {string} target - "storage" (data===2 tiles) or "work" (mustBeReachable tiles)
 *  For mustBeReachable furniture tiles, distance is measured to the nearest
 *  adjacent walkable room tile (the tile a worker stands on to interact). */
function computeAvgWalkDistance(ctx, target) {
  const { gridW, gridH, room, furnitureSet: fs, placements, doors } = ctx;
  if (doors.size === 0) return Infinity;

  const dist = Array.from({ length: gridH }, () => Array(gridW).fill(-1));
  const q = ctx.bfsQueue;
  q.reset();

  // Seed BFS from walkable room tiles adjacent to each door
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

  // Collect target furniture tiles
  let totalDist = 0, count = 0;
  for (const p of placements) {
    const tiles = getCachedTiles(ctx, p.groupIdx, p.itemIdx, p.rotation);
    for (let r = 0; r < tiles.length; r++) {
      for (let c = 0; c < (tiles[r]?.length ?? 0); c++) {
        const tileKey = tiles[r][c];
        if (tileKey === null) continue;
        const tt = fs.tileTypes[tileKey];
        if (!tt) continue;
        const gr = p.row + r, gc = p.col + c;

        if (target === "storage" && tt.data !== 2) continue;
        if (target === "work" && !tt.mustBeReachable) continue;

        // Find the nearest walkable room tile adjacent to this furniture tile
        let minD = Infinity;
        for (const [dr, dc] of DIRS) {
          const nr = gr + dr, nc = gc + dc;
          if (nr >= 0 && nr < gridH && nc >= 0 && nc < gridW && dist[nr][nc] >= 0) {
            minD = Math.min(minD, dist[nr][nc]);
          }
        }
        // Also check the tile itself if walkable
        if (dist[gr]?.[gc] >= 0) {
          minD = Math.min(minD, dist[gr][gc]);
        }
        if (minD < Infinity) {
          totalDist += minD;
          count++;
        }
      }
    }
  }

  if (count === 0) return Infinity;
  return totalDist / count;
}

// ── Phase 5: Final Validation ────────────────────────────

function validateFinal(ctx) {
  if (!checkWalkabilityOpt(ctx)) return false;
  if (!checkStabilityOpt(ctx)) return false;
  // Efficiency is a soft constraint — handled by scoring, not validated here.
  // Reverting the entire layout because of <100% efficiency wastes all SA work.
  if (ctx.building.storage > 0 && ctx.placements.length > 0 && !hasStorageTile(ctx)) return false;
  if (!checkRoomConnectivity(ctx)) return false;

  // Group mins and maxes
  const fs = ctx.furnitureSet;
  for (let gi = 0; gi < fs.groups.length; gi++) {
    const group = fs.groups[gi];
    const count = countGroupPlacements(ctx, gi);
    if (group.min > 0 && count < group.min) return false;
    if (group.max != null && count > group.max) return false;
  }

  return true;
}
