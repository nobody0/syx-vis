// Room Planner Auto-Optimizer — simulated annealing placement with constraint checking
import { AVAIL_BLOCKING, getRotatedTiles, getAllowedRotations, DIRS } from "./planner.js";

const DIRS8 = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
const SUPPORT_RADIUS = 4;

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

  // Phase 0.5: Pre-place support pillars (before any furniture)
  await prePlacePillars(ctx);

  // Save initial state (post-pillar) for multi-restart
  const initialSnapshot = takeSnapshot(ctx);

  // Multi-restart: run constructive+SA+polish twice, keep best
  let bestResult = null;
  let bestResultScore = -Infinity;

  for (let restart = 0; restart < 2; restart++) {
    if (restart > 0) {
      restoreSnapshot(ctx, initialSnapshot);
      ctx.rng = createRNG(ctx.baseSeed + restart);
    }

    // Phase 1: Smart constructive phase (hero-first)
    // Restart 1: skip every 4th hero placement for diversity
    const skipInterval = restart === 0 ? 0 : 4;
    await constructivePhase(ctx, skipInterval);
    ctx.constructiveSnapshot = takeSnapshot(ctx);

    // Phase 2: Simulated annealing
    await simulatedAnnealing(ctx);

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

  // Phase 4: Door optimization
  doorPhase(ctx);

  // Phase 5: Final validation
  if (!validateFinal(ctx)) {
    console.log(`[optimizer] validateFinal FAILED after trim+doors (${ctx.doors.size} doors lost) — reverting to constructive snapshot`);
    console.log(`[optimizer] validateFinal details: walk=${checkWalkabilityOpt(ctx)} stab=${checkStabilityOpt(ctx)} storage=${!(ctx.building.storage > 0 && ctx.placements.length > 0 && !hasStorageTile(ctx))} conn=${checkRoomConnectivity(ctx)}`);
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
    bestSnapshot: null,
    constructiveSnapshot: null,
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
}

function rebuildRoomTiles(ctx) {
  ctx.roomTiles = [];
  for (let r = 0; r < ctx.gridH; r++)
    for (let c = 0; c < ctx.gridW; c++)
      if (ctx.room[r][c]) ctx.roomTiles.push({ r, c });
}

// ── Occupancy grid ───────────────────────────────────────

function buildOccupancyGrid(ctx) {
  const { gridW, gridH, placements } = ctx;
  const grid = Array.from({ length: gridH }, () => Array(gridW).fill(-1));
  for (let pi = 0; pi < placements.length; pi++) {
    const p = placements[pi];
    const tiles = getCachedTiles(ctx, p.groupIdx, p.itemIdx, p.rotation);
    for (let r = 0; r < tiles.length; r++) {
      for (let c = 0; c < (tiles[r]?.length ?? 0); c++) {
        if (tiles[r][c] === null) continue;
        const gr = p.row + r, gc = p.col + c;
        if (gr >= 0 && gr < gridH && gc >= 0 && gc < gridW) {
          grid[gr][gc] = pi;
        }
      }
    }
  }
  return grid;
}

/** Set occupancy for a specific placement index. Returns false if overlap detected. */
function setOccupancy(ctx, pi) {
  const p = ctx.placements[pi];
  const tiles = getCachedTiles(ctx, p.groupIdx, p.itemIdx, p.rotation);
  let overlap = false;
  for (let r = 0; r < tiles.length; r++) {
    for (let c = 0; c < (tiles[r]?.length ?? 0); c++) {
      if (tiles[r][c] === null) continue;
      const gr = p.row + r, gc = p.col + c;
      if (gr < 0 || gr >= ctx.gridH || gc < 0 || gc >= ctx.gridW) { overlap = true; continue; }
      if (!ctx.room[gr][gc]) { overlap = true; continue; }
      if (ctx.occupancy[gr][gc] >= 0 && ctx.occupancy[gr][gc] !== pi) overlap = true;
      ctx.occupancy[gr][gc] = pi;
    }
  }
  return !overlap;
}

/** Clear occupancy for a specific placement index. */
function clearOccupancy(ctx, pi) {
  const p = ctx.placements[pi];
  const tiles = getCachedTiles(ctx, p.groupIdx, p.itemIdx, p.rotation);
  for (let r = 0; r < tiles.length; r++) {
    for (let c = 0; c < (tiles[r]?.length ?? 0); c++) {
      if (tiles[r][c] === null) continue;
      const gr = p.row + r, gc = p.col + c;
      if (gr >= 0 && gr < ctx.gridH && gc >= 0 && gc < ctx.gridW) {
        if (ctx.occupancy[gr][gc] === pi) ctx.occupancy[gr][gc] = -1;
      }
    }
  }
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

// ── Blocker map ──────────────────────────────────────────

function buildBlockerMap(ctx) {
  const { gridW, gridH, furnitureSet: fs, placements } = ctx;
  const blocked = Array.from({ length: gridH }, () => Array(gridW).fill(false));
  for (const p of placements) {
    const tiles = getCachedTiles(ctx, p.groupIdx, p.itemIdx, p.rotation);
    for (let r = 0; r < tiles.length; r++) {
      for (let c = 0; c < (tiles[r]?.length ?? 0); c++) {
        const tileKey = tiles[r][c];
        if (tileKey === null) continue;
        const gr = p.row + r, gc = p.col + c;
        if (gr < 0 || gr >= gridH || gc < 0 || gc >= gridW) continue;
        const tt = fs.tileTypes[tileKey];
        if (tt && AVAIL_BLOCKING.has(tt.availability)) {
          blocked[gr][gc] = true;
        }
      }
    }
  }
  return blocked;
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

// ── Score function ───────────────────────────────────────

function scoreLayoutSA(ctx) {
  const stats = computeStats(ctx);
  const primary = stats[ctx.primaryStatIdx] ?? 0;

  // Secondary stats (excluding efficiency which is handled separately)
  let secondary = 0;
  for (let i = 0; i < stats.length; i++) {
    if (i !== ctx.primaryStatIdx && i !== ctx.effIdx) secondary += stats[i];
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

  // Stability penalty (heavy — each unstable tile is very bad)
  const unstableCount = countUnstableTiles(ctx);
  const stabilityPenalty = unstableCount * 500;

  // Room size penalty (prefer tighter rooms — each tile has area cost)
  const roomPenalty = ctx.roomTiles.length * 15;

  // Packing density bonus: tiebreaker favoring denser layouts
  let occupied = 0;
  for (const t of ctx.roomTiles) if (ctx.occupancy[t.r][t.c] >= 0) occupied++;
  const packingBonus = (occupied / Math.max(1, ctx.roomTiles.length)) * 50;

  return primary * 1000 + secondary + effBonus + packingBonus
         - totalCost * 0.001 - effPenalty
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
        proposedBlockers.add(`${gr},${gc}`);
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

  // Connectivity check
  if (proposedBlockers.size > 0) {
    if (wouldDisconnectRoomOpt(ctx, proposedBlockers, skipPi)) return false;
  }

  return true;
}

function isBlockerAtOpt(ctx, r, c, proposedBlockers, skipPi) {
  if (proposedBlockers.has(`${r},${c}`)) return true;
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
  const blocked = buildBlockerMap(ctx);
  // Clear blockers from the skipped placement
  if (skipPi !== undefined && skipPi >= 0) {
    const sp = ctx.placements[skipPi];
    if (sp) {
      const stiles = getCachedTiles(ctx, sp.groupIdx, sp.itemIdx, sp.rotation);
      for (let r = 0; r < stiles.length; r++) {
        for (let c = 0; c < (stiles[r]?.length ?? 0); c++) {
          if (stiles[r][c] === null) continue;
          const gr = sp.row + r, gc = sp.col + c;
          if (gr >= 0 && gr < gridH && gc >= 0 && gc < gridW) blocked[gr][gc] = false;
        }
      }
    }
  }
  for (const key of proposedBlockers) {
    const [r, c] = key.split(",").map(Number);
    blocked[r][c] = true;
  }

  let totalOpen = 0, startR = -1, startC = -1;
  for (let r = 0; r < gridH; r++) {
    for (let c = 0; c < gridW; c++) {
      if (room[r][c] && !blocked[r][c]) {
        totalOpen++;
        if (startR < 0) { startR = r; startC = c; }
      }
    }
  }
  if (totalOpen === 0) return false;

  const visited = Array.from({ length: gridH }, () => Array(gridW).fill(false));
  const queue = [[startR, startC]];
  visited[startR][startC] = true;
  let reached = 1;

  while (queue.length > 0) {
    const [cr, cc] = queue.shift();
    for (const [dr, dc] of DIRS) {
      const nr = cr + dr, nc = cc + dc;
      if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW) continue;
      if (visited[nr][nc] || !room[nr][nc] || blocked[nr][nc]) continue;
      visited[nr][nc] = true;
      reached++;
      queue.push([nr, nc]);
    }
  }
  return reached < totalOpen;
}

// ── Walkability check ────────────────────────────────────

function checkWalkabilityOpt(ctx) {
  const { furnitureSet: fs, gridW, gridH, room, placements } = ctx;
  const blocked = buildBlockerMap(ctx);
  const mustReach = [];

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

  const visited = Array.from({ length: gridH }, () => Array(gridW).fill(false));
  const queue = [];
  let totalOpen = 0;

  for (let r = 0; r < gridH; r++) {
    for (let c = 0; c < gridW; c++) {
      if (room[r][c] && !blocked[r][c]) {
        totalOpen++;
        if (queue.length === 0) {
          queue.push([r, c]);
          visited[r][c] = true;
        }
      }
    }
  }

  let reached = queue.length > 0 ? 1 : 0;
  while (queue.length > 0) {
    const [cr, cc] = queue.shift();
    for (const [dr, dc] of DIRS) {
      const nr = cr + dr, nc = cc + dc;
      if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW) continue;
      if (visited[nr][nc] || !room[nr][nc] || blocked[nr][nc]) continue;
      visited[nr][nc] = true;
      reached++;
      queue.push([nr, nc]);
    }
  }

  for (const { row, col } of mustReach) {
    let reachable = false;
    for (const [dr, dc] of DIRS) {
      const nr = row + dr, nc = col + dc;
      if (nr >= 0 && nr < gridH && nc >= 0 && nc < gridW && visited[nr][nc]) {
        reachable = true;
        break;
      }
    }
    if (!reachable) return false;
  }

  return reached >= totalOpen;
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
  const checked = new Set();
  let support = 0;
  for (const ray of SUPPORT_RAYS) {
    for (let i = 0; i < ray.length; i++) {
      const tr = r + ray[i].dy, tc = c + ray[i].dx;
      if (tr < 0 || tr >= gridH || tc < 0 || tc >= gridW) break;
      if (!room[tr][tc]) {
        const key = `${tr},${tc}`;
        if (!checked.has(key)) {
          checked.add(key);
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

  const visited = Array.from({ length: gridH }, () => Array(gridW).fill(false));
  const queue = [[startR, startC]];
  visited[startR][startC] = true;
  let reached = 1;

  while (queue.length > 0) {
    const [cr, cc] = queue.shift();
    for (const [dr, dc] of DIRS) {
      const nr = cr + dr, nc = cc + dc;
      if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW) continue;
      if (visited[nr][nc] || !room[nr][nc]) continue;
      visited[nr][nc] = true;
      reached++;
      queue.push([nr, nc]);
    }
  }
  return reached >= totalRoom;
}

function canEraseTile(ctx, r, c) {
  if (!ctx.room[r][c]) return false;
  if (ctx.occupancy[r][c] >= 0) return false;

  let roomCount = 0;
  for (let rr = 0; rr < ctx.gridH; rr++)
    for (let cc = 0; cc < ctx.gridW; cc++)
      if (ctx.room[rr][cc]) roomCount++;
  if (roomCount <= 1) return false;

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
    let isDecorative = true;

    if (bItem?.stats) {
      for (let s = 0; s < bItem.stats.length && s < (fs.stats?.length ?? 0); s++) {
        if (bItem.stats[s] !== 0) {
          isDecorative = false;
          if (s === ctx.primaryStatIdx) hasPrimary = true;
          if (s === ctx.effIdx) hasEfficiency = true;
        }
      }
    }

    // Check if group has blocking tiles
    let hasBlockers = false;
    for (const item of group.items) {
      for (const row of item.tiles) {
        for (const tileKey of row) {
          if (tileKey === null) continue;
          const tt = fs.tileTypes[tileKey];
          if (tt && AVAIL_BLOCKING.has(tt.availability)) { hasBlockers = true; break; }
        }
        if (hasBlockers) break;
      }
      if (hasBlockers) break;
    }

    // Priority: required > primary-stat > efficiency > decorative
    let priority = 3;
    if (group.min > 0) priority = 0;
    else if (hasPrimary) priority = 1;
    else if (hasEfficiency) priority = 2;

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
      groupIdx: gi, isDecorative, hasPrimary, hasEfficiency, hasBlockers, priority,
      heroItems: heroItems.map(h => h.ii),
      bestHeroIdx,
      fillerItems: fillerItems.map(f => f.ii),
    });
  }
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

    ctx.room[bestCandidate.r][bestCandidate.c] = false;
    const idx = ctx.roomTiles.findIndex(t => t.r === bestCandidate.r && t.c === bestCandidate.c);
    if (idx >= 0) ctx.roomTiles.splice(idx, 1);
    // Update occupancy grid (all -1 before furniture, but the grid dimensions must match)
    ctx.occupancy = buildOccupancyGrid(ctx);
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

  return statContrib / tileCount;
}

/** Score a candidate placement position: value density + wall adjacency + gap-1 furniture proximity. */
function scorePlacementPosition(ctx, gi, ii, rot, r, c) {
  let posScore = getValueDensity(ctx, gi, ii);
  const tiles = getCachedTiles(ctx, gi, ii, rot);
  let wallAdj = 0;
  let furnitureAdj = 0;
  for (let tr = 0; tr < tiles.length; tr++) {
    for (let tc = 0; tc < (tiles[tr]?.length ?? 0); tc++) {
      if (tiles[tr][tc] === null) continue;
      const gr = r + tr, gc = c + tc;
      for (const [dr, dc] of DIRS) {
        const nr = gr + dr, nc = gc + dc;
        if (nr < 0 || nr >= ctx.gridH || nc < 0 || nc >= ctx.gridW || !ctx.room[nr][nc]) {
          wallAdj++;
        } else if (ctx.occupancy[nr][nc] >= 0) {
          furnitureAdj++;
        } else {
          // Check distance-2: furniture across a 1-tile walkway gap
          const nr2 = gr + dr * 2, nc2 = gc + dc * 2;
          if (nr2 >= 0 && nr2 < ctx.gridH && nc2 >= 0 && nc2 < ctx.gridW
              && ctx.occupancy[nr2][nc2] >= 0) {
            furnitureAdj += 0.5;
          }
        }
      }
    }
  }
  return posScore + wallAdj * 0.1 + furnitureAdj * 1.5;
}

// ── Phase 1: Smart Constructive Phase ────────────────────

async function constructivePhase(ctx, skipInterval) {
  const { furnitureSet: fs } = ctx;

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

          // Reject if this blocks all door candidates
          if (!hasAnyDoorCandidate(ctx)) {
            clearOccupancy(ctx, pi);
            ctx.placements.pop();
          } else {
            placed++;
            placementCount++;
            keepGoing = true;

            if (ctx.empIdx >= 0 && ctx.effIdx >= 0) {
              placeEfficiencyItems(ctx, fs);
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

          if (!hasAnyDoorCandidate(ctx)) {
            clearOccupancy(ctx, pi);
            ctx.placements.pop();
          } else {
            placed++;
            keepGoing = true;

            if (ctx.empIdx >= 0 && ctx.effIdx >= 0) {
              placeEfficiencyItems(ctx, fs);
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
}

/** Place efficiency items until eff >= emp or no more can fit. */
function placeEfficiencyItems(ctx, fs) {
  const stats = computeStats(ctx);
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

          if (!hasAnyDoorCandidate(ctx)) {
            clearOccupancy(ctx, pi);
            ctx.placements.pop();
          } else {
            placed++;
            const st = computeStats(ctx);
            if (st[ctx.effIdx] >= st[ctx.empIdx]) return;
          }
        }
      }
      const st = computeStats(ctx);
      if (st[ctx.effIdx] >= st[ctx.empIdx]) return;
    }
  }
}

// ── Phase 2: Simulated Annealing ─────────────────────────

// Move weights
const MOVE_WEIGHTS = {
  RELOCATE: 30,
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
const TOTAL_WEIGHT = Object.values(MOVE_WEIGHTS).reduce((a, b) => a + b, 0);

function pickMoveType(rng) {
  let r = rng() * TOTAL_WEIGHT;
  for (const type of MOVE_TYPES) {
    r -= MOVE_WEIGHTS[type];
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
  if (!checkStabilityOpt(ctx)) return false;
  if (ctx.building.storage > 0 && ctx.placements.length > 0 && !hasStorageTile(ctx)) return false;
  if (!hasAnyDoorCandidate(ctx)) return false;
  // Group mins
  const fs = ctx.furnitureSet;
  for (let gi = 0; gi < fs.groups.length; gi++) {
    const group = fs.groups[gi];
    if (group.min > 0 && countGroupPlacements(ctx, gi) < group.min) return false;
  }
  return true;
}

function checkMoveConstraints(ctx, move) {
  // Walkability check — only for moves involving blocking tiles
  if (move.type === "RELOCATE" || move.type === "RESIZE" || move.type === "UPGRADE" || move.type === "ADD" || move.type === "SWAP") {
    if (!checkWalkabilityOpt(ctx)) return false;
  }
  if (move.type === "ERASE") {
    if (!checkRoomConnectivity(ctx)) return false;
    if (!checkWalkabilityOpt(ctx)) return false;
    // Stability is a soft penalty in scoring, not a hard constraint for ERASE
    // (erasing tiles generally improves stability by creating wall support)
  }
  if (move.type === "ADD_ROOM") {
    // Adding a room tile must keep connectivity
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
  const type = pickMoveType(ctx.rng);
  const unlocked = ctx.placements.length - ctx.lockedCount;

  switch (type) {
    case "RELOCATE": return generateRelocate(ctx, unlocked);
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

  const dr = Math.round(gaussRand(ctx.rng, 3));
  const dc = Math.round(gaussRand(ctx.rng, 3));
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

function generateResize(ctx, unlocked) {
  const pi = pickUnlocked(ctx, unlocked);
  if (pi < 0) return null;
  const p = ctx.placements[pi];
  const group = ctx.furnitureSet.groups[p.groupIdx];
  if (group.items.length <= 1) return null;

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
      return true;
    }

    case "REMOVE": {
      clearOccupancy(ctx, move.pi);
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
      ctx.room[move.row][move.col] = false;
      // Update roomTiles
      const idx = ctx.roomTiles.findIndex(t => t.r === move.row && t.c === move.col);
      if (idx >= 0) ctx.roomTiles.splice(idx, 1);
      return true;
    }

    case "ADD_ROOM": {
      ctx.room[move.row][move.col] = true;
      ctx.roomTiles.push({ r: move.row, c: move.col });
      return true;
    }

    default: return false;
  }
}

// ── Move reversion ───────────────────────────────────────

function revertMove(ctx, move) {
  switch (move.type) {
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
      ctx.placements.pop();
      break;
    }

    case "REMOVE": {
      // Re-add: push saved placement
      ctx.placements.push(move.saved);
      const newPi = ctx.placements.length - 1;
      // If we swapped during removal, swap back
      if (move.swappedFrom !== undefined) {
        const tmp = ctx.placements[move.pi];
        ctx.placements[move.pi] = ctx.placements[newPi];
        ctx.placements[newPi] = tmp;
        // Rebuild occupancy for both
        clearOccupancy(ctx, move.pi);
        clearOccupancy(ctx, newPi);
        setOccupancy(ctx, move.pi);
        setOccupancy(ctx, newPi);
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
      ctx.room[move.row][move.col] = true;
      ctx.roomTiles.push({ r: move.row, c: move.col });
      break;
    }

    case "ADD_ROOM": {
      ctx.room[move.row][move.col] = false;
      const idx = ctx.roomTiles.findIndex(t => t.r === move.row && t.c === move.col);
      if (idx >= 0) ctx.roomTiles.splice(idx, 1);
      break;
    }
  }
}

// ── Phase 2.5: Post-SA Polish ─────────────────────────────

async function polishPhase(ctx) {
  const { furnitureSet: fs } = ctx;

  // Sub-pass A: Upgrade — try replacing each item with a larger variant
  for (let pi = ctx.lockedCount; pi < ctx.placements.length; pi++) {
    const p = ctx.placements[pi];
    const group = fs.groups[p.groupIdx];
    if (group.items.length <= 1) continue;

    const currentScore = scoreLayoutSA(ctx);
    // Try progressively larger items
    for (let newII = p.itemIdx + 1; newII < group.items.length; newII++) {
      clearOccupancy(ctx, pi);
      const oldII = p.itemIdx;
      p.itemIdx = newII;

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
        if (checkWalkabilityOpt(ctx) && scoreLayoutSA(ctx) > currentScore
            && hasAnyDoorCandidate(ctx)) {
          break; // keep upgrade
        }
        clearOccupancy(ctx, pi);
      }

      p.itemIdx = oldII;
      setOccupancy(ctx, pi);
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

          const ok = checkWalkabilityOpt(ctx)
            && scoreLayoutSA(ctx) > currentScore
            && hasAnyDoorCandidate(ctx);
          if (!ok) {
            clearOccupancy(ctx, pi);
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
}

/** Quick check: is there at least one valid door candidate? For outdoor buildings, always true.
 *  Geometry-based — checks for outside tiles adjacent to room tiles, ignoring furniture. */
function hasAnyDoorCandidate(ctx) {
  if (!ctx.furnitureSet.mustBeIndoors) return true;
  // Quick check: any non-room tile adjacent to room that isn't an enclosed hollow?
  // Use findOutsideTiles to exclude support pillar holes.
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
  // Fallback: if findOutsideTiles found nothing (room fills grid), check raw
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

  // Pass 2: Trim unoccupied tiles (edge AND interior) that aren't needed
  for (let pass = 0; pass < 5; pass++) {
    let trimmed = false;
    await yieldToUI();

    // Compute centroid
    let cr = 0, cc = 0, cnt = 0;
    for (const t of ctx.roomTiles) { cr += t.r; cc += t.c; cnt++; }
    if (cnt === 0) break;
    cr /= cnt; cc /= cnt;

    // Collect ALL unoccupied room tiles, not just edges
    const candidates = [];
    for (let r = 0; r < ctx.gridH; r++) {
      for (let c = 0; c < ctx.gridW; c++) {
        if (!ctx.room[r][c]) continue;
        if (ctx.occupancy[r][c] >= 0) continue;
        const dist = Math.abs(r - cr) + Math.abs(c - cc);
        candidates.push({ r, c, dist });
      }
    }

    // Farthest from centroid first (outer tiles trimmed before inner)
    candidates.sort((a, b) => b.dist - a.dist);

    for (const cand of candidates) {
      if (canEraseTile(ctx, cand.r, cand.c)) {
        ctx.room[cand.r][cand.c] = false;
        const idx = ctx.roomTiles.findIndex(t => t.r === cand.r && t.c === cand.c);
        if (idx >= 0) ctx.roomTiles.splice(idx, 1);
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
    ctx.room[bestCandidate.r][bestCandidate.c] = false;
    const idx = ctx.roomTiles.findIndex(t => t.r === bestCandidate.r && t.c === bestCandidate.c);
    if (idx >= 0) ctx.roomTiles.splice(idx, 1);
  }
}

// ── Phase 4: Door Optimization ───────────────────────────

/** BFS from grid boundary through non-room tiles to find "outside" tiles.
 *  Support pillars (interior holes) won't be reached. */
function findOutsideTiles(ctx) {
  const { gridW, gridH, room } = ctx;
  const outside = Array.from({ length: gridH }, () => Array(gridW).fill(false));
  const queue = [];

  // Seed: all boundary non-room tiles + off-grid is implicitly outside
  for (let r = 0; r < gridH; r++) {
    for (let c = 0; c < gridW; c++) {
      if (room[r][c]) continue;
      if (r === 0 || r === gridH - 1 || c === 0 || c === gridW - 1) {
        outside[r][c] = true;
        queue.push([r, c]);
      }
    }
  }

  // If room fills entire boundary, also seed non-room tiles adjacent to off-grid
  if (queue.length === 0) {
    for (let r = 0; r < gridH; r++) {
      for (let c = 0; c < gridW; c++) {
        if (room[r][c] || outside[r][c]) continue;
        // Check if any 4-neighbor is off-grid (implicitly outside)
        for (const [dr, dc] of DIRS) {
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW) {
            outside[r][c] = true;
            queue.push([r, c]);
            break;
          }
        }
      }
    }
  }

  while (queue.length > 0) {
    const [cr, cc] = queue.shift();
    for (const [dr, dc] of DIRS) {
      const nr = cr + dr, nc = cc + dc;
      if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW) continue;
      if (outside[nr][nc] || room[nr][nc]) continue;
      outside[nr][nc] = true;
      queue.push([nr, nc]);
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

  // Diagnostic counters
  let nonRoomCount = 0, outsideCount = 0, adjRoomCount = 0;
  let rejNotOutside = 0, rejNoAxis = 0, rejPerp = 0;

  // Valid door: outer wall tile that connects room to open exterior
  const candidates = [];
  for (let r = 0; r < ctx.gridH; r++) {
    for (let c = 0; c < ctx.gridW; c++) {
      if (ctx.room[r][c]) continue;
      nonRoomCount++;

      if (!outside[r][c]) { rejNotOutside++; continue; }
      outsideCount++;

      // Check if adjacent to any room tile
      let hasAdj = false;
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < ctx.gridH && nc >= 0 && nc < ctx.gridW && ctx.room[nr][nc]) {
          hasAdj = true; break;
        }
      }
      if (!hasAdj) continue;
      adjRoomCount++;

      // Door must connect outside to room along the SAME axis:
      // one side is room, opposite side is open exterior.
      // Additionally, the perpendicular neighbors must NOT be room tiles —
      // this prevents doors at trimmed corners/notches where the wall
      // changes direction (diagonal-only connection to part of the room).
      let validDoor = false;
      let anyAxisPass = false;
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
          anyAxisPass = true;
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

      if (!validDoor) {
        if (!anyAxisPass) rejNoAxis++;
        else rejPerp++;
        continue;
      }
      candidates.push({ r, c });
    }
  }

  console.log(`[optimizer] doorPhase: grid=${ctx.gridW}x${ctx.gridH} nonRoom=${nonRoomCount} outside=${outsideCount} adjRoom=${adjRoomCount} candidates=${candidates.length}`);
  console.log(`[optimizer] doorPhase rejections: notOutside=${rejNotOutside} noAxisPass=${rejNoAxis} perpFail=${rejPerp}`);

  if (candidates.length === 0) return;

  // Greedy marginal placement: each round, pick the door that most reduces
  // average walk distance from work/storage tiles to their nearest door.
  // This naturally spaces doors around the room perimeter.
  // All valid doors are placed (marginal scoring controls order, not count).
  let isoRejected = 0;
  let doorsPlaced = 0;
  while (candidates.length > 0) {
    // Pass 1: Filter candidates that would break isolation (with current doors)
    for (let i = candidates.length - 1; i >= 0; i--) {
      const cand = candidates[i];
      ctx.doors.add(`${cand.r},${cand.c}`);
      const iso = computeIsolationOpt(ctx);
      ctx.doors.delete(`${cand.r},${cand.c}`);
      if (iso < 0.995) {
        candidates.splice(i, 1);
        isoRejected++;
      }
    }

    if (candidates.length === 0) break;

    // Pass 2: Score each remaining candidate by resulting avg walk distance
    // First door: minimize distance to storage; subsequent: minimize distance to workstations
    const target = doorsPlaced === 0 ? "storage" : "work";
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
    doorsPlaced++;
  }
  console.log(`[optimizer] doorPhase result: ${doorsPlaced} doors placed, ${isoRejected} rejected by isolation, ${candidates.length} remaining`);
}

/** Multi-source BFS from all placed doors. Returns avg walk distance to target tiles.
 *  @param {string} target - "storage" (data===2 tiles) or "work" (mustBeReachable tiles)
 *  For mustBeReachable furniture tiles, distance is measured to the nearest
 *  adjacent walkable room tile (the tile a worker stands on to interact). */
function computeAvgWalkDistance(ctx, target) {
  const { gridW, gridH, room, furnitureSet: fs, placements, doors } = ctx;
  if (doors.size === 0) return Infinity;

  const blocked = buildBlockerMap(ctx);
  const dist = Array.from({ length: gridH }, () => Array(gridW).fill(-1));
  const queue = [];

  // Seed BFS from walkable room tiles adjacent to each door
  for (const key of doors) {
    const [dr, dc] = key.split(",").map(Number);
    for (const [ddr, ddc] of DIRS) {
      const nr = dr + ddr, nc = dc + ddc;
      if (nr >= 0 && nr < gridH && nc >= 0 && nc < gridW
          && room[nr][nc] && !blocked[nr][nc] && dist[nr][nc] < 0) {
        dist[nr][nc] = 1;
        queue.push([nr, nc]);
      }
    }
  }

  while (queue.length > 0) {
    const [cr, cc] = queue.shift();
    for (const [dr, dc] of DIRS) {
      const nr = cr + dr, nc = cc + dc;
      if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW) continue;
      if (dist[nr][nc] >= 0 || !room[nr][nc] || blocked[nr][nc]) continue;
      dist[nr][nc] = dist[cr][cc] + 1;
      queue.push([nr, nc]);
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

  // Group mins
  const fs = ctx.furnitureSet;
  for (let gi = 0; gi < fs.groups.length; gi++) {
    const group = fs.groups[gi];
    if (group.min > 0 && countGroupPlacements(ctx, gi) < group.min) return false;
  }

  return true;
}
