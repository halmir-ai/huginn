import { starfallGame } from "../games/starfall/game";
import { mountStarfall } from "../games/starfall/view";
import { GameRuntime } from "../game-runtime";
import { gamePage } from "./page";

const page = gamePage("starfall", true);
const runtime = new GameRuntime(starfallGame, 12);
const unmount = mountStarfall(page.app, runtime, { assets: page.assets });
page.afterGame.className = "plain-notice";
page.afterGame.textContent = "Standalone game. No experiment runtime or registered tools are loaded.";
const hot = (import.meta as ImportMeta & { hot?: { dispose(callback: () => void): void } }).hot;
hot?.dispose(() => { unmount(); page.dispose(); });
