import { coilGame } from "../games/coil/game";
import { mountCoil } from "../games/coil/view";
import { GameRuntime } from "../game-runtime";
import { gamePage } from "./page";

const page = gamePage("coil", true);
const runtime = new GameRuntime(coilGame, 12);
const unmount = mountCoil(page.app, runtime, { assets: page.assets });
page.afterGame.className = "plain-notice";
page.afterGame.textContent = "Standalone game. No experiment runtime or registered tools are loaded.";
const hot = (import.meta as ImportMeta & { hot?: { dispose(callback: () => void): void } }).hot;
hot?.dispose(() => { unmount(); page.dispose(); });
