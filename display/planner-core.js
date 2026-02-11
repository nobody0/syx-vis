/* global Buffer */
// Planner core — shared room rules, validation, and utilities for browser planner + optimizer + Node.js scripts

/** Set of availability values that block tile passage (solid + penalty). */
export const AVAIL_IMPASSABLE = new Set([
  "SOLID", "NOT_ACCESSIBLE", "ROOM_SOLID",  // truly solid
  "AVOID_PASS", "AVOID_LIKE_FUCK", "PENALTY4", // penalty — still blocks walkability
]);

/** 4-directional neighbor offsets [row, col]. */
export const DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0]];

/** 8-directional neighbor offsets [row, col]. */
export const DIRS8 = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];

/** Support ray radius for stability checking. */
export const SUPPORT_RADIUS = 4;

/**
 * Stability threshold — tile is stable when tileSupport() >= this value.
 * The game uses exact 1.0 comparison, but its yellow overlay formula
 * (CLAMP(support-1, 0, 4)/4) visually hides sub-epsilon shortfalls.
 * We use a small epsilon to match the game's effective behavior.
 */
export const STABILITY_THRESHOLD = 1.0 - 1e-9;

/** Pre-computed DDA support rays (matches game's TileRayTracer.java). */
export const SUPPORT_RAYS = [];
{
  const has = Array.from({ length: SUPPORT_RADIUS * 2 + 1 }, () => new Uint8Array(SUPPORT_RADIUS * 2 + 1));
  function ddaRay(fromx, fromy) {
    let x = fromx, y = fromy;
    const ax = Math.abs(x), ay = Math.abs(y);
    const divider = ax > ay ? ax : (ax < ay ? ay : ax);
    if (divider === 0) return;
    const dx = -x / divider, dy = -y / divider;
    let i = 0;
    while (i < divider) {
      const tx = Math.trunc(x), ty = Math.trunc(y);
      if (Math.floor(Math.sqrt(x * x + y * y)) <= SUPPORT_RADIUS) {
        if (has[ty + SUPPORT_RADIUS][tx + SUPPORT_RADIUS]) return;
        has[ty + SUPPORT_RADIUS][tx + SUPPORT_RADIUS] = 1;
        break;
      }
      x += dx; y += dy; i++;
    }
    const coos = [];
    while (true) {
      const tx = Math.trunc(x), ty = Math.trunc(y);
      if (tx === 0 && ty === 0) break;
      coos.push({ dx: tx, dy: ty });
      x += dx; y += dy;
    }
    coos.reverse();
    if (coos.length > 0) SUPPORT_RAYS.push(coos);
  }
  for (let gy = -SUPPORT_RADIUS; gy <= SUPPORT_RADIUS; gy++) {
    ddaRay(-SUPPORT_RADIUS, gy);
    ddaRay(SUPPORT_RADIUS, gy);
  }
  for (let gx = -SUPPORT_RADIUS; gx <= SUPPORT_RADIUS; gx++) {
    ddaRay(gx, -SUPPORT_RADIUS);
    ddaRay(gx, SUPPORT_RADIUS);
  }
}

// ── BFS infrastructure (pointer-based queue + stamp-based visited) ──

/** Create a pointer-based BFS queue backed by Int32Array (avoids O(n) Array.shift). */
export function createBFSQueue(capacity) {
  const buf = new Int32Array(capacity * 2);
  let head = 0, tail = 0;
  return {
    push(r, c) { buf[tail++] = r; buf[tail++] = c; },
    shift() { const r = buf[head++], c = buf[head++]; return [r, c]; },
    get length() { return (tail - head) >> 1; },
    reset() { head = 0; tail = 0; },
  };
}

/** Reset visited tracking in O(1) by incrementing stamp. */
export function freshVisited(ctx) {
  ctx.visitedStamp++;
  if (ctx.visitedStamp === 0) { ctx.visitedBuf.fill(0); ctx.visitedStamp = 1; }
  return { buf: ctx.visitedBuf, stamp: ctx.visitedStamp, w: ctx.gridW };
}

export function visitedHas(v, r, c) { return v.buf[r * v.w + c] === v.stamp; }
export function visitedSet(v, r, c) { v.buf[r * v.w + c] = v.stamp; }

// ── Tile rotation / group helpers ────────────────────────

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

// ── Tile cache ──────────────────────────────────────────

