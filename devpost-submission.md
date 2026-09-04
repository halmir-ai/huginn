# Huginn — Devpost submission record

## Project name

**Huginn**

## Tagline

Test the moment, not the grind: a typed WebMCP test port for live browser games.

## Links

- Live app: <https://halmir-ai.github.io/huginn/>
- Public repository: <https://github.com/halmir-ai/huginn>
- Demo video: <https://youtu.be/2wD7KBtM5fs> (2:52)

## Short description

Huginn gives coding agents a typed test port into the live browser games they
create, turning opaque canvas gameplay into visible, reproducible experiments.
A designer can ask an agent to open an authored gameplay moment, inspect the
real state and legal moves, branch two plans from the same seed and checksum,
watch every action render, and keep the result as a semantic regression.

## Full description

### The problem

Coding agents are increasingly good at creating browser games, but testing the
gameplay they create is still surprisingly blind. A source-code review can
suggest what should happen and a screenshot can show pixels, yet neither exposes
the authoritative state currently held in browser memory: the board, economy,
legal actions, RNG state, campaign progress, or save timeline.

That gap is especially painful in games. Important regressions often appear only
after a sequence of decisions or behind minutes of progression. Reaching the
same late-game moment by keyboard or pointer is slow and difficult to reproduce,
while inventing a parallel test simulation risks proving behavior the real game
does not have.

### Why WebMCP

This use case depends on the live page. Huginn registers bounded, typed tools
directly from the running game through WebMCP. The agent reads the same canonical
state the renderer uses and dispatches through the same transition path as the
player. The human stays in the loop and watches each committed action render on
the real canvas.

A backend API would miss the thing being tested: this exact deployed browser
build, its in-memory save state, and the visual result currently in front of the
designer. DOM automation alone cannot describe a Canvas or WebGL game, and raw
coordinate clicking cannot reliably create or replay a semantic game state.

### What people and agents can do together

With Huginn, a designer can direct an experiment in natural language:

- discover the game's rules, goals, metrics, action vocabulary, and curated
  setups;
- enter a real late-game moment without replaying unrelated progression;
- list only actions that are legal against the current state;
- run a visible sequence with a fixed seed and bounded steps;
- branch two plans from the same verified state and compare their outcomes;
- snapshot and restore the canonical save timeline;
- capture the rendered frame with an image hash paired to the exact state hash;
- save meaningful metric expectations as a portable gameplay regression.

The submission demonstrates this on three playable games. COIL is a three-level
campaign Snake game, STARFALL is physical pinball, and THORNWATCH is tower
defense. COIL and STARFALL use native Canvas 2D; THORNWATCH uses PixiJS 8 and
WebGL. The same shared tool surface works across both renderer families.

The hero demonstration skips directly to COIL's real Level 2 signal gate and
branches shielded versus unprotected play from an identical checksum. In
THORNWATCH, the agent compares two tower plans through the same deterministic
wave, then captures the visible PixiJS result. These are narrow, reproducible
test cases—not claims that one seed proves game balance or fun.

### How it works

Huginn is split into four layers:

1. a protocol-independent kernel that owns deterministic execution, legal-action
   checks, snapshots, checksums, cancellation, and semantic verdicts;
2. a separate WebMCP transport that builds strict JSON Schemas and performs the
   imperative `document.modelContext.registerTool(...)` calls;
3. a small protocol-free runtime for reducer-first games;
4. an optional in-page debugger for receipts, captures, and replay controls.

Games implement an engine-neutral adapter: initial state, legal actions, reducer,
metrics, serialization, restoration, and render callback. Human input and agent
tools use the same state authority. The core never imports Canvas, PixiJS, DOM
selectors, or a game engine.

The shared tools are `describe_game`, `get_game_state`, `get_metrics`,
`list_legal_actions`, `apply_action_sequence`, `snapshot_game`, and
`restore_game`. The examples also provide the optional `capture_game` host
capability. Inputs are closed and bounded: no executable code, selectors,
arbitrary predicates, URLs, filesystem paths, or network targets.

