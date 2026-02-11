// Semantic layout: X = build-cost score, Y = category bands
import { BAND_ORDER } from "../display/config.js";
import { GATHERING_RATES } from "../derive/graph.js";

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

  // Step 5: Assign columns — alternating resource/building
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
  // Also mark gathered resources as extracted (formerly from World Map edges)
  for (const resId of Object.keys(GATHERING_RATES)) {
    if (nodes.has(resId)) extractedResources.add(resId);
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

  // Inject virtual gathering producers (breaks construction-cost cycles)
  for (const [resId, rate] of Object.entries(GATHERING_RATES)) {
    if (!nodes.has(resId)) continue;
    if (!producers.has(resId)) producers.set(resId, []);
    producers.get(resId).push({ buildingId: null, inputs: [], outputAmount: rate });
  }

  const costs = new Map();
  const computing = new Set(); // cycle detection

  function getCost(resourceId) {
    if (costs.has(resourceId)) return costs.get(resourceId);
    if (computing.has(resourceId)) return 1000; // cycle fallback

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
 * buildScore = sqrt(constructionCostScore) + sqrt(techCostScore) + 1
 * Additive sqrt compresses the two independent cost axes onto the same scale,
 * preventing explosive scores when both are nonzero (e.g. temples: 40k → ~30).
 * @param {Object} building
 * @param {Map<string, number>} productionCosts
 * @returns {number}
 */
function computeBuildScore(building, productionCosts) {
  // Construction cost score: max production cost across required resources.
  // Amount is irrelevant for chain depth — needing 20 wood vs 2 wood doesn't
  // change when you can build it. The bottleneck is the most advanced resource.
  let constructionScore = 0;
  if (building.constructionCosts) {
    for (const cost of building.constructionCosts) {
      const resCost = productionCosts.get(cost.resource) || 100;
      constructionScore = Math.max(constructionScore, resCost);
    }
  }

  // Tech cost score: sum of all CIVIC_INNOVATION + CIVIC_KNOWLEDGE
  let techScore = 0;
  if (building.unlockedBy && building.unlockedBy.costs) {
    for (const val of Object.values(building.unlockedBy.costs)) {
      techScore += val;
    }
  }

  return Math.sqrt(constructionScore) + Math.sqrt(techScore) + 1;
}

/**
 * Compute path-cost scores for all resources.
 * For each producer of resource R:
 *   - Gathering (no building): pathCost = 0 (tier 0, always leftmost)
 *   - Extraction (building, no inputs): pathCost = buildScore (chain depth, rate-agnostic)
 *   - Recipe with inputs: pathCost = buildScore + sum(resourceScore of each input)
 * resourceScore(R) = min(pathCost) across all producers.
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

  // Inject virtual gathering producers (no building needed = tier 0)
  for (const [resId, rate] of Object.entries(GATHERING_RATES)) {
    if (!nodes.has(resId)) continue;
    if (!producers.has(resId)) producers.set(resId, []);
    producers.get(resId).push({ buildingId: null, inputs: [], buildScore: 0, outputAmount: rate });
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
        if (prod.buildingId === null) {
          // Gathering (no building): tier 0, available from the start
          minCost = 0;
        } else {
          // Extraction: position = buildScore (same as the building).
          // Rate is NOT used here — X-axis represents production chain depth,
          // not output efficiency. This keeps extraction resources next to their
          // producer buildings regardless of how much they yield per worker.
          minCost = Math.min(minCost, prod.buildScore);
        }
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
 * Uses sqrt-scaled score buckets so nodes with similar scores share columns,
 * rather than quantile-based grouping that ignores score magnitude.
 * Within each bucket: buildings left, resources right.
 * @param {Map<string, number>} scores
 * @param {Map<string, Object>} nodes
 * @returns {Map<string, number>}
 */
function assignColumns(scores, nodes) {
  const columns = new Map();

  const sorted = Array.from(scores.entries())
    .filter(([id]) => nodes.has(id))
    .sort((a, b) => a[1] - b[1]);

  if (sorted.length === 0) return columns;

  // Group nodes by sqrt-scaled score buckets.
  // sqrt compresses high scores so late-game buildings don't eat all the columns,
  // while keeping early-game tiers visually separated.
  const maxScore = sorted[sorted.length - 1][1];
  const TARGET_GROUPS = 12;
  const scale = maxScore > 0.01 ? TARGET_GROUPS / Math.sqrt(maxScore) : 1;

  const groups = new Map();
  for (const [id, score] of sorted) {
    const g = Math.floor(Math.sqrt(Math.max(0, score)) * scale);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(id);
  }

  // Assign columns: each group splits into building sub-col + resource sub-col
  let col = 0;
  for (const gIdx of Array.from(groups.keys()).sort((a, b) => a - b)) {
    const members = groups.get(gIdx);
    const resIds = members.filter(id => nodes.get(id).type === "resource");
    const bldIds = members.filter(id => nodes.get(id).type !== "resource");

    // Buildings first (left), then their output resources (right)
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
 * Uses alternating left-to-right / right-to-left sweeps with distance-weighted
 * neighbor influence across ALL columns (not just ±2).
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

  const positions = new Map();
  const numCols = Math.max(...Array.from(columns.values()), 0) + 1;

  // Initial positions (needed before first barycenter pass)
  computePositionsFromGroups(colBandGroups, numCols, positions, nodes, neighborsByNode, columns);

  // Barycenter sorting: alternating sweep direction, distance-weighted neighbors
  const NUM_PASSES = 6;
  for (let pass = 0; pass < NUM_PASSES; pass++) {
    const leftToRight = pass % 2 === 0;

    for (let i = 0; i < numCols; i++) {
      const col = leftToRight ? i : numCols - 1 - i;
      const bandMap = colBandGroups.get(col);
      if (!bandMap) continue;

      for (const [_band, nodeIds] of bandMap) {
        if (nodeIds.length <= 1) continue;

        const barycenters = new Map();
        for (const nid of nodeIds) {
          const neighbors = neighborsByNode.get(nid) || [];
          let weightedSum = 0;
          let totalWeight = 0;

          for (const neighborId of neighbors) {
            const neighborCol = columns.get(neighborId);
            if (neighborCol === undefined || neighborCol === col) continue;
            const pos = positions.get(neighborId);
            if (!pos) continue;

            // Inverse-distance weighting: nearby neighbors pull harder
            const w = 1 / Math.abs(neighborCol - col);
            weightedSum += pos.y * w;
            totalWeight += w;
          }

          if (totalWeight > 0) {
            barycenters.set(nid, weightedSum / totalWeight);
          }
        }

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

    computePositionsFromGroups(colBandGroups, numCols, positions, nodes, neighborsByNode, columns);
  }

  return positions;
}

/**
 * Compute actual x,y positions from column/band groups.
 * After initial center-aligned placement, applies a cross-band centering pass
 * that shifts each (col, band) group toward its cross-band neighbors using
 * available slack within the band allocation.
 * @param {Map<number, Map<number, string[]>>} colBandGroups
 * @param {number} numCols
 * @param {Map<string, {x: number, y: number, column: number, band: number}>} positions
 * @param {Map<string, Object>} _nodes
 * @param {Map<string, string[]>} [neighborsByNode]
 * @param {Map<string, number>} [columns]
 */
function computePositionsFromGroups(colBandGroups, numCols, positions, _nodes, neighborsByNode, columns) {
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

  // Position each node (center-aligned within band allocation)
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

  // Cross-band centering pass: pull groups toward their cross-band neighbors
  if (!neighborsByNode || !columns) return;

  for (let col = 0; col < numCols; col++) {
    const bandMap = colBandGroups.get(col);
    if (!bandMap) continue;

    for (const [band, nodeIds] of bandMap) {
      const totalHeight = nodeIds.length * ROW_SPACING;
      const maxBandHeight = (maxNodesPerBand.get(band) || 1) * ROW_SPACING;
      const slack = maxBandHeight - totalHeight;
      if (slack <= 0) continue; // dense column, no room to shift

      // Compute average Y of all cross-band neighbors
      let neighborYSum = 0;
      let neighborCount = 0;
      for (const nid of nodeIds) {
        const neighbors = neighborsByNode.get(nid) || [];
        for (const neighborId of neighbors) {
          const npos = positions.get(neighborId);
          if (!npos) continue;
          // Only pull toward neighbors in other bands
          if (npos.band === band) continue;
          neighborYSum += npos.y;
          neighborCount++;
        }
      }
      if (neighborCount === 0) continue;

      const avgNeighborY = neighborYSum / neighborCount;

      // Current group center
      const first = positions.get(nodeIds[0]);
      const last = positions.get(nodeIds[nodeIds.length - 1]);
      if (!first || !last) continue;
      const currentCenter = (first.y + last.y) / 2;

      // Clamp shift to stay within band allocation
      const maxShift = slack / 2;
      const rawShift = avgNeighborY - currentCenter;
      const shift = Math.max(-maxShift, Math.min(maxShift, rawShift));

      if (Math.abs(shift) < 1) continue; // negligible

      for (const nid of nodeIds) {
        const pos = positions.get(nid);
        if (pos) pos.y += shift;
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