/** Get (or compute and cache) rotated tiles for an item. */
export function getCachedTiles(ctx, groupIdx, itemIdx, rotation) {
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

// ── RoomContext creation ─────────────────────────────────

/**
 * Create a RoomContext with fast data structures for room-rule operations.
 * Both the planner UI and optimizer create contexts and call shared core functions.
 * The optimizer extends the context with additional fields (rng, scoring caches, etc.).
 */
export function createRoomContext(furnitureSet, building, room, placements, gridW, gridH, doors) {
  const ctx = {
    furnitureSet, building, gridW, gridH,
    room,
    placements,
    doors,
    occupancy: null,
    tileCache: new Map(),
    blockerCount: Array.from({ length: gridH }, () => new Int8Array(gridW)),
    groupGrid: Array.from({ length: gridH }, () => new Int16Array(gridW).fill(-1)),
    mustReachGrid: new Int8Array(gridW * gridH),
    occupiedCount: 0,
    visitedBuf: new Uint32Array(gridW * gridH), visitedStamp: 0,
    blockedBuf: new Uint32Array(gridW * gridH), blockedStamp: 0,
    bfsQueue: createBFSQueue(gridW * gridH),
    currentStats: null, statsDirty: true,
    mustReachCache: null, mustReachDirty: true,
    stabilityDirty: true,
    _walkabilityValid: false,
    _doorCandidateCache: undefined,
    groupCounts: null,
    // Stamp buffers for canPlaceFast (zero-allocation placement checks)
    _cpBlockerBuf: new Uint32Array(gridW * gridH),
    _cpBlockerStamp: 0,
    _cpTileBuf: new Uint32Array(gridW * gridH),
    _cpTileStamp: 0,
    _cpTileList: new Int32Array(192),  // [gr, gc] × 96 tiles max
    _cpTileCount: 0,
    _cpCheckedBuf: new Uint32Array(512),  // indexed by placement index
    _cpCheckedStamp: 0,
    // Free-tile bitmap: 1 = room tile AND unoccupied, 0 = otherwise
    freeBitmap: new Uint8Array(gridW * gridH),
  };
  ctx.occupancy = buildOccupancyGrid(ctx);
  return ctx;
}

// ── Occupancy grid ──────────────────────────────────────

/** Build the occupancy grid from scratch. Returns the grid array. */
export function buildOccupancyGrid(ctx) {
  const { gridW, gridH, placements, furnitureSet: fs } = ctx;
  const grid = Array.from({ length: gridH }, () => Array(gridW).fill(-1));
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
          if (tt && AVAIL_IMPASSABLE.has(tt.availability)) bc[gr][gc]++;
          if (tt?.mustBeReachable) mrg[gr * gridW + gc] = 1;
        }
      }
    }
  }
  ctx.occupancy = grid;
  ctx.blockerCount = bc;
  ctx.groupGrid = gg;
  ctx.mustReachGrid = mrg;
  ctx.occupiedCount = occCount;
  ctx.statsDirty = true;
  ctx.stabilityDirty = true;
  ctx.mustReachDirty = true;
  ctx._walkabilityValid = false;
  // Rebuild freeBitmap: room tile AND unoccupied
  if (ctx.freeBitmap) {
    const fb = ctx.freeBitmap;
    for (let r = 0; r < gridH; r++)
      for (let c = 0; c < gridW; c++)
        fb[r * gridW + c] = (ctx.room[r][c] && grid[r][c] < 0) ? 1 : 0;
  }
  return grid;
}

/**
 * Rebuild occupancy grids in-place from placements — zero allocations.
 * Same logic as buildOccupancyGrid but reuses existing grid arrays.
 */
export function rebuildOccupancyInPlace(ctx) {
  const { gridW, gridH, placements, furnitureSet: fs } = ctx;
  for (let r = 0; r < gridH; r++) {
    ctx.occupancy[r].fill(-1);
    ctx.blockerCount[r].fill(0);
    ctx.groupGrid[r].fill(-1);
  }
  ctx.mustReachGrid.fill(0);
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
          if (ctx.occupancy[gr][gc] < 0) occCount++;
          ctx.occupancy[gr][gc] = pi;
          ctx.groupGrid[gr][gc] = p.groupIdx;
          const tt = fs.tileTypes[tileKey];
          if (tt && AVAIL_IMPASSABLE.has(tt.availability)) ctx.blockerCount[gr][gc]++;
          if (tt?.mustBeReachable) ctx.mustReachGrid[gr * gridW + gc] = 1;
        }
      }
    }
  }
  ctx.occupiedCount = occCount;
  ctx.statsDirty = true;
  ctx.stabilityDirty = true;
  ctx.mustReachDirty = true;
  ctx._walkabilityValid = false;
  // Rebuild freeBitmap
  if (ctx.freeBitmap) {
    const fb = ctx.freeBitmap;
    for (let r = 0; r < gridH; r++)
      for (let c = 0; c < gridW; c++)
        fb[r * gridW + c] = (ctx.room[r][c] && ctx.occupancy[r][c] < 0) ? 1 : 0;
  }
}

/** Mark a placement's tiles as occupied in the occupancy grid. Returns false if overlap detected. */
export function setOccupancy(ctx, pi) {
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
      if (ctx.freeBitmap) ctx.freeBitmap[gr * ctx.gridW + gc] = 0;
      const tt = fs.tileTypes[tileKey];
      if (tt && AVAIL_IMPASSABLE.has(tt.availability)) ctx.blockerCount[gr][gc]++;
      if (tt?.mustBeReachable) ctx.mustReachGrid[gr * ctx.gridW + gc] = 1;
    }
  }
  ctx.statsDirty = true;
  ctx.mustReachDirty = true;
  ctx._walkabilityValid = false;
  return !overlap;
}