Every game also has a standalone build with identical rules and ordinary
controls but no Huginn executable code. The production build traverses and
audits those dependency graphs. This keeps Huginn optional instead of turning
game development into protocol bureaucracy.

### What is new

Huginn, its kernel, WebMCP transport, debugger, all three game implementations,
tests, documentation, and the public site were created during the WebMCP
Challenge submission period. A selected set of pre-existing, owner-authorized
THORNWATCH art is published under CC BY 4.0 with exact source paths and hashes.
All source code is MIT licensed.

## Testing instructions for judges

Use ChatGPT's in-app browser or Chrome 149+ with
`chrome://flags/#enable-webmcp-testing`.

1. Open <https://halmir-ai.github.io/huginn/>. Play COIL with arrow/WASD keys
   or touch first; the game should work without invoking a tool.
2. Confirm the integrated page reports **Connected · 8 live browser tools**.
3. Ask the browser agent:

   > Use the actual WebMCP tools on this COIL page. Call `describe_game`.
   > Then run request `judge-coil-shield-01` from setup
   > `level-2-gate`, seed `12`, with actions
   > `[{"type":"shield"},{"type":"advance","steps":1}]`.
   > Expect `campaignLevel == 2`, `alive == true`, and
   > `shieldStepsLeft == 0`. Use watch speed and summarize the events.

   Expected: Signal Gates renders immediately, the shield blocks the collision,
   and the semantic verdict is `passed`.

4. Open <https://halmir-ai.github.io/huginn/games/thornwatch/> and ask the agent
   to call `describe_game` and `capture_game`. Expected: the same eight tool
   names are available on this PixiJS/WebGL game; the capture appears visibly in
   the page and returns PNG dimensions, an image checksum, and the paired
   canonical state checksum.
5. Optional: compare either integrated game with its **Standalone game** link.
   The same human game remains playable, but the standalone page intentionally
   registers no WebMCP tools.

No login or credentials are required.

## Required form answers

- Submitter type: **Individual**
- Country of residence: **United States**
- Organization: **N/A / individual entry**
- App status: **New**
- Existing-project extension explanation: **N/A; all implementation is new
  hackathon-period work. Reused art is explicitly documented.**
- Compatible clients tested: **Codex in-app browser with built-in WebMCP on
  the final public deployment**
- AI tools used: **OpenAI Codex for implementation, testing, and release
  preparation; ChatGPT and Claude for product ideation and critique**
- How much did you learn?: **Significant**
- Is AI valuable to your career?: **Yes**
- How did you hear about the hackathon?: **Devpost**
- Newsletter opt-in: **Yes**

## AI assistance disclosure

OpenAI Codex was used as the primary coding collaborator: architecture,
implementation, tests, browser-tool verification, documentation, and release
preparation. ChatGPT and Claude contributed early product ideation and critical
feedback. The entrant selected the product direction, supplied and authorized
the reused art, evaluated playability and visual quality, and is responsible for
the final demo, claims, and submission.

## Visual collateral

1. **Hero:** THORNWATCH during a live wave with painted towers and enemies;
   debugger compactly showing a passing experiment.
2. **Test the moment:** COIL Level 2 Signal Gates with the shield-blocked event
   and passing expectations visible.
3. **Engine agnostic:** COIL Native Canvas 2D beside THORNWATCH PixiJS/WebGL,
   both labeled with the same eight tools.
4. **Architecture:** the four-layer dependency diagram plus the standalone
   no-protocol build audit.

Keep text readable at Devpost thumbnail size. Do not use old prototype or
efficiency-study imagery.

## Video record

The final 2:52 cut follows
[the final demo script](docs/demo/TEST_THE_MOMENT_DEMO.md), includes normalized
audio and an accurate caption file, and shows actual WebMCP calls in Codex's
in-app browser. Public URL: <https://youtu.be/2wD7KBtM5fs>.

## Finalization status

- Devpost project: <https://devpost.com/software/huginn>
- Final submission fields and testing instructions are recorded above.
- Submission status is verified live before this record is frozen.
