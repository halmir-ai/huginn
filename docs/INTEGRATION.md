# Add Huginn to a browser game

Huginn works best when the game has one deterministic transition path. The
renderer can use Canvas, PixiJS, Phaser, Three.js, or WebGL; Huginn consumes
structured state and typed actions, never pixels or DOM selectors.

## Choose the integration path

| Starting point | Use | Reference |
| --- | --- | --- |
| Existing game with a reducer/save model | Implement `GameAdapter`, then connect `@halmir/huginn/webmcp` | [Tideglass adapter](../src/demo/tideglass.ts) |
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
tools from `description.actions`, and registers them when the browser supports
WebMCP. `supported: false` is a normal result in an ordinary browser; the game
must remain playable.

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
saves a passing seeded expectation run as `huginn/regression-v1`. Removing the
debugger must not change the core or WebMCP contract.

For a custom UI, call `registerWebMcpTools` yourself and consume `ToolActivity`
events. A display failure must not alter an authoritative tool result.

## Verification before claiming integration

| Property | Required proof |
| --- | --- |
| Snapshot fidelity | Snapshot → restore returns the identical canonical checksum and legal actions |
| Seeded determinism | Same seed + same actions produces identical per-step actions, events, metrics, and checksums twice |
| Legal safety | An unavailable action is rejected before it mutates state |
| Visible execution | Every committed action produces one renderer update |
| Prefix semantics | Cancel, stop, and error receipts name the exact committed prefix |
| Human parity | Keyboard/pointer/touch uses the same transition semantics as tools |
| Browser integration | All seven tools are discoverable and callable on the deployed URL in a WebMCP browser |
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
