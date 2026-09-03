import { coilGame } from "../games/coil/game";
import { mountCoil } from "../games/coil/view";
import { GameRuntime } from "./core";
import { gamePage } from "./page";
import { attachHuginn } from "./bridge";
const page = gamePage("coil", false);
const runtime = new GameRuntime(coilGame, 12);
mountCoil(page.app, runtime, { assets: page.assets });
await attachHuginn(runtime, page.dock);
