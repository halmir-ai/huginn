# Add Huginn to a browser game

Huginn works best when the game has one deterministic transition path. The
renderer can use Canvas, PixiJS, Phaser, Three.js, or WebGL; Huginn consumes
structured state and typed actions, never pixels or DOM selectors.

## Choose the integration path

| Starting point | Use | Reference |
| --- | --- | --- |
| Existing game with a reducer/save model | Implement `GameAdapter`, then connect `@halmir/huginn/webmcp` | [adapter example below](#existing-engine-implement-the-adapter) |
| New game or a game you can make reducer-first | Implement `GameDefinition`, use the small `GameRuntime`, then optionally mount the debugger | [COIL game](../src/games/coil/game.ts) and [entry](../src/play/coil-entry.ts) |
| Tests or another transport | Use `HuginnKernel` directly; do not import WebMCP or the debugger | [kernel tests](../tests/kernel.test.ts) |

The [architecture map](ARCHITECTURE.md) defines the dependency boundaries.

## Install

Until the first registry release, install the package from the public repo:

```sh
npm install github:halmir-ai/huginn#main
```

For work inside this repository, use the matching source entry points:
`src/huginn`, `src/webmcp`, `src/game-runtime`, and `src/debugger`.

## Existing engine: implement the adapter

The adapter is the only contract between Huginn and game-specific code:

```ts
import type {
  GameAdapter,
  GameDescription,
  RenderContext,
} from "@halmir/huginn";
import { connectHuginnWebMcp } from "@halmir/huginn/webmcp";

type State = {
  version: 1;
  seed: number;
  rng: number;
  tick: number;
  score: number;
  alive: boolean;
};
type Action =
  | { type: "turn"; direction: "left" | "right" }
  | { type: "advance"; frames: 1 | 10 | 30 };
type Event = { type: "scored"; points: number } | { type: "lost" };
type GameMetrics = { tick: number; score: number; alive: boolean };

const description: GameDescription = {
  id: "my-game",
  title: "My Game",
  version: "1.0.0",
  summary: "A deterministic browser game.",
  rules: ["Turn, then advance the simulation by fixed frames."],
  victoryConditions: ["Reach the target score."],
  failureConditions: ["The player is no longer alive."],
  metrics: [
    { key: "tick", label: "Tick", description: "Committed simulation ticks." },
    { key: "score", label: "Score", description: "Points earned." },
    { key: "alive", label: "Alive", description: "Whether play may continue.", badWhen: "false" },
  ],
  actions: [
    {
      type: "turn",
      description: "Change direction when the turn is legal.",
      inputSchema: {
        type: "object",
        properties: {
          type: { const: "turn" },
          direction: { enum: ["left", "right"] },
        },
        required: ["type", "direction"],
        additionalProperties: false,
      },
    },
    {
      type: "advance",
      description: "Advance by a bounded number of fixed simulation frames.",
      inputSchema: {
        type: "object",
        properties: {
          type: { const: "advance" },
          frames: { type: "integer", enum: [1, 10, 30] },
        },
        required: ["type", "frames"],
        additionalProperties: false,
      },
    },
  ],
};

const adapter: GameAdapter<State, Action, Event, GameMetrics> = {
  description,
  setups: [
    {
      id: "boss-wave",
      title: "Boss wave at the final gate",
      description: "Begin at the authored checkpoint used to test the boss mechanic.",
      createState: (seed) => createBossWaveState(seed),
    },
  ],
  initialState: (seed) => createInitialState(seed),
  listLegalActions: (state) => legalActionsFor(state),
  reduce: (state, action) => reduceGame(state, action),
  metrics: (state) => ({ tick: state.tick, score: state.score, alive: state.alive }),
  serialize: (state) => structuredClone(state),
  deserialize: (value) => validateAndRestoreState(value),
  render: (state, context: RenderContext<Action, Event>) => renderGame(state, context),
};

const huginn = await connectHuginnWebMcp(adapter, {
  initialSeed: 12,
  onActivity: (activity) => console.debug("Huginn", activity),
});
window.addEventListener("pagehide", huginn.dispose, { once: true });
```

`connectHuginnWebMcp` initializes the kernel, generates schemas for the seven
core tools from `description.actions`, and registers them when the browser
supports WebMCP. Supply the optional `captureFrame` host callback to add the
generic eighth tool, `capture_game`. `supported: false` is a normal result in
an ordinary browser; the game must remain playable.

### Keep one state authority

Do not let WebMCP mutate a private clone while keyboard input mutates a second
engine state. Route human input through the same kernel transition path, or
make both paths dispatch to the same reducer:

```ts
let humanRequest = 0;
async function dispatchHuman(action: Action) {
  return huginn.kernel.applyActionSequence({
    request_id: `human-${++humanRequest}`,
    actions: [action],
    speed: "fast",
  });
}
```

For a continuously ticking game, represent time as a bounded semantic action
such as `{ type: "advance", frames: 10 }`. Pause the human clock while a
mutating WebMCP call is running, then resume it after completion. Never derive
gameplay state from `requestAnimationFrame`, wall time, animation completion,
or `Math.random()`.

## New game: define the test port from the first reducer

The optional reference runtime already coordinates human dispatch with the
kernel. A `GameDefinition` contains no WebMCP code:

```ts
import { GameRuntime, type GameDefinition } from "@halmir/huginn/game-runtime";
import { attachHuginnDebugger } from "@halmir/huginn/debugger";
import "@halmir/huginn/debugger.css";

const game: GameDefinition<State, Action, Event> = {
  description,
  initialState: createInitialState,
  legalActions: legalActionsFor,
  reduce: reduceGame,
  metrics: (state) => ({ tick: state.tick, score: state.score, alive: state.alive }),
  deserialize: validateAndRestoreState,
};

const runtime = new GameRuntime(game, 12);
const unmountGame = mountCanvas(document.querySelector("#game")!, runtime);
const debuggerSession = await attachHuginnDebugger(
  runtime,
  document.querySelector("#huginn")!,
);

window.addEventListener("pagehide", () => {
  debuggerSession.dispose();
  unmountGame();
}, { once: true });
```

The view subscribes to runtime state and renders it. Keyboard, pointer, and
touch handlers call `runtime.dispatch(action)`. The debugger is optional; omit
its import and element to ship a game with no agent-facing UI. See the
[STARFALL standalone entry](../src/play/starfall-plain.ts) for a build whose
full dependency graph contains no Huginn or WebMCP runtime.

## Test the moment, not the grind

Long campaigns often hide the state a coding agent actually needs behind many
minutes of play: a Level 3 obstacle, an expiring buff, a late tower-defense
wave, or a nearly-complete quest. Add optional, authored `setups` to the
adapter or `GameDefinition` for those moments.

`describe_game` lists their ids, titles, and intent. The agent selects one in
the existing hero tool:

```ts
await huginn.kernel.applyActionSequence({
  request_id: "boss-balance-a",
  setup_id: "boss-wave",
  seed: 12,
  actions: [
    { type: "place_tower", pad: 7, tower: "mage" },
    { type: "start_wave" },
    { type: "advance", frames: 30 },
  ],
  expect: [{ metric: "baseHp", operator: "gte", value: 1 }],
});
```

A setup is not arbitrary state injection. It is trusted game code, selected by
a bounded id, constructed from a seed, round-tripped through the normal save
codec, and visibly rendered before the first action. `setup_id` may accompany
`seed`, but it cannot accompany `base_snapshot_id`. This preserves the shared
generic tool surface and keeps test-only coordinates, gold, health, or
inventory out of the public schema.

Use a small catalog of decision-relevant moments. Do not create a setup for
every level frame or every visual change. For counterfactuals, initialize one
setup, snapshot it, and run multiple legal plans from that same checksum.

## Adapter invariants

1. `initialState(seed)` contains every piece of state needed to reproduce play,
   including PRNG state and fixed simulation counters.
2. `listLegalActions(state)` returns only complete, concrete actions currently
   valid. It is the anti-hallucination boundary.
3. `reduce(state, action)` is deterministic and does not mutate its input.
4. `serialize` returns canonical data only: nulls, booleans, finite numbers,
   strings, arrays, and plain objects. No class instances, DOM nodes, textures,
   functions, timers, maps, or implicit engine globals.
5. `deserialize` validates untrusted snapshot data and reconstructs a state
   whose serialization is byte-for-byte canonical.
6. `metrics` exposes only values the agent can interpret using the descriptions
   in `GameDescription`; add `badWhen` when direction is not obvious.
7. `render` visibly projects committed state but never changes simulation state.
8. Human controls and agent actions share the same reducer and renderer.

## Action design

Prefer semantic, bounded inputs: `play_card`, `place_tower`, `choose_upgrade`,
or fixed-frame `advance`. Use closed JSON Schemas with `additionalProperties:
false`, enums, numeric limits, and short arrays. Do not accept JavaScript,
selectors, arbitrary predicates, URLs, filesystem paths, network targets, or
unbounded “run forever” requests.

Do not mirror every key press as a tool. A human may hold a flipper continuously;
an agent should request a fixed simulation window with explicit held-input
booleans. This keeps the tool surface small without changing natural controls.

## Optional debugger

`@halmir/huginn/debugger` is evidence UI, not the protocol. It displays actual
tool activity, saves/restores an in-memory checkpoint, downloads receipts, and
saves a passing seeded expectation run as `huginn/regression-v1`. Its integrated
composition also supplies `capture_game`: it encodes the current canvas as a
bounded PNG, shows one current preview in the dock, and returns image metadata
paired to the canonical state checksum. It freezes game mutations, waits for
the renderer to paint, and rejects the evidence if canonical state changes
during capture. The PNG itself stays in the page rather than bloating the JSON
tool result. Removing the debugger must not change the core or the seven core
WebMCP tools.

For a custom UI, call `registerWebMcpTools` yourself and consume `ToolActivity`
events. A display failure must not alter an authoritative tool result.

For a direct existing-engine integration, pass `captureFrame` to
`connectHuginnWebMcp`. The callback owns engine-specific readback and the
visible preview; it returns only bounded metadata:

```ts
const huginn = await connectHuginnWebMcp(adapter, {
  initialSeed: 12,
  runMutation: (operation) => pauseGameClockWhile(operation),
  captureFrame: async () => {
    await engine.flushFrame(); // Paint the frozen canonical state first.
    const png = await encodeCurrentCanvasAsPng();
    showLatestCapturePreview(png);
    return {
      captureId: nextCaptureId(),
      imageChecksum: await sha256(png),
      width: gameCanvas.width,
      height: gameCanvas.height,
      mimeType: "image/png",
      bytes: png.size,
      previewVisible: true,
    };
  },
});
```

Canvas 2D can use `HTMLCanvasElement.toBlob`. PixiJS can expose its application
canvas and must preserve the drawing buffer if browser readback is required.
The complete zero-configuration reference path is
[`attachHuginnDebugger`](../src/debugger/index.ts); THORNWATCH shows the PixiJS
composition in [`view.ts`](../src/games/thornwatch/view.ts).

## Verification before claiming integration

| Property | Required proof |
| --- | --- |
| Snapshot fidelity | Snapshot → restore returns the identical canonical checksum and legal actions |
| Seeded determinism | Same seed + same actions produces identical per-step actions, events, metrics, and checksums twice |
| Named setup fidelity | Every authored setup survives `serialize` → `deserialize`, renders visibly, and replays from the same seed |
| Legal safety | An unavailable action is rejected before it mutates state |
| Visible execution | Every committed action produces one renderer update |
| Prefix semantics | Cancel, stop, and error receipts name the exact committed prefix |
| Human parity | Keyboard/pointer/touch uses the same transition semantics as tools |
| Browser integration | Seven core tools—and `capture_game` when enabled—are discoverable and callable on the deployed URL in a WebMCP browser |
| Engine independence | The same tool contract works through at least two real renderer families without importing either engine into core |
| Optionality | A plain build remains playable and contains no protocol runtime |

Inside this repository, run:

```sh
npm run check
npm run build
```

The second command builds the site and installable ESM surfaces, smoke-imports
the public package exports, and audits the standalone game bundles.

## When Huginn is worth adding

Use it for stateful gameplay behavior that is expensive or ambiguous to reach
by clicking: campaign progression, economies, procedural seeds, card hands,
cooldowns, gesture-heavy state, physics outcomes, and regressions that require
a precise setup. Do not require a Huginn scenario for copy, art, CSS, or every
small edit. It is an optional live behavioral proof layer, not a new approval
process.
