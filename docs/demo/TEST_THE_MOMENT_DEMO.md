# Huginn final demo — test the moment, not the grind

Target runtime: **2:50**. Hard ceiling: **2:58**. This is the recording source
of truth for the hackathon submission.

> **Huginn gives coding agents a typed test port into the live browser games
> they create, turning opaque canvas gameplay into visible, reproducible
> experiments.**

The film proves three things, and only these three things:

1. A coding agent can enter a real, authored gameplay moment without replaying
   unrelated progression or accepting an arbitrary state patch.
2. It can run two legal plans from the same deterministic browser state and
   turn an important outcome into a replayable semantic regression.
3. The same test port and visual capture work across native Canvas 2D and
   PixiJS/WebGL; Huginn is bound to game state, not a renderer.

Do not use the final three minutes for a fresh code-generation session. It is
too variable and makes the result look like a toy generated for the protocol.
Show the three playable games first, then spend the proof on COIL and
THORNWATCH. The checked-in [agent integration brief](../AGENT_INTEGRATION.md)
is the concise evidence that a coding agent can instrument the same contract
from a game's first reducer.

## Before recording

- Use fresh public Codex in-app-browser tabs for
  [COIL](https://halmir-ai.github.io/huginn/),
  [STARFALL](https://halmir-ai.github.io/huginn/games/starfall/), and
  [THORNWATCH](https://halmir-ai.github.io/huginn/games/thornwatch/).
- Confirm each integrated page says **Connected · 8 live browser tools**.
- Play each game briefly with its ordinary keyboard or pointer controls.
- Run the two prompts below once off-camera. Record only after every exact
  expected outcome passes.
- Use a new request suffix for every take. Never reuse a request id after a
  failed take, because idempotent retries are returned as cached results.
- Keep the game canvas larger than the transcript. Zoom the transcript only
  when holding on a compact result.
- Hide notifications, personal tabs, terminal output, credentials, and local
  URLs. Record 1440p or clean 1080p with a quiet microphone.

## 0:00–0:18 — These are games first

### Picture

Cut quickly through ordinary play in all three games: steer through COIL, flip
the STARFALL ball, then place a THORNWATCH tower and start a wave. Use the
standalone builds for one of these shots if convenient. Do not show a tool call
yet.

### Narration

“Coding agents can build browser games, but testing what they build is still
surprisingly blind. The important state is behind controls, progression and a
canvas: the current board, legal moves, economy, random seed, and save
timeline.”

## 0:18–0:33 — State the WebMCP fit

### Picture

Return to integrated COIL with the canvas and small Huginn dock visible.

### Narration

“A screenshot can show pixels, and source code can suggest intent. Neither is
the live game state a designer is watching. Huginn uses WebMCP to expose a
small typed test port directly from that page, so the agent and the human work
on the same running game.”

## 0:33–1:17 — COIL: reach Level 2 instantly, then branch

Give Codex this exact prompt. Replace `01` with a fresh two-digit take number
if rerunning.

> On this live COIL page, use the actual WebMCP tools, not page controls. Call
> `describe_game` first and briefly identify its named setups. Then run two
> visible experiments from `setup_id: "level-2-gate"`, seed `12`, and
> `speed: "watch"`.
>
> First use request id `coil-gate-unprotected-01`, actions
> `[{"type":"advance","steps":1}]`, and expect `campaignLevel == 2` and
> `alive == false`.
>
> Second use request id `coil-gate-shielded-01`, actions
> `[{"type":"shield"},{"type":"advance","steps":1}]`, and expect
> `campaignLevel == 2`, `alive == true`, and `shieldStepsLeft == 0`.
>
> Keep both result receipts. Verify that their first `beforeChecksum` values
> are identical, report the `death` versus `shield-blocked` events, and do not
> claim a replay match unless those base checksums are equal.

### Expected proof

| Branch | Level | Alive | Decisive event |
| --- | ---: | --- | --- |
| Unprotected | 2 | `false` | `death` |
| Shielded | 2 | `true` | `shield-blocked` |

Both first `beforeChecksum` values must match. Do not hard-code the checksum in
the film; show the value returned by that take.

### Picture

Hold for a beat when Signal Gates renders. The Level 2 obstacles must be
visible before the first action. Show the unprotected collision, then the same
board resetting and the shield absorbing it.

### Narration

“Normally we would eat five fruit just to reach Signal Gates. The agent selects
a game-owned Level 2 setup, and Huginn validates it through the real save codec
before rendering it. This is not arbitrary state injection. From the identical
starting checksum, one branch dies and the shielded branch survives. That
behavior can now be saved and rerun after the next code change.”

The passing shield branch is checked in as
[`coil-level-2-shield.json`](../../public/regressions/coil-level-2-shield.json).

## 1:17–2:09 — THORNWATCH: compare actual defensive outcomes

Navigate to integrated THORNWATCH. Give Codex this exact prompt, again changing
the take suffix if necessary.

> On this live THORNWATCH page, use actual WebMCP tools. Call `describe_game`
> and identify its three authored route setups. Run these two experiments from
> `setup_id: "meadow-opening"`, seed `12`, and `speed: "watch"`.
>
> Weak branch, request id `thornwatch-far-road-01`: place an archer at pad
> `90`, place a ballista at pad `91`, start the wave, then advance `30` frames
> three times. Expect `phase == "build"`, `wave == 1`, `baseHp == 12`,
> `kills == 0`, and `leaks == 4`.
>
> Strong branch, request id `thornwatch-near-road-01`: place an archer at pad
> `29`, place a ballista at pad `30`, start the wave, then advance `30` frames
> three times. Expect `phase == "build"`, `wave == 1`, `baseHp == 18`,
> `kills == 3`, and `leaks == 1`.
>
> Compare the first `beforeChecksum` from both branches. Report an identical
> experiment base only if they match, then summarize the difference in gate
> health, kills, and leaks. Finally call `capture_game` on the strong final
> state and report its state checksum, distinct image checksum, dimensions, and
> whether the preview is visible. Do not infer that this single wave proves
> overall game balance.

Use this exact action tail in both branches:

```json
[
  { "type": "start_wave" },
  { "type": "advance", "frames": 30 },
  { "type": "advance", "frames": 30 },
  { "type": "advance", "frames": 30 }
]
```

### Expected proof

| Plan | Gate HP | Kills | Leaks |
| --- | ---: | ---: | ---: |
| Towers far from the road | 12 | 0 | 4 |
| Towers near the road | 18 | 3 | 1 |

Both first `beforeChecksum` values must match. The near-road branch is checked
in as
[`thornwatch-meadow-defense.json`](../../public/regressions/thornwatch-meadow-defense.json).

### Picture

Let each of the three 30-frame commits render. Show raiders, attacks, leaks and
the gate-health change on the real canvas. Because the strong branch runs last,
end on its painted towers and passing result. Let `capture_game` reveal its PNG
preview in the Huginn dock; briefly show both returned checksums.

### Narration

“The same port now drives a different genre. Legal actions stop the agent from
inventing placements, fixed frames make the wave reproducible, and two plans
start from the same authored state. Near the road we stop three raiders. Far
away, all four leak. A designer can inspect the visible result and keep the
metric expectations as a regression—without replaying a campaign to reach the
mechanic under test.”

## 2:09–2:29 — Prove the engine boundary and visual evidence

### Picture

Use a prepared split card or a fast source crop: COIL says **Native Canvas 2D**;
THORNWATCH visibly says **PIXIJS · WEBGL**. Show that both pages report the same
eight tool names. Hold on the `capture_game` result paired to THORNWATCH's final
experiment checksum.

### Narration

“COIL renders with the browser's native Canvas API. THORNWATCH is a real PixiJS
WebGL game. Huginn imports neither engine into its core: both expose the same
state-and-action adapter and the same tools. Capture adds the missing visual
receipt—the current PNG and its image hash, paired to the exact game-state
hash the agent just tested.”

## 2:29–2:43 — Show the architecture and optionality

### Picture

Show the diagram in [ARCHITECTURE.md](../ARCHITECTURE.md) or a prepared card
based on it. Briefly show a standalone game beside its integrated equivalent.

```text
game reducer + save codec + named setups
                    │
                    ▼
             protocol-free core
                    │
       ┌────────────┴────────────┐
       ▼                         ▼
WebMCP registration       optional debugger
```

### Narration

“The game owns its reducer, legal actions, save codec and a small catalog of
meaningful setups. Huginn core is protocol-independent. WebMCP registration is
a separate layer, and the debugger is optional. The standalone builds remain
fully playable and their bundles are audited to contain no Huginn protocol
runtime. Capture is an optional host capability, so it adds no requirement to a
headless kernel or a game without a safe frame path.”

## 2:43–2:50 — Close on the durable value

### Picture

Return to the two passing result summaries and the live THORNWATCH canvas.

### Narration

“Huginn does not replace unit tests, visual testing, or human judgment, and it
does not add ceremony to every edit. It gives coding agents a typed test port
for the gameplay moments where regressions hide: live, visible, and exactly
reproducible.”

End on the positioning line and the public repository URL.

## If something goes wrong during the take

- Tool discovery missing: reload a fresh public tab in Codex's in-app browser.
  Do not substitute the dock badge for a real tool call.
- Result says `cached`: change the request suffix and rerun both branches.
- Starting checksums differ: stop. Confirm the same `setup_id`, seed, and game
  build, then use fresh tabs/request ids.
- An action becomes illegal: call `list_legal_actions`; do not improvise a new
  demo plan on camera.
- A metric expectation fails: stop the recording and investigate. Never edit a
  receipt or narration to turn it into a pass.
- Canvas is too small: widen the browser and collapse the debugger details.
  Keep the external tool transcript narrow and show only compact results.

## Claims we can make

- A named setup removes prerequisite gameplay for the selected authored
  moment.
- Typed legal actions prevent impossible moves from being committed.
- Same setup, seed and actions produce comparable step/event/metric/checksum
  receipts.
- Semantic expectations can preserve selected gameplay behavior as a portable
  regression.
- Tool actions execute on the same state and renderer used by the player.
- The same tool surface has been called in the in-app browser on native Canvas
  2D and PixiJS/WebGL pages.
- `capture_game` provides visible bounded PNG evidence paired to canonical
  state; it does not replace the restorable state snapshot.

## Claims we must not make

- Do not claim lower token use, fewer code changes, lower wall time, or faster
  authoring. The completed paired trials did not establish those outcomes.
- Do not claim one seed or one wave proves balance, fun, visual quality, or a
  universally best strategy.
- Do not call setups hidden cheats, arbitrary state injection, or a parallel
  test simulation. They are curated game code and must pass the normal codec.
- Do not say Huginn replaces ordinary source tests, human play, visual review,
  accessibility testing, or engine tooling.