/** Clear a placement's tiles from the occupancy grid. */
export function clearOccupancy(ctx, pi) {
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
          if (ctx.freeBitmap && ctx.room[gr][gc]) ctx.freeBitmap[gr * ctx.gridW + gc] = 1;
          const tt = fs.tileTypes[tileKey];
          if (tt && AVAIL_IMPASSABLE.has(tt.availability)) ctx.blockerCount[gr][gc]--;
          if (tt?.mustBeReachable) ctx.mustReachGrid[gr * ctx.gridW + gc] = 0;
        }
      }
    }
  }
  ctx.statsDirty = true;
  ctx.mustReachDirty = true;
  ctx._walkabilityValid = false;
}

// ── Tile lookup helpers ──────────────────────────────────

/** Get placement index at (row, col) via occupancy grid — O(1). */
export function getPlacementAt(ctx, row, col) {
  const pi = ctx.occupancy[row]?.[col];
  return (pi !== undefined && pi >= 0) ? pi : -1;
}

/** Get the FurnitureTileType at (r,c) from existing placements, or null. */
export function getFurnitureTileAt(ctx, r, c, skipPi) {
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

/** Check if tile (r,c) is a blocker, considering existing furniture + proposed new blocker tiles. */
export function isBlockerAt(ctx, r, c, proposedBlockers, skipPi) {
  if (proposedBlockers.has(r * ctx.gridW + c)) return true;
  const tt = getFurnitureTileAt(ctx, r, c, skipPi);
  return tt !== null && AVAIL_IMPASSABLE.has(tt.availability);
}

/** Check if a mustBeReachable tile at (r,c) would have all 4 neighbors blocked. */
export function wouldBeFullyBlocked(ctx, r, c, proposedBlockers, skipPi) {
  let blockedCount = 0;
  for (const [dr, dc] of DIRS) {
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nr >= ctx.gridH || nc < 0 || nc >= ctx.gridW || !ctx.room[nr][nc]) blockedCount++;
    else if (isBlockerAt(ctx, nr, nc, proposedBlockers, skipPi)) blockedCount++;
  }
  return blockedCount >= 4;
}

/** Check whether a placed piece (at index pi) has any walkable neighbor. */
export function pieceHasWalkableNeighbor(ctx, pi, proposedBlockers, proposedSet, skipPi) {
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
        if (proposedSet.has(nr * gridW + nc)) continue;
        if (isBlockerAt(ctx, nr, nc, proposedBlockers, skipPi)) continue;
        return true;
      }
    }
  }
  return false;
}

