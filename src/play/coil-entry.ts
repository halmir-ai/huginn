import { coilGame } from "../games/coil/game";
import { mountCoil } from "../games/coil/view";
import { GameRuntime } from "../game-runtime";
import { gamePage } from "./page";
import { attachHuginnDebugger } from "../debugger";
const page = gamePage("coil", false);
const runtime = new GameRuntime(coilGame, 12);
const unmount = mountCoil(page.app, runtime, { assets: page.assets });
const huginn = await attachHuginnDebugger(runtime, page.afterGame);
const hot = (import.meta as ImportMeta & { hot?: { dispose(callback: () => void): void } }).hot;
hot?.dispose(() => {
  huginn.dispose();
  unmount();
  page.dispose();
});
