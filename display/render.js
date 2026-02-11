// PixiJS v8 WebGL rendering for the bipartite production chain graph
import { Application, Container, Graphics, Text, Sprite, Assets } from "pixi.js";
import { buildGraph } from "../derive/graph.js";
import { computeLayout, bezierMidpoint, COL_SPACING, ROW_SPACING, BAND_GAP } from "../derive/layout.js";
import { buildFilterPanel, applyFilters, focusSearch, setResourceState, getResourceState, refreshResourceGrid, fireFilterChange, isShowFiltered, getRecipeWeight, setRecipeWeight, getEdgeMode, setEdgeMode, getVisibleDirections, getFocusMode, setFocusMode, clearFocusMode, setBuildingState, getBuildingState, getAvailableResources, getCities, getActiveCityId, getActiveCityName, createCity, deleteCity, renameCity, switchCity, deactivateCity, importCity } from "./filters.js";
import { parseSaveFile } from "./save-import.js";
import { RESOURCE_COLORS, BUILDING_COLORS, RESOURCE_NODE_COLORS, BAND_ORDER, BAND_COLORS, capitalize } from "./config.js";
import { sampleBezier, drawSolidBezier, drawDashedCurve, drawArrowhead, EDGE_COLORS, EDGE_ALPHAS } from "./pixi-edges.js";
import { createZoomController } from "./pixi-zoom.js";

import * as d3 from "d3-selection";

// Node dimensions
const RESOURCE_R = 32;
const BUILDING_W = 165;
const BUILDING_H = 54;

// PixiJS application & containers
let app = null;
let worldContainer = null;
let zoomCtrl = null;

// Container layers (inside worldContainer)
let ghostEdgeLayer, ghostNodeLayer, edgeLayer, edgeLabelLayer, edgeHitLayer;
let nodeLayer, nodeIconLayer, nodeLabelLayer, pingLayer;

// Full dataset for detail panel
/** @type {Map<string, Object>} */
let fullNodes;
/** @type {import('../types.js').GraphEdge[]} */
let fullEdges;

// Cached producer/consumer maps
let producersByResource = new Map();
let consumersByResource = new Map();

// Persistent selection state
let selectedNodeId = null;

// First-render flag
let isFirstRender = true;

// Module-level adjacency maps for BFS (set by updateGraph)
let outgoingEdges = new Map();
let incomingEdges = new Map();

// Module-level navigateToNode (reassigned each updateGraph)
let navigateToNode = () => {};

// Tooltip element references
let tooltipEl = null;
let edgeTooltipEl = null;

// Full layout position cache for ghost nodes
let fullLayoutPositions = null;

// Current filtered layout positions
let currentLayoutPositions = null;

// Filtered-out nodes for hidden-link detection
let currentFilteredOutNodes = new Map();

// City mode derived sets (recomputed each filter change)
let availableResources = null;
let frontierResources = null;

// What-if preview sets (focus on buildable-not-built building in city mode)
let whatIfResources = null;   // Set<string> of resource IDs that would become available
let whatIfBuildings = null;   // Set<string> of building IDs that would become buildable
let whatIfUpgrades = null;    // Set<string> of building IDs that would gain a new upgrade tier

// Breadcrumb state
const MAX_BREADCRUMBS = 8;
let breadcrumbHistory = [];

// PixiJS objects indexed by node/edge ID for interaction
let nodeGfxMap = new Map(); // nodeId → {gfx, data, x, y}
let edgeGfxMap = new Map(); // edgeIdx → {hitGfx, data, points}

// Icon texture cache
let iconTextures = new Map(); // iconPath → Texture

// Track previous focus mode state
let wasFocusMode = false;

// Focus bar reference
let focusBarEl = null;

// Detail-panel resource hover tooltip
let detailResTooltip = null;

// ── Cached highlighted edge set for animated dashes ──
let highlightedEdgeIdxs = new Map(); // idx → {color, width}
let dashOffset = 0;
let edgeLabelsCreated = false;
let currentZoomScale = 1; // tracked for zoom-adaptive edge rendering

// Stats bar counts (for re-rendering on selection change)
let lastNodeCount = 0;
let lastEdgeCount = 0;

// ══════════════════════════════════════════════════════════
// City mode helpers
// ══════════════════════════════════════════════════════════

function recomputeCitySets() {
  if (getActiveCityId() && fullNodes && fullEdges) {
    availableResources = getAvailableResources(fullNodes, fullEdges);
    // Frontier: outputs of buildable-not-built buildings
    frontierResources = new Set();
    for (const [id, node] of fullNodes) {
      if (node.type !== "building") continue;
      const bState = getBuildingState(id);
      if (bState === "built" || bState === "ignored") continue;
      // Check if buildable
      if (!node.constructionCosts || node.constructionCosts.length === 0 ||
          node.constructionCosts.every(c => availableResources.has(c.resource))) {
        for (const e of fullEdges) {
          if (e.from === id && e.direction === "output") {
            frontierResources.add(e.to);
          }
        }
      }
    }
    // ── What-if preview: focus on a buildable-not-built building ──
    whatIfResources = null;
    whatIfBuildings = null;
    whatIfUpgrades = null;
    const focus = getFocusMode();
    if (focus) {
      const targetNode = fullNodes.get(focus.targetId);
      if (targetNode && targetNode.type === "building") {
        const bState = getBuildingState(focus.targetId);
        if (bState !== "built" && bState !== "ignored") {
          // Check if buildable (all construction costs available)
          const buildable = !targetNode.constructionCosts ||
            targetNode.constructionCosts.length === 0 ||
            targetNode.constructionCosts.every(c => availableResources.has(c.resource));
          if (buildable) {
            // Compute temp available: current available + focused building's outputs
            const tempAvailable = new Set(availableResources);
            for (const e of fullEdges) {
              if (e.from === focus.targetId && e.direction === "output") {
                tempAvailable.add(e.to);
              }
            }
            // What-if resources = new resources not already available
            const wiRes = new Set();
            for (const r of tempAvailable) {
              if (!availableResources.has(r)) wiRes.add(r);
            }
            // What-if buildings: newly constructable OR newly upgradeable
            const wiBld = new Set();
            const wiUpgrade = new Set(); // buildings that gain a new upgrade tier
            for (const [id, node] of fullNodes) {
              if (node.type !== "building") continue;
              if (id === focus.targetId) continue;
              const bs = getBuildingState(id);
              if (bs === "ignored") continue;

              // Check construction unlock (not-yet-built buildings)
              if (bs !== "built" && node.constructionCosts && node.constructionCosts.length > 0) {
                const wasBuildable = node.constructionCosts.every(c => availableResources.has(c.resource));
                if (!wasBuildable) {
                  const isBuildableNow = node.constructionCosts.every(c => tempAvailable.has(c.resource));
                  if (isBuildableNow) wiBld.add(id);
                }
              }

              // Check upgrade unlock (any building with upgrade tiers)
              if (node.upgradeCosts && node.upgradeCosts.length > 0) {
                for (const tierCosts of node.upgradeCosts) {
                  const wasAffordable = tierCosts.every(c => availableResources.has(c.resource));
                  if (wasAffordable) continue;
                  const isAffordableNow = tierCosts.every(c => tempAvailable.has(c.resource));
                  if (isAffordableNow) { wiUpgrade.add(id); break; }
                }
              }
            }
            if (wiRes.size > 0 || wiBld.size > 0 || wiUpgrade.size > 0) {
              whatIfResources = wiRes;
              whatIfBuildings = wiBld;
              whatIfUpgrades = wiUpgrade;
            }
          }
        }
      }
    }
  } else {
    availableResources = null;
    frontierResources = null;
    whatIfResources = null;
    whatIfBuildings = null;
    whatIfUpgrades = null;
  }
}

// ══════════════════════════════════════════════════════════
// BFS chain highlighting (pure data)
// ══════════════════════════════════════════════════════════

function getDirectionalChain(nodeId) {
  const upstreamNodes = new Map();
  const downstreamNodes = new Map();
  const upstreamEdges = new Map();
  const downstreamEdges = new Map();

  const downQueue = [[nodeId, 0]];
  const downRawDist = new Map([[nodeId, 0]]);
  while (downQueue.length > 0) {
    const [cur, rawDist] = downQueue.shift();
    for (const e of outgoingEdges.get(cur) || []) {
      const nextRaw = rawDist + 1;
      const logDist = Math.ceil(nextRaw / 2);
      if (!downstreamEdges.has(e.name)) downstreamEdges.set(e.name, logDist);
      if (!downRawDist.has(e.w)) {
        downRawDist.set(e.w, nextRaw);
        downstreamNodes.set(e.w, logDist);
        downQueue.push([e.w, nextRaw]);
      }
    }
  }

  const upQueue = [[nodeId, 0]];
  const upRawDist = new Map([[nodeId, 0]]);
  while (upQueue.length > 0) {
    const [cur, rawDist] = upQueue.shift();
    for (const e of incomingEdges.get(cur) || []) {
      const nextRaw = rawDist + 1;
      const logDist = Math.ceil(nextRaw / 2);
      if (!upstreamEdges.has(e.name)) upstreamEdges.set(e.name, logDist);
      if (!upRawDist.has(e.v)) {
        upRawDist.set(e.v, nextRaw);
        upstreamNodes.set(e.v, logDist);
        upQueue.push([e.v, nextRaw]);
      }
    }
  }

  return { upstreamNodes, downstreamNodes, upstreamEdges, downstreamEdges, selectedNodeId: nodeId };
}

function isOneEdgeAway(nodeA, nodeB) {
  for (const e of outgoingEdges.get(nodeA) || []) {
    if (e.w === nodeB) return true;
  }
  for (const e of outgoingEdges.get(nodeB) || []) {
    if (e.w === nodeA) return true;
  }
  return false;
}

function distAlpha(logicalDist) {
  if (logicalDist <= 1) return 1;
  if (logicalDist === 2) return 0.6;
  return 0.35;
}

// ══════════════════════════════════════════════════════════
// Visual highlight application (PixiJS properties)
// ══════════════════════════════════════════════════════════

function applyDirectionalHighlight(chain) {
  const { upstreamNodes, downstreamNodes, upstreamEdges, downstreamEdges, selectedNodeId: selId } = chain;
  const allHighlightedNodes = new Set([selId, ...upstreamNodes.keys(), ...downstreamNodes.keys()]);
  const allHighlightedEdges = new Set([...upstreamEdges.keys(), ...downstreamEdges.keys()]);

  highlightedEdgeIdxs.clear();
  const inFocus = !!getFocusMode();

  // Collect direct neighbors of selected node (any edge type) so they stay visible
  const directNeighbors = new Set();
  for (const [, entry] of edgeGfxMap) {
    if (entry.data.v === selId) directNeighbors.add(entry.data.w);
    if (entry.data.w === selId) directNeighbors.add(entry.data.v);
  }

  // Nodes
  for (const [id, entry] of nodeGfxMap) {
    const { gfx, strokeGfx, data } = entry;
    if (id === selId) {
      gfx.alpha = 1;
      redrawNodeSelectionRing(strokeGfx, data);
    } else if (upstreamNodes.has(id)) {
      gfx.alpha = distAlpha(upstreamNodes.get(id));
      redrawNodeStroke(strokeGfx, data, 0x4fc3f7, 2.5);
    } else if (downstreamNodes.has(id)) {
      gfx.alpha = distAlpha(downstreamNodes.get(id));
      redrawNodeStroke(strokeGfx, data, 0xffb74d, 2.5);
    } else if (directNeighbors.has(id)) {
      // Direct neighbor via non-BFS edge — keep visible
      gfx.alpha = 1;
      redrawNodeStateStroke(strokeGfx, data);
    } else if (!allHighlightedNodes.has(id) && !inFocus) {
      gfx.alpha = 0.08;
      redrawNodeStroke(strokeGfx, data, 0x000000, 1.5, 0.3);
    } else {
      gfx.alpha = 1;
      redrawNodeStateStroke(strokeGfx, data);
    }
  }

  // Edges — mark highlighted edges but DON'T draw them here; the ticker handles animated dashes
  for (const [idx, entry] of edgeGfxMap) {
    const { visGfx, hitGfx, labelText, data } = entry;
    if (upstreamEdges.has(data.name)) {
      const a = distAlpha(upstreamEdges.get(data.name));
      visGfx.alpha = a;
      if (labelText) { labelText.alpha = a; labelText.style.fill = "#4fc3f7"; }
      highlightedEdgeIdxs.set(idx, { color: 0x4fc3f7, width: 2.5 });
      hitGfx.alpha = 1;
      hitGfx.eventMode = "static";
    } else if (downstreamEdges.has(data.name)) {
      const a = distAlpha(downstreamEdges.get(data.name));
      visGfx.alpha = a;
      if (labelText) { labelText.alpha = a; labelText.style.fill = "#ffb74d"; }
      highlightedEdgeIdxs.set(idx, { color: 0xffb74d, width: 2.5 });
      hitGfx.alpha = 1;
      hitGfx.eventMode = "static";
    } else if (!allHighlightedEdges.has(data.name)) {
      // Edges directly touching the selected node get full chain highlight
      if (data.w === selId) {
        // Incoming to selected → upstream (cyan)
        highlightedEdgeIdxs.set(idx, { color: 0x4fc3f7, width: 2.5 });
        visGfx.alpha = 1;
        if (labelText) { labelText.alpha = 1; labelText.style.fill = "#4fc3f7"; }
        hitGfx.alpha = 1;
        hitGfx.eventMode = "static";
      } else if (data.v === selId) {
        // Outgoing from selected → downstream (amber)
        highlightedEdgeIdxs.set(idx, { color: 0xffb74d, width: 2.5 });
        visGfx.alpha = 1;
        if (labelText) { labelText.alpha = 1; labelText.style.fill = "#ffb74d"; }
        hitGfx.alpha = 1;
        hitGfx.eventMode = "static";
      } else if (inFocus && nodeGfxMap.has(data.v) && nodeGfxMap.has(data.w)) {
        // In focus mode, keep edges between two visible nodes fully visible
        visGfx.alpha = 1;
        if (labelText) { labelText.alpha = 1; labelText.style.fill = "#7a8a9c"; }
        hitGfx.alpha = 1;
        hitGfx.eventMode = "static";
      } else {
        visGfx.alpha = 0.04;
        if (labelText) labelText.alpha = 0.03;
        hitGfx.alpha = 0;
        hitGfx.eventMode = "none";
      }
    } else {
      visGfx.alpha = 1;
      if (labelText) { labelText.alpha = 1; labelText.style.fill = "#7a8a9c"; }
      hitGfx.alpha = 1;
      hitGfx.eventMode = "static";
    }
  }
}

function clearHighlight() {
  highlightedEdgeIdxs.clear();

  for (const [, entry] of nodeGfxMap) {
    entry.gfx.alpha = 1;
    redrawNodeStateStroke(entry.strokeGfx, entry.data);
  }

  for (const [, entry] of edgeGfxMap) {
    entry.visGfx.alpha = 1;
    if (entry.labelText) { entry.labelText.alpha = 1; entry.labelText.style.fill = "#7a8a9c"; }
    entry.hitGfx.alpha = 1;
    entry.hitGfx.eventMode = "static";
    redrawEdgeNormal(entry.visGfx, entry.data, entry.points);
  }
}

function restoreBaseState() {
  if (selectedNodeId) {
    const chain = getDirectionalChain(selectedNodeId);
    applyDirectionalHighlight(chain);
  } else {
    clearHighlight();
  }
}

// ── Redraw helpers ──

