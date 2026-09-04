# Coding-agent integration contract

Use this brief when asking Codex or another coding agent to make a browser game
Huginn-compatible. It works for a new game or as a retrofit brief.

## Copy/paste prompt

```text
Instrument this browser game with Huginn as an optional typed test port.

First read:
- https://github.com/halmir-ai/huginn/blob/main/docs/INTEGRATION.md
- https://github.com/halmir-ai/huginn/blob/main/docs/ARCHITECTURE.md

Preserve the existing human game, controls, visuals, and feel. Do not redesign
the game merely to simplify instrumentation.

Architecture requirements:
1. Keep canonical simulation state separate from rendering and DOM state.
2. Put all nondeterminism behind a seed stored in canonical state. Do not use
   Math.random(), wall time, or animation timing in transitions.
3. Define a closed, bounded semantic Action union with matching JSON Schemas.
4. Implement initialState(seed), listLegalActions(state), reduce(state, action),
   metrics(state), serialize(state), deserialize(value), and visible render.
5. Route human input and agent actions through the same transition semantics.
6. Keep @halmir/huginn core separate from @halmir/huginn/webmcp. Treat the
   @halmir/huginn/debugger dock as optional; no game rule may depend on it.
7. Do not add game-specific WebMCP tools. Use the shared seven core experiment
   tools; optionally supply the generic `capture_game` frame callback.
8. Pause any ambient human clock while a mutating agent sequence executes.
9. For important states that are expensive to reach, define a small catalog of
   named `setups`. Each setup must construct a real codec-valid game state from
   a seed. Never accept arbitrary state patches from a tool caller.

Before changing UI, identify the current state authority, RNG, tick/update loop,
save format, legal-action rules, and render entry point. If state and rendering
are inseparable, report the smallest extraction required before proceeding.

Verification requirements:
- snapshot then restore preserves checksum and legal actions;
- the same seed and action list produces identical per-step events, metrics,
  and checksums in two fresh runs;
- an illegal action cannot mutate state;
- every committed action visibly renders;
- a visual capture, when enabled, flushes the frozen renderer, displays a
  bounded PNG preview, and returns image metadata paired to a canonical state
  checksum that remains unchanged across capture;
- cancellation/error returns the exact committed prefix;
- the ordinary game remains playable when WebMCP is unavailable;
- if there is a standalone build, its transitive bundle contains no Huginn,
  WebMCP, or debugger runtime.

Return:
- the adapter and the small composition entry;
- focused tests for the invariants above;
- one bounded seeded experiment with meaningful metric expectations;
- when the game has long progression, one named setup that reaches a real
  late-game mechanic without replaying unrelated content;
- a concise list of source files changed and any behavior that could not be
  made deterministic without changing game design.
```

## New-game version

For a game being authored from scratch, add this sentence to the prompt:

> Define `GameDefinition` beside the first playable reducer, before building
> menus or content. Human controls must call `GameRuntime.dispatch`; mount the
> optional debugger only in the integrated entry. Add named setups only for
> expensive, decision-relevant test moments—not as a parallel simulation.

This makes testability part of the state architecture without requiring a
regression fixture for every edit.

## Retrofit version

For an existing Canvas, Phaser, PixiJS, or WebGL game, add:

> Do not replace the engine. Wrap its canonical save/reducer boundary in a
> `GameAdapter`. If human actions currently mutate engine objects directly,
> first introduce one shared dispatch function and route both human input and
> Huginn through it.

If the game has no saveable canonical state or relies on ambient randomness,
snapshot/replay cannot be honestly claimed. The agent should expose that as a
bounded prerequisite rather than creating a parallel fake simulation.

## Review checklist for the human

- Play the game normally before reviewing any tool output.
- Confirm the agent-visible action vocabulary matches real gameplay choices.
- Inspect every metric description; the agent must know what “bad” means.
- Watch one tool sequence render, then take back control with keyboard/pointer.
- Replay one fresh request from the same seed and compare the complete receipt.
- Keep only regressions that protect meaningful behavior.

Reference implementations:

- [COIL reducer-first game](../src/games/coil/game.ts)
- [COIL three-line integration entry](../src/play/coil-entry.ts)
- [STARFALL deterministic physics game](../src/games/starfall/game.ts)
- [THORNWATCH setup-driven tower defense](../src/games/thornwatch/game.ts)
- [THORNWATCH PixiJS renderer](../src/games/thornwatch/view.ts)
- [Core adapter contract](../src/huginn/types.ts)
- [WebMCP registration](../src/webmcp/index.ts)
- [Optional debugger composition](../src/debugger/index.ts)
