import { coilGame } from "../games/coil/game";
import { mountCoil } from "../games/coil/view";
import { GameRuntime } from "./core";
import { gamePage } from "./page";
import { attachHuginn } from "./bridge";
const page = gamePage("coil", false);
const runtime = new GameRuntime(coilGame, 12);
const unmount = mountCoil(page.app, runtime, { assets: page.assets });
const huginn = await attachHuginn(runtime, page.dock);
const hot = (import.meta as ImportMeta & { hot?: { dispose(callback: () => void): void } }).hot;
hot?.dispose(() => {
  huginn.dispose();
  unmount();
  page.dispose();
});