/** Restore the appropriate state-based stroke for a node (built/bought/available/default). */
function redrawNodeStateStroke(strokeGfx, data) {
  const bState = data.type === "building" ? getBuildingState(data.id) : null;
  const rState = data.type === "resource" ? getResourceState(data.id) : null;
  const cityActive = !!getActiveCityId();
  const isAvail = data.type === "resource" && cityActive && availableResources && availableResources.has(data.id);

  if (bState === "built" && !(whatIfUpgrades && whatIfUpgrades.has(data.id))) {
    strokeGfx.clear();
    strokeGfx.setStrokeStyle({ width: 2.5, color: 0x6cc060, alpha: 1 });
    strokeGfx.roundRect(-BUILDING_W / 2, -BUILDING_H / 2, BUILDING_W, BUILDING_H, 6);
    strokeGfx.stroke();
  } else if (rState === "bought") {
    strokeGfx.clear();
    strokeGfx.setStrokeStyle({ width: 2, color: 0xb88420, alpha: 1 });
    const circlePoints = [];
    for (let a = 0; a <= Math.PI * 2; a += Math.PI / 40) {
      circlePoints.push({ x: Math.cos(a) * RESOURCE_R, y: Math.sin(a) * RESOURCE_R });
    }
    drawDashedCurve(strokeGfx, circlePoints, [4, 2]);
    strokeGfx.stroke();
  } else if (isAvail) {
    strokeGfx.clear();
    strokeGfx.setStrokeStyle({ width: 2.5, color: 0x6cc060, alpha: 1 });
    strokeGfx.circle(0, 0, RESOURCE_R);
    strokeGfx.stroke();
  } else if (isWhatIfNode(data.id)) {
    redrawWhatIfStroke(strokeGfx, data);
  } else {
    redrawNodeStroke(strokeGfx, data, 0x000000, 1.5, 0.35);
  }
}

/** Check if a node is part of the what-if preview. */
function isWhatIfNode(id) {
  return (whatIfResources && whatIfResources.has(id)) ||
    (whatIfBuildings && whatIfBuildings.has(id)) ||
    (whatIfUpgrades && whatIfUpgrades.has(id));
}

/** Draw dashed cyan stroke for what-if preview nodes. */
function redrawWhatIfStroke(strokeGfx, data) {
  strokeGfx.clear();
  strokeGfx.setStrokeStyle({ width: 2, color: 0x4fc3f7, alpha: 0.85 });
  if (data.type === "resource") {
    const circlePoints = [];
    for (let a = 0; a <= Math.PI * 2; a += Math.PI / 40) {
      circlePoints.push({ x: Math.cos(a) * RESOURCE_R, y: Math.sin(a) * RESOURCE_R });
    }
    drawDashedCurve(strokeGfx, circlePoints, [6, 3]);
  } else {
    const hw = BUILDING_W / 2, hh = BUILDING_H / 2;
    const rectPoints = [];
    const r = 6;
    const steps = 8;
    for (let i = 0; i <= steps; i++) { const a = -Math.PI / 2 + (Math.PI / 2) * (i / steps); rectPoints.push({ x: hw - r + Math.cos(a) * r, y: -hh + r + Math.sin(a) * r }); }
    rectPoints.push({ x: hw, y: hh - r });
    for (let i = 0; i <= steps; i++) { const a = 0 + (Math.PI / 2) * (i / steps); rectPoints.push({ x: hw - r + Math.cos(a) * r, y: hh - r + Math.sin(a) * r }); }
    rectPoints.push({ x: -hw + r, y: hh });
    for (let i = 0; i <= steps; i++) { const a = Math.PI / 2 + (Math.PI / 2) * (i / steps); rectPoints.push({ x: -hw + r + Math.cos(a) * r, y: hh - r + Math.sin(a) * r }); }
    rectPoints.push({ x: -hw, y: -hh + r });
    for (let i = 0; i <= steps; i++) { const a = Math.PI + (Math.PI / 2) * (i / steps); rectPoints.push({ x: -hw + r + Math.cos(a) * r, y: -hh + r + Math.sin(a) * r }); }
    drawDashedCurve(strokeGfx, rectPoints, [6, 3]);
  }
  strokeGfx.stroke();
}

function redrawNodeStroke(strokeGfx, data, color, width, alpha = 1) {
  strokeGfx.clear();
  if (data.type === "resource") {
    strokeGfx.setStrokeStyle({ width, color, alpha });
    strokeGfx.circle(0, 0, RESOURCE_R);
    strokeGfx.stroke();
  } else {
    strokeGfx.setStrokeStyle({ width, color, alpha });
    strokeGfx.roundRect(-BUILDING_W / 2, -BUILDING_H / 2, BUILDING_W, BUILDING_H, 6);
    strokeGfx.stroke();
  }
}

function redrawNodeSelectionRing(strokeGfx, data) {
  strokeGfx.clear();
  const catColor = data.type === "resource"
    ? (RESOURCE_NODE_COLORS[data.category] || RESOURCE_NODE_COLORS.material).rim
    : buildingCategoryHex(data.category);

  if (data.type === "resource") {
    // Outer category glow ring
    strokeGfx.setStrokeStyle({ width: 3, color: catColor, alpha: 0.35 });
    strokeGfx.circle(0, 0, RESOURCE_R + 5);
    strokeGfx.stroke();
    // Outer category ring
    strokeGfx.setStrokeStyle({ width: 2, color: catColor, alpha: 0.75 });
    strokeGfx.circle(0, 0, RESOURCE_R + 3);
    strokeGfx.stroke();
    // Inner bright ring
    strokeGfx.setStrokeStyle({ width: 2, color: 0xf0f0f0, alpha: 0.85 });
    strokeGfx.circle(0, 0, RESOURCE_R);
    strokeGfx.stroke();
  } else {
    const hw = BUILDING_W / 2, hh = BUILDING_H / 2;
    // Outer category glow frame
    strokeGfx.setStrokeStyle({ width: 3, color: catColor, alpha: 0.30 });
    strokeGfx.roundRect(-hw - 5, -hh - 5, BUILDING_W + 10, BUILDING_H + 10, 10);
    strokeGfx.stroke();
    // Outer category frame
    strokeGfx.setStrokeStyle({ width: 2, color: catColor, alpha: 0.75 });
    strokeGfx.roundRect(-hw - 3, -hh - 3, BUILDING_W + 6, BUILDING_H + 6, 8);
    strokeGfx.stroke();
    // Inner bright frame
    strokeGfx.setStrokeStyle({ width: 2, color: 0xf0f0f0, alpha: 0.85 });
    strokeGfx.roundRect(-hw, -hh, BUILDING_W, BUILDING_H, 6);
    strokeGfx.stroke();
  }
}

function redrawEdgeNormal(visGfx, data, points, scale) {
  visGfx.clear();
  const color = EDGE_COLORS[data.direction] ?? 0x6890b8;
  const baseAlpha = EDGE_ALPHAS[data.direction] ?? 0.40;
  const isSynthetic = data.direction === "synthetic";
  const s = scale || currentZoomScale;

  const baseWidth = isSynthetic ? 1.0 : 1.8;
  const width = Math.max(baseWidth, Math.min(1.2 / s, baseWidth * 1.5));
  const alpha = s < 0.5 ? Math.min(baseAlpha + (0.5 - s) * 0.3, baseAlpha * 1.3) : baseAlpha;

  visGfx.setStrokeStyle({ width, color, alpha });
  drawSolidBezier(visGfx, points[0].x, points[0].y, points[points.length - 1].x, points[points.length - 1].y);
  visGfx.stroke();

  if (!isSynthetic && 7 * s >= 2) {
    drawArrowhead(visGfx, points, color, Math.min(alpha * 1.4, 0.65), 7);
  }
}

function redrawEdgeHighlighted(visGfx, points, color, width) {
  visGfx.clear();
  const s = currentZoomScale;

  const w = Math.max(width, Math.min(2.5 / s, width * 2));
  const glowW = w + 4;

  // Glow underlay
  visGfx.setStrokeStyle({ width: glowW, color, alpha: 0.10 });
  drawSolidBezier(visGfx, points[0].x, points[0].y, points[points.length - 1].x, points[points.length - 1].y);
  visGfx.stroke();

  // Animated flowing dashes
  const dashScale = s < 0.5 ? 0.5 / s : 1;
  visGfx.setStrokeStyle({ width: w, color, alpha: 0.9 });
  drawDashedCurve(visGfx, points, [12 * dashScale, 6 * dashScale], dashOffset);
  visGfx.stroke();

  drawArrowhead(visGfx, points, color, 0.95, 8);
}

// ══════════════════════════════════════════════════════════
// Lazy edge label creation
// ══════════════════════════════════════════════════════════

function materializeEdgeLabels() {
  if (edgeLabelsCreated) return;
  edgeLabelsCreated = true;
  for (const [, entry] of edgeGfxMap) {
    if (entry.labelText || !entry.labelStr) continue;

    const labelContainer = new Container();
    labelContainer.position.set(entry.labelMid.x, entry.labelMid.y - 7);

    const t = new Text({
      text: entry.labelStr,
      style: {
        fontFamily: '"Fira Code", "Consolas", monospace',
        fontSize: 10,
        fill: "#7a8a9c",
        align: "center",
      },
    });
    t.anchor.set(0.5, 1);

    // Background pill with subtle border
    const bounds = t.getBounds();
    const padH = 5, padV = 3;
    const pill = new Graphics();
    pill.roundRect(
      bounds.x - padH,
      bounds.y - padV,
      bounds.width + padH * 2,
      bounds.height + padV * 2,
      3,
    );
    pill.fill({ color: 0x0c1018, alpha: 0.80 });
    pill.setStrokeStyle({ width: 0.5, color: 0x2a3a4c, alpha: 0.4 });
    pill.roundRect(
      bounds.x - padH,
      bounds.y - padV,
      bounds.width + padH * 2,
      bounds.height + padV * 2,
      3,
    );
    pill.stroke();

    labelContainer.addChild(pill);
    labelContainer.addChild(t);
    edgeLabelLayer.addChild(labelContainer);
    entry.labelText = t;
  }
}

// ══════════════════════════════════════════════════════════
// Zoom to fit
// ══════════════════════════════════════════════════════════

function zoomToFit() {
  if (!currentLayoutPositions || currentLayoutPositions.size === 0 || !zoomCtrl) return;
  const bbox = computeBBox(currentLayoutPositions);
  if (!bbox) return;
  zoomCtrl.zoomToFit(bbox, 60, true);
}

function computeBBox(positions) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const pos of positions.values()) {
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x);
    maxY = Math.max(maxY, pos.y);
  }
  if (!isFinite(minX)) return null;
  return {
    x: minX - BUILDING_W,
    y: minY - BUILDING_H,
    width: (maxX - minX) + BUILDING_W * 2,
    height: (maxY - minY) + BUILDING_H * 2,
  };
}

// ══════════════════════════════════════════════════════════
// Focus mode
// ══════════════════════════════════════════════════════════

function enterFocusMode(targetId, upstreamDepth = 1, downstreamDepth = 1) {
  setFocusMode({ targetId, upstreamDepth, downstreamDepth });
  renderFocusBar(targetId, upstreamDepth, downstreamDepth);
  isFirstRender = true;
  fireFilterChange();
}

function exitFocusMode() {
  clearFocusMode();
  removeFocusBar();
  fireFilterChange();
}

function appendDepthStepper(parent, value, onChange) {
  const minus = document.createElement("button");
  minus.className = "focus-depth-btn";
  minus.textContent = "\u2212";
  minus.title = "Decrease depth";
  minus.addEventListener("click", () => {
    const cur = parseDepthValue(input.value);
    if (cur <= 0) return;
    const next = cur === Infinity ? 10 : cur - 1;
    input.value = formatDepth(next);
    onChange(next);
  });
  parent.appendChild(minus);

  const input = document.createElement("input");
  input.type = "text";
  input.className = "focus-depth-input";
  input.value = formatDepth(value);
  input.addEventListener("change", () => {
    const newDepth = parseDepthValue(input.value);
    if (isNaN(newDepth) || newDepth < 0) { input.value = "1"; onChange(1); return; }
    input.value = formatDepth(newDepth);
    onChange(newDepth);
  });
  parent.appendChild(input);

  const plus = document.createElement("button");
  plus.className = "focus-depth-btn";
  plus.textContent = "+";
  plus.title = "Increase depth";
  plus.addEventListener("click", () => {
    const cur = parseDepthValue(input.value);
    if (cur === Infinity) return;
    const next = cur + 1;
    input.value = formatDepth(next);
    onChange(next);
  });
  parent.appendChild(plus);
}

function parseDepthValue(val) {
  const v = val.trim();
  return (v === "\u221E" || v === "" || v === "inf") ? Infinity : parseInt(v, 10);
}

function formatDepth(n) {
  return n === Infinity ? "\u221E" : String(n);
}

function renderFocusBar(targetId, upstreamDepth, downstreamDepth) {
  removeFocusBar();
  const targetNode = fullNodes.get(targetId);
  if (!targetNode) return;

  focusBarEl = document.createElement("div");
  focusBarEl.className = "focus-bar";

  const label = document.createElement("span");
  label.className = "focus-bar-label";
  label.textContent = "FOCUS";
  focusBarEl.appendChild(label);

  const target = document.createElement("span");
  target.className = "focus-bar-target";
  if (targetNode.icon) {
    const img = document.createElement("img");
    img.src = `data/icons/${targetNode.icon}`;
    img.alt = targetNode.name;
    target.appendChild(img);
  }
  const nameSpan = document.createElement("span");
  nameSpan.textContent = targetNode.name;
  target.appendChild(nameSpan);
  focusBarEl.appendChild(target);

  const upCtrl = document.createElement("span");
  upCtrl.className = "focus-depth-ctrl";
  const upLabel = document.createElement("label");
  upLabel.textContent = "Up:";
  upCtrl.appendChild(upLabel);
  appendDepthStepper(upCtrl, upstreamDepth, (newDepth) => {
    enterFocusMode(targetId, newDepth, getFocusMode()?.downstreamDepth ?? 1);
  });
  focusBarEl.appendChild(upCtrl);

  const downCtrl = document.createElement("span");
  downCtrl.className = "focus-depth-ctrl";
  const downLabel = document.createElement("label");
  downLabel.textContent = "Down:";
  downCtrl.appendChild(downLabel);
  appendDepthStepper(downCtrl, downstreamDepth, (newDepth) => {
    enterFocusMode(targetId, getFocusMode()?.upstreamDepth ?? 1, newDepth);
  });
  focusBarEl.appendChild(downCtrl);

  const exitBtn = document.createElement("button");
  exitBtn.className = "focus-bar-exit";
  exitBtn.textContent = "Exit (Esc)";
  exitBtn.addEventListener("click", exitFocusMode);
  focusBarEl.appendChild(exitBtn);

  document.body.appendChild(focusBarEl);
}

function removeFocusBar() {
  if (focusBarEl) { focusBarEl.remove(); focusBarEl = null; }
}

function updateFocusBarWhatIf() {
  if (!focusBarEl) return;
  // Remove existing what-if indicator if any
  const existing = focusBarEl.querySelector(".focus-bar-whatif");
  if (existing) existing.remove();
  // Add indicator if what-if sets are non-empty
  if (whatIfResources || whatIfBuildings || whatIfUpgrades) {
    const resCount = whatIfResources ? whatIfResources.size : 0;
    const bldCount = whatIfBuildings ? whatIfBuildings.size : 0;
    const upgCount = whatIfUpgrades ? whatIfUpgrades.size : 0;
    if (resCount > 0 || bldCount > 0 || upgCount > 0) {
      const parts = [];
      if (bldCount > 0) parts.push(`${bldCount} building${bldCount > 1 ? "s" : ""}`);
      if (upgCount > 0) parts.push(`${upgCount} upgrade${upgCount > 1 ? "s" : ""}`);
      if (resCount > 0) parts.push(`${resCount} resource${resCount > 1 ? "s" : ""}`);
      const span = document.createElement("span");
      span.className = "focus-bar-whatif";
      span.textContent = `Would unlock: ${parts.join(", ")}`;
      focusBarEl.appendChild(span);
    }
  }
}

// ══════════════════════════════════════════════════════════
// Utility functions
// ══════════════════════════════════════════════════════════

function injectCategoryColors() {
  const rules = [];
  for (const [cat, color] of Object.entries(RESOURCE_COLORS)) {
    rules.push(`:root { --res-${cat}: ${color}; }`);
  }
  for (const [cat, color] of Object.entries(BUILDING_COLORS)) {
    rules.push(`:root { --bld-${cat}: ${color}; }`);
  }
  const style = document.createElement("style");
  style.textContent = rules.join("\n");
  document.head.appendChild(style);
}

function createTooltip() {
  tooltipEl = document.createElement("div");
  tooltipEl.className = "graph-tooltip";
  tooltipEl.innerHTML = `
    <div class="graph-tooltip-name"></div>
    <div class="graph-tooltip-cat"></div>
    <div class="graph-tooltip-desc"></div>
    <div class="graph-tooltip-filter-reason"></div>
    <div class="graph-tooltip-click-hint"></div>
  `;
  document.body.appendChild(tooltipEl);
}

