import { starfallGame } from "../games/starfall/game";
import { mountStarfall } from "../games/starfall/view";
import { GameRuntime } from "../game-runtime";
import { gamePage } from "./page";
import { attachHuginnDebugger } from "../debugger";
const page = gamePage("starfall", false);
const runtime = new GameRuntime(starfallGame, 12);
const unmount = mountStarfall(page.app, runtime, { assets: page.assets });
const huginn = await attachHuginnDebugger(runtime, page.afterGame);
const hot = (import.meta as ImportMeta & { hot?: { dispose(callback: () => void): void } }).hot;
hot?.dispose(() => {
  huginn.dispose();
  unmount();
  page.dispose();
});
