import { starfallGame } from "../games/starfall/game";
import { mountStarfall } from "../games/starfall/view";
import { GameRuntime } from "./core";
import { gamePage } from "./page";

const page = gamePage("starfall", true);
const runtime = new GameRuntime(starfallGame, 12);
mountStarfall(page.app, runtime, { assets: page.assets });
page.dock.className = "plain-notice";
page.dock.textContent = "Standalone game. No experiment runtime or registered tools are loaded.";