function positionTooltip(el, clientX, clientY) {
  const margin = 8;
  const offset = 14;
  el.style.maxWidth = Math.min(300, window.innerWidth - margin * 2) + "px";
  let x = clientX + offset;
  let y = clientY - 10;
  el.style.left = x + "px";
  el.style.top = y + "px";
  requestAnimationFrame(() => {
    const rect = el.getBoundingClientRect();
    if (rect.right > window.innerWidth - margin) x = clientX - rect.width - offset;
    if (x < margin) x = margin;
    if (rect.bottom > window.innerHeight - margin) y = clientY - rect.height - offset;
    if (y < margin) y = margin;
    el.style.left = x + "px";
    el.style.top = y + "px";
  });
}

function showTooltip(event, d, filterReason) {
  if (!tooltipEl) return;
  const nameEl = tooltipEl.querySelector(".graph-tooltip-name");
  const catEl = tooltipEl.querySelector(".graph-tooltip-cat");
  const descEl = tooltipEl.querySelector(".graph-tooltip-desc");
  const reasonEl = tooltipEl.querySelector(".graph-tooltip-filter-reason");

  if (d.icon) {
    nameEl.innerHTML = `<img src="data/icons/${d.icon}" alt="${d.name}"> ${escapeHtml(d.name)}`;
  } else {
    nameEl.textContent = d.name;
  }
  catEl.textContent = `${d.type} / ${d.band || d.category}`;

  if (d.desc) {
    descEl.textContent = d.desc.length > 100 ? d.desc.slice(0, 100) + "..." : d.desc;
    descEl.style.display = "";
  } else {
    descEl.style.display = "none";
  }

  if (filterReason) {
    reasonEl.textContent = filterReason;
    reasonEl.style.display = "";
  } else {
    reasonEl.style.display = "none";
  }

  const clickHintEl = tooltipEl.querySelector(".graph-tooltip-click-hint");
  if (clickHintEl) {
    clickHintEl.style.display = localStorage.getItem("syx-vis-onboarded") ? "none" : "";
  }

  tooltipEl.classList.add("visible");
  positionTooltip(tooltipEl, event.clientX, event.clientY);
}

function hideTooltip() {
  if (tooltipEl) tooltipEl.classList.remove("visible");
}

function createEdgeTooltip() {
  edgeTooltipEl = document.createElement("div");
  edgeTooltipEl.className = "edge-tooltip";
  document.body.appendChild(edgeTooltipEl);
}

function showEdgeTooltip(event, d) {
  if (!edgeTooltipEl) return;
  hideTooltip();
  const fromNode = fullNodes.get(d.v);
  const toNode = fullNodes.get(d.w);
  const fromName = fromNode ? fromNode.name : d.v;
  const toName = toNode ? toNode.name : d.w;
  const fromIcon = fromNode && fromNode.icon
    ? `<img src="data/icons/${fromNode.icon}" alt="${escapeHtml(fromName)}">`
    : "";
  const toIcon = toNode && toNode.icon
    ? `<img src="data/icons/${toNode.icon}" alt="${escapeHtml(toName)}">`
    : "";

  const isOneTime = d.direction === "construction" || d.direction === "upgrade" || d.direction === "area";
  const amountLine = d.amount
    ? `<div class="edge-tooltip-recipe">${isOneTime ? formatQuantity(d.amount) : formatRate(d.amount)}</div>`
    : "";
  edgeTooltipEl.innerHTML = `
    <div class="edge-tooltip-route">${fromIcon} ${escapeHtml(fromName)} → ${toIcon} ${escapeHtml(toName)}</div>
    ${amountLine}
  `;
  edgeTooltipEl.classList.add("visible");
  positionTooltip(edgeTooltipEl, event.clientX, event.clientY);
}

function hideEdgeTooltip() {
  if (edgeTooltipEl) edgeTooltipEl.classList.remove("visible");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatRate(amount) { return `${amount}/day`; }
function formatQuantity(amount) { return `×${amount}`; }

// ══════════════════════════════════════════════════════════
// Breadcrumbs
// ══════════════════════════════════════════════════════════

function pushBreadcrumb(nodeData) {
  breadcrumbHistory = breadcrumbHistory.filter(b => b.id !== nodeData.id);
  breadcrumbHistory.push({
    id: nodeData.id,
    name: nodeData.name,
    icon: nodeData.icon,
    type: nodeData.type,
    category: nodeData.category,
  });
  if (breadcrumbHistory.length > MAX_BREADCRUMBS) {
    breadcrumbHistory = breadcrumbHistory.slice(-MAX_BREADCRUMBS);
  }
  renderBreadcrumbs();
}

function renderBreadcrumbs() {
  const bar = document.getElementById("breadcrumb-bar");
  if (!bar) return;
  bar.innerHTML = "";
  if (breadcrumbHistory.length <= 1) { bar.style.display = "none"; return; }
  bar.style.display = "";

  breadcrumbHistory.forEach((crumb, idx) => {
    if (idx > 0) {
      const sep = document.createElement("span");
      sep.className = "breadcrumb-sep";
      sep.textContent = "\u203A";
      bar.appendChild(sep);
    }
    const item = document.createElement("span");
    item.className = "breadcrumb-item";
    if (crumb.id === selectedNodeId) item.classList.add("active");
    if (currentFilteredOutNodes.has(crumb.id)) item.classList.add("breadcrumb-hidden");

    if (crumb.icon) {
      const img = document.createElement("img");
      img.src = `data/icons/${crumb.icon}`;
      img.className = "breadcrumb-icon";
      img.alt = crumb.name;
      item.appendChild(img);
    }
    const label = document.createElement("span");
    label.textContent = crumb.name;
    item.appendChild(label);

    item.addEventListener("click", () => {
      if (currentFilteredOutNodes.has(crumb.id)) {
        const targetNode = fullNodes.get(crumb.id);
        if (targetNode) openDetailForNode(targetNode);
      } else {
        navigateToNode(crumb.id);
      }
    });
    bar.appendChild(item);
  });
}

function pruneBreadcrumbs() {
  if (fullNodes) breadcrumbHistory = breadcrumbHistory.filter(b => fullNodes.has(b.id));
  renderBreadcrumbs();
}

// ══════════════════════════════════════════════════════════
// PixiJS colour helpers
// ══════════════════════════════════════════════════════════

function hexToPixi(hex) {
  // "#5a9eff" → 0x5a9eff
  return parseInt(hex.replace("#", ""), 16);
}

function miniColorToRgb(mc) {
  const [r, g, b] = mc.split("_").map(Number);
  return { r, g, b };
}

function darkenMiniColor(mc) {
  const { r, g, b } = miniColorToRgb(mc);
  // Slightly brighter than pure darkening — blended with deep blue
  const f = 0.28;
  const dr = (r * f + 12) | 0;
  const dg = (g * f + 16) | 0;
  const db = (b * f + 24) | 0;
  return (Math.min(dr, 255) << 16) | (Math.min(dg, 255) << 8) | Math.min(db, 255);
}

function lightenMiniColor(mc) {
  const { r, g, b } = miniColorToRgb(mc);
  const lr = Math.min(255, r + (255 - r) * 0.45) | 0;
  const lg = Math.min(255, g + (255 - g) * 0.45) | 0;
  const lb = Math.min(255, b + (255 - b) * 0.45) | 0;
  return (lr << 16) | (lg << 8) | lb;
}

function buildingCategoryHex(category) {
  const c = BUILDING_COLORS[category];
  return c ? hexToPixi(c) : 0x888888;
}

// ══════════════════════════════════════════════════════════
// Icon texture loading
// ══════════════════════════════════════════════════════════

async function preloadIcons(nodes) {
  const paths = new Set();
  for (const n of nodes.values()) {
    if (n.icon) paths.add(`data/icons/${n.icon}`);
  }
  if (paths.size === 0) return;

  // Register all icons as a bundle for parallel loading
  const assets = [];
  for (const p of paths) {
    if (!iconTextures.has(p)) {
      assets.push({ alias: p, src: p });
    }
  }
  if (assets.length === 0) return;

  Assets.addBundle("icons", assets);
  const textures = await Assets.loadBundle("icons");

  // Store loaded textures in our map
  for (const alias of Object.keys(textures)) {
    iconTextures.set(alias, textures[alias]);
  }
}

function getIconTexture(iconPath) {
  return iconTextures.get(`data/icons/${iconPath}`) || null;
}

// ══════════════════════════════════════════════════════════
// Renderer init
// ══════════════════════════════════════════════════════════

async function initRenderer() {
  injectCategoryColors();
  createTooltip();
  createEdgeTooltip();

  detailResTooltip = document.createElement("div");
  detailResTooltip.id = "detail-res-tooltip";
  document.body.appendChild(detailResTooltip);

  // Dismiss tooltip on click-outside (for touch tap-toggle)
  document.addEventListener("click", () => {
    if (detailResTooltip) {
      detailResTooltip.classList.remove("visible");
      detailResTooltip._activeNode = null;
    }
  });

  const container = document.getElementById("graph-container");

  // Create PixiJS Application
  app = new Application();
  await app.init({
    resizeTo: container,
    background: 0x0f1419,
    backgroundAlpha: 0, // transparent so CSS background shows through
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });

  container.appendChild(app.canvas);

  // Style the canvas to fill the container
  app.canvas.style.width = "100%";
  app.canvas.style.height = "100%";
  app.canvas.style.display = "block";
  app.canvas.style.position = "relative";
  app.canvas.style.zIndex = "1";

  // Re-trigger PixiJS resize when graph tab becomes visible again
  // (resizeTo reports 0×0 while the container is display:none)
  new ResizeObserver(() => {
    if (container.offsetWidth > 0 && container.offsetHeight > 0) {
      app.resize();
    }
  }).observe(container);

  // World container (zoom/pan applied here)
  worldContainer = new Container();
  app.stage.addChild(worldContainer);

  // Create layers
  ghostEdgeLayer = new Container();
  ghostNodeLayer = new Container();
  edgeLayer = new Container();
  edgeLabelLayer = new Container();
  edgeHitLayer = new Container();
  nodeLayer = new Container();
  nodeIconLayer = new Container();
  nodeLabelLayer = new Container();
  pingLayer = new Container();

  worldContainer.addChild(ghostEdgeLayer);
  worldContainer.addChild(ghostNodeLayer);
  worldContainer.addChild(edgeLayer);
  worldContainer.addChild(edgeLabelLayer);
  worldContainer.addChild(edgeHitLayer);
  worldContainer.addChild(nodeLayer);
  worldContainer.addChild(nodeIconLayer);
  worldContainer.addChild(nodeLabelLayer);
  worldContainer.addChild(pingLayer);

  // Zoom controller
  zoomCtrl = createZoomController(worldContainer, app.canvas, {
    minScale: 0.1,
    maxScale: 4,
    onZoom: (scale) => {
      const show = scale >= 0.5;
      edgeLabelLayer.visible = show;
      if (show && !edgeLabelsCreated) materializeEdgeLabels();

      // Redraw non-highlighted edges with zoom-adaptive stroke width
      const prevScale = currentZoomScale;
      currentZoomScale = scale;
      // Only redraw if scale changed meaningfully (avoid wasted GPU work)
      if (Math.abs(scale - prevScale) / (prevScale || 1) > 0.05) {
        for (const [idx, entry] of edgeGfxMap) {
          if (!highlightedEdgeIdxs.has(idx)) {
            redrawEdgeNormal(entry.visGfx, entry.data, entry.points, scale);
          }
        }
      }
    },
  });

  // ── Zoom controls overlay ──
  const zoomControls = document.createElement("div");
  zoomControls.className = "zoom-controls";

  const zoomIn = document.createElement("button");
  zoomIn.textContent = "+";
  zoomIn.title = "Zoom in";
  zoomIn.addEventListener("click", () => zoomCtrl.zoomBy(1.5));

  const zoomOut = document.createElement("button");
  zoomOut.textContent = "\u2212";
  zoomOut.title = "Zoom out";
  zoomOut.addEventListener("click", () => zoomCtrl.zoomBy(0.67));

  const zoomFitBtn = document.createElement("button");
  zoomFitBtn.textContent = "\u2B1C";
  zoomFitBtn.title = "Fit to view";
  zoomFitBtn.addEventListener("click", () => zoomToFit());

  zoomControls.appendChild(zoomIn);
  zoomControls.appendChild(zoomOut);
  zoomControls.appendChild(zoomFitBtn);
  document.getElementById("view-graph").appendChild(zoomControls);

  // ── Background click: close detail panel + clear selection ──
  app.canvas.addEventListener("pointerup", (_e) => {
    // Only fire on background (not after drag)
    if (zoomCtrl.wasDragged) return;
    // Check if any interactive node/edge was hit — if not, it's background
    // We use a small timeout to let node/edge clicks fire first
    setTimeout(() => {
      if (!bgClickConsumed) {
        const panel = document.getElementById("detail-panel");
        panel.classList.remove("open");
        selectedNodeId = null;
        breadcrumbHistory = [];
        renderBreadcrumbs();
        restoreBaseState();
        refreshStatsBar();
      }
      bgClickConsumed = false;
    }, 0);
  });

  // ── Keyboard shortcuts ──
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "f") {
      e.preventDefault();
      const filterPanel = document.getElementById("filter-panel");
      if (filterPanel.classList.contains("collapsed")) {
        filterPanel.classList.remove("collapsed");
        const btn = filterPanel.querySelector(".filter-collapse-btn");
        if (btn) btn.textContent = "\u00AB";
      }
      focusSearch();
    }
  });

  const edgeModeKeys = { "1": "production", "2": "construction", "3": "upgrade", "4": "all" };
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const mode = edgeModeKeys[e.key];
    if (mode && mode !== getEdgeMode()) {
      setEdgeMode(mode);
      const filterPanel = document.getElementById("filter-panel");
      if (filterPanel._edgeModeBtns) {
        for (const btn of filterPanel._edgeModeBtns) {
          btn.classList.toggle("active", btn.dataset.mode === mode);
        }
      }
      fireFilterChange();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (getFocusMode()) {
      e.preventDefault();
      exitFocusMode();
    } else if (selectedNodeId) {
      e.preventDefault();
      document.getElementById("detail-panel").classList.remove("open");
      selectedNodeId = null;
      breadcrumbHistory = [];
      renderBreadcrumbs();
      restoreBaseState();
      refreshStatsBar();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "f" || e.key === "F") {
      if (selectedNodeId && fullNodes.has(selectedNodeId)) {
        e.preventDefault();
        enterFocusMode(selectedNodeId);
      }
    }
  });

  // ── Animated dash ticker ──
  app.ticker.add((ticker) => {
    if (highlightedEdgeIdxs.size === 0) return;
    dashOffset -= 30 * (ticker.deltaMS / 1000); // 30 px/sec, frame-rate independent
    for (const [idx, hlStyle] of highlightedEdgeIdxs) {
      const entry = edgeGfxMap.get(idx);
      if (!entry) continue;
      const { visGfx, points } = entry;
      redrawEdgeHighlighted(visGfx, points, hlStyle.color, hlStyle.width);
    }
  });
}

// Flag to prevent background click when a node/edge was clicked
let bgClickConsumed = false;

// ══════════════════════════════════════════════════════════
// Stats bar
// ══════════════════════════════════════════════════════════

function updateStatsBar(nodeCount, edgeCount) {
  lastNodeCount = nodeCount;
  lastEdgeCount = edgeCount;
  refreshStatsBar();
}

function refreshStatsBar() {
  const bar = document.getElementById("stats-bar");
  const hint = selectedNodeId ? "" : ' &middot; <span style="color:var(--text-muted);font-weight:400">click a node to explore</span>';
  bar.innerHTML = `<span>${lastNodeCount}</span> nodes &middot; <span>${lastEdgeCount}</span> edges${hint}`;
}

// ══════════════════════════════════════════════════════════
// Collapse layout (focus mode)
// ══════════════════════════════════════════════════════════