/** Check if adding proposed blockers would split the walkable room into disconnected regions. */
export function wouldDisconnectRoom(ctx, proposedBlockers, skipPi) {
  const { gridW, gridH, room } = ctx;
  ctx.blockedStamp++;
  if (ctx.blockedStamp === 0) { ctx.blockedBuf.fill(0); ctx.blockedStamp = 1; }
  const bStamp = ctx.blockedStamp;
  const bBuf = ctx.blockedBuf;
  for (let r = 0; r < gridH; r++)
    for (let c = 0; c < gridW; c++)
      if (ctx.blockerCount[r][c] > 0) bBuf[r * gridW + c] = bStamp;
  if (skipPi !== undefined && skipPi >= 0) {
    const sp = ctx.placements[skipPi];
    if (sp) {
      const stiles = getCachedTiles(ctx, sp.groupIdx, sp.itemIdx, sp.rotation);
      for (let r = 0; r < stiles.length; r++)
        for (let c = 0; c < (stiles[r]?.length ?? 0); c++) {
          if (stiles[r][c] === null) continue;
          const gr = sp.row + r, gc = sp.col + c;
          if (gr >= 0 && gr < gridH && gc >= 0 && gc < gridW) bBuf[gr * gridW + gc] = 0;
        }
    }
  }
  for (const key of proposedBlockers) bBuf[key] = bStamp;

  let totalOpen = 0, startR = -1, startC = -1;
  for (let r = 0; r < gridH; r++)
    for (let c = 0; c < gridW; c++)
      if (room[r][c] && bBuf[r * gridW + c] !== bStamp) {
        totalOpen++;
        if (startR < 0) { startR = r; startC = c; }
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

// ── Placement validation ─────────────────────────────────

/**
 * Check if a furniture piece can be placed at (row, col).
 * Returns boolean — fast path for optimizer. Use canPlaceWithReason for UI feedback.
 */
export function canPlace(ctx, groupIdx, itemIdx, rotation, row, col, skipPi) {
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
      if (tt && AVAIL_IMPASSABLE.has(tt.availability)) proposedBlockers.add(gr * gridW + gc);
    }
  }

  // Reject if a blocking tile would cover a reserved tile (door access must stay walkable)
  if (ctx.reservedTiles?.size > 0) {
    for (const { gr, gc, tileKey } of proposedTiles) {
      if (!ctx.reservedTiles.has(gr * gridW + gc)) continue;
      const tt = fs.tileTypes[tileKey];
      if (tt && AVAIL_IMPASSABLE.has(tt.availability)) return false;
    }
  }

  // mustBeReachable check
  for (const { gr, gc, tileKey } of proposedTiles) {
    const tt = fs.tileTypes[tileKey];
    if (!tt?.mustBeReachable) continue;
    let blockedCount = 0;
    for (const [dr, dc] of DIRS) {
      const nr = gr + dr, nc = gc + dc;
      if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW || !room[nr][nc]) blockedCount++;
      else if (isBlockerAt(ctx, nr, nc, proposedBlockers, skipPi)) blockedCount++;
    }
    if (blockedCount >= 4) return false;
  }

  // Don't fully block existing mustBeReachable tiles
  for (const { gr, gc, tileKey } of proposedTiles) {
    const tt = fs.tileTypes[tileKey];
    if (!tt || !AVAIL_IMPASSABLE.has(tt.availability)) continue;
    for (const [dr, dc] of DIRS) {
      const nr = gr + dr, nc = gc + dc;
      if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW) continue;
      const existingTT = getFurnitureTileAt(ctx, nr, nc, skipPi);
      if (existingTT?.mustBeReachable) {
        if (wouldBeFullyBlocked(ctx, nr, nc, proposedBlockers, skipPi)) return false;
      }
    }
  }

  // Piece perimeter reachability
  const proposedSet = new Set(proposedTiles.map(t => t.gr * gridW + t.gc));
  let hasWalkableNeighbor = false;
  for (const { gr, gc } of proposedTiles) {
    if (hasWalkableNeighbor) break;
    for (const [dr, dc] of DIRS) {
      const nr = gr + dr, nc = gc + dc;
      if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW) continue;
      if (!room[nr][nc]) continue;
      if (proposedSet.has(nr * gridW + nc)) continue;
      if (isBlockerAt(ctx, nr, nc, proposedBlockers, skipPi)) continue;
      hasWalkableNeighbor = true;
      break;
    }
  }
  if (!hasWalkableNeighbor) return false;

  // Don't enclose adjacent pieces
  if (proposedBlockers.size > 0) {
    const checkedPieces = new Set();
    for (const { gr, gc, tileKey } of proposedTiles) {
      const tt = fs.tileTypes[tileKey];
      if (!tt || !AVAIL_IMPASSABLE.has(tt.availability)) continue;
      for (const [dr, dc] of DIRS) {
        const nr = gr + dr, nc = gc + dc;
        if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW) continue;
        const adjPi = occupancy[nr][nc];
        if (adjPi < 0 || adjPi === skipPi || checkedPieces.has(adjPi)) continue;
        checkedPieces.add(adjPi);
        if (!pieceHasWalkableNeighbor(ctx, adjPi, proposedBlockers, proposedSet, skipPi)) return false;
      }
    }
  }

  // Connectivity check
  if (proposedBlockers.size > 0) {
    if (wouldDisconnectRoom(ctx, proposedBlockers, skipPi)) return false;
  }

  return true;
}

/**
 * Fast canPlace using stamp buffers — zero allocations per call.
 * Same logic as canPlace but uses ctx._cp* stamp buffers instead of Set/Array.
 * For optimizer hot paths only; canPlace/canPlaceWithReason stay for UI.
 */
