import { thornwatchGame } from "../games/thornwatch/game";
import { mountThornwatch } from "../games/thornwatch/view";
import { GameRuntime } from "../game-runtime";
import { gamePage } from "./page";
const page = gamePage("thornwatch", true);
const runtime = new GameRuntime(thornwatchGame, 12);
const unmount = await mountThornwatch(page.app, runtime, {
  assets: page.assets,
});
page.afterGame.className = "plain-notice";
page.afterGame.textContent =
  "Standalone game. No experiment runtime or registered tools are loaded.";
(
  import.meta as ImportMeta & { hot?: { dispose(cb: () => void): void } }
).hot?.dispose(() => {
  unmount();
  page.dispose();
});
