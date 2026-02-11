// PixiJS edge drawing utilities: bezier sampling, dashed curves, arrowheads

/**
 * Compute cubic bezier control points matching layout.js edgePath convention.
 * @param {number} fromX
 * @param {number} fromY
 * @param {number} toX
 * @param {number} toY
 * @returns {{cx1: number, cy1: number, cx2: number, cy2: number}}
 */
export function bezierControls(fromX, fromY, toX, toY) {
  const dx = toX - fromX;
  return {
    cx1: fromX + dx * 0.4,
    cy1: fromY,
    cx2: toX - dx * 0.4,
    cy2: toY,
  };
}

/**
 * Evaluate cubic bezier at parameter t.
 * @param {number} fromX
 * @param {number} fromY
 * @param {number} toX
 * @param {number} toY
 * @param {number} t
 * @returns {{x: number, y: number}}
 */
export function bezierAt(fromX, fromY, toX, toY, t) {
  const { cx1, cy1, cx2, cy2 } = bezierControls(fromX, fromY, toX, toY);
  const t1 = 1 - t;
  return {
    x: t1 * t1 * t1 * fromX + 3 * t1 * t1 * t * cx1 + 3 * t1 * t * t * cx2 + t * t * t * toX,
    y: t1 * t1 * t1 * fromY + 3 * t1 * t1 * t * cy1 + 3 * t1 * t * t * cy2 + t * t * t * toY,
  };
}

/**
 * Sample a bezier curve into an array of points.
 * @param {number} fromX
 * @param {number} fromY
 * @param {number} toX
 * @param {number} toY
 * @param {number} [segments=80]
 * @returns {{x: number, y: number}[]}
 */
export function sampleBezier(fromX, fromY, toX, toY, segments = 80) {
  const points = [];
  for (let i = 0; i <= segments; i++) {
    points.push(bezierAt(fromX, fromY, toX, toY, i / segments));
  }
  return points;
}

/**
 * Draw a solid bezier curve using Graphics.bezierCurveTo.
 * @param {import('pixi.js').Graphics} g
 * @param {number} fromX
 * @param {number} fromY
 * @param {number} toX
 * @param {number} toY
 */
export function drawSolidBezier(g, fromX, fromY, toX, toY) {
  const { cx1, cy1, cx2, cy2 } = bezierControls(fromX, fromY, toX, toY);
  g.moveTo(fromX, fromY);
  g.bezierCurveTo(cx1, cy1, cx2, cy2, toX, toY);
}

/**
 * Draw a dashed bezier curve along sampled points.
 * @param {import('pixi.js').Graphics} g
 * @param {{x: number, y: number}[]} points - sampled curve points
 * @param {number[]} pattern - dash/gap lengths, e.g. [6, 3]
 * @param {number} [offset=0] - dash offset for animation
 */