function collapseLayout(positions) {
  const occupiedCols = new Set();
  const bandNodes = new Map();

  for (const [id, pos] of positions) {
    occupiedCols.add(pos.column);
    if (!bandNodes.has(pos.band)) bandNodes.set(pos.band, []);
    bandNodes.get(pos.band).push(id);
  }

  const sortedCols = [...occupiedCols].sort((a, b) => a - b);
  const colRemap = new Map();
  sortedCols.forEach((col, i) => colRemap.set(col, i));

  const bandRowCounts = new Map();
  const nodeNewRow = new Map();
  for (const [band, nodeIds] of bandNodes) {
    nodeIds.sort((a, b) => positions.get(a).y - positions.get(b).y);
    bandRowCounts.set(band, nodeIds.length);
    nodeIds.forEach((id, i) => nodeNewRow.set(id, i));
  }

  const occupiedBands = [...bandNodes.keys()].sort((a, b) => a - b);
  const bandOffsets = new Map();
  let cumulativeY = 0;
  for (const band of occupiedBands) {
    bandOffsets.set(band, cumulativeY);
    const count = bandRowCounts.get(band) || 0;
    cumulativeY += count * ROW_SPACING + BAND_GAP;
  }

  const collapsed = new Map();
  for (const [id, pos] of positions) {
    const newCol = colRemap.get(pos.column) ?? 0;
    const bandY = bandOffsets.get(pos.band) ?? 0;
    const row = nodeNewRow.get(id) ?? 0;
    collapsed.set(id, {
      x: newCol * COL_SPACING + 82,
      y: bandY + row * ROW_SPACING + 34,
      column: newCol,
      band: pos.band,
    });
  }

  return collapsed;
}

// ══════════════════════════════════════════════════════════
// Main graph update (called on every filter change)
// ══════════════════════════════════════════════════════════

function updateGraph(nodes, edges, layoutEdges, filteredOutNodes, filteredOutEdges) {
  const isFocused = !!getFocusMode();
  if (!isFocused && focusBarEl) removeFocusBar();
  if (isFocused !== wasFocusMode) {
    isFirstRender = true;
    wasFocusMode = isFocused;
  }

  currentFilteredOutNodes = filteredOutNodes || new Map();

  const prevSelectedId = selectedNodeId;
  selectedNodeId = (prevSelectedId && nodes.has(prevSelectedId)) ? prevSelectedId : null;

  updateStatsBar(nodes.size, edges.length);

  // Clear all layers
  edgeLabelsCreated = false;
  ghostEdgeLayer.removeChildren();
  ghostNodeLayer.removeChildren();
  edgeLayer.removeChildren();
  edgeLabelLayer.removeChildren();
  edgeHitLayer.removeChildren();
  nodeLayer.removeChildren();
  nodeIconLayer.removeChildren();
  nodeLabelLayer.removeChildren();
  pingLayer.removeChildren();
  nodeGfxMap.clear();
  edgeGfxMap.clear();
  highlightedEdgeIdxs.clear();

  // Semantic layout
  let layoutPositions = computeLayout(nodes, edges, layoutEdges);
  if (getFocusMode() && layoutPositions.size > 0) {
    layoutPositions = collapseLayout(layoutPositions);
  }
  currentLayoutPositions = layoutPositions;

  // ── Ghost (filtered-out) nodes/edges ──
  if (isShowFiltered() && !getFocusMode() && filteredOutNodes && filteredOutNodes.size > 0 && fullLayoutPositions) {
    renderGhostEdges(filteredOutEdges, layoutPositions);
    renderGhostNodes(filteredOutNodes);
  }

  // ── Build edge data ──
  const visibleEdgeData = edges.map((e, i) => {
    const fromPos = layoutPositions.get(e.from);
    const toPos = layoutPositions.get(e.to);
    return {
      v: e.from, w: e.to, name: `ve${i}`, label: e.recipe,
      amount: e.amount, direction: e.direction, recipeId: e.recipeId,
      fromPos, toPos,
    };
  });

  // Build adjacency maps for BFS
  const mode = getEdgeMode();
  const bfsDirs = mode === "all" ? null : getVisibleDirections();
  outgoingEdges = new Map();
  incomingEdges = new Map();
  for (const e of visibleEdgeData) {
    if (bfsDirs && !bfsDirs.has(e.direction)) continue;
    if (!outgoingEdges.has(e.v)) outgoingEdges.set(e.v, []);
    outgoingEdges.get(e.v).push(e);
    if (!incomingEdges.has(e.w)) incomingEdges.set(e.w, []);
    incomingEdges.get(e.w).push(e);
  }

  // ── Render edges ──
  for (let i = 0; i < visibleEdgeData.length; i++) {
    const d = visibleEdgeData[i];
    if (!d.fromPos || !d.toPos) continue;

    const points = sampleBezier(d.fromPos.x, d.fromPos.y, d.toPos.x, d.toPos.y, 80);

    // Visible edge
    const visGfx = new Graphics();
    redrawEdgeNormal(visGfx, d, points);
    edgeLayer.addChild(visGfx);

    // Edge label (lazy — created on demand when zoomed in past threshold)
    let labelText = null;
    const mid = bezierMidpoint(d.fromPos.x, d.fromPos.y, d.toPos.x, d.toPos.y);
    let labelStr = d.amount ? `${d.label} (${d.amount})` : d.label;
    if (d.recipeId && d.direction === "output") {
      const w = getRecipeWeight(d.recipeId);
      if (w !== 1) labelStr += ` [${Math.round(w * 100) / 100}w]`;
    }

    // Invisible hit area (wide stroke for interaction)
    const hitGfx = new Graphics();
    hitGfx.setStrokeStyle({ width: 14, color: 0xffffff, alpha: 0.001 });
    drawSolidBezier(hitGfx, d.fromPos.x, d.fromPos.y, d.toPos.x, d.toPos.y);
    hitGfx.stroke();
    hitGfx.eventMode = "static";
    hitGfx.cursor = "pointer";

    hitGfx.on("pointerenter", (evt) => {
      hideTooltip();
      showEdgeTooltip(evt, d);
      if (!highlightedEdgeIdxs.has(i)) {
        visGfx.clear();
        visGfx.setStrokeStyle({ width: 6, color: 0xe8a830, alpha: 0.12 });
        drawSolidBezier(visGfx, d.fromPos.x, d.fromPos.y, d.toPos.x, d.toPos.y);
        visGfx.stroke();
        visGfx.setStrokeStyle({ width: 2.5, color: 0xe8a830, alpha: 0.9 });
        drawSolidBezier(visGfx, d.fromPos.x, d.fromPos.y, d.toPos.x, d.toPos.y);
        visGfx.stroke();
        drawArrowhead(visGfx, points, 0xe8a830, 0.95, 8);
        visGfx.alpha = 1;
        if (labelText) { labelText.alpha = 1; labelText.style.fill = "#ffc042"; }
      }
    });
    hitGfx.on("pointermove", (evt) => {
      showEdgeTooltip(evt, d);
    });
    hitGfx.on("pointerleave", () => {
      hideEdgeTooltip();
      // Restore just this edge to its normal style
      if (!highlightedEdgeIdxs.has(i)) {
        redrawEdgeNormal(visGfx, d, points);
        const entry = edgeGfxMap.get(i);
        if (entry && entry.labelText) {
          entry.labelText.style.fill = "#7a8a9c";
        }
      }
    });
    hitGfx.on("pointertap", (_evt) => {
      if (zoomCtrl.wasDragged) return;
      bgClickConsumed = true;
      hideEdgeTooltip();
      if (!d.fromPos || !d.toPos) return;
      const center = zoomCtrl.getViewportCenter();
      const distFrom = (d.fromPos.x - center.x) ** 2 + (d.fromPos.y - center.y) ** 2;
      const distTo = (d.toPos.x - center.x) ** 2 + (d.toPos.y - center.y) ** 2;
      const targetId = distTo >= distFrom ? d.w : d.v;
      navigateToNode(targetId);
    });
    edgeHitLayer.addChild(hitGfx);

    edgeGfxMap.set(i, { visGfx, hitGfx, labelText, labelStr, labelMid: mid, data: d, points });
  }

  // ── Render nodes ──
  const nodesArr = Array.from(nodes.values()).map(n => {
    const pos = layoutPositions.get(n.id);
    return { ...n, x: pos ? pos.x : 0, y: pos ? pos.y : 0 };
  });

  for (const d of nodesArr) {
    const nodeContainer = new Container();
    nodeContainer.position.set(d.x, d.y);
    nodeContainer.eventMode = "static";
    nodeContainer.cursor = "pointer";

    // Shape + layered visuals
    const shapeGfx = new Graphics();
    const BW = BUILDING_W;
    const BH = BUILDING_H;

    if (d.type === "resource") {
      // ── Resource node: "Wax Seal" concentric disc ──
      const colors = RESOURCE_NODE_COLORS[d.category] || RESOURCE_NODE_COLORS.material;
      const R = RESOURCE_R;

      // Layer 1: Soft ambient halo (category-tinted glow on the dark canvas)
      shapeGfx.circle(0, 0, R + 6);
      shapeGfx.fill({ color: colors.glow, alpha: 0.10 });

      // Layer 2: Drop shadow (offset down-right)
      shapeGfx.circle(1.5, 2.5, R + 1);
      shapeGfx.fill({ color: 0x050810, alpha: 0.55 });

      // Layer 3: Main disc body
      shapeGfx.circle(0, 0, R);
      shapeGfx.fill({ color: colors.fill });

      // Layer 4: Concentric detail ring (engraved groove effect)
      shapeGfx.setStrokeStyle({ width: 1.5, color: colors.mid, alpha: 0.5 });
      shapeGfx.circle(0, 0, R - 5);
      shapeGfx.stroke();

      // Layer 5: Inner highlight crescent (top-left light source)
      shapeGfx.setStrokeStyle({ width: 1, color: colors.light, alpha: 0.20 });
      // Draw a short arc on the top-left quadrant for directional light
      const arcR = R - 2;
      const arcStart = -Math.PI * 0.85;
      const arcEnd = -Math.PI * 0.25;
      shapeGfx.arc(0, 0, arcR, arcStart, arcEnd);
      shapeGfx.stroke();

      // Layer 6: Outer rim — crisp category border
      shapeGfx.setStrokeStyle({ width: 2.5, color: colors.rim, alpha: 0.55 });
      shapeGfx.circle(0, 0, R);
      shapeGfx.stroke();

    } else {
      // ── Building node: "Instrument Panel" beveled card ──
      const fillColor = d.miniColor ? darkenMiniColor(d.miniColor) : 0x141c28;
      const lightColor = d.miniColor ? lightenMiniColor(d.miniColor) : 0x8898a8;
      const catColor = buildingCategoryHex(d.category);
      const hw = BW / 2;
      const hh = BH / 2;

      // Layer 1: Drop shadow
      shapeGfx.roundRect(-hw + 2, -hh + 3, BW, BH, 7);
      shapeGfx.fill({ color: 0x040810, alpha: 0.50 });

      // Layer 2: Main body — slightly recessed look
      shapeGfx.roundRect(-hw, -hh, BW, BH, 6);
      shapeGfx.fill({ color: fillColor });

      // Layer 3: Top bevel highlight (thin bright line along top edge)
      shapeGfx.setStrokeStyle({ width: 1, color: lightColor, alpha: 0.30 });
      shapeGfx.moveTo(-hw + 8, -hh + 0.5);
      shapeGfx.lineTo(hw - 8, -hh + 0.5);
      shapeGfx.stroke();

      // Layer 4: Bottom shadow line (recessed look)
      shapeGfx.setStrokeStyle({ width: 1, color: 0x080c14, alpha: 0.40 });
      shapeGfx.moveTo(-hw + 8, hh - 0.5);
      shapeGfx.lineTo(hw - 8, hh - 0.5);
      shapeGfx.stroke();

      // Layer 5: Category accent bar (left edge, full-bleed rounded)
      shapeGfx.roundRect(-hw, -hh + 3, 3, BH - 6, 1.5);
      shapeGfx.fill({ color: catColor, alpha: 0.75 });

      // Layer 6: Frame border — subtle but structured
      shapeGfx.setStrokeStyle({ width: 1.5, color: 0x2a3a4c, alpha: 0.65 });
      shapeGfx.roundRect(-hw, -hh, BW, BH, 6);
      shapeGfx.stroke();
    }
    nodeLayer.addChild(nodeContainer);
    nodeContainer.addChild(shapeGfx);

    // Stroke overlay (separate Graphics for highlight updates)
    const strokeGfx = new Graphics();
    const rState = d.type === "resource" ? getResourceState(d.id) : null;
    const bState = d.type === "building" ? getBuildingState(d.id) : null;
    // Compute available resources for green ring on derived availability
    const cityActive = !!getActiveCityId();
    const isResourceAvailable = d.type === "resource" && cityActive && availableResources && availableResources.has(d.id);
    const isFrontier = d.type === "resource" && cityActive && frontierResources && frontierResources.has(d.id) && !isResourceAvailable;
    const isWhatIf = isWhatIfNode(d.id);

    if (bState === "built" && !(whatIfUpgrades && whatIfUpgrades.has(d.id))) {
      // Green stroke for built buildings (unless upgrade what-if takes priority)
      strokeGfx.setStrokeStyle({ width: 2.5, color: 0x6cc060, alpha: 1 });
      strokeGfx.roundRect(-BUILDING_W / 2, -BUILDING_H / 2, BUILDING_W, BUILDING_H, 6);
      strokeGfx.stroke();
    } else if (rState === "bought") {
      // Dashed stroke for bought resources
      strokeGfx.setStrokeStyle({ width: 2, color: 0xb88420, alpha: 1 });
      const circlePoints = [];
      for (let a = 0; a <= Math.PI * 2; a += Math.PI / 40) {
        circlePoints.push({ x: Math.cos(a) * RESOURCE_R, y: Math.sin(a) * RESOURCE_R });
      }
      drawDashedCurve(strokeGfx, circlePoints, [4, 2]);
      strokeGfx.stroke();
    } else if (isResourceAvailable) {
      // Green ring for available resources (derived from built buildings)
      strokeGfx.setStrokeStyle({ width: 2.5, color: 0x6cc060, alpha: 1 });
      strokeGfx.circle(0, 0, RESOURCE_R);
      strokeGfx.stroke();
    } else if (isWhatIf) {
      // Dashed cyan stroke for what-if preview nodes
      redrawWhatIfStroke(strokeGfx, d);
    } else {
      redrawNodeStroke(strokeGfx, d, 0x000000, 1.5, 0.35);
    }
    nodeContainer.addChild(strokeGfx);

    // Frontier resources get dimmed alpha
    if (isFrontier) {
      nodeContainer.alpha = 0.55;
    }

    // Icon sprite
    if (d.icon) {
      const tex = getIconTexture(d.icon);
      if (tex) {
        const sprite = new Sprite(tex);
        sprite.width = 24;
        sprite.height = 24;
        sprite.alpha = 1.0;
        sprite.eventMode = "none";
        if (d.type === "resource") {
          // Icon sits in the upper half; label goes below it inside the disc
          sprite.position.set(-12, -19);
        } else {
          sprite.position.set(-BW / 2 + 10, -12);
        }
        nodeContainer.addChild(sprite);
      }
    }

    // Name label
    const isRes = d.type === "resource";
    const nameText = new Text({
      text: d.name,
      style: {
        fontFamily: '"DM Sans", "Segoe UI", system-ui, sans-serif',
        fontSize: isRes ? 10 : 12,
        fontWeight: isRes ? "700" : "600",
        fill: isRes ? "#dce0e8" : "#ccd2da",
        letterSpacing: isRes ? 0.3 : 0,
        align: "center",
        ...(isRes ? { wordWrap: true, wordWrapWidth: 54 } : {}),
        stroke: { color: "#060a10", width: isRes ? 4 : 3, join: "round" },
      },
    });
    nameText.resolution = window.devicePixelRatio || 1;
    nameText.eventMode = "none";
    if (d.type === "building" && d.icon) {
      nameText.anchor.set(0.5, 0.5);
      nameText.position.set(14, 0);
    } else if (d.type === "resource" && d.icon) {
      nameText.anchor.set(0.5, 0.5);
      nameText.position.set(0, 14);
    } else {
      nameText.anchor.set(0.5, 0.5);
      nameText.position.set(0, 0);
    }
    nodeContainer.addChild(nameText);

    // State sublabel for bought/available resources and built buildings
    if (d.type === "resource") {
      const rState2 = getResourceState(d.id);
      const showAvailable = !rState2 && isResourceAvailable;
      if (rState2 === "bought" || showAvailable) {
        const sublabel = new Text({
          text: rState2 === "bought" ? "bought" : "available",
          style: {
            fontFamily: '"DM Sans", "Segoe UI", system-ui, sans-serif',
            fontSize: 9,
            fontStyle: "italic",
            fill: rState2 === "bought" ? "#b88420" : "#6cc060",
            align: "center",
          },
        });
        sublabel.resolution = window.devicePixelRatio || 1;
        sublabel.anchor.set(0.5, 0);
        sublabel.eventMode = "none";
        sublabel.position.set(0, d.icon ? RESOURCE_R + 4 : 14);
        sublabel.alpha = 0.8;
        nodeContainer.addChild(sublabel);
      } else if (isFrontier) {
        const sublabel = new Text({
          text: "frontier",
          style: {
            fontFamily: '"DM Sans", "Segoe UI", system-ui, sans-serif',
            fontSize: 9,
            fontStyle: "italic",
            fill: "#807568",
            align: "center",
          },
        });
        sublabel.resolution = window.devicePixelRatio || 1;
        sublabel.anchor.set(0.5, 0);
        sublabel.eventMode = "none";
        sublabel.position.set(0, d.icon ? RESOURCE_R + 4 : 14);
        sublabel.alpha = 0.6;
        nodeContainer.addChild(sublabel);
      } else if (isWhatIf) {
        const sublabel = new Text({
          text: "would unlock",
          style: {
            fontFamily: '"DM Sans", "Segoe UI", system-ui, sans-serif',
            fontSize: 9,
            fontStyle: "italic",
            fill: "#4fc3f7",
            align: "center",
          },
        });
        sublabel.resolution = window.devicePixelRatio || 1;
        sublabel.anchor.set(0.5, 0);
        sublabel.eventMode = "none";
        sublabel.position.set(0, d.icon ? RESOURCE_R + 4 : 14);
        sublabel.alpha = 0.85;
        nodeContainer.addChild(sublabel);
      }
    }
    if (d.type === "building" && isWhatIf) {
      const isUpgradeOnly = whatIfUpgrades && whatIfUpgrades.has(d.id) &&
        !(whatIfBuildings && whatIfBuildings.has(d.id));
      const sublabel = new Text({
        text: isUpgradeOnly ? "would unlock upgrade" : "would unlock",
        style: {
          fontFamily: '"DM Sans", "Segoe UI", system-ui, sans-serif',
          fontSize: 9,
          fontStyle: "italic",
          fill: "#4fc3f7",
          align: "center",
        },
      });
      sublabel.resolution = window.devicePixelRatio || 1;
      sublabel.anchor.set(0.5, 0);
      sublabel.eventMode = "none";
      sublabel.position.set(0, BUILDING_H / 2 + 4);
      sublabel.alpha = 0.85;
      nodeContainer.addChild(sublabel);
    }
    if (d.type === "building" && bState === "built" && !isWhatIf) {
      const sublabel = new Text({
        text: "built",
        style: {
          fontFamily: '"DM Sans", "Segoe UI", system-ui, sans-serif',
          fontSize: 9,
          fontStyle: "italic",
          fill: "#6cc060",
          align: "center",
        },
      });
      sublabel.resolution = window.devicePixelRatio || 1;
      sublabel.anchor.set(0.5, 0);
      sublabel.eventMode = "none";
      sublabel.position.set(0, BUILDING_H / 2 + 4);
      sublabel.alpha = 0.8;
      nodeContainer.addChild(sublabel);
    }

    // ── Node interactions ──
    nodeContainer.on("pointerenter", (evt) => {
      hideEdgeTooltip();
      showTooltip(evt, d);
      if (d.id !== selectedNodeId) {
        // Category-tinted hover glow
        const hoverColor = d.type === "resource"
          ? (RESOURCE_NODE_COLORS[d.category] || RESOURCE_NODE_COLORS.material).rim
          : buildingCategoryHex(d.category);
        strokeGfx.clear();
        strokeGfx.setStrokeStyle({ width: 3, color: hoverColor, alpha: 0.25 });
        if (d.type === "resource") {
          strokeGfx.circle(0, 0, RESOURCE_R + 3);
        } else {
          strokeGfx.roundRect(-BUILDING_W / 2 - 2, -BUILDING_H / 2 - 2, BUILDING_W + 4, BUILDING_H + 4, 8);
        }
        strokeGfx.stroke();
        strokeGfx.setStrokeStyle({ width: 2, color: 0xe8dcc8, alpha: 0.8 });
        if (d.type === "resource") {
          strokeGfx.circle(0, 0, RESOURCE_R);
        } else {
          strokeGfx.roundRect(-BUILDING_W / 2, -BUILDING_H / 2, BUILDING_W, BUILDING_H, 6);
        }
        strokeGfx.stroke();
      }
    });
    nodeContainer.on("pointermove", (evt) => {
      showTooltip(evt, d);
    });
    nodeContainer.on("pointerleave", () => {
      hideTooltip();
      if (d.id !== selectedNodeId) {
        restoreBaseState();
      }
    });
    nodeContainer.on("pointertap", (_evt) => {
      if (zoomCtrl.wasDragged) return;
      bgClickConsumed = true;
      hideTooltip();

      const prevId = selectedNodeId;
      selectedNodeId = d.id;

      // Dismiss first-visit onboarding on first click
      if (!localStorage.getItem("syx-vis-onboarded")) dismissOnboarding();

      const alreadyInTrail = breadcrumbHistory.some(b => b.id === d.id);
      if (alreadyInTrail) {
        renderBreadcrumbs();
      } else if (prevId && isOneEdgeAway(prevId, d.id)) {
        pushBreadcrumb(d);
      } else {
        breadcrumbHistory = [];
        pushBreadcrumb(d);
      }
      restoreBaseState();
      openDetailForNode(d);
      refreshStatsBar();
    });

    nodeGfxMap.set(d.id, { gfx: nodeContainer, strokeGfx, data: d, x: d.x, y: d.y });
  }

  // ── Navigate to node ──
  navigateToNode = function (nodeId) {
    const entry = nodeGfxMap.get(nodeId);
    if (!entry) {
      const targetNode = fullNodes.get(nodeId);
      if (targetNode) {
        pushBreadcrumb(targetNode);
        openDetailForNode(targetNode);
      }
      return;
    }

    const { x: nx, y: ny, data: nodeData } = entry;
    zoomCtrl.panTo(nx, ny, 500).then(() => {
      // Simulate click
      bgClickConsumed = true;
      hideTooltip();

      const prevId = selectedNodeId;
      selectedNodeId = nodeId;

      if (!localStorage.getItem("syx-vis-onboarded")) dismissOnboarding();

      const alreadyInTrail = breadcrumbHistory.some(b => b.id === nodeId);
      if (alreadyInTrail) {
        renderBreadcrumbs();
      } else if (prevId && isOneEdgeAway(prevId, nodeId)) {
        pushBreadcrumb(nodeData);
      } else {
        breadcrumbHistory = [];
        pushBreadcrumb(nodeData);
      }
      restoreBaseState();
      openDetailForNode(nodeData);
      refreshStatsBar();

      // Ping effect
      doPingEffect(nx, ny, nodeData.type);

      // Highlight pulse
      doHighlightPulse(entry);
    });
  };

  // Prune breadcrumbs
  pruneBreadcrumbs();

  // Restore selection
  if (selectedNodeId) {
    const selNode = nodes.get(selectedNodeId);
    if (selNode) openDetailForNode(selNode);
  }

  // Zoom to fit on first render (instant, no rAF delay to avoid pop-in)
  if (isFirstRender) {
    isFirstRender = false;
    const bbox = computeBBox(layoutPositions);
    if (bbox && zoomCtrl) {
      zoomCtrl.zoomToFit(bbox, 60, false);
    }
  }
  updateFocusBarWhatIf();
  restoreBaseState();
}

