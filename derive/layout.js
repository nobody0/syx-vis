// Semantic layout: X = build-cost score, Y = category bands
import { BAND_ORDER } from "../display/config.js";

// Layout constants
export const COL_SPACING = 200;   // px between columns
export const ROW_SPACING = 80;    // px between nodes within a band
export const BAND_GAP = 60;       // extra gap between bands
const NODE_W = 165;
const NODE_H = 68;

/**
 * Main entry point. Computes {x, y} positions for all nodes.
 * @param {Map<string, Object>} nodes
 * @param {import('../types.js').GraphEdge[]} edges - visible edges
 * @param {import('../types.js').GraphEdge[]} layoutEdges - all edges used for layout (includes construction)
 * @returns {Map<string, {x: number, y: number, column: number, band: number}>}
 */
export function computeLayout(nodes, edges, layoutEdges) {
  if (nodes.size === 0) return new Map();

  const allEdges = layoutEdges.length > 0 ? layoutEdges : edges;

  // Step 1: Compute resource production costs
  const productionCosts = computeProductionCosts(nodes, allEdges);

  // Step 2: Compute build scores for buildings
  const buildScores = new Map();
  for (const [id, node] of nodes) {
    if (node.type === "building") {
      buildScores.set(id, computeBuildScore(node, productionCosts));
    }
  }

  // Step 3: Compute resource scores (path cost through input chain)
  const resourceScores = computeResourceScores(nodes, allEdges, buildScores);

  // Step 4: Unified score map
  // Buildings are clamped to max of their recipe input resource scores,
  // so a building can't appear before the resources it consumes.
  // Resources get a tiny offset so they sort just after their producer building.
  const scores = new Map();
  for (const [id, score] of buildScores) {
    let adjusted = score;
    const node = nodes.get(id);
    if (node && node.recipes) {
      for (const recipe of node.recipes) {
        for (const inp of recipe.inputs) {
          const inputScore = resourceScores.get(inp.resource);
          if (inputScore !== undefined && inputScore > adjusted) adjusted = inputScore;
        }
      }
    }
    scores.set(id, adjusted);
  }
  for (const [id, score] of resourceScores) scores.set(id, score + 0.001);

  // Step 5: Assign columns — alternating resource/building, World Map leftmost
  const columns = assignColumns(scores, nodes);

  // Pre-build adjacency map for barycenter sorting in positionNodes
  const neighborsByNode = new Map();
  for (const e of allEdges) {
    if (!neighborsByNode.has(e.from)) neighborsByNode.set(e.from, []);
    neighborsByNode.get(e.from).push(e.to);
    if (!neighborsByNode.has(e.to)) neighborsByNode.set(e.to, []);
    neighborsByNode.get(e.to).push(e.from);
  }

  // Step 6: Determine which resources are "extracted" (produced by a no-input recipe)
  const extractedResources = new Set();
  for (const e of allEdges) {
    if (e.direction !== "output") continue;
    const building = nodes.get(e.from);
    if (!building || building.type !== "building") continue;
    const recipe = building.recipes?.find(r =>
      r.outputs.some(o => o.resource === e.to)
    );
    if (recipe && recipe.inputs.length === 0) {
      extractedResources.add(e.to);
    }
  }

  // Step 7: Assign bands
  const bands = new Map();
  for (const [id, node] of nodes) {
    bands.set(id, assignBand(node, extractedResources));
  }

  // Step 8: Position nodes within columns + bands
  const positions = positionNodes(nodes, columns, bands, neighborsByNode);

  return positions;
}

/**
 * Recursively compute production cost per unit for each resource.
 * For extraction (no inputs): cost = 1 / output_rate.
 * For recipes with inputs: cost = sum(inputCost * inputAmount) / outputAmount.
 * Uses min across all producers.
 * @param {Map<string, Object>} nodes
 * @param {import('../types.js').GraphEdge[]} edges
 * @returns {Map<string, number>}
 */
