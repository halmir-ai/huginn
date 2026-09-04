import { starfallGame } from "../games/starfall/game";
import { mountStarfall } from "../games/starfall/view";
import { GameRuntime } from "./core";
import { gamePage } from "./page";
import { attachHuginn } from "./bridge";
const page = gamePage("starfall", false);
const runtime = new GameRuntime(starfallGame, 12);
const unmount = mountStarfall(page.app, runtime, { assets: page.assets });
const huginn = await attachHuginn(runtime, page.dock);
const hot = (import.meta as ImportMeta & { hot?: { dispose(callback: () => void): void } }).hot;
hot?.dispose(() => {
  huginn.dispose();
  unmount();
  page.dispose();
});