// ══════════════════════════════════════════════════════════
// Ghost (filtered-out) nodes/edges rendering
// ══════════════════════════════════════════════════════════

function renderGhostEdges(filteredOutEdges, layoutPositions) {
  if (!filteredOutEdges || filteredOutEdges.length === 0) return;

  const gfx = new Graphics();
  const s = currentZoomScale;
  const ghostWidth = Math.min(Math.max(1.0, 1.0 / s), 3);
  gfx.alpha = 0.15;
  gfx.setStrokeStyle({ width: ghostWidth, color: 0x4a6480, alpha: 0.30 });

  for (const e of filteredOutEdges) {
    const fromPos = fullLayoutPositions.get(e.from) || layoutPositions.get(e.from);
    const toPos = fullLayoutPositions.get(e.to) || layoutPositions.get(e.to);
    if (!fromPos || !toPos) continue;
    const points = sampleBezier(fromPos.x, fromPos.y, toPos.x, toPos.y, 40);
    drawDashedCurve(gfx, points, [2, 5]);
  }
  gfx.stroke();
  ghostEdgeLayer.addChild(gfx);
}

function renderGhostNodes(filteredOutNodes) {
  for (const { node, reason } of filteredOutNodes.values()) {
    const pos = fullLayoutPositions.get(node.id);
    if (!pos) continue;

    const container = new Container();
    container.position.set(pos.x, pos.y);
    container.alpha = 0.07;
    container.eventMode = "static";
    container.cursor = "help";

    // Simplified ghost silhouette — faint outline + fill
    const shape = new Graphics();
    if (node.type === "resource") {
      const colors = RESOURCE_NODE_COLORS[node.category] || RESOURCE_NODE_COLORS.material;
      shape.circle(0, 0, RESOURCE_R);
      shape.fill({ color: colors.fill });
      shape.setStrokeStyle({ width: 1, color: colors.rim, alpha: 0.3 });
      shape.circle(0, 0, RESOURCE_R);
      shape.stroke();
    } else {
      const fillColor = node.miniColor ? darkenMiniColor(node.miniColor) : 0x141c28;
      shape.roundRect(-BUILDING_W / 2, -BUILDING_H / 2, BUILDING_W, BUILDING_H, 6);
      shape.fill({ color: fillColor });
      shape.setStrokeStyle({ width: 1, color: 0x2a3a4c, alpha: 0.3 });
      shape.roundRect(-BUILDING_W / 2, -BUILDING_H / 2, BUILDING_W, BUILDING_H, 6);
      shape.stroke();
    }
    container.addChild(shape);

    // Icon
    if (node.icon) {
      const tex = getIconTexture(node.icon);
      if (tex) {
        const sprite = new Sprite(tex);
        sprite.width = 24;
        sprite.height = 24;
        sprite.eventMode = "none";
        if (node.type === "resource") {
          sprite.position.set(-12, -12);
        } else {
          sprite.position.set(-BUILDING_W / 2 + 8, -12);
        }
        container.addChild(sprite);
      }
    }

    // Label (inherits container alpha)
    const label = new Text({
      text: node.name,
      style: {
        fontFamily: '"DM Sans", "Segoe UI", system-ui, sans-serif',
        fontSize: 12,
        fontWeight: "600",
        fill: "#ccd2da",
        align: "center",
        stroke: { color: "#060a10", width: 3, join: "round" },
      },
    });
    label.resolution = window.devicePixelRatio || 1;
    label.eventMode = "none";
    if (node.type === "building" && node.icon) {
      label.anchor.set(0.5, 0.5);
      label.position.set(14, 0);
    } else if (node.type === "resource" && node.icon) {
      label.anchor.set(0.5, 0);
      label.position.set(0, RESOURCE_R + 6);
    } else {
      label.anchor.set(0.5, 0.5);
    }
    container.addChild(label);

    // Ghost interactions
    container.on("pointertap", (_evt) => {
      if (zoomCtrl.wasDragged) return;
      bgClickConsumed = true;
      hideTooltip();
      const targetNode = fullNodes.get(node.id);
      if (targetNode) {
        pushBreadcrumb(targetNode);
        openDetailForNode(targetNode);
      }
    });
    container.on("pointerenter", (evt) => {
      container.alpha = 0.22;
      showTooltip(evt, node, reason);
    });
    container.on("pointermove", (evt) => {
      showTooltip(evt, node, reason);
    });
    container.on("pointerleave", () => {
      container.alpha = 0.07;
      hideTooltip();
    });

    ghostNodeLayer.addChild(container);
  }
}

// ══════════════════════════════════════════════════════════
// Ping & pulse effects
// ══════════════════════════════════════════════════════════

function doPingEffect(nx, ny, type) {
  const gfx = new Graphics();
  pingLayer.addChild(gfx);

  const startTime = performance.now();
  const duration = 900;

  function animate(now) {
    const t = Math.min((now - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);

    gfx.clear();
    const a = 0.5 * (1 - t);
    const sw = 2.5 - 1.5 * t;

    if (type === "resource") {
      const r = RESOURCE_R + (RESOURCE_R * 2.2) * ease;
      // Double ring ping
      gfx.setStrokeStyle({ width: sw, color: 0xe8a830, alpha: a });
      gfx.circle(nx, ny, r);
      gfx.stroke();
      gfx.setStrokeStyle({ width: sw * 0.6, color: 0xe8a830, alpha: a * 0.5 });
      gfx.circle(nx, ny, r * 0.7);
      gfx.stroke();
    } else {
      const scale = 1 + ease * 1.2;
      const w = BUILDING_W * scale;
      const h = BUILDING_H * scale;
      gfx.setStrokeStyle({ width: sw, color: 0xe8a830, alpha: a });
      gfx.roundRect(nx - w / 2, ny - h / 2, w, h, 8);
      gfx.stroke();
    }

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      pingLayer.removeChild(gfx);
      gfx.destroy();
    }
  }
  requestAnimationFrame(animate);
}