function computeProductionCosts(nodes, edges) {
  // Build lookup: resource → [{buildingId, inputs: [{resource, amount}], outputAmount}]
  const producers = new Map();

  for (const e of edges) {
    if (e.direction !== "output") continue;
    const buildingNode = nodes.get(e.from);
    if (!buildingNode || buildingNode.type !== "building") continue;

    // Find the recipe this output edge belongs to
    const recipe = buildingNode.recipes?.find(r =>
      r.outputs.some(o => o.resource === e.to && o.amount === e.amount)
    );
    if (!recipe) continue;

    if (!producers.has(e.to)) producers.set(e.to, []);
    producers.get(e.to).push({
      buildingId: e.from,
      inputs: recipe.inputs,
      outputAmount: e.amount,
    });
  }

  const costs = new Map();
  const computing = new Set(); // cycle detection

  function getCost(resourceId) {
    if (costs.has(resourceId)) return costs.get(resourceId);
    if (computing.has(resourceId)) return 1000; // cycle fallback (shouldn't happen with World Map)

    computing.add(resourceId);

    const prods = producers.get(resourceId);
    if (!prods || prods.length === 0) {
      // No producer: high default cost (trade-only)
      costs.set(resourceId, 100);
      computing.delete(resourceId);
      return 100;
    }

    let minCost = Infinity;
    for (const prod of prods) {
      if (prod.inputs.length === 0) {
        // Extraction: cost = 1 / rate
        const cost = 1 / prod.outputAmount;
        minCost = Math.min(minCost, cost);
      } else {
        // Process: cost = sum(inputCost * inputAmount) / outputAmount
        let inputTotal = 0;
        for (const inp of prod.inputs) {
          inputTotal += getCost(inp.resource) * inp.amount;
        }
        const cost = inputTotal / prod.outputAmount;
        minCost = Math.min(minCost, cost);
      }
    }

    costs.set(resourceId, minCost);
    computing.delete(resourceId);
    return minCost;
  }

  // Compute for all resources
  for (const [id, node] of nodes) {
    if (node.type === "resource") getCost(id);
  }

  return costs;
}

/**
 * Compute build score for a building.
 * buildScore = (constructionCostScore + 1) * (techCostScore + 1)
 * @param {Object} building
 * @param {Map<string, number>} productionCosts
 * @returns {number}
 */
function computeBuildScore(building, productionCosts) {
  // Construction cost score
  let constructionScore = 0;
  if (building.constructionCosts) {
    for (const cost of building.constructionCosts) {
      const resCost = productionCosts.get(cost.resource) || 100;
      constructionScore += resCost * cost.amount;
    }
  }

  // Tech cost score: sum of all CIVIC_INNOVATION + CIVIC_KNOWLEDGE
  let techScore = 0;
  if (building.unlockedBy && building.unlockedBy.costs) {
    for (const val of Object.values(building.unlockedBy.costs)) {
      techScore += val;
    }
  }

  return (constructionScore + 1) * (techScore + 1);
}

/**
 * Compute path-cost scores for all resources.
 * For each producer of resource R:
 *   - Extraction (no inputs): pathCost = buildScore
 *   - Recipe with inputs: pathCost = buildScore + sum(resourceScore of each input)
 * resourceScore(R) = min(pathCost) across all producers.
 * Excludes World Map pseudo-building.
 * @param {Map<string, Object>} nodes
 * @param {import('../types.js').GraphEdge[]} edges
 * @param {Map<string, number>} buildScores
 * @returns {Map<string, number>}
 */
function computeResourceScores(nodes, edges, buildScores) {
  // Build producer lookup: resource → [{buildingId, inputs, buildScore}]
  const producers = new Map();
  for (const e of edges) {
    if (e.direction !== "output") continue;
    const buildingNode = nodes.get(e.from);
    if (!buildingNode || buildingNode.type !== "building") continue;
    const bs = buildScores.get(e.from);
    if (bs === undefined) continue;

    const recipe = buildingNode.recipes?.find(r =>
      r.outputs.some(o => o.resource === e.to)
    );
    if (!recipe) continue;

    if (!producers.has(e.to)) producers.set(e.to, []);
    const output = recipe.outputs.find(o => o.resource === e.to);
    producers.get(e.to).push({
      buildingId: e.from,
      inputs: recipe.inputs,
      buildScore: bs,
      outputAmount: output ? output.amount : 1,
    });
  }

  const scores = new Map();
  const computing = new Set(); // cycle detection

  function getScore(resourceId) {
    if (scores.has(resourceId)) return scores.get(resourceId);
    if (computing.has(resourceId)) return 1000; // cycle fallback

    computing.add(resourceId);

    const prods = producers.get(resourceId);
    if (!prods || prods.length === 0) {
      scores.set(resourceId, 1);
      computing.delete(resourceId);
      return 1;
    }

    let minCost = Infinity;
    for (const prod of prods) {
      if (prod.inputs.length === 0) {
        // Extraction: pathCost = buildScore / rate (mirrors productionCost = 1/rate)
        minCost = Math.min(minCost, prod.buildScore / prod.outputAmount);
      } else {
        // Recipe: pathCost = buildScore + sum(input resource scores)
        let pathCost = prod.buildScore;
        for (const inp of prod.inputs) {
          pathCost += getScore(inp.resource);
        }
        minCost = Math.min(minCost, pathCost);
      }
    }

    scores.set(resourceId, minCost);
    computing.delete(resourceId);
    return minCost;
  }

  // Compute for all resources
  for (const [id, node] of nodes) {
    if (node.type === "resource") getScore(id);
  }

  return scores;
}