export function drawDashedCurve(g, points, pattern, offset = 0) {
  if (points.length < 2) return;

  // Compute cumulative arc-length for each point
  const distances = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    distances.push(distances[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  const totalLen = distances[distances.length - 1];
  if (totalLen < 1) return;

  const patternLen = pattern.reduce((a, b) => a + b, 0);
  if (patternLen <= 0) return;

  // Normalise offset to [0, patternLen)
  let pos = ((offset % patternLen) + patternLen) % patternLen;
  let patIdx = 0;
  let drawing = true;
  // Fast-forward through pattern to account for offset
  while (pos > 0) {
    if (pos < pattern[patIdx]) {
      break;
    }
    pos -= pattern[patIdx];
    patIdx = (patIdx + 1) % pattern.length;
    drawing = !drawing;
  }
  let remaining = pattern[patIdx] - pos;

  let ptIdx = 0;
  let curDist = 0;

  while (ptIdx < points.length - 1) {
    const segEnd = curDist + remaining;

    if (drawing) {
      g.moveTo(points[ptIdx].x, points[ptIdx].y);
    }

    // Walk forward along points until we've consumed `remaining` distance
    while (ptIdx < points.length - 1 && distances[ptIdx + 1] <= segEnd) {
      ptIdx++;
      if (drawing) {
        g.lineTo(points[ptIdx].x, points[ptIdx].y);
      }
    }

    // Interpolate to exact segment end if between two points
    if (ptIdx < points.length - 1 && segEnd < distances[ptIdx + 1]) {
      const frac = (segEnd - distances[ptIdx]) / (distances[ptIdx + 1] - distances[ptIdx]);
      const ix = points[ptIdx].x + (points[ptIdx + 1].x - points[ptIdx].x) * frac;
      const iy = points[ptIdx].y + (points[ptIdx + 1].y - points[ptIdx].y) * frac;
      if (drawing) {
        g.lineTo(ix, iy);
      }
    }

    curDist = segEnd;
    patIdx = (patIdx + 1) % pattern.length;
    drawing = !drawing;
    remaining = pattern[patIdx];
  }
}

/**
 * Dash patterns for each edge direction type.
 * @type {Record<string, number[]>}
 */
export const DASH_PATTERNS = {
  construction: [14, 5],
  upgrade: [12, 5],
  equipment: [10, 4, 3, 4],
  ammo: [10, 4, 3, 4],
  sacrifice: [10, 4, 3, 4],
  synthetic: [6, 8],
};

/**
 * Edge color for each direction type.
 * Warmer tones for production flow, cooler for infrastructure.
 * @type {Record<string, number>}
 */
export const EDGE_COLORS = {
  input: 0x6890b8,
  output: 0x6890b8,
  construction: 0x58a0d8,
  upgrade: 0x9870d0,
  equipment: 0xe0a850,
  ammo: 0xe06868,
  sacrifice: 0xd05898,
  synthetic: 0x586878,
  area: 0x6890b8,
};

/**
 * Edge alpha for each direction type.
 * @type {Record<string, number>}
 */
export const EDGE_ALPHAS = {
  input: 0.40,
  output: 0.40,
  construction: 0.38,
  upgrade: 0.40,
  equipment: 0.40,
  ammo: 0.40,
  sacrifice: 0.40,
  synthetic: 0.20,
  area: 0.38,
};

/**
 * Assign edge connection ports along node boundaries.
 * Groups edges by node + side (left/right), sorts by the Y of the node at the
 * other end, then distributes connection points evenly along the node boundary.
 *
 * @param {Array<{v: string, w: string, fromPos: {x: number, y: number}, toPos: {x: number, y: number}, direction: string}>} edgeData
 * @param {Map<string, Object>} nodes - node map (need .type)
 * @param {number} buildingW - building width
 * @param {number} buildingH - building height
 * @param {number} resourceR - resource radius
 * @returns {Array<{fromX: number, fromY: number, toX: number, toY: number}>} adjusted endpoints per edge (same indices as edgeData)
 */
export function assignEdgePorts(edgeData, nodes, buildingW, buildingH, resourceR) {
  const hw = buildingW / 2;
  const MIN_SPACING = 3;
  const MARGIN = 6; // px from corners of building rects
  const ARC_SPREAD = Math.PI / 4; // ±45° from horizontal for resource ports

  // Result array — default to center-to-center
  const result = edgeData.map(d => ({
    fromX: d.fromPos ? d.fromPos.x : 0,
    fromY: d.fromPos ? d.fromPos.y : 0,
    toX: d.toPos ? d.toPos.x : 0,
    toY: d.toPos ? d.toPos.y : 0,
  }));

  // Group edges by (nodeId, side) where side = "left" or "right"
  // Each edge contributes two entries: one for its "from" node and one for its "to" node
  // key = "nodeId:side"
  const portGroups = new Map(); // key → [{edgeIdx, end: "from"|"to", otherY}]

  for (let i = 0; i < edgeData.length; i++) {
    const d = edgeData[i];
    if (!d.fromPos || !d.toPos) continue;

    const dx = d.toPos.x - d.fromPos.x;
    // Determine side based on relative position
    // For the "from" node: edge exits toward "to", so if dx > 0 → right side, else left
    const fromSide = dx >= 0 ? "right" : "left";
    const toSide = dx >= 0 ? "left" : "right";

    const fromKey = `${d.v}:${fromSide}`;
    const toKey = `${d.w}:${toSide}`;

    if (!portGroups.has(fromKey)) portGroups.set(fromKey, []);
    portGroups.get(fromKey).push({ edgeIdx: i, end: "from", otherY: d.toPos.y, otherX: d.toPos.x });

    if (!portGroups.has(toKey)) portGroups.set(toKey, []);
    portGroups.get(toKey).push({ edgeIdx: i, end: "to", otherY: d.fromPos.y, otherX: d.fromPos.x });
  }

  // For each port group, sort by otherY and distribute ports
  for (const [key, group] of portGroups) {
    if (group.length === 0) continue;
    const [nodeId, side] = key.split(":");
    const node = nodes.get(nodeId);
    if (!node) continue;

    // Sort by Y position of the other end (stable edge ordering)
    group.sort((a, b) => a.otherY - b.otherY || a.otherX - b.otherX);

    const edgeIdx0 = group[0].edgeIdx;
    const d0 = edgeData[edgeIdx0];
    const end0 = group[0].end;
    const nodePos = end0 === "from" ? d0.fromPos : d0.toPos;
    if (!nodePos) continue;

    if (node.type === "resource") {
      // Distribute along an arc: ±ARC_SPREAD from horizontal
      const centerAngle = side === "right" ? 0 : Math.PI;
      const arcLen = ARC_SPREAD * 2; // total arc span
      const n = group.length;

      for (let j = 0; j < n; j++) {
        // Evenly space within the arc
        const t = n === 1 ? 0.5 : j / (n - 1);
        const angle = centerAngle - ARC_SPREAD + t * arcLen;
        const px = nodePos.x + Math.cos(angle) * resourceR;
        const py = nodePos.y + Math.sin(angle) * resourceR;

        const entry = group[j];
        if (entry.end === "from") {
          result[entry.edgeIdx].fromX = px;
          result[entry.edgeIdx].fromY = py;
        } else {
          result[entry.edgeIdx].toX = px;
          result[entry.edgeIdx].toY = py;
        }
      }
    } else {
      // Building: distribute along left or right edge
      const usableHeight = buildingH - 2 * MARGIN;
      const n = group.length;
      const spacing = Math.max(MIN_SPACING, usableHeight / Math.max(n - 1, 1));
      const totalSpan = Math.min(spacing * (n - 1), usableHeight);
      const startOffset = -totalSpan / 2;

      const edgeX = side === "right" ? nodePos.x + hw : nodePos.x - hw;

      for (let j = 0; j < n; j++) {
        const py = nodePos.y + startOffset + j * (n === 1 ? 0 : totalSpan / (n - 1));

        const entry = group[j];
        if (entry.end === "from") {
          result[entry.edgeIdx].fromX = edgeX;
          result[entry.edgeIdx].fromY = py;
        } else {
          result[entry.edgeIdx].toX = edgeX;
          result[entry.edgeIdx].toY = py;
        }
      }
    }
  }

  return result;
}

/**
 * Draw an arrowhead at the end of a curve.
 * Narrower kite shape for a sleeker look.
 * @param {import('pixi.js').Graphics} g
 * @param {{x: number, y: number}[]} points - sampled curve points (uses last 2)
 * @param {number} color
 * @param {number} alpha
 * @param {number} [size=7]
 */
export function drawArrowhead(g, points, color, alpha, size = 7) {
  if (points.length < 2) return;
  const p1 = points[points.length - 2];
  const p2 = points[points.length - 1];
  const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

  const tipX = p2.x;
  const tipY = p2.y;
  // Narrower spread angle (PI/7 ≈ 25.7° vs PI/6 ≈ 30°)
  const spread = Math.PI / 7;
  const baseX1 = tipX - Math.cos(angle - spread) * size;
  const baseY1 = tipY - Math.sin(angle - spread) * size;
  const baseX2 = tipX - Math.cos(angle + spread) * size;
  const baseY2 = tipY - Math.sin(angle + spread) * size;
  // Indent point for kite shape
  const indentX = tipX - Math.cos(angle) * (size * 0.55);
  const indentY = tipY - Math.sin(angle) * (size * 0.55);

  g.moveTo(tipX, tipY);
  g.lineTo(baseX1, baseY1);
  g.lineTo(indentX, indentY);
  g.lineTo(baseX2, baseY2);
  g.closePath();
  g.fill({ color, alpha });
}