function doHighlightPulse(entry) {
  const { strokeGfx, data } = entry;
  const startTime = performance.now();
  const cycles = 2;
  const cycleDuration = 500;
  const totalDuration = cycles * cycleDuration;

  function animate(now) {
    const elapsed = now - startTime;
    if (elapsed > totalDuration) {
      restoreBaseState();
      return;
    }
    const t = (elapsed % cycleDuration) / cycleDuration;
    const sw = 2.5 + 3 * Math.sin(t * Math.PI);
    const pulseAlpha = 0.7 + 0.3 * Math.sin(t * Math.PI);

    strokeGfx.clear();
    strokeGfx.setStrokeStyle({ width: sw, color: 0xffc042, alpha: pulseAlpha });
    if (data.type === "resource") {
      strokeGfx.circle(0, 0, RESOURCE_R);
    } else {
      strokeGfx.roundRect(-BUILDING_W / 2, -BUILDING_H / 2, BUILDING_W, BUILDING_H, 6);
    }
    strokeGfx.stroke();

    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

// ══════════════════════════════════════════════════════════
// Detail panel (DOM — unchanged logic from SVG version)
// ══════════════════════════════════════════════════════════

function renderProducerComparison(panel, resourceId, producers, navToNode, appendWeightCtrl, attachHover) {
  const sorted = [...producers].sort((a, b) => {
    const wa = getRecipeWeight(a.recipeId);
    const wb = getRecipeWeight(b.recipeId);
    const aEnabled = wa > 0 ? 1 : 0;
    const bEnabled = wb > 0 ? 1 : 0;
    if (aEnabled !== bEnabled) return bEnabled - aEnabled;
    return b.amount - a.amount;
  });

  const container = panel.append("div").attr("class", "producer-cards");

  for (const p of sorted) {
    const building = fullNodes.get(p.from);
    if (!building) continue;

    const weight = getRecipeWeight(p.recipeId);
    const card = container.append("div")
      .attr("class", "producer-card")
      .classed("card-disabled", weight === 0);

    if (building.miniColor) {
      const [r, g, b] = building.miniColor.split("_").map(Number);
      card.style("border-left-color", `rgb(${r},${g},${b})`);
    }

    const header = card.append("div").attr("class", "producer-card-header");
    if (building.icon) {
      header.append("img")
        .attr("src", `data/icons/${building.icon}`)
        .attr("class", "producer-card-icon")
        .attr("alt", building.name);
    }
    const nameSpan = header.append("span")
      .attr("class", "producer-card-name")
      .text(building.name);
    nameSpan.on("click", () => navigateToNode(p.from));

    header.append("span")
      .attr("class", "producer-card-rate")
      .text(formatRate(p.amount));

    const recipe = building.recipes?.find(r => r.id === p.recipeId);

    if (recipe && recipe.inputs.length > 0) {
      const inputsDiv = card.append("div").attr("class", "producer-card-inputs");
      for (const inp of recipe.inputs) {
        const resNode = fullNodes.get(inp.resource);
        const pill = inputsDiv.append("span")
          .attr("class", "producer-card-input-pill");
        if (resNode && resNode.icon) {
          pill.append("img")
            .attr("src", `data/icons/${resNode.icon}`)
            .attr("alt", resNode.name);
        }
        pill.append("span").text(resNode ? resNode.name : inp.resource);
        pill.append("span").attr("class", "pill-amount").text(inp.amount);
        pill.on("click", () => navigateToNode(inp.resource));
        attachHover(pill, inp.resource, "input");
      }
    } else {
      card.append("div")
        .attr("class", "producer-card-no-inputs")
        .text("No inputs (extraction)");
    }

    if (building.unlockedBy) {
      const u = building.unlockedBy;
      card.append("div")
        .attr("class", "producer-card-tech")
        .text(`Tech: ${u.techTreeName} > ${u.techName}`);
    }

    if (p.recipeId && producers.length > 1) {
      const weightDiv = card.append("div").attr("class", "producer-card-weight");
      appendWeightCtrl(weightDiv, p.recipeId);
      const cb = weightDiv.select(".recipe-weight-cb");
      if (!cb.empty()) {
        const origHandler = cb.on("change");
        cb.on("change", function () {
          origHandler.call(this);
          card.classed("card-disabled", !this.checked);
        });
      }
    }
  }
}

function openDetailForNode(d) {
  const panel = d3.select("#detail-panel");
  panel.classed("open", true);
  panel.html("");

  function attachResHover(linkEl, resourceId, role) {
    const node = linkEl.node();
    if (!node || !detailResTooltip) return;

    function showResHover() {
      let entries;
      let header;
      if (role === "input") {
        entries = producersByResource.get(resourceId) || [];
        header = "Produced by";
      } else {
        entries = consumersByResource.get(resourceId) || [];
        header = "Consumed by";
      }
      if (entries.length === 0) {
        detailResTooltip.classList.remove("visible");
        return;
      }
      let html = `<div class="drt-header">${escapeHtml(header)}</div>`;
      for (const e of entries) {
        const icon = e.buildingIcon
          ? `<img class="drt-icon" src="data/icons/${e.buildingIcon}" alt="">`
          : "";
        const weightTag = role === "input" && e.recipeId
          ? ` <span class="drt-weight">[${getRecipeWeight(e.recipeId)}w]</span>`
          : "";
        html += `<div class="drt-entry">${icon}${escapeHtml(e.buildingName)} &nbsp;${formatRate(e.amount)}${weightTag}</div>`;
      }
      detailResTooltip.innerHTML = html;
      const rect = node.getBoundingClientRect();
      detailResTooltip.classList.add("visible");
      positionTooltip(detailResTooltip, rect.left - 14, rect.bottom - 6);
    }

    // Mouse hover (desktop)
    node.addEventListener("mouseenter", showResHover);
    node.addEventListener("mouseleave", () => {
      detailResTooltip.classList.remove("visible");
    });

    // Tap toggle (touch devices)
    node.addEventListener("click", (e) => {
      e.stopPropagation();
      if (detailResTooltip.classList.contains("visible") && detailResTooltip._activeNode === node) {
        detailResTooltip.classList.remove("visible");
        detailResTooltip._activeNode = null;
      } else {
        showResHover();
        detailResTooltip._activeNode = node;
      }
    });
  }

  function appendRecipeWeightCtrl(li, recipeId) {
    const weight = getRecipeWeight(recipeId);
    if (weight === 0) li.classed("recipe-disabled", true);
    const wrap = li.append("span").attr("class", "recipe-weight-ctrl");
    const cb = wrap.append("input")
      .attr("type", "checkbox")
      .attr("class", "recipe-weight-cb")
      .property("checked", weight > 0);
    const num = wrap.append("input")
      .attr("type", "number")
      .attr("class", "recipe-weight-num")
      .attr("min", "0")
      .attr("step", "0.5")
      .property("value", weight)
      .property("disabled", weight === 0);
    cb.on("change", function () {
      if (this.checked) {
        const w = parseFloat(num.property("value")) || 1;
        const newW = w <= 0 ? 1 : w;
        setRecipeWeight(recipeId, newW);
        num.property("value", newW).property("disabled", false);
        li.classed("recipe-disabled", false);
      } else {
        setRecipeWeight(recipeId, 0);
        num.property("disabled", true);
        li.classed("recipe-disabled", true);
      }
      fireFilterChange();
    });
    num.on("change", function () {
      const w = parseFloat(this.value);
      if (isNaN(w) || w < 0) {
        this.value = 1;
        setRecipeWeight(recipeId, 1);
      } else if (w === 0) {
        cb.property("checked", false);
        num.property("disabled", true);
        li.classed("recipe-disabled", true);
        setRecipeWeight(recipeId, 0);
      } else {
        setRecipeWeight(recipeId, w);
      }
      fireFilterChange();
    });
  }

  // Title row
  const titleRow = panel.append("div").attr("class", "detail-title-row");
  if (d.icon) {
    titleRow.append("img")
      .attr("src", `data/icons/${d.icon}`)
      .attr("class", "detail-icon")
      .attr("alt", d.name);
  }
  titleRow.append("h2").text(d.name).style("margin", "0");
  panel.append("span")
    .attr("class", `type-badge ${d.type}`)
    .text(`${d.type} / ${d.band || d.category}`);

  if (currentFilteredOutNodes.has(d.id)) {
    const info = currentFilteredOutNodes.get(d.id);
    panel.append("div")
      .attr("class", "detail-hidden-note")
      .text(`Hidden: ${info.reason}`);
  }

  if (d.desc) {
    panel.append("p").attr("class", "detail-desc").text(d.desc);
  }

  const focusBtnRow = panel.append("div").style("margin", "6px 0");
  focusBtnRow.append("button")
    .attr("class", "detail-focus-btn")
    .text("Focus")
    .attr("title", "Show only this node's dependency chain (F)")
    .on("click", () => enterFocusMode(d.id));

  // Building state buttons (Built / Ignored)
  if (d.type === "building") {
    const bStateRow = panel.append("div").attr("class", "detail-state-row");
    const bStateOptions = [
      { key: "built", label: "Built", tooltip: "Mark as built \u2014 its recipe outputs become available resources" },
      { key: "ignored", label: "Ignored", tooltip: "Hide this building from the graph" },
    ];
    const bStateBtns = [];
    for (const opt of bStateOptions) {
      const btn = bStateRow.append("button")
        .attr("class", `detail-state-btn state-${opt.key}`)
        .classed("active", getBuildingState(d.id) === opt.key)
        .on("click", () => {
          const current = getBuildingState(d.id);
          if (current === opt.key) setBuildingState(d.id, null);
          else setBuildingState(d.id, opt.key);
          for (const b of bStateBtns) b.classed("active", getBuildingState(d.id) === b.datum());
          refreshResourceGrid();
          fireFilterChange();
        });
      btn.text(opt.label);
      btn.append("span").attr("class", "state-tooltip").text(opt.tooltip);
      btn.datum(opt.key);
      bStateBtns.push(btn);
    }
  }

  if (d.type === "building" && d.recipes) {
    const metaItems = [];
    if (d.storage != null) metaItems.push(`Storage: ${d.storage}`);
    if (d.fulfillment != null) metaItems.push(`Fulfillment: ${d.fulfillment}`);
    if (d.accidentsPerYear != null) metaItems.push(`Accidents/yr: ${d.accidentsPerYear}`);
    if (d.healthFactor != null) metaItems.push(`Health: ${d.healthFactor}`);
    if (d.usesTool) metaItems.push("Uses tools");
    if (d.noise) metaItems.push("Noisy");
    if (d.indoors === true) metaItems.push("Indoors");
    if (d.indoors === false) metaItems.push("Outdoors");
    if (d.growable) metaItems.push(`Grows: ${d.growable}`);
    if (d.animal) metaItems.push(`Animal: ${d.animal}`);
    if (d.climateBonus) {
      const parts = Object.entries(d.climateBonus).map(([k, v]) => `${k}: ${v}x`).join(", ");
      metaItems.push(`Climate: ${parts}`);
    }
    if (d.nightShift != null) metaItems.push(`Night shift: ${d.nightShift}`);
    if (d.employShiftOffset != null) metaItems.push(`Shift offset: ${d.employShiftOffset}`);
    if (d.serviceRadius != null) metaItems.push(`Service radius: ${d.serviceRadius}`);
    if (d.need) metaItems.push(`Fulfills need: ${capitalize(d.need.toLowerCase())}`);
    if (d.serviceDefaultAccess != null) metaItems.push(`Default access: ${d.serviceDefaultAccess}`);
    if (d.serviceDefaultValue != null) metaItems.push(`Default value: ${d.serviceDefaultValue}`);
    if (d.race) metaItems.push(`Species: ${capitalize(d.race.toLowerCase())}`);
    if (d.religion) metaItems.push(`Religion: ${capitalize(d.religion.toLowerCase())}`);
    if (d.incubationDays != null) metaItems.push(`Incubation: ${d.incubationDays} days`);
    if (d.learningSpeed != null) metaItems.push(`Learning speed: ${d.learningSpeed}`);
    if (d.fulfillmentBonus != null) {
      if (typeof d.fulfillmentBonus === "object") {
        const parts = Object.entries(d.fulfillmentBonus).map(([k, v]) => `${k}: ${v}`).join(", ");
        metaItems.push(`Fulfillment bonus: ${parts}`);
      } else {
        metaItems.push(`Fulfillment bonus: ${d.fulfillmentBonus}`);
      }
    }
    if (d.maxValue != null) metaItems.push(`Max value: ${d.maxValue}`);
    if (d.valuePerWorker != null) metaItems.push(`Value/worker: ${d.valuePerWorker}`);
    if (d.valueDegradePerYear != null) metaItems.push(`Value degrade/yr: ${d.valueDegradePerYear}`);
    if (d.experienceBonus != null) {
      if (typeof d.experienceBonus === "object") {
        const bonus = d.experienceBonus.BONUS ?? d.experienceBonus.bonus;
        metaItems.push(`Experience bonus: ${bonus != null ? bonus + "x" : JSON.stringify(d.experienceBonus)}`);
      } else {
        metaItems.push(`Experience bonus: ${d.experienceBonus}`);
      }
    }
    if (d.maxEmployed != null) metaItems.push(`Max employed: ${d.maxEmployed}`);
    if (d.fullTrainingDays != null) metaItems.push(`Training: ${d.fullTrainingDays} days`);
    if (d.degradeRate != null) metaItems.push(`Deposit degrade: ${d.degradeRate}/yr`);
    if (d.daysTillGrowth != null) metaItems.push(`Growth: ${d.daysTillGrowth} days`);
    if (d.ripeAtPartOfYear != null) metaItems.push(`Harvest: ${Math.round(d.ripeAtPartOfYear * 100)}% of year`);
    if (d.fence) metaItems.push(`Fence: ${d.fence}`);
    if (d.valueWorkSpeed != null) metaItems.push(`Work speed: ${d.valueWorkSpeed}`);
    if (d.sacrificeTime != null) metaItems.push(`Sacrifice time: ${d.sacrificeTime}`);
    if (d.workTimeInDays != null) metaItems.push(`Work time: ${d.workTimeInDays} days`);
    if (d.buildingType) metaItems.push(`Type: ${d.buildingType}`);
    if (d.racePreference) metaItems.push(`Species pref: ${capitalize(d.racePreference.toLowerCase())}`);
    if (d.training) {
      const parts = [];
      if (d.training.fullDays != null) parts.push(`${d.training.fullDays} days`);
      if (d.training.boost != null) parts.push(`${d.training.boost}x boost`);
      metaItems.push(`Training: ${parts.join(", ")}`);
    }
    if (d.floorType != null) {
      const ft = Array.isArray(d.floorType) ? d.floorType.join(", ") : d.floorType;
      metaItems.push(`Floor: ${ft}`);
    }
    if (metaItems.length > 0) {
      panel.append("h3").text("Properties");
      const metaUl = panel.append("ul").attr("class", "detail-meta");
      for (const item of metaItems) metaUl.append("li").text(item);
    }

    if (d.popMin != null || d.requires) {
      panel.append("h3").text("Population Requirements");
      const reqUl = panel.append("ul").attr("class", "detail-meta");
      if (d.popMin != null) reqUl.append("li").text(`Min population: ${d.popMin}`);
      if (d.requires) {
        for (const [k, v] of Object.entries(d.requires)) {
          reqUl.append("li").text(`${k.toLowerCase().replace(/_/g, " ")}: ${v}`);
        }
      }
    }

    if (d.boosting && d.boosting.length > 0) {
      panel.append("h3").text("Boosting");
      const boostMeta = [];
      if (d.boostFrom != null || d.boostTo != null) boostMeta.push(`Range: ${d.boostFrom ?? "?"} \u2013 ${d.boostTo ?? "?"}`);
      if (d.increasePow != null) boostMeta.push(`Growth: ${d.increasePow}`);
      if (boostMeta.length > 0) panel.append("p").attr("class", "detail-desc").text(boostMeta.join(", "));
      const boostUl = panel.append("ul").attr("class", "detail-meta");
      for (const target of d.boosting) {
        boostUl.append("li").text(target.replace(/^ROOM_/, "").replace(/\*/g, " (all)").toLowerCase());
      }
    }

    if (d.standing && typeof d.standing === "object") {
      panel.append("h3").text("Standing");
      const standUl = panel.append("ul").attr("class", "detail-meta");
      for (const [k, v] of Object.entries(d.standing)) standUl.append("li").text(`${capitalize(k.toLowerCase())}: ${v}`);
    }

    if (d.serviceStanding && typeof d.serviceStanding === "object") {
      panel.append("h3").text("Service Access");
      const svcUl = panel.append("ul").attr("class", "detail-meta");
      for (const [k, v] of Object.entries(d.serviceStanding)) svcUl.append("li").text(`${capitalize(k.toLowerCase())}: ${v}`);
    }

    const resDeps = [];
    if (d.equipmentToUse) resDeps.push({ label: "Equipment", resource: d.equipmentToUse });
    if (d.projectileResource) resDeps.push({ label: "Ammo", resource: d.projectileResource });
    if (d.sacrificeResource) resDeps.push({ label: "Sacrifice", resource: d.sacrificeResource });
    if (resDeps.length > 0) {
      panel.append("h3").text("Resource Dependencies");
      const depUl = panel.append("ul").attr("class", "detail-meta");
      for (const dep of resDeps) {
        const li = depUl.append("li");
        li.append("span").text(`${dep.label}: `);
        appendResourceIcon(li, dep.resource);
        createNavLink(li, dep.resource, findName(fullNodes, dep.resource));
      }
    }

    if (d.unlockedBy) {
      panel.append("h3").text("Unlocked By");
      const u = d.unlockedBy;
      const reqParts = [];
      if (u.requiresTechLevel) { for (const [tech, lv] of Object.entries(u.requiresTechLevel)) reqParts.push(`${tech} lv${lv}`); }
      if (u.requiresPopulation) { for (const [pop, count] of Object.entries(u.requiresPopulation)) reqParts.push(`${count} ${pop.toLowerCase().replace(/_/g, " ")}`); }
      let unlockText = `${u.techTreeName} > ${u.techName}`;
      if (reqParts.length > 0) unlockText += ` (requires ${reqParts.join(", ")})`;
      panel.append("p").attr("class", "detail-desc").text(unlockText);
    }
    if (d.upgradesUnlockedBy && d.upgradesUnlockedBy.length > 0) {
      panel.append("h3").text("Upgrade Unlocks");
      const upgUl = panel.append("ul");
      for (const u of d.upgradesUnlockedBy) {
        const reqParts = [];
        if (u.requiresTechLevel) { for (const [tech, lv] of Object.entries(u.requiresTechLevel)) reqParts.push(`${tech} lv${lv}`); }
        if (u.requiresPopulation) { for (const [pop, count] of Object.entries(u.requiresPopulation)) reqParts.push(`${count} ${pop.toLowerCase().replace(/_/g, " ")}`); }
        let text = `Tier ${u.tier}: ${u.techTreeName} > ${u.techName}`;
        if (reqParts.length > 0) text += ` (requires ${reqParts.join(", ")})`;
        upgUl.append("li").text(text);
      }
    }

    const buildCosts = fullEdges.filter(e => e.to === d.id && e.direction === "construction");
    if (buildCosts.length > 0) {
      const costAvail = availableResources;
      const allAvailable = costAvail && buildCosts.every(c => costAvail.has(c.from));
      const costHeader = panel.append("h3");
      costHeader.text(`Construction Costs (${buildCosts.length})`);
      if (costAvail) {
        if (allAvailable) {
          costHeader.append("span").attr("class", "cost-status cost-ready").text(" Ready");
        } else {
          const missing = buildCosts.filter(c => !costAvail.has(c.from))
            .map(c => findName(fullNodes, c.from));
          costHeader.append("span").attr("class", "cost-status cost-missing")
            .text(` Needs: ${missing.join(", ")}`);
        }
      }
      const costUl = panel.append("ul");
      for (const c of buildCosts) {
        const li = costUl.append("li");
        if (costAvail) {
          const marker = costAvail.has(c.from) ? "\u2713" : "\u2717";
          const cls = costAvail.has(c.from) ? "cost-check" : "cost-x";
          li.append("span").attr("class", cls).text(marker + " ");
        }
        appendResourceIcon(li, c.from);
        createNavLink(li, c.from, findName(fullNodes, c.from));
        li.append("span").text(` ${formatQuantity(c.amount)}`);
      }
    }

    const upgCosts = fullEdges.filter(e => e.to === d.id && e.direction === "upgrade");
    if (upgCosts.length > 0) {
      panel.append("h3").text(`Upgrade Costs (${upgCosts.length})`);
      const upgUl = panel.append("ul");
      for (const u of upgCosts) {
        const li = upgUl.append("li");
        appendResourceIcon(li, u.from);
        createNavLink(li, u.from, findName(fullNodes, u.from));
        li.append("span").text(` ${formatQuantity(u.amount)} (${u.recipe})`);
      }
      if (d.upgradeBoosts && d.upgradeBoosts.length > 0) {
        const boostUl = panel.append("ul").attr("class", "detail-meta");
        for (let i = 0; i < d.upgradeBoosts.length; i++) {
          const pct = Math.round(d.upgradeBoosts[i] * 100);
          boostUl.append("li").text(`Tier ${i}: +${pct}% production`);
        }
      }
    }

    const areaCostEdges = fullEdges.filter(e => e.to === d.id && e.direction === "area");
    if (areaCostEdges.length > 0) {
      panel.append("h3").text(`Per-Tile Costs (${areaCostEdges.length})`);
      const acUl = panel.append("ul");
      for (const c of areaCostEdges) {
        const li = acUl.append("li");
        appendResourceIcon(li, c.from);
        createNavLink(li, c.from, findName(fullNodes, c.from));
        li.append("span").text(` ${formatQuantity(c.amount)}`);
      }
    }

    if (d.items && d.items.length > 0) {
      panel.append("h3").text("Furniture");
      const itemsUl = panel.append("ul");
      for (let i = 0; i < d.items.length; i++) {
        const item = d.items[i];
        const label = d.spriteTypes && d.spriteTypes[i] ? d.spriteTypes[i] : `Item ${i + 1}`;
        const li = itemsUl.append("li");
        li.append("span").style("font-weight", "600").text(label);
        if (item.costs.length > 0) {
          const costSpan = li.append("span").text(" — ");
          for (const c of item.costs) {
            appendResourceIcon(costSpan, c.resource);
            costSpan.append("span").text(`${c.amount} `);
          }
        }
        if (item.stats.length > 0 && item.stats.some(s => s !== 0)) {
          li.append("span").style("color", "#8af").text(` [${item.stats.join(", ")}]`);
        }
      }
    }

    if (d.recipes.length > 0) {
      panel.append("h3").text("Recipes");
      const recipeContainer = panel.append("div").attr("class", "producer-cards");
      for (const r of d.recipes) {
        const card = recipeContainer.append("div").attr("class", "producer-card");
        if (d.miniColor) {
          const [mr, mg, mb] = d.miniColor.split("_").map(Number);
          card.style("border-left-color", `rgb(${mr},${mg},${mb})`);
        }
        const header = card.append("div").attr("class", "producer-card-header");
        header.append("span")
          .style("font-weight", "600")
          .style("font-size", "13px")
          .style("color", "var(--text-primary)")
          .text(r.name);

        const hasCompetition = r.outputs.some(out =>
          (producersByResource.get(out.resource)?.length || 0) > 1
        );
        if (hasCompetition) {
          const weightSpan = header.append("span").style("margin-left", "auto");
          appendRecipeWeightCtrl(weightSpan, r.id);
          const weight = getRecipeWeight(r.id);
          card.classed("card-disabled", weight === 0);
          const cb = weightSpan.select(".recipe-weight-cb");
          if (!cb.empty()) {
            const origHandler = cb.on("change");
            cb.on("change", function () {
              origHandler.call(this);
              card.classed("card-disabled", !this.checked);
            });
          }
        }

        if (r.inputs.length > 0) {
          card.append("div").attr("class", "recipe-io-label").text("Inputs");
          const inputsDiv = card.append("div").attr("class", "producer-card-inputs");
          for (const inp of r.inputs) {
            const resNode = fullNodes.get(inp.resource);
            const pill = inputsDiv.append("span").attr("class", "producer-card-input-pill");
            if (resNode && resNode.icon) {
              pill.append("img").attr("src", `data/icons/${resNode.icon}`).attr("alt", resNode.name);
            }
            pill.append("span").text(resNode ? resNode.name : inp.resource);
            pill.append("span").attr("class", "pill-amount").text(inp.amount);
            pill.on("click", () => navigateToNode(inp.resource));
            attachResHover(pill, inp.resource, "input");
          }
        } else {
          card.append("div").attr("class", "producer-card-no-inputs").text("No inputs (extraction)");
        }

        card.append("div").attr("class", "recipe-io-label").text("Outputs");
        const outputsDiv = card.append("div").attr("class", "producer-card-inputs");
        for (const out of r.outputs) {
          const resNode = fullNodes.get(out.resource);
          const pill = outputsDiv.append("span").attr("class", "producer-card-input-pill");
          if (resNode && resNode.icon) {
            pill.append("img").attr("src", `data/icons/${resNode.icon}`).attr("alt", resNode.name);
          }
          pill.append("span").text(resNode ? resNode.name : out.resource);
          pill.append("span").attr("class", "pill-amount").text(out.amount);
          pill.on("click", () => navigateToNode(out.resource));
          attachResHover(pill, out.resource, "output");
        }
      }
    }
  }

  if (d.type === "resource") {
    const metaItems = [];
    if (d.degradeRate != null) metaItems.push(`Degrade rate: ${d.degradeRate}`);
    if (d.priceCap != null) metaItems.push(`Price cap: ${d.priceCap}`);
    if (d.tags && d.tags.length > 0) metaItems.push(`Tags: ${d.tags.join(", ")}`);
    if (metaItems.length > 0) {
      panel.append("h3").text("Properties");
      const metaUl = panel.append("ul").attr("class", "detail-meta");
      for (const item of metaItems) metaUl.append("li").text(item);
    }

    const stateRow = panel.append("div").attr("class", "detail-state-row");
    const stateOptions = [
      { key: "bought", label: "Bought", tooltip: "We buy this externally \u2014 hides its producers since we don't need to make it" },
      { key: "ignored", label: "Ignored", tooltip: "We don't use this at all \u2014 hides everything related to it" },
    ];
    const stateBtns = [];
    for (const opt of stateOptions) {
      const btn = stateRow.append("button")
        .attr("class", `detail-state-btn state-${opt.key}`)
        .classed("active", getResourceState(d.id) === opt.key)
        .on("click", () => {
          const current = getResourceState(d.id);
          if (current === opt.key) setResourceState(d.id, null);
          else setResourceState(d.id, opt.key);
          for (const b of stateBtns) b.classed("active", getResourceState(d.id) === b.datum());
          refreshResourceGrid();
          fireFilterChange();
        });
      btn.text(opt.label);
      btn.append("span").attr("class", "state-tooltip").text(opt.tooltip);
      btn.datum(opt.key);
      stateBtns.push(btn);
    }

    // Derived availability status (city mode)
    if (availableResources) {
      const isAvail = availableResources.has(d.id);
      const rState3 = getResourceState(d.id);
      if (rState3 !== "bought" && rState3 !== "ignored") {
        if (isAvail) {
          // Find which built building produces this
          const builtProducers = fullEdges.filter(e =>
            e.to === d.id && e.direction === "output" && getBuildingState(e.from) === "built" && getRecipeWeight(e.recipeId) > 0
          );
          const statusDiv = panel.append("div").attr("class", "resource-availability available");
          if (builtProducers.length > 0) {
            statusDiv.append("span").text("Produced by: ");
            for (let pi = 0; pi < builtProducers.length; pi++) {
              if (pi > 0) statusDiv.append("span").text(", ");
              const bld = fullNodes.get(builtProducers[pi].from);
              if (bld) {
                createNavLink(statusDiv, builtProducers[pi].from, bld.name, { bold: true });
              }
            }
          } else {
            statusDiv.text("Available (bought or base resource)");
          }
        } else {
          // Show which buildable buildings would produce this
          const potentialProducers = fullEdges.filter(e => {
            if (e.to !== d.id || e.direction !== "output") return false;
            const node = fullNodes.get(e.from);
            if (!node || node.type !== "building") return false;
            const bs = getBuildingState(e.from);
            if (bs === "built" || bs === "ignored") return false;
            if (!node.constructionCosts || node.constructionCosts.length === 0) return true;
            return node.constructionCosts.every(c => availableResources.has(c.resource));
          });
          if (potentialProducers.length > 0) {
            const hintDiv = panel.append("div").attr("class", "resource-availability hint");
            hintDiv.append("span").text("Would be produced by: ");
            for (let pi = 0; pi < potentialProducers.length; pi++) {
              if (pi > 0) hintDiv.append("span").text(", ");
              const bld = fullNodes.get(potentialProducers[pi].from);
              if (bld) createNavLink(hintDiv, potentialProducers[pi].from, bld.name, { bold: true });
            }
          } else {
            panel.append("div").attr("class", "resource-availability not-available")
              .text("Not yet produced");
          }
        }
      }
    }

    const producers = fullEdges.filter(e => e.to === d.id && e.direction === "output");
    if (producers.length > 0) {
      panel.append("h3").text(`Produced by (${producers.length})`);
      renderProducerComparison(panel, d.id, producers, navigateToNode, appendRecipeWeightCtrl, attachResHover);
    }

    const consumers = fullEdges.filter(e => e.from === d.id && e.direction === "input");
    if (consumers.length > 0) {
      panel.append("h3").text(`Consumed by (${consumers.length})`);
      const ul = panel.append("ul");
      for (const c of consumers) {
        const building = fullNodes.get(c.to);
        const li = ul.append("li");
        appendResourceIcon(li, c.to);
        createNavLink(li, c.to, building.name, { bold: true });
        li.append("span").text(` ${formatRate(c.amount)}`);
      }
    }

    const constructionUses = fullEdges.filter(e => e.from === d.id && e.direction === "construction");
    if (constructionUses.length > 0) {
      panel.append("h3").text(`Construction (${constructionUses.length})`);
      const ul = panel.append("ul");
      for (const c of constructionUses) {
        const building = fullNodes.get(c.to);
        const li = ul.append("li");
        appendResourceIcon(li, c.to);
        createNavLink(li, c.to, building.name, { bold: true });
        li.append("span").text(` ${formatQuantity(c.amount)}`);
      }
    }

    const upgradeUses = fullEdges.filter(e => e.from === d.id && e.direction === "upgrade");
    if (upgradeUses.length > 0) {
      panel.append("h3").text(`Upgrades (${upgradeUses.length})`);
      const ul = panel.append("ul");
      for (const u of upgradeUses) {
        const building = fullNodes.get(u.to);
        const li = ul.append("li");
        appendResourceIcon(li, u.to);
        createNavLink(li, u.to, building.name, { bold: true });
        li.append("span").text(` ${formatQuantity(u.amount)} (${u.recipe})`);
      }
    }

    const depUses = fullEdges.filter(e => e.from === d.id && (e.direction === "equipment" || e.direction === "ammo" || e.direction === "sacrifice"));
    if (depUses.length > 0) {
      panel.append("h3").text(`Required By (${depUses.length})`);
      const ul = panel.append("ul");
      for (const dep of depUses) {
        const building = fullNodes.get(dep.to);
        const li = ul.append("li");
        appendResourceIcon(li, dep.to);
        createNavLink(li, dep.to, building ? building.name : dep.to, { bold: true });
        li.append("span").text(` (${dep.recipe})`);
      }
    }

    if (producers.length === 0) {
      panel.append("p").attr("class", "detail-empty-note").text("No verified producer.");
    }
    if (consumers.length === 0) {
      panel.append("p").attr("class", "detail-empty-note").text("No verified consumer.");
    }
  }
}

function createNavLink(parentSel, targetId, labelText, opts) {
  const isHidden = currentFilteredOutNodes.has(targetId);
  const link = parentSel.append("span")
    .attr("class", isHidden ? "nav-link nav-link-hidden" : "nav-link")
    .text(labelText);

  if (opts && opts.bold) link.style("font-weight", "bold");

  if (isHidden) {
    const info = currentFilteredOutNodes.get(targetId);
    link.attr("title", `Hidden: ${info.reason}`);
    parentSel.append("span").attr("class", "nav-link-hidden-reason").text("(hidden)");
    link.on("click", () => {
      const targetNode = fullNodes.get(targetId);
      if (targetNode) { pushBreadcrumb(targetNode); openDetailForNode(targetNode); }
    });
  } else {
    link.on("click", () => navigateToNode(targetId));
  }
  return link;
}

function appendResourceIcon(selection, resourceId) {
  const node = fullNodes.get(resourceId);
  if (node && node.icon) {
    selection.append("img")
      .attr("src", `data/icons/${node.icon}`)
      .attr("class", "inline-icon")
      .attr("alt", node.name);
  }
}

// ══════════════════════════════════════════════════════════
// Legend
// ══════════════════════════════════════════════════════════

function buildLegend() {
  const legend = document.getElementById("legend");
  legend.innerHTML = "";

  const resSection = document.createElement("div");
  resSection.className = "legend-section";
  resSection.innerHTML = '<span class="legend-section-label">Resources</span>';
  for (const [cat, color] of Object.entries(RESOURCE_COLORS)) {
    const item = document.createElement("div");
    item.className = "legend-item";
    item.innerHTML = `<span class="legend-circle" style="background: ${color};"></span>${capitalize(cat)}`;
    resSection.appendChild(item);
  }
  legend.appendChild(resSection);

  const divider = document.createElement("div");
  divider.className = "legend-divider";
  legend.appendChild(divider);

  const bldSection = document.createElement("div");
  bldSection.className = "legend-section";
  bldSection.innerHTML = '<span class="legend-section-label">Buildings</span>';
  for (const band of BAND_ORDER) {
    const color = BAND_COLORS[band];
    const item = document.createElement("div");
    item.className = "legend-item";
    item.innerHTML = `<span class="legend-rect" style="background: ${color};"></span>${capitalize(band)}`;
    bldSection.appendChild(item);
  }
  legend.appendChild(bldSection);

  const divider2 = document.createElement("div");
  divider2.className = "legend-divider";
  legend.appendChild(divider2);

  const edgeSection = document.createElement("div");
  edgeSection.className = "legend-section";
  edgeSection.innerHTML = `
    <span class="legend-section-label">Edges</span>
    <div class="legend-item"><span class="legend-line" style="background: rgba(90,120,160,0.5);"></span>Production</div>
    <div class="legend-item"><span class="legend-line legend-line-construction"></span>Construction</div>
    <div class="legend-item"><span class="legend-line legend-line-upgrade"></span>Upgrade</div>
  `;
  legend.appendChild(edgeSection);
}

function findName(nodes, id) {
  const n = nodes.get(id);
  return n ? n.name : id;
}

// ══════════════════════════════════════════════════════════
// City selector
// ══════════════════════════════════════════════════════════

function buildCitySelector(onFilterChange) {
  const container = document.getElementById("city-selector");
  container.innerHTML = "";

  const cities = getCities();
  const activeCityId = getActiveCityId();

  // Select dropdown
  const select = document.createElement("select");
  select.className = "city-select";
  select.setAttribute("aria-label", "Select city");

  const exploreOpt = document.createElement("option");
  exploreOpt.value = "";
  exploreOpt.textContent = "-- Explore --";
  if (!activeCityId) exploreOpt.selected = true;
  select.appendChild(exploreOpt);

  for (const city of cities) {
    const opt = document.createElement("option");
    opt.value = city.id;
    opt.textContent = city.name;
    if (city.id === activeCityId) opt.selected = true;
    select.appendChild(opt);
  }

  select.addEventListener("change", () => {
    if (select.value) {
      switchCity(select.value);
    } else {
      deactivateCity();
    }
    buildCitySelector(onFilterChange);
    onFilterChange();
  });
  container.appendChild(select);

  // New city button
  const addBtn = document.createElement("button");
  addBtn.className = "city-btn city-add-btn";
  addBtn.textContent = "+";
  addBtn.title = "Create new city";
  addBtn.addEventListener("click", () => {
    const name = prompt("City name:");
    if (!name || !name.trim()) return;
    createCity(name.trim());
    buildCitySelector(onFilterChange);
    onFilterChange();
  });
  container.appendChild(addBtn);

  // Import save button
  const importBtn = document.createElement("button");
  importBtn.className = "city-btn city-import-btn";
  importBtn.innerHTML = "&#x1F4C2;";
  importBtn.title = "Import from .save file";
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".save";
  fileInput.style.display = "none";
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;
    fileInput.value = "";
    try {
      const buf = await file.arrayBuffer();
      const result = await parseSaveFile(buf, file.name);
      showSaveImportModal(result, onFilterChange);
    } catch (err) {
      alert("Failed to parse save file: " + err.message);
    }
  });
  importBtn.addEventListener("click", () => fileInput.click());
  importBtn.appendChild(fileInput);
  container.appendChild(importBtn);

  // Rename/delete only when city is active
  if (activeCityId) {
    const renameBtn = document.createElement("button");
    renameBtn.className = "city-btn";
    renameBtn.textContent = "\u270E";
    renameBtn.title = "Rename city";
    renameBtn.addEventListener("click", () => {
      const current = getActiveCityName();
      const name = prompt("Rename city:", current || "");
      if (!name || !name.trim()) return;
      renameCity(activeCityId, name.trim());
      buildCitySelector(onFilterChange);
    });
    container.appendChild(renameBtn);

    const delBtn = document.createElement("button");
    delBtn.className = "city-btn city-del-btn";
    delBtn.textContent = "\u2715";
    delBtn.title = "Delete city";
    delBtn.addEventListener("click", () => {
      const cityName = getActiveCityName();
      if (!confirm(`Delete city "${cityName}"?`)) return;
      deleteCity(activeCityId);
      buildCitySelector(onFilterChange);
      onFilterChange();
    });
    container.appendChild(delBtn);
  }
}

