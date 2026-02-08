// Building Upkeep tab — maintenance costs from value degradation
import { buildings } from "../data/buildings.js";
import { formatResourceName } from "./config.js";

export function renderUpkeep(container) {
  // Filter to buildings with degradation and construction costs
  const degrading = buildings.filter(b => b.valueDegradePerYear > 0 && b.constructionCosts);

  const html = [];
  html.push(`<div class="calc-content">`);
  html.push(`<h2>Building Upkeep</h2>`);
  html.push(`<p>Buildings with a value degradation rate consume construction materials over time to maintain their value. Maintenance cost per year = construction cost &times; degrade rate.</p>`);

  html.push(`<table class="calc-table">`);
  html.push(`<thead><tr>
    <th>Building</th>
    <th style="text-align:right">Degrade Rate (/yr)</th>
    <th>Resource</th>
    <th style="text-align:right">Construction Cost</th>
    <th style="text-align:right">Maintenance (/yr)</th>
  </tr></thead><tbody>`);

  for (const b of degrading) {
    const rows = b.constructionCosts.length;
    for (let i = 0; i < b.constructionCosts.length; i++) {
      const cost = b.constructionCosts[i];
      const maintenance = (cost.amount * b.valueDegradePerYear).toFixed(3).replace(/\.?0+$/, "");
      const resName = formatResourceName(cost.resource);
      html.push(`<tr>`);
      if (i === 0) {
        html.push(`<td ${rows > 1 ? `rowspan="${rows}"` : ""}><span class="resource-name"><img src="data/icons/${b.icon}" alt="">${b.name}</span></td>`);
        html.push(`<td ${rows > 1 ? `rowspan="${rows}"` : ""} class="num">${b.valueDegradePerYear}</td>`);
      }
      html.push(`<td><span class="resource-name"><img src="data/icons/${cost.resource}.png" alt="">${resName}</span></td>`);
      html.push(`<td class="num">${cost.amount}</td>`);
      html.push(`<td class="num">${maintenance}</td>`);
      html.push(`</tr>`);
    }
  }

  html.push(`</tbody></table>`);

  html.push(`<div class="note">Only ${degrading.length} buildings have explicit degradation rates in game data (${degrading.map(b => b.name).join(", ")}). General janitor-based maintenance is engine-level and not reflected here.</div>`);

  // Summary: total annual resource demand per building instance
  html.push(`<h3>Total Annual Maintenance per Instance</h3>`);
  html.push(`<table class="calc-table">`);
  html.push(`<thead><tr>
    <th>Building</th>
    <th>Resources (/yr)</th>
  </tr></thead><tbody>`);

  for (const b of degrading) {
    const costs = b.constructionCosts.map(c => {
      const amt = (c.amount * b.valueDegradePerYear).toFixed(3).replace(/\.?0+$/, "");
      return `<span class="resource-name"><img src="data/icons/${c.resource}.png" alt="">${amt} ${formatResourceName(c.resource)}</span>`;
    });
    html.push(`<tr>
      <td><span class="resource-name"><img src="data/icons/${b.icon}" alt="">${b.name}</span></td>
      <td>${costs.join(", ")}</td>
    </tr>`);
  }

  html.push(`</tbody></table>`);
  html.push(`</div>`);
  container.innerHTML = html.join("\n");
}