export function canPlaceFast(ctx, groupIdx, itemIdx, rotation, row, col, skipPi) {
  const { furnitureSet: fs, gridW, gridH, room, occupancy } = ctx;
  const tiles = getCachedTiles(ctx, groupIdx, itemIdx, rotation);
  if (tiles.length === 0) return false;

  // Advance stamps
  ctx._cpBlockerStamp++;
  if (ctx._cpBlockerStamp === 0) { ctx._cpBlockerBuf.fill(0); ctx._cpBlockerStamp = 1; }
  ctx._cpTileStamp++;
  if (ctx._cpTileStamp === 0) { ctx._cpTileBuf.fill(0); ctx._cpTileStamp = 1; }
  const bStamp = ctx._cpBlockerStamp;
  const bBuf = ctx._cpBlockerBuf;
  const tStamp = ctx._cpTileStamp;
  const tBuf = ctx._cpTileBuf;
  let tCount = 0;
  let blockerCount = 0;

  for (let r = 0; r < tiles.length; r++) {
    for (let c = 0; c < (tiles[r]?.length ?? 0); c++) {
      const tileKey = tiles[r][c];
      if (tileKey === null) continue;
      const gr = row + r, gc = col + c;
      if (gr < 0 || gr >= gridH || gc < 0 || gc >= gridW) return false;
      if (!room[gr][gc]) return false;
      const occ = occupancy[gr][gc];
      if (occ >= 0 && occ !== skipPi) return false;
      const key = gr * gridW + gc;
      ctx._cpTileList[tCount * 2] = gr;
      ctx._cpTileList[tCount * 2 + 1] = gc;
      tBuf[key] = tStamp;
      tCount++;
      const tt = fs.tileTypes[tileKey];
      if (tt && AVAIL_IMPASSABLE.has(tt.availability)) {
        bBuf[key] = bStamp;
        blockerCount++;
      }
    }
  }

  // Reserved tile check
  if (ctx.reservedTiles?.size > 0) {
    for (let i = 0; i < tCount; i++) {
      const gr = ctx._cpTileList[i * 2], gc = ctx._cpTileList[i * 2 + 1];
      const key = gr * gridW + gc;
      if (!ctx.reservedTiles.has(key)) continue;
      if (bBuf[key] === bStamp) return false;  // blocker on reserved tile
    }
  }

  // mustBeReachable check (inline wouldBeFullyBlocked)
  for (let i = 0; i < tCount; i++) {
    const gr = ctx._cpTileList[i * 2], gc = ctx._cpTileList[i * 2 + 1];
    const key = gr * gridW + gc;
    // Get tileType from tileKey — re-derive from tiles grid
    const lr = gr - row, lc = gc - col;
    const tileKey = tiles[lr][lc];
    const tt = fs.tileTypes[tileKey];
    if (!tt?.mustBeReachable) continue;
    let bc = 0;
    for (const [dr, dc] of DIRS) {
      const nr = gr + dr, nc = gc + dc;
      if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW || !room[nr][nc]) { bc++; continue; }
      // inline isBlockerAt with stamp
      const nk = nr * gridW + nc;
      if (bBuf[nk] === bStamp) { bc++; continue; }
      const ntt = getFurnitureTileAt(ctx, nr, nc, skipPi);
      if (ntt !== null && AVAIL_IMPASSABLE.has(ntt.availability)) bc++;
    }
    if (bc >= 4) return false;
  }

  // Don't fully block existing mustBeReachable tiles
  for (let i = 0; i < tCount; i++) {
    const gr = ctx._cpTileList[i * 2], gc = ctx._cpTileList[i * 2 + 1];
    const key = gr * gridW + gc;
    if (bBuf[key] !== bStamp) continue;  // not a blocker tile
    for (const [dr, dc] of DIRS) {
      const nr = gr + dr, nc = gc + dc;
      if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW) continue;
      const existingTT = getFurnitureTileAt(ctx, nr, nc, skipPi);
      if (!existingTT?.mustBeReachable) continue;
      // inline wouldBeFullyBlocked with stamp
      let bc2 = 0;
      for (const [dr2, dc2] of DIRS) {
        const nr2 = nr + dr2, nc2 = nc + dc2;
        if (nr2 < 0 || nr2 >= gridH || nc2 < 0 || nc2 >= gridW || !room[nr2][nc2]) { bc2++; continue; }
        const nk2 = nr2 * gridW + nc2;
        if (bBuf[nk2] === bStamp) { bc2++; continue; }
        const ntt2 = getFurnitureTileAt(ctx, nr2, nc2, skipPi);
        if (ntt2 !== null && AVAIL_IMPASSABLE.has(ntt2.availability)) bc2++;
      }
      if (bc2 >= 4) return false;
    }
  }

  // Piece perimeter reachability (using tBuf stamp for proposedSet, bBuf for blockers)
  let hasWalkableNeighbor = false;
  for (let i = 0; i < tCount && !hasWalkableNeighbor; i++) {
    const gr = ctx._cpTileList[i * 2], gc = ctx._cpTileList[i * 2 + 1];
    for (const [dr, dc] of DIRS) {
      const nr = gr + dr, nc = gc + dc;
      if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW) continue;
      if (!room[nr][nc]) continue;
      const nk = nr * gridW + nc;
      if (tBuf[nk] === tStamp) continue;  // part of proposed tiles
      if (bBuf[nk] === bStamp) continue;   // proposed blocker
      const ntt = getFurnitureTileAt(ctx, nr, nc, skipPi);
      if (ntt !== null && AVAIL_IMPASSABLE.has(ntt.availability)) continue;
      hasWalkableNeighbor = true;
      break;
    }
  }
  if (!hasWalkableNeighbor) return false;

  // Don't enclose adjacent pieces
  if (blockerCount > 0) {
    ctx._cpCheckedStamp++;
    if (ctx._cpCheckedStamp === 0) { ctx._cpCheckedBuf.fill(0); ctx._cpCheckedStamp = 1; }
    // Grow buffer if needed
    if (ctx._cpCheckedBuf.length < ctx.placements.length + 64) {
      ctx._cpCheckedBuf = new Uint32Array(ctx.placements.length + 256);
      ctx._cpCheckedStamp = 1;
    }
    const cStamp = ctx._cpCheckedStamp;
    const cBuf = ctx._cpCheckedBuf;

    for (let i = 0; i < tCount; i++) {
      const gr = ctx._cpTileList[i * 2], gc = ctx._cpTileList[i * 2 + 1];
      const key = gr * gridW + gc;
      if (bBuf[key] !== bStamp) continue;  // only check blocker tiles
      for (const [dr, dc] of DIRS) {
        const nr = gr + dr, nc = gc + dc;
        if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW) continue;
        const adjPi = occupancy[nr][nc];
        if (adjPi < 0 || adjPi === skipPi) continue;
        if (cBuf[adjPi] === cStamp) continue;
        cBuf[adjPi] = cStamp;
        // inline pieceHasWalkableNeighbor with stamps
        const ap = ctx.placements[adjPi];
        if (!ap) continue;
        const aTiles = getCachedTiles(ctx, ap.groupIdx, ap.itemIdx, ap.rotation);
        let pieceWalkable = false;
        for (let ar = 0; ar < aTiles.length && !pieceWalkable; ar++) {
          for (let ac = 0; ac < (aTiles[ar]?.length ?? 0) && !pieceWalkable; ac++) {
            if (aTiles[ar][ac] === null) continue;
            const agr = ap.row + ar, agc = ap.col + ac;
            for (const [dr2, dc2] of DIRS) {
              const anr = agr + dr2, anc = agc + dc2;
              if (anr < 0 || anr >= gridH || anc < 0 || anc >= gridW) continue;
              if (!room[anr][anc]) continue;
              const ank = anr * gridW + anc;
              if (tBuf[ank] === tStamp) continue;
              if (bBuf[ank] === bStamp) continue;
              const antt = getFurnitureTileAt(ctx, anr, anc, skipPi);
              if (antt !== null && AVAIL_IMPASSABLE.has(antt.availability)) continue;
              pieceWalkable = true;
              break;
            }
          }
        }
        if (!pieceWalkable) return false;
      }
    }

    // Connectivity check using stamp-based blocker iteration
    if (wouldDisconnectRoomOpt(ctx, bBuf, bStamp, tCount, skipPi)) return false;
  }

  return true;
}

