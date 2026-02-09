// Tab switching logic – lazy-initializes each tab's content on first switch
import { pushTabRoute } from "./router.js";

const initialized = new Set();

/** Whether renderPlanner() has completed (distinct from initialized which guards double-load). */
let plannerReady = false;

const TAB_KEYS = { "1": "graph", "2": "population", "3": "upkeep", "4": "balancing", "5": "planner" };

/** Pending plan data to restore after planner lazy-init completes. */
let pendingPlanRestore = null;

const LS_KEY = "syx-vis-planner-state";

export function initTabs() {
  const tabBar = document.getElementById("tab-bar");
  tabBar.addEventListener("click", async (e) => {
    const btn = e.target.closest(".tab");
    if (!btn) return;
    const tabId = btn.dataset.tab;
    await switchTab(tabId);
    pushTabRoute(tabId);
  });

  // Alt+1/2/3/4/5 keyboard shortcuts for tab switching
  document.addEventListener("keydown", async (e) => {
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    const tabId = TAB_KEYS[e.key];
    if (tabId) {
      e.preventDefault();
      await switchTab(tabId);
      pushTabRoute(tabId);
    }
  });
}

/**
 * Switch to a tab by ID. Exported so the router can call it directly.
 * @param {string} tabId
 */
export async function switchTab(tabId) {
  // Update tab buttons
  for (const btn of document.querySelectorAll("#tab-bar .tab")) {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  }

  // Update view containers
  for (const view of document.querySelectorAll(".view")) {
    view.classList.toggle("active", view.id === `view-${tabId}`);
  }

  // Lazy-init tab content on first switch
  if (tabId !== "graph" && !initialized.has(tabId)) {
    initialized.add(tabId);
    try {
      if (tabId === "population") {
        const { renderPopulation } = await import("./population.js");
        renderPopulation(document.getElementById("view-population"));
      } else if (tabId === "upkeep") {
        const { renderUpkeep } = await import("./upkeep.js");
        renderUpkeep(document.getElementById("view-upkeep"));
      } else if (tabId === "balancing") {
        const { renderBalancing } = await import("./balancing.js");
        renderBalancing(document.getElementById("view-balancing"));
      } else if (tabId === "planner") {
        const { renderPlanner } = await import("./planner.js");
        renderPlanner(document.getElementById("view-planner"));
        plannerReady = true;
        // Apply pending plan restore if the router queued one before init
        if (pendingPlanRestore) {
          const data = pendingPlanRestore;
          pendingPlanRestore = null;
          const { deserializePlan } = await import("./planner.js");
          const result = await deserializePlan(data);
          if (!result.ok) {
            const fallback = tryLocalStorageFallback();
            if (fallback) {
              const r2 = await deserializePlan(fallback);
              if (!r2.ok) showPlanRestoreError(r2.error || "Could not restore plan");
            } else {
              showPlanRestoreError(result.error || "Could not restore plan");
            }
          }
        }
      }
    } catch (err) {
      console.error(`Failed to load tab "${tabId}":`, err);
      const container = document.getElementById(`view-${tabId}`);
      const errDiv = document.createElement("div");
      errDiv.className = "calc-content";
      const errP = document.createElement("p");
      errP.style.color = "var(--state-ignored)";
      errP.textContent = `Failed to load: ${err.message}`;
      errDiv.appendChild(errP);
      container.replaceChildren(errDiv);
    }
  }
}

/**
 * Restore a planner layout from encoded URL data.
 * If planner isn't ready yet, queues the restore for after init.
 * @param {string} encoded
 */
export async function restorePlan(encoded) {
  if (!plannerReady) {
    pendingPlanRestore = encoded;
    return;
  }
  try {
    const { deserializePlan } = await import("./planner.js");
    const result = await deserializePlan(encoded);
    if (!result.ok) {
      const fallback = tryLocalStorageFallback();
      if (fallback) {
        const r2 = await deserializePlan(fallback);
        if (!r2.ok) showPlanRestoreError(r2.error || "Could not restore plan");
      } else {
        showPlanRestoreError(result.error || "Could not restore plan");
      }
    }
  } catch (err) {
    console.warn("Failed to restore plan from URL:", err);
    showPlanRestoreError(err.message || "Could not restore plan");
  }
}

/**
 * Try to read a fallback plan from localStorage.
 * @returns {string|null}
 */
function tryLocalStorageFallback() {
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (!stored) return null;
    // Quick validation: must be base64url decodable with a known version byte
    if (isValidPlanData(stored)) return stored;
  } catch { /* ignore */ }
  return null;
}

/**
 * Check if encoded data looks like valid plan data (base64url with known version byte or JSON).
 * @param {string} encoded
 * @returns {boolean}
 */
function isValidPlanData(encoded) {
  try {
    const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded);
    if (binary.length === 0) return false;
    const first = binary.charCodeAt(0);
    // 0x01 = uncompressed binary, 0x02 = compressed binary, 0x7B = legacy JSON
    return first === 0x01 || first === 0x02 || first === 0x7B;
  } catch {
    return false;
  }
}

/**
 * Show a dismissible error banner at the top of the planner view.
 * @param {string} message
 */
function showPlanRestoreError(message) {
  const container = document.getElementById("view-planner");
  if (!container) return;
  // Remove any existing error banner
  const existing = container.querySelector(".plan-restore-error");
  if (existing) existing.remove();

  const banner = document.createElement("div");
  banner.className = "plan-restore-error";
  banner.textContent = `Failed to restore plan: ${message}`;
  const dismiss = document.createElement("button");
  dismiss.textContent = "\u00d7";
  dismiss.className = "plan-restore-dismiss";
  dismiss.addEventListener("click", () => banner.remove());
  banner.appendChild(dismiss);
  container.prepend(banner);

  // Auto-dismiss after 8 seconds
  setTimeout(() => { if (banner.parentNode) banner.remove(); }, 8000);
}
