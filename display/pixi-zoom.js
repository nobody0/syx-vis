// PixiJS zoom & pan controller: wheel zoom, pointer drag, animated transitions

/**
 * @typedef {Object} ZoomState
 * @property {number} x - world container X offset
 * @property {number} y - world container Y offset
 * @property {number} scale - current zoom scale
 * @property {import('pixi.js').Container} container - the world container to transform
 * @property {HTMLCanvasElement} canvas - the canvas element for event binding
 * @property {number} minScale
 * @property {number} maxScale
 * @property {((scale: number) => void)|null} onZoom - callback after any zoom change
 */

/**
 * Create a zoom controller for a PixiJS container.
 * @param {import('pixi.js').Container} container - world container to apply transforms to
 * @param {HTMLCanvasElement} canvas - canvas element for pointer events
 * @param {object} [opts]
 * @param {number} [opts.minScale=0.1]
 * @param {number} [opts.maxScale=4]
 * @param {(scale: number) => void} [opts.onZoom]
 * @returns {ZoomController}
 */
export function createZoomController(container, canvas, opts = {}) {
  const state = {
    x: 0,
    y: 0,
    scale: 1,
    container,
    canvas,
    minScale: opts.minScale ?? 0.1,
    maxScale: opts.maxScale ?? 4,
    onZoom: opts.onZoom ?? null,
  };

  // Drag state
  let dragging = false;
  let wasDragged = false; // true if pointer moved beyond threshold during drag
  let dragStartX = 0;
  let dragStartY = 0;
  let dragContainerX = 0;
  let dragContainerY = 0;
  const DRAG_THRESHOLD = 4; // px — ignore taps that moved less than this

  // Animation state
  let animationId = null;

  function applyTransform() {
    container.position.set(state.x, state.y);
    container.scale.set(state.scale);
    if (state.onZoom) state.onZoom(state.scale);
  }

  function cancelAnimation() {
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  // ── Wheel zoom (zoom toward cursor) ──
  function onWheel(e) {
    e.preventDefault();
    cancelAnimation();

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // World point under cursor before zoom
    const worldX = (mouseX - state.x) / state.scale;
    const worldY = (mouseY - state.y) / state.scale;

    // Apply zoom
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const newScale = Math.min(state.maxScale, Math.max(state.minScale, state.scale * factor));
    state.scale = newScale;

    // Adjust position so world point stays under cursor
    state.x = mouseX - worldX * newScale;
    state.y = mouseY - worldY * newScale;

    applyTransform();
  }

  // ── Pinch-to-zoom (multi-touch) ──
  const activePointers = new Map(); // pointerId → {x, y}
  let pinching = false;
  let pinchStartDist = 0;
  let pinchStartScale = 1;
  let pinchStartX = 0;  // container X at pinch start
  let pinchStartY = 0;
  let pinchMidX = 0;    // screen midpoint at pinch start
  let pinchMidY = 0;

  function pointerDist() {
    const pts = [...activePointers.values()];
    if (pts.length < 2) return 0;
    const dx = pts[0].x - pts[1].x;
    const dy = pts[0].y - pts[1].y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function pointerMid() {
    const pts = [...activePointers.values()];
    if (pts.length < 2) return { x: 0, y: 0 };
    return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
  }

  // ── Pointer drag ──
  function onPointerDown(e) {
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Start pinch when 2 fingers are down
    if (activePointers.size === 2) {
      pinching = true;
      dragging = false;
      pinchStartDist = pointerDist();
      pinchStartScale = state.scale;
      pinchStartX = state.x;
      pinchStartY = state.y;
      const mid = pointerMid();
      pinchMidX = mid.x;
      pinchMidY = mid.y;
      cancelAnimation();
      return;
    }

    // Only drag on middle button or left button when not on interactive child
    if (e.button !== 0 && e.button !== 1) return;
    if (pinching) return;
    dragging = true;
    wasDragged = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragContainerX = state.x;
    dragContainerY = state.y;
    canvas.style.cursor = "grabbing";
    cancelAnimation();
  }

  function onPointerMove(e) {
    if (activePointers.has(e.pointerId)) {
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Pinch zoom
    if (pinching && activePointers.size >= 2) {
      const dist = pointerDist();
      if (pinchStartDist > 0) {
        const rect = canvas.getBoundingClientRect();
        const factor = dist / pinchStartDist;
        const newScale = Math.min(state.maxScale, Math.max(state.minScale, pinchStartScale * factor));

        // Zoom toward pinch midpoint
        const worldX = (pinchMidX - rect.left - pinchStartX) / pinchStartScale;
        const worldY = (pinchMidY - rect.top - pinchStartY) / pinchStartScale;
        state.scale = newScale;
        state.x = (pinchMidX - rect.left) - worldX * newScale;
        state.y = (pinchMidY - rect.top) - worldY * newScale;

        // Also pan with midpoint movement
        const mid = pointerMid();
        state.x += mid.x - pinchMidX;
        state.y += mid.y - pinchMidY;

        applyTransform();
      }
      return;
    }

    if (!dragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    if (!wasDragged && (dx * dx + dy * dy) > DRAG_THRESHOLD * DRAG_THRESHOLD) {
      wasDragged = true;
    }
    state.x = dragContainerX + dx;
    state.y = dragContainerY + dy;
    applyTransform();
  }

  function onPointerUp(e) {
    activePointers.delete(e.pointerId);
    if (pinching) {
      if (activePointers.size < 2) {
        pinching = false;
        wasDragged = true; // prevent tap after pinch
      }
      return;
    }
    if (dragging) {
      dragging = false;
      canvas.style.cursor = "";
    }
  }

  // Bind events
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.style.touchAction = "none"; // prevent browser pan/zoom on touch
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);

  /** @type {ZoomController} */
  const ctrl = {
    get scale() { return state.scale; },
    get x() { return state.x; },
    get y() { return state.y; },
    get isDragging() { return dragging; },
    get wasDragged() { return wasDragged; },

    /**
     * Zoom by a factor, centered on the canvas center.
     * @param {number} factor
     * @param {boolean} [animate=true]
     */
    zoomBy(factor, animate = true) {
      const rect = canvas.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const worldX = (cx - state.x) / state.scale;
      const worldY = (cy - state.y) / state.scale;
      const targetScale = Math.min(state.maxScale, Math.max(state.minScale, state.scale * factor));
      const targetX = cx - worldX * targetScale;
      const targetY = cy - worldY * targetScale;

      if (animate) {
        ctrl.animateTo(targetX, targetY, targetScale, 300);
      } else {
        state.scale = targetScale;
        state.x = targetX;
        state.y = targetY;
        applyTransform();
      }
    },

    /**
     * Animate to target transform.
     * @param {number} targetX
     * @param {number} targetY
     * @param {number} targetScale
     * @param {number} [duration=500]
     * @returns {Promise<void>}
     */
    animateTo(targetX, targetY, targetScale, duration = 500) {
      cancelAnimation();
      const startX = state.x;
      const startY = state.y;
      const startScale = state.scale;
      const startTime = performance.now();

      return new Promise((resolve) => {
        function step(now) {
          const elapsed = now - startTime;
          const t = Math.min(elapsed / duration, 1);
          // Ease in-out quadratic
          const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

          state.x = startX + (targetX - startX) * ease;
          state.y = startY + (targetY - startY) * ease;
          state.scale = startScale + (targetScale - startScale) * ease;
          applyTransform();

          if (t < 1) {
            animationId = requestAnimationFrame(step);
          } else {
            animationId = null;
            resolve();
          }
        }
        animationId = requestAnimationFrame(step);
      });
    },

    /**
     * Set transform instantly (no animation).
     * @param {number} x
     * @param {number} y
     * @param {number} scale
     */
    setTransform(x, y, scale) {
      cancelAnimation();
      state.x = x;
      state.y = y;
      state.scale = scale;
      applyTransform();
    },

    /**
     * Zoom to fit a bounding box in the viewport.
     * @param {{x: number, y: number, width: number, height: number}} bbox
     * @param {number} [padding=60]
     * @param {boolean} [animate=true]
     * @returns {Promise<void>|void}
     */
    zoomToFit(bbox, padding = 60, animate = true) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width / (bbox.width + padding * 2);
      const scaleY = rect.height / (bbox.height + padding * 2);
      const scale = Math.min(scaleX, scaleY, 1.2);
      const tx = (rect.width - bbox.width * scale) / 2 - bbox.x * scale;
      const ty = (rect.height - bbox.height * scale) / 2 - bbox.y * scale;

      if (animate) {
        return ctrl.animateTo(tx, ty, scale, 500);
      } else {
        ctrl.setTransform(tx, ty, scale);
      }
    },

    /**
     * Navigate to a world position (center it in viewport).
     * @param {number} worldX
     * @param {number} worldY
     * @param {number} [duration=500]
     * @returns {Promise<void>}
     */
    panTo(worldX, worldY, duration = 500) {
      const rect = canvas.getBoundingClientRect();
      const scale = Math.max(state.scale, 0.8);
      const tx = rect.width / 2 - worldX * scale;
      const ty = rect.height / 2 - worldY * scale;
      return ctrl.animateTo(tx, ty, scale, duration);
    },

    /**
     * Get world coordinates from screen position.
     * @param {number} screenX
     * @param {number} screenY
     * @returns {{x: number, y: number}}
     */
    screenToWorld(screenX, screenY) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (screenX - rect.left - state.x) / state.scale,
        y: (screenY - rect.top - state.y) / state.scale,
      };
    },

    /**
     * Get screen coordinates from world position.
     * @param {number} worldX
     * @param {number} worldY
     * @returns {{x: number, y: number}}
     */
    worldToScreen(worldX, worldY) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: worldX * state.scale + state.x + rect.left,
        y: worldY * state.scale + state.y + rect.top,
      };
    },

    /**
     * Get the viewport center in world coordinates.
     * @returns {{x: number, y: number}}
     */
    getViewportCenter() {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (rect.width / 2 - state.x) / state.scale,
        y: (rect.height / 2 - state.y) / state.scale,
      };
    },

    /**
     * Destroy all event listeners.
     */
    destroy() {
      cancelAnimation();
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    },
  };

  return ctrl;
}

/**
 * @typedef {ReturnType<typeof createZoomController>} ZoomController
 */
