import { starfallGame } from "../games/starfall/game";
import { mountStarfall } from "../games/starfall/view";
import { GameRuntime } from "./core";
import { gamePage } from "./page";
import { attachHuginn } from "./bridge";
const page = gamePage("starfall", false);
const runtime = new GameRuntime(starfallGame, 12);
mountStarfall(page.app, runtime, { assets: page.assets });
await attachHuginn(runtime, page.dock);