/**
 * Assign nodes to alternating resource/building columns.
 * World Map is always column 0. Then score-aligned segments produce
 * a resource column followed by a building column per segment.
 * Empty columns are collapsed.
 * @param {Map<string, number>} scores
 * @param {Map<string, Object>} nodes
 * @returns {Map<string, number>}
 */
function assignColumns(scores, nodes) {
  const columns = new Map();

  // World Map always at column 0
  if (nodes.has("_world_map")) columns.set("_world_map", 0);

  // Sort all non-World Map nodes by score
  const sorted = Array.from(scores.entries())
    .filter(([id]) => nodes.has(id) && id !== "_world_map")
    .sort((a, b) => a[1] - b[1]);

  if (sorted.length === 0) return columns;

  // Determine score segments using quantile breaks
  const TARGET_SEGMENTS = 12;
  const segSize = Math.max(1, Math.ceil(sorted.length / TARGET_SEGMENTS));

  // Assign columns: within each segment, resources first, then buildings
  let col = 1; // start after World Map

  for (let segStart = 0; segStart < sorted.length; segStart += segSize) {
    const segEnd = Math.min(segStart + segSize, sorted.length);
    const resIds = [];
    const bldIds = [];

    for (let i = segStart; i < segEnd; i++) {
      const [id] = sorted[i];
      if (nodes.get(id).type === "resource") resIds.push(id);
      else bldIds.push(id);
    }

    // Buildings first (left), then their output resources (right)
    // This ensures outputs flow left-to-right: building → resource it produces
    if (bldIds.length > 0) {
      for (const id of bldIds) columns.set(id, col);
      col++;
    }
    if (resIds.length > 0) {
      for (const id of resIds) columns.set(id, col);
      col++;
    }
  }

  return columns;
}

/**
 * Assign a node to a band index based on its category/band.
 * Resources: military → order, extracted (no-input recipe) → production, otherwise → manufacturing.
 * Buildings: use pre-computed node.band from graph.js.
 * @param {Object} node
 * @param {Set<string>} extractedResources
 * @returns {number}
 */
function assignBand(node, extractedResources) {
  const bandIndex = (bandName) => {
    const idx = BAND_ORDER.indexOf(bandName);
    return idx >= 0 ? idx : 4; // default to lifestyle
  };

  if (node.type === "resource") {
    if (node.category === "military") return bandIndex("order");
    return bandIndex(extractedResources.has(node.id) ? "production" : "manufacturing");
  }

  // Building: use pre-computed band
  return bandIndex(node.band || "lifestyle");
}

/**
 * Position nodes using column/band assignment + barycenter edge-crossing minimization.
 * @param {Map<string, Object>} nodes
 * @param {Map<string, number>} columns
 * @param {Map<string, number>} bands
 * @param {Map<string, string[]>} neighborsByNode
 * @returns {Map<string, {x: number, y: number, column: number, band: number}>}
 */
function positionNodes(nodes, columns, bands, neighborsByNode) {
  // Group nodes by column, then by band within each column
  const colBandGroups = new Map(); // col → band → [nodeId]

  for (const [id] of nodes) {
    const col = columns.get(id) ?? 0;
    const band = bands.get(id) ?? 2;

    if (!colBandGroups.has(col)) colBandGroups.set(col, new Map());
    const bandMap = colBandGroups.get(col);
    if (!bandMap.has(band)) bandMap.set(band, []);
    bandMap.get(band).push(id);
  }

  // Initial positioning: stack nodes per column, per band
  const positions = new Map();
  const numCols = Math.max(...Array.from(columns.values()), 0) + 1;

  // Run barycenter sorting (3 passes)
  for (let pass = 0; pass < 3; pass++) {
    for (let col = 0; col < numCols; col++) {
      const bandMap = colBandGroups.get(col);
      if (!bandMap) continue;

      for (const [_band, nodeIds] of bandMap) {
        if (nodeIds.length <= 1) continue;

        // Compute barycenter for each node (avg Y of connected neighbors in nearby columns)
        const barycenters = new Map();
        for (const nid of nodeIds) {
          const neighborYs = [];
          const neighbors = neighborsByNode.get(nid) || [];
          for (const neighborId of neighbors) {
            const neighborCol = columns.get(neighborId);
            if (neighborCol === undefined) continue;
            // Nearby columns (within 2 — since alternating R/B means neighbors are 2 cols apart)
            if (Math.abs(neighborCol - col) <= 2 && neighborCol !== col) {
              const pos = positions.get(neighborId);
              if (pos) neighborYs.push(pos.y);
            }
          }

          if (neighborYs.length > 0) {
            barycenters.set(nid, neighborYs.reduce((a, b) => a + b, 0) / neighborYs.length);
          }
        }

        // Sort by barycenter (nodes without barycenters keep their position)
        nodeIds.sort((a, b) => {
          const ba = barycenters.get(a);
          const bb = barycenters.get(b);
          if (ba !== undefined && bb !== undefined) return ba - bb;
          if (ba !== undefined) return -1;
          if (bb !== undefined) return 1;
          return 0;
        });
      }
    }

    // Recompute positions after each barycenter pass
    computePositionsFromGroups(colBandGroups, numCols, positions, nodes);
  }

  return positions;
}

