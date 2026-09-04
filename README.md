# Huginn

**Huginn gives coding agents a typed test port into the live browser games they
create, turning opaque canvas gameplay into visible, reproducible experiments.**

Every gameplay bug can become a replayable experiment. The agent still edits
code and runs unit tests normally; Huginn is the optional live proof layer for
the gameplay behavior that matters.

**Play:** [COIL · Snake](https://halmir-ai.github.io/huginn/) ·
[STARFALL · Pinball](https://halmir-ai.github.io/huginn/games/starfall/) ·
[Behavioral evidence](https://halmir-ai.github.io/huginn/trials/)

Real score-chasing arcade games first. Optional agent tools second. Each game
also has a standalone build that contains **no Huginn executable code**:
[COIL standalone](https://halmir-ai.github.io/huginn/games/coil/plain/) ·
[STARFALL standalone](https://halmir-ai.github.io/huginn/games/starfall/plain/).

Canvas rendering alone does not describe the current board, legal
moves, economy, RNG state, or save timeline. That state lives in JavaScript memory. Huginn
exposes that state through WebMCP as bounded, typed tools. An agent can inspect
the rules, discover legal actions, run a visible sequence, snapshot the game,
restore it, and replay the same seed to verify a result.

The load-bearing tool is `apply_action_sequence`. It validates every action
against the live state, renders every committed step, records metrics and a
checksum, supports cancellation, and stops before the first illegal action. A
caller may also attach semantic metric expectations and receive a separate
`passed`, `failed`, or `inconclusive` gameplay verdict without changing whether
the tool itself executed successfully.
The imperative registration boundary is intentionally easy to inspect in
[src/webmcp/index.ts](src/webmcp/index.ts). The optional in-page debugger is a
separate consumer in [src/debugger/index.ts](src/debugger/index.ts); neither is
part of the protocol-independent core.

## Add Huginn to a game

Install the source package directly from GitHub while the library is pre-release:

```sh
npm install github:halmir-ai/huginn#main
```

The package exposes four intentionally separate imports:

| Import | Responsibility | Browser protocol required? |
| --- | --- | --- |
| `@halmir/huginn` | Deterministic experiment kernel, adapter types, checksums, regression scenarios | No |
| `@halmir/huginn/webmcp` | Seven tool definitions and `document.modelContext` registration | Yes |
| `@halmir/huginn/game-runtime` | Small protocol-free reference runtime for reducer-first games | No |
| `@halmir/huginn/debugger` | Optional dock, checkpoint controls, receipts, and visible regression status | Yes |

See the [dependency-boundary diagram](docs/ARCHITECTURE.md) for the exact import
direction and the rule that keeps standalone games protocol-free.

For an existing engine, implement `GameAdapter` and connect only the transport:

```ts
import type { GameAdapter } from "@halmir/huginn";
import { connectHuginnWebMcp } from "@halmir/huginn/webmcp";

const adapter: GameAdapter<State, Action, Event, GameMetrics> = /* your adapter */;
const huginn = await connectHuginnWebMcp(adapter, { initialSeed: 12 });
window.addEventListener("pagehide", huginn.dispose, { once: true });
```

For a new reducer-first game, the reference runtime and debugger reduce the
composition to three calls while keeping ordinary play independent:

```ts
import { GameRuntime } from "@halmir/huginn/game-runtime";
import { attachHuginnDebugger } from "@halmir/huginn/debugger";
import "@halmir/huginn/debugger.css";

const runtime = new GameRuntime(myGameDefinition, 12);
mountMyGame(canvas, runtime);
await attachHuginnDebugger(runtime, document.querySelector("#huginn")!);
```

The [complete integration guide](docs/INTEGRATION.md) covers existing engines,
new games, human/agent clock ownership, action design, and verification. The
[agent integration contract](docs/AGENT_INTEGRATION.md) is a ready-to-paste
brief for Codex or another coding agent. `npm run build:library` emits and
smoke-tests all four package entry points; the website build separately proves
that standalone games contain no protocol runtime.

## Status

This repository is the new WebMCP work for [The WebMCP Challenge](https://webmcp.devpost.com/).
The two arcade games use the same optional bridge and seven WebMCP tools:

| Game | Genre | Experiment |
| --- | --- | --- |
| COIL | Evolved Snake | Growth, escalating speed, timed golden fruit, genuine wall/body collisions, restart and local best |
| STARFALL | Three-ball pinball | Physical flippers, bumpers, slingshots, multiplier banks, drains, sound and local best |

![STARFALL during ordinary keyboard play](public/assets/arcade/starfall.png)

Neither game has a scripted victory quota or a prearranged near-win state.
Ordinary keyboard/touch play is independent of the protocol. The game rules,
renderer and controls are identical between integrated and standalone builds;
the optional bridge pauses the human clock during an agent experiment and
publishes each committed action to that same visible canvas.

The [feature-authoring trial protocol](docs/demo/ARCADE_FEATURE_PROTOCOL.md)
freezes a real additional feature for each game: COIL's emergency shield and
STARFALL's launch ball saver. Each pair starts with identical game source and
the same feature brief. Both agents may inspect code, write tests and create
diagnostics. The [completed COIL result](docs/demo/COIL_FEATURE_TRIAL_RESULTS.md)
and [completed STARFALL result](docs/demo/STARFALL_FEATURE_TRIAL_RESULTS.md) are
deliberately honest: Huginn did not reduce time, tokens, or code changes in
either pair, but it produced reproducible live-state evidence the standalone
canvas could not expose. Two pairs are still too small for an aggregate
efficiency claim.

The genuine STARFALL accounting mismatch from that trial is now captured as a
seeded [ball-saver regression scenario](public/regressions/starfall-ball-saver.json).
COIL includes a second [shield-recovery scenario](public/regressions/coil-shield-recovery.json).
These human-readable files contain typed actions, a stop condition when useful,
and semantic expectations. They can be replayed through the same kernel after
a gameplay change. Live run receipts supply exact checksums for same-build
replay; stable gameplay metrics decide whether the behavior still passes.

This is deliberately not a mandatory gate for every edit. Copy, styling, art,
and ordinary source-level changes do not need Huginn. Human and visual testing
remain essential for feel, animation, accessibility, and fun.

## Preserved earlier experiments

The original [RTS Lab](https://halmir-ai.github.io/huginn/lab/) and
[Tideglass Relay](https://halmir-ai.github.io/huginn/tideglass/) remain available
as historical protocol prototypes. Their receipts are not arcade-game or
feature-authoring measurements.

RTS Lab's visible comparison restores one
verified snapshot, runs military-rush and economy-first branches against the
same seed, and reports the tradeoffs at the same ending cycle with per-step
metrics and checksums. Actual WebMCP calls populate the live notebook; the page
preset is clearly labeled and does not impersonate an agent invocation.

Tideglass was authored in a separate Codex task with Huginn from the start.
Its original baseline passed. A subsequently requested resource-budget
revision changed one executable rule line and was retested with the same plans:
Unassisted battery **0 → 2**, Signal **3 → 5**, both at watch 8 with three
deliveries. [Preserved baseline](docs/demo/TIDEGLASS_RELAY.md) ·
[Actual revision, source delta and receipts](docs/demo/TIDEGLASS_REFINEMENT.md).

Those earlier examples have ordinary controls, a readable state/rules inspector,
checkpoints, and a `?webmcp=off` mode that skips registration while retaining
the same UI and rules. The [paired replay pilot](docs/demo/COMPARISON_RESULTS.md)
matched all **46 state transitions** across modes: RTS used **25 UI commands
versus 6 WebMCP mutations**, Tideglass **27 versus 6**. Each integrated trial
also made **7 read-only calls**. Ordinary browser batching was allowed in both
modes. These are page-command measurements, **not token, latency, iteration,
or code-savings results**.

Dawn of People is a planned retrofit, **not a shipped integration**. The current
integrations prove the new-game path only. RTS Lab is a small deterministic slice,
not a full real-time RTS or evidence of a generally dominant strategy.

## Run locally

```sh
npm install
npm run dev
```

Use the **Codex in-app browser** for the rehearsed path. September 3 testing
used actual registered tools on both arcade games, including snapshot restore
and exact same-seed replay. Chrome 149+ with
`chrome://flags/#enable-webmcp-testing` is an optional alternative; the connected
Chrome was not WebMCP-enabled. The page preset also works without WebMCP, but
is not a substitute for an agent-tool test. The arcade games remain normally
playable in an ordinary browser.

See the [demo production guide](docs/demo/START_HERE.md) for word-for-word
narration, copy/paste prompts, expected results, recovery instructions, and
the optional fresh-game authoring brief. The [technical recording kit](docs/RECORDING_KIT.md)
retains the detailed test and browser receipts.

For a first Tideglass experiment, ask the agent: “Use the actual WebMCP tools.
Read the rules and legal actions, snapshot seed 12, run Signal route to watch
8, then restore and run Unassisted with a fresh request ID. Compare deliveries
and battery. Replay Unassisted and verify every step. Do not click the UI-plan
presets or claim that one seed establishes balance.”

To add Huginn to a game, start with the [integration guide](docs/INTEGRATION.md).
It has distinct paths for a new reducer-first game and an existing Canvas,
PixiJS, Phaser, or WebGL engine. Coding agents can follow the copy/paste
[agent instrumentation contract](docs/AGENT_INTEGRATION.md). The complete
[COIL rules](src/games/coil/game.ts) and its tiny
[integrated entry](src/play/coil-entry.ts) are the reference implementation.
Game and adapter logic are intentionally counted together, not advertised as
trivial overhead.

## Verify

```sh
npm run check
npm run build
```

The build traverses both standalone bundle dependency graphs and fails if
Huginn's protocol runtime is present. Tests cover seed replay, strict saves,
legality, cancellation, atomic live-state reads and complete metric semantics.

Huginn's code and original procedural arcade art are MIT licensed. The eight selected RTS Lab PNGs are separately
released under CC BY 4.0 with exact source paths and hashes in
[docs/ASSET_LICENSE.md](docs/ASSET_LICENSE.md).

See [docs/PLAN.md](docs/PLAN.md), [docs/TOOL_CONTRACT.md](docs/TOOL_CONTRACT.md),
[docs/PROVENANCE.md](docs/PROVENANCE.md), and the
[submission checklist](docs/SUBMISSION_CHECKLIST.md).
