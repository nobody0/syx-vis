// Application entry point — extracted from index.html inline script
import { render } from "./render.js";
import { initTabs, switchTab, restorePlan } from "./tabs.js";
import { initRouter } from "./router.js";
import { initHelp } from "./help.js";

const overlay = document.getElementById("loading-overlay");
const statusEl = overlay ? overlay.querySelector(".loading-status") : null;

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

try {
  setStatus("Building graph\u2026");
  await render(setStatus);
  setStatus("Initializing UI\u2026");
  initTabs();
  initHelp();
  initRouter(switchTab, restorePlan);
  if (overlay) overlay.remove();
} catch (err) {
  document.body.style.display = "flex";
  document.body.style.justifyContent = "center";
  document.body.style.paddingTop = "20vh";
  document.body.innerHTML = `<div style="color:#d8d2c4;font-family:system-ui;text-align:center">
    <h2 style="font-family:Georgia,serif;font-style:italic">Failed to load</h2>
    <p style="color:#a09882">${err.message || err}</p>
    <p style="color:#706858;font-size:13px">Check the browser console for details.</p>
  </div>`;
}
