import { coilGame } from "../games/coil/game";
import { mountCoil } from "../games/coil/view";
import { GameRuntime } from "./core";
import { gamePage } from "./page";

const page = gamePage("coil", true);
const runtime = new GameRuntime(coilGame, 12);
mountCoil(page.app, runtime, { assets: page.assets });
page.dock.className = "plain-notice";
page.dock.textContent = "Standalone game. No experiment runtime or registered tools are loaded.";