/**
 * Compute actual x,y positions from column/band groups.
 * @param {Map<number, Map<number, string[]>>} colBandGroups
 * @param {number} numCols
 * @param {Map<string, {x: number, y: number, column: number, band: number}>} positions
 * @param {Map<string, Object>} _nodes
 */
function computePositionsFromGroups(colBandGroups, numCols, positions, _nodes) {
  // Count max nodes per band across all columns
  const maxNodesPerBand = new Map();
  for (let col = 0; col < numCols; col++) {
    const bandMap = colBandGroups.get(col);
    if (!bandMap) continue;
    for (const [band, nodeIds] of bandMap) {
      const current = maxNodesPerBand.get(band) || 0;
      maxNodesPerBand.set(band, Math.max(current, nodeIds.length));
    }
  }

  // Compute cumulative band Y offsets
  const bandOffsets = new Map();
  let cumulativeY = 0;
  for (let bandIdx = 0; bandIdx < BAND_ORDER.length; bandIdx++) {
    bandOffsets.set(bandIdx, cumulativeY);
    const maxNodes = maxNodesPerBand.get(bandIdx) || 0;
    cumulativeY += maxNodes * ROW_SPACING + BAND_GAP;
  }

  // Position each node
  for (let col = 0; col < numCols; col++) {
    const bandMap = colBandGroups.get(col);
    if (!bandMap) continue;

    const x = col * COL_SPACING;

    for (const [band, nodeIds] of bandMap) {
      const bandY = bandOffsets.get(band) || 0;
      const totalHeight = nodeIds.length * ROW_SPACING;
      const maxBandHeight = (maxNodesPerBand.get(band) || 1) * ROW_SPACING;
      const startY = bandY + (maxBandHeight - totalHeight) / 2;

      for (let i = 0; i < nodeIds.length; i++) {
        const nid = nodeIds[i];
        positions.set(nid, {
          x: x + NODE_W / 2,
          y: startY + i * ROW_SPACING + NODE_H / 2,
          column: col,
          band,
        });
      }
    }
  }
}

/**
 * Generate a cubic bezier SVG path between two points.
 * @param {number} fromX
 * @param {number} fromY
 * @param {number} toX
 * @param {number} toY
 * @returns {string}
 */
export function edgePath(fromX, fromY, toX, toY) {
  const dx = toX - fromX;
  return `M${fromX},${fromY} C${fromX + dx * 0.4},${fromY} ${toX - dx * 0.4},${toY} ${toX},${toY}`;
}

/**
 * Compute the midpoint of a cubic bezier at t=0.5.
 * @param {number} fromX
 * @param {number} fromY
 * @param {number} toX
 * @param {number} toY
 * @returns {{x: number, y: number}}
 */
export function bezierMidpoint(fromX, fromY, toX, toY) {
  const dx = toX - fromX;
  const cx1 = fromX + dx * 0.4;
  const cy1 = fromY;
  const cx2 = toX - dx * 0.4;
  const cy2 = toY;

  // Cubic bezier at t=0.5
  const t = 0.5;
  const t1 = 1 - t;
  const x = t1 * t1 * t1 * fromX + 3 * t1 * t1 * t * cx1 + 3 * t1 * t * t * cx2 + t * t * t * toX;
  const y = t1 * t1 * t1 * fromY + 3 * t1 * t1 * t * cy1 + 3 * t1 * t * t * cy2 + t * t * t * toY;

  return { x, y };
}