/**
 * Optimized wouldDisconnectRoom that reads blocker positions from stamp buffer.
 * Iterates _cpTileList to find which tiles are blockers via bBuf check.
 */
function wouldDisconnectRoomOpt(ctx, bBuf, bStamp, tCount, skipPi) {
  const { gridW, gridH, room } = ctx;
  ctx.blockedStamp++;
  if (ctx.blockedStamp === 0) { ctx.blockedBuf.fill(0); ctx.blockedStamp = 1; }
  const dStamp = ctx.blockedStamp;
  const dBuf = ctx.blockedBuf;
  for (let r = 0; r < gridH; r++)
    for (let c = 0; c < gridW; c++)
      if (ctx.blockerCount[r][c] > 0) dBuf[r * gridW + c] = dStamp;
  if (skipPi !== undefined && skipPi >= 0) {
    const sp = ctx.placements[skipPi];
    if (sp) {
      const stiles = getCachedTiles(ctx, sp.groupIdx, sp.itemIdx, sp.rotation);
      for (let r = 0; r < stiles.length; r++)
        for (let c = 0; c < (stiles[r]?.length ?? 0); c++) {
          if (stiles[r][c] === null) continue;
          const gr = sp.row + r, gc = sp.col + c;
          if (gr >= 0 && gr < gridH && gc >= 0 && gc < gridW) dBuf[gr * gridW + gc] = 0;
        }
    }
  }
  // Mark proposed blockers from stamp buffer
  for (let i = 0; i < tCount; i++) {
    const gr = ctx._cpTileList[i * 2], gc = ctx._cpTileList[i * 2 + 1];
    const key = gr * gridW + gc;
    if (bBuf[key] === bStamp) dBuf[key] = dStamp;
  }

  let totalOpen = 0, startR = -1, startC = -1;
  for (let r = 0; r < gridH; r++)
    for (let c = 0; c < gridW; c++)
      if (room[r][c] && dBuf[r * gridW + c] !== dStamp) {
        totalOpen++;
        if (startR < 0) { startR = r; startC = c; }
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
      if (visitedHas(v, nr, nc) || !room[nr][nc] || dBuf[nr * gridW + nc] === dStamp) continue;
      visitedSet(v, nr, nc);
      reached++;
      q.push(nr, nc);
    }
  }
  return reached < totalOpen;
}

/**
 * Check if a furniture piece can be placed, returning a reason string for UI feedback.
 * Same logic as canPlace but returns {ok, reason} instead of boolean.
 */
