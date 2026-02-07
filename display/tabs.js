// Tab switching logic – lazy-initializes each tab's content on first switch

const initialized = new Set();

const TAB_KEYS = { "1": "graph", "2": "population", "3": "upkeep", "4": "balancing" };

export function initTabs() {
  const tabBar = document.getElementById("tab-bar");
  tabBar.addEventListener("click", async (e) => {
    const btn = e.target.closest(".tab");
    if (!btn) return;
    const tabId = btn.dataset.tab;
    switchTab(tabId);
  });

  // Alt+1/2/3/4 keyboard shortcuts for tab switching
  document.addEventListener("keydown", (e) => {
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    const tabId = TAB_KEYS[e.key];
    if (tabId) {
      e.preventDefault();
      switchTab(tabId);
    }
  });
}

async function switchTab(tabId) {
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
      }
    } catch (err) {
      console.error(`Failed to load tab "${tabId}":`, err);
      const container = document.getElementById(`view-${tabId}`);
      container.innerHTML = `<div class="calc-content"><p style="color:var(--state-ignored)">Failed to load: ${err.message}</p></div>`;
    }
  }
}
