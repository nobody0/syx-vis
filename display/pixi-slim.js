// Slim pixi.js entry — registers only the subsystems we use, skipping
// accessibility, advanced-blend-modes, compressed-textures, spritesheet,
// prepare, dom, and filters. Used via esbuild alias in production builds.

import { ExtensionType, extensions } from "../node_modules/pixi.js/lib/extensions/Extensions.mjs";

// Custom browser environment extension (replaces browserExt which pulls in
// accessibility, spritesheet, filters etc. via browserAll.mjs)
const slimBrowserExt = {
  extension: { type: ExtensionType.Environment, name: "browser", priority: -1 },
  test: () => true,
  load: async () => {
    await import("../node_modules/pixi.js/lib/rendering/init.mjs");
    await import("../node_modules/pixi.js/lib/events/init.mjs");
  },
};
extensions.add(slimBrowserExt);

// Scene subsystem inits (app lifecycle, graphics paths, text rendering)
import "../node_modules/pixi.js/lib/app/init.mjs";
import "../node_modules/pixi.js/lib/scene/graphics/init.mjs";
import "../node_modules/pixi.js/lib/scene/text/init.mjs";

// Re-export only the classes the app uses
export { Application } from "../node_modules/pixi.js/lib/app/Application.mjs";
export { Container } from "../node_modules/pixi.js/lib/scene/container/Container.mjs";
export { Graphics } from "../node_modules/pixi.js/lib/scene/graphics/shared/Graphics.mjs";
export { Sprite } from "../node_modules/pixi.js/lib/scene/sprite/Sprite.mjs";
export { Text } from "../node_modules/pixi.js/lib/scene/text/Text.mjs";
export { Assets } from "../node_modules/pixi.js/lib/assets/Assets.mjs";