export function canPlaceWithReason(ctx, groupIdx, itemIdx, rotation, row, col) {
  const { furnitureSet: fs, gridW, gridH, room, occupancy } = ctx;
  const tiles = getCachedTiles(ctx, groupIdx, itemIdx, rotation);
  if (tiles.length === 0) return { ok: false, reason: "Invalid item" };

  const proposedBlockers = new Set();
  const proposedTiles = [];

  for (let r = 0; r < tiles.length; r++) {
    for (let c = 0; c < (tiles[r]?.length ?? 0); c++) {
      const tileKey = tiles[r][c];
      if (tileKey === null) continue;
      const gr = row + r, gc = col + c;
      if (gr < 0 || gr >= gridH || gc < 0 || gc >= gridW) return { ok: false, reason: "Out of bounds" };
      if (!room[gr][gc]) return { ok: false, reason: "Not on room tile" };
      const occ = occupancy[gr][gc];
      if (occ >= 0) return { ok: false, reason: "Overlaps furniture" };
      proposedTiles.push({ gr, gc, tileKey });
      const tt = fs.tileTypes[tileKey];
      if (tt && AVAIL_IMPASSABLE.has(tt.availability)) proposedBlockers.add(gr * gridW + gc);
    }
  }

  for (const { gr, gc, tileKey } of proposedTiles) {
    const tt = fs.tileTypes[tileKey];
    if (!tt?.mustBeReachable) continue;
    let blockedCount = 0;
    for (const [dr, dc] of DIRS) {
      const nr = gr + dr, nc = gc + dc;
      if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW || !room[nr][nc]) blockedCount++;
      else if (isBlockerAt(ctx, nr, nc, proposedBlockers, -1)) blockedCount++;
    }
    if (blockedCount >= 4) return { ok: false, reason: "Would block a reachable tile" };
  }

  for (const { gr, gc, tileKey } of proposedTiles) {
    const tt = fs.tileTypes[tileKey];
    if (!tt || !AVAIL_IMPASSABLE.has(tt.availability)) continue;
    for (const [dr, dc] of DIRS) {
      const nr = gr + dr, nc = gc + dc;
      if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW) continue;
      const existingTT = getFurnitureTileAt(ctx, nr, nc, -1);
      if (existingTT?.mustBeReachable) {
        if (wouldBeFullyBlocked(ctx, nr, nc, proposedBlockers, -1)) return { ok: false, reason: "Would block existing furniture" };
      }
    }
  }

  const proposedSet = new Set(proposedTiles.map(t => `${t.gr},${t.gc}`));
  let hasWalkableNeighbor = false;
  for (const { gr, gc } of proposedTiles) {
    if (hasWalkableNeighbor) break;
    for (const [dr, dc] of DIRS) {
      const nr = gr + dr, nc = gc + dc;
      if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW) continue;
      if (!room[nr][nc]) continue;
      if (proposedSet.has(`${nr},${nc}`)) continue;
      if (isBlockerAt(ctx, nr, nc, new Set(), -1)) continue;
      hasWalkableNeighbor = true;
      break;
    }
  }
  if (!hasWalkableNeighbor) return { ok: false, reason: "Furniture would be fully enclosed" };

  if (proposedBlockers.size > 0) {
    if (wouldDisconnectRoom(ctx, proposedBlockers, -1)) return { ok: false, reason: "Would split room" };
  }

  return { ok: true, reason: "" };
}

// ── Walkability check ────────────────────────────────────

/** Full walkability check: connectivity + mustBeReachable + piece reachability. Returns boolean. */
export function checkWalkability(ctx) {
  const { furnitureSet: fs, gridW, gridH, room, placements, blockerCount } = ctx;

  let mustReach;
  if (!ctx.mustReachDirty && ctx.mustReachCache) {
    mustReach = ctx.mustReachCache;
  } else {
    mustReach = [];
    for (const p of placements) {
      const tiles = getCachedTiles(ctx, p.groupIdx, p.itemIdx, p.rotation);
      for (let r = 0; r < tiles.length; r++)
        for (let c = 0; c < (tiles[r]?.length ?? 0); c++) {
          const tileKey = tiles[r][c];
          if (tileKey === null) continue;
          const gr = p.row + r, gc = p.col + c;
          if (gr < 0 || gr >= gridH || gc < 0 || gc >= gridW) continue;
          const tt = fs.tileTypes[tileKey];
          if (tt?.mustBeReachable) mustReach.push({ row: gr, col: gc });
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
  for (let r = 0; r < gridH; r++)
    for (let c = 0; c < gridW; c++)
      if (room[r][c] && blockerCount[r][c] === 0) {
        totalOpen++;
        if (!seeded) { q.push(r, c); visitedSet(v, r, c); seeded = true; }
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
        reachable = true; break;
      }
    }
    if (!reachable) return false;
  }

  for (const p of placements) {
    const pTiles = getCachedTiles(ctx, p.groupIdx, p.itemIdx, p.rotation);
    let pieceReachable = false;
    for (let r = 0; r < pTiles.length && !pieceReachable; r++)
      for (let c = 0; c < (pTiles[r]?.length ?? 0) && !pieceReachable; c++) {
        if (pTiles[r][c] === null) continue;
        const gr = p.row + r, gc = p.col + c;
        for (const [dr, dc] of DIRS) {
          const nr = gr + dr, nc = gc + dc;
          if (nr >= 0 && nr < gridH && nc >= 0 && nc < gridW && visitedHas(v, nr, nc)) {
            pieceReachable = true; break;
          }
        }
      }
    if (!pieceReachable) return false;
  }

  const walkable = reached >= totalOpen;
  if (walkable) ctx._walkabilityValid = true;
  return walkable;
}

// ── Room connectivity ────────────────────────────────────

/** Check that all room tiles form a single connected component. */
export function checkRoomConnectivity(ctx) {
  const { gridW, gridH, room } = ctx;
  let totalRoom = 0, startR = -1, startC = -1;
  for (let r = 0; r < gridH; r++)
    for (let c = 0; c < gridW; c++)
      if (room[r][c]) { totalRoom++; if (startR < 0) { startR = r; startC = c; } }
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

// ── Metric functions ─────────────────────────────────────

/** Compute stat totals from placements. Returns array parallel to furnitureSet.stats. */
export function computeStats(ctx) {
  const { furnitureSet: fs, building: bld, placements } = ctx;
  if (!fs.stats || !bld.items) return new Array(fs.stats?.length ?? 0).fill(0);
  const totals = new Array(fs.stats.length).fill(0);
  for (const p of placements) {
    const item = fs.groups[p.groupIdx]?.items[p.itemIdx];
    if (!item) continue;
    const bItem = bld.items[p.groupIdx];
    if (!bItem || !bItem.stats) continue;
    const mult = item.multiplierStats ?? item.multiplier;
    for (let s = 0; s < bItem.stats.length && s < totals.length; s++)
      totals[s] += bItem.stats[s] * mult;
  }
  return totals;
}

/** Compute wall tile grid (non-room tiles adjacent to room, excluding doors). */
export function computeWalls(ctx) {
  const { gridW, gridH, room, doors } = ctx;
  const walls = Array.from({ length: gridH }, () => Array(gridW).fill(false));
  if (!ctx.furnitureSet?.mustBeIndoors) return walls;
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
  // Clean up doors no longer on perimeter
  for (const key of [...doors]) {
    const [r, c] = key.split(",").map(Number);
    let adj = false;
    for (const [dr, dc] of DIRS8) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < gridH && nc >= 0 && nc < gridW && room[nr][nc]) {
        adj = true; break;
      }
    }
    if (!adj || room[r]?.[c]) doors.delete(key);
  }
  return walls;
}

