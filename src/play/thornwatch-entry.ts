import { thornwatchGame } from "../games/thornwatch/game";
import { mountThornwatch } from "../games/thornwatch/view";
import { GameRuntime } from "../game-runtime";
import { gamePage } from "./page";
import { attachHuginnDebugger } from "../debugger";
const page = gamePage("thornwatch", false);
const runtime = new GameRuntime(thornwatchGame, 12);
const unmount = await mountThornwatch(page.app, runtime, {
  assets: page.assets,
});
const huginn = await attachHuginnDebugger(runtime, page.afterGame);
(
  import.meta as ImportMeta & { hot?: { dispose(cb: () => void): void } }
).hot?.dispose(() => {
  huginn.dispose();
  unmount();
  page.dispose();
});
