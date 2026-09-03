# Huginn

Huginn turns a running browser game into a controlled experiment an AI agent can
conduct while its human collaborator watches.

**Play:** [COIL · Snake](https://halmir-ai.github.io/huginn/) ·
[STARFALL · Pinball](https://halmir-ai.github.io/huginn/games/starfall/) ·
[Feature trials](https://halmir-ai.github.io/huginn/trials/)

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
checksum, supports cancellation, and stops before the first illegal action.
The imperative registration boundary is intentionally easy to inspect in
[src/play/bridge.ts](src/play/bridge.ts), with shared tool definitions in
[src/huginn/webmcp.ts](src/huginn/webmcp.ts).

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
is deliberately honest: Huginn did not reduce time, tokens, or code changes in
that single pair, but it produced reproducible live-state evidence the
standalone canvas could not expose. STARFALL remains a separate running trial;
no aggregate efficiency claim is made.

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

To add a game, inspect the protocol-independent `GameDefinition` in
[src/play/core.ts](src/play/core.ts), the complete
[COIL rules](src/games/coil/game.ts), and [optional bridge](src/play/bridge.ts).
For another engine, the lower-level `GameAdapter` interface lives in
[src/huginn/types.ts](src/huginn/types.ts). The adapter supplies deterministic
initial state, legal actions, transitions, metrics, canonical save/restore and
rendering; the shared layer supplies the seven browser tools. Game and adapter
logic are intentionally counted together, not advertised as trivial overhead.

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