/** Compute isolation score (0–1) for enclosed room quality. */
export function computeIsolation(ctx) {
  if (!ctx.furnitureSet?.mustBeIndoors) return 1;
  const { gridW, gridH, room, doors } = ctx;
  const walls = Array.from({ length: gridH }, () => Array(gridW).fill(false));
  for (let r = 0; r < gridH; r++)
    for (let c = 0; c < gridW; c++) {
      if (room[r][c]) continue;
      let adjRoom = false;
      for (const [dr, dc] of DIRS8) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < gridH && nc >= 0 && nc < gridW && room[nr][nc]) { adjRoom = true; break; }
      }
      if (adjRoom && !doors.has(`${r},${c}`)) walls[r][c] = true;
    }
  let edgeTiles = 0, total = 0, unwalled = 0;
  for (let r = 0; r < gridH; r++)
    for (let c = 0; c < gridW; c++) {
      if (!room[r][c]) continue;
      let isEdge = false;
      for (const [dr, dc] of DIRS8) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW || !room[nr][nc]) { isEdge = true; break; }
      }
      if (!isEdge) continue;
      edgeTiles++;
      for (const [dr, dc] of DIRS8) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW) { total++; unwalled++; }
        else if (!room[nr][nc]) {
          total++;
          if (!walls[nr][nc]) unwalled += doors.has(`${nr},${nc}`) ? 0.34 : 1;
        }
      }
    }
  if (total === 0) return 1;
  const bonus = Math.ceil(edgeTiles / 10);
  const raw = Math.min(1, Math.max(0, (total - unwalled + bonus) / total));
  return Math.pow(raw, 1.5);
}

const _tileSupportBuf = new Int32Array(128);

/** Compute support value for a single tile (uses DDA support rays). */
export function tileSupport(room, gridW, gridH, r, c) {
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

/** Count group placements using cached counts or linear scan. */
export function countGroupPlacements(ctx, groupIdx) {
  if (ctx.groupCounts) return ctx.groupCounts[groupIdx] ?? 0;
  let count = 0;
  for (const p of ctx.placements) if (p.groupIdx === groupIdx) count++;
  return count;
}

// ── Binary serialization ─────────────────────────────────

/** Encode bytes to base64url (RFC 4648: + → -, / → _, no padding). */
export function toBase64url(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
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

/** Compress bytes using deflate-raw via CompressionStream. */
export async function compress(data) {
  const cs = new CompressionStream("deflate-raw");
  const writer = cs.writable.getWriter();
  writer.write(data);
  writer.close();
  const chunks = [];
  const reader = cs.readable.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const totalLen = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(totalLen);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

/** Decompress deflate-raw bytes via DecompressionStream. */
export async function decompress(data) {
  const ds = new DecompressionStream("deflate-raw");
  const writer = ds.writable.getWriter();
  writer.write(data);
  writer.close();
  const chunks = [];
  const reader = ds.readable.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const totalLen = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(totalLen);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}