// ══════════════════════════════════════════════════════════
// Save import modal
// ══════════════════════════════════════════════════════════

function showSaveImportModal(result, onFilterChange) {
  const { cityName, population, buildingIds } = result;

  // Group buildings by category using fullNodes
  const groups = new Map(); // category → [{id, name, icon}]
  for (const id of buildingIds) {
    const node = fullNodes.get(id);
    if (!node) continue;
    const cat = node.category || "unknown";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push({ id, name: node.name, icon: node.icon });
  }
  // Sort groups by category name, items by name within
  const sortedCats = [...groups.keys()].sort();
  for (const cat of sortedCats) groups.get(cat).sort((a, b) => a.name.localeCompare(b.name));

  // Build full resource list for manual selection when import depot detected
  const allResources = [];
  const hasImportDepot = buildingIds.includes("_import");
  if (hasImportDepot) {
    for (const [id, node] of fullNodes) {
      if (node.type === "resource") {
        allResources.push({ id, name: node.name, icon: node.icon, category: node.category });
      }
    }
    allResources.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Track checked state
  const buildingChecked = new Map();
  for (const id of buildingIds) buildingChecked.set(id, true);
  const resourceChecked = new Map();
  if (hasImportDepot) {
    for (const r of allResources) resourceChecked.set(r.id, false);
  }

  // Create overlay
  const overlay = document.createElement("div");
  overlay.className = "blueprint-overlay";

  const modal = document.createElement("div");
  modal.className = "blueprint-modal save-import-modal";
  modal.addEventListener("click", (e) => e.stopPropagation());

  // Header
  const header = document.createElement("div");
  header.className = "blueprint-header";
  const title = document.createElement("h3");
  title.textContent = "Import Save";
  header.appendChild(title);
  const closeX = document.createElement("button");
  closeX.className = "blueprint-close-x";
  closeX.textContent = "\u00D7";
  closeX.addEventListener("click", () => overlay.remove());
  header.appendChild(closeX);
  modal.appendChild(header);

  // City name input
  const nameRow = document.createElement("div");
  nameRow.className = "save-import-name-row";
  const nameLabel = document.createElement("label");
  nameLabel.textContent = "City name:";
  nameLabel.className = "save-import-label";
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.value = cityName;
  nameInput.className = "save-import-name-input";
  nameRow.appendChild(nameLabel);
  nameRow.appendChild(nameInput);
  modal.appendChild(nameRow);

  // Summary
  const summary = document.createElement("div");
  summary.className = "save-import-summary";
  const popStr = population != null ? ` (population: ${population.toLocaleString()})` : "";
  summary.textContent = `Found ${buildingIds.length} buildings${popStr}`;
  modal.appendChild(summary);

  // Scrollable body
  const body = document.createElement("div");
  body.className = "save-import-body";

  // Buildings section
  const bldSection = document.createElement("div");
  bldSection.className = "save-import-section";
  const bldHeader = document.createElement("div");
  bldHeader.className = "save-import-section-header";
  const bldTitle = document.createElement("span");
  bldTitle.textContent = "Buildings";
  bldTitle.className = "save-import-section-title";
  bldHeader.appendChild(bldTitle);
  const bldToggle = document.createElement("button");
  bldToggle.className = "save-import-toggle-btn";
  bldToggle.textContent = "Deselect All";
  let bldAllChecked = true;
  bldToggle.addEventListener("click", () => {
    bldAllChecked = !bldAllChecked;
    bldToggle.textContent = bldAllChecked ? "Deselect All" : "Select All";
    for (const id of buildingChecked.keys()) buildingChecked.set(id, bldAllChecked);
    bldSection.querySelectorAll("input[type=checkbox]").forEach(cb => { cb.checked = bldAllChecked; });
  });
  bldHeader.appendChild(bldToggle);
  bldSection.appendChild(bldHeader);

  for (const cat of sortedCats) {
    const items = groups.get(cat);
    const catGroup = document.createElement("div");
    catGroup.className = "save-import-cat-group";
    const catLabel = document.createElement("div");
    catLabel.className = "save-import-cat-label";
    catLabel.textContent = `${capitalize(cat)} (${items.length})`;
    const color = BUILDING_COLORS[cat];
    if (color) catLabel.style.borderLeftColor = color;
    catGroup.appendChild(catLabel);

    const grid = document.createElement("div");
    grid.className = "save-import-grid";
    for (const item of items) {
      const label = document.createElement("label");
      label.className = "save-import-item";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = true;
      cb.addEventListener("change", () => buildingChecked.set(item.id, cb.checked));
      label.appendChild(cb);
      if (item.icon) {
        const img = document.createElement("img");
        img.src = `data/icons/${item.icon}`;
        img.alt = item.name;
        img.className = "save-import-icon";
        label.appendChild(img);
      }
      const span = document.createElement("span");
      span.textContent = item.name;
      label.appendChild(span);
      grid.appendChild(label);
    }
    catGroup.appendChild(grid);
    bldSection.appendChild(catGroup);
  }
  body.appendChild(bldSection);

  // Resources section (only if import depot detected)
  if (hasImportDepot) {
    const resSection = document.createElement("div");
    resSection.className = "save-import-section";
    const resHeader = document.createElement("div");
    resHeader.className = "save-import-section-header";
    const resTitle = document.createElement("span");
    resTitle.className = "save-import-section-title";
    resTitle.textContent = "Imported Resources";
    resHeader.appendChild(resTitle);
    const resHint = document.createElement("span");
    resHint.className = "save-import-hint";
    resHint.textContent = "Check resources your city imports";
    resHeader.appendChild(resHint);
    const resToggle = document.createElement("button");
    resToggle.className = "save-import-toggle-btn";
    let resAllChecked = false;
    resToggle.textContent = "Select All";
    resToggle.addEventListener("click", () => {
      resAllChecked = !resAllChecked;
      resToggle.textContent = resAllChecked ? "Deselect All" : "Select All";
      for (const id of resourceChecked.keys()) resourceChecked.set(id, resAllChecked);
      resSection.querySelectorAll("input[type=checkbox]").forEach(cb => { cb.checked = resAllChecked; });
    });
    resHeader.appendChild(resToggle);
    resSection.appendChild(resHeader);

    const resGrid = document.createElement("div");
    resGrid.className = "save-import-grid";
    for (const r of allResources) {
      const label = document.createElement("label");
      label.className = "save-import-item";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = resourceChecked.get(r.id) || false;
      cb.addEventListener("change", () => resourceChecked.set(r.id, cb.checked));
      label.appendChild(cb);
      if (r.icon) {
        const img = document.createElement("img");
        img.src = `data/icons/${r.icon}`;
        img.alt = r.name;
        img.className = "save-import-icon";
        label.appendChild(img);
      }
      const span = document.createElement("span");
      span.textContent = r.name;
      label.appendChild(span);
      resGrid.appendChild(label);
    }
    resSection.appendChild(resGrid);
    body.appendChild(resSection);
  }

  modal.appendChild(body);

  // Footer buttons
  const footer = document.createElement("div");
  footer.className = "save-import-footer";
  const cancelBtn = document.createElement("button");
  cancelBtn.className = "save-import-cancel-btn";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", () => overlay.remove());
  footer.appendChild(cancelBtn);
  const confirmBtn = document.createElement("button");
  confirmBtn.className = "save-import-confirm-btn";
  confirmBtn.textContent = "Import";
  confirmBtn.addEventListener("click", () => {
    const bStates = {};
    for (const [id, checked] of buildingChecked) {
      if (checked) bStates[id] = "built";
    }
    const rStates = {};
    for (const [id, checked] of resourceChecked) {
      if (checked) rStates[id] = "bought";
    }
    const name = nameInput.value.trim() || cityName;
    importCity(name, bStates, rStates);
    overlay.remove();
    buildCitySelector(onFilterChange);
    onFilterChange();
  });
  footer.appendChild(confirmBtn);
  modal.appendChild(footer);

  overlay.appendChild(modal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
  nameInput.focus();
  nameInput.select();
}

// ══════════════════════════════════════════════════════════
// First-visit onboarding
// ══════════════════════════════════════════════════════════

let onboardingHintEl = null;

function showOnboarding() {
  if (localStorage.getItem("syx-vis-onboarded")) return;

  // Floating hint pill
  onboardingHintEl = document.createElement("div");
  onboardingHintEl.className = "onboarding-hint";
  onboardingHintEl.innerHTML = `
    <span class="onboarding-hint-icon">\u{1F446}</span>
    <span class="onboarding-hint-text">Click any node to explore</span>
    <button class="onboarding-hint-close">\u00D7</button>
  `;
  document.body.appendChild(onboardingHintEl);

  onboardingHintEl.querySelector(".onboarding-hint-close").addEventListener("click", () => {
    dismissOnboarding();
  });

  // Pulse the first extraction building as an onboarding hint
  for (const [_id, entry] of nodeGfxMap) {
    if (entry.data.category === "extraction" && entry.data.type === "building") {
      doHighlightPulse(entry);
      break;
    }
  }
}

function dismissOnboarding() {
  localStorage.setItem("syx-vis-onboarded", "1");
  if (onboardingHintEl) {
    onboardingHintEl.classList.add("dismissing");
    onboardingHintEl.addEventListener("animationend", () => {
      onboardingHintEl.remove();
      onboardingHintEl = null;
    });
  }
}

// ══════════════════════════════════════════════════════════
// Main entry point
// ══════════════════════════════════════════════════════════

const yieldToMain = () => new Promise(r => setTimeout(r, 0));

export async function render(setStatus) {
  const status = typeof setStatus === "function" ? setStatus : () => {};

  status("Building graph\u2026");
  const { nodes, edges } = buildGraph();
  fullNodes = nodes;
  fullEdges = edges;

  // Build producer/consumer maps
  producersByResource = new Map();
  consumersByResource = new Map();
  for (const e of fullEdges) {
    if (e.direction === "output" && e.recipeId) {
      const building = fullNodes.get(e.from);
      if (!producersByResource.has(e.to)) producersByResource.set(e.to, []);
      producersByResource.get(e.to).push({
        recipeId: e.recipeId,
        buildingId: e.from,
        buildingName: building ? building.name : e.from,
        buildingIcon: building ? building.icon : null,
        recipeName: e.recipe,
        amount: e.amount,
      });
    }
    if (e.direction === "input" && e.recipeId) {
      const building = fullNodes.get(e.to);
      if (!consumersByResource.has(e.from)) consumersByResource.set(e.from, []);
      consumersByResource.get(e.from).push({
        buildingId: e.to,
        buildingName: building ? building.name : e.to,
        buildingIcon: building ? building.icon : null,
        recipeName: e.recipe,
        amount: e.amount,
      });
    }
  }

  await yieldToMain();

  // Initialize renderer (creates WebGL context first)
  status("Initializing renderer\u2026");
  await initRenderer();

  // Pause rendering while building the scene
  app.stage.visible = false;
  app.ticker.stop();

  // Preload icons (batched, after WebGL context exists)
  status("Loading icons\u2026");
  await preloadIcons(fullNodes);
  buildLegend();

  await yieldToMain();

  // Full layout positions
  status("Computing layout\u2026");
  const allEdges = edges.filter(e => e.direction !== "upgrade");
  fullLayoutPositions = computeLayout(nodes, allEdges, allEdges);

  await yieldToMain();

  status("Building filters\u2026");
  const onFilterChange = () => {
    recomputeCitySets();
    const hasWhatIf = whatIfResources || whatIfBuildings || whatIfUpgrades;
    const whatIfIds = hasWhatIf
      ? new Set([...(whatIfResources || []), ...(whatIfBuildings || []), ...(whatIfUpgrades || [])])
      : null;
    const { nodes: filteredNodes, edges: filteredEdges, layoutEdges, filteredOutNodes, filteredOutEdges } = applyFilters(fullNodes, fullEdges, whatIfIds);
    updateGraph(filteredNodes, filteredEdges, layoutEdges, filteredOutNodes, filteredOutEdges);
    // Rebuild city selector to reflect state changes
    buildCitySelector(onFilterChange);
  };

  buildCitySelector(onFilterChange);
  buildFilterPanel(fullNodes, fullEdges, onFilterChange, (id) => navigateToNode(id));

  await yieldToMain();

  // Initial render
  status("Rendering graph\u2026");
  recomputeCitySets();
  const initial = applyFilters(fullNodes, fullEdges);
  updateGraph(initial.nodes, initial.edges, initial.layoutEdges, initial.filteredOutNodes, initial.filteredOutEdges);

  // Remove SEO placeholder now that graph is rendered
  const seoDiv = document.querySelector("#view-graph .seo-content");
  if (seoDiv) seoDiv.remove();

  // Reveal — graph is fully built and zoom-to-fit already applied
  app.stage.visible = true;
  app.ticker.start();

  // First-visit onboarding
  showOnboarding();
}
