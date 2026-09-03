# Copy/paste prompts — one at a time

Use a fresh Codex task or this task, with the live game in the **built-in
browser**. These prompts ask for real site-tool calls. They do not require
terminal commands or hand-entered JSON. Inspect each PASS condition before
moving on. Never paste a snapshot ID from a previous page session.

## 1 · Inspect and save the start

```text
Open https://halmir-ai.github.io/huginn/ in the built-in browser. This is a
recording rehearsal. Use its real WebMCP site tools, not the page preset.
Call describe_game, get_game_state, and list_legal_actions. In two sentences,
explain the goal and what the damage/base-health metrics mean. Confirm we
are at seed 12, cycle 0. Then call snapshot_game and retain its actual ID and
full checksum for the next requests. Do not run actions yet. If site tools
are unavailable or the start is different, stop and tell me.
```

**PASS:** seven discovered tools; seed 12; cycle 0; snapshot checksum starts
`35e2bab995b2`. The notebook says `WebMCP · snapshot_game · completed`.

**If not:** verify the supported model/browser. If you used the preset or
changed the game, open a fresh tab and start again. Never claim the green
badge or a JavaScript-console call proves agent discovery.

## 2 · Rush branch

```text
From the snapshot you just saved, use apply_action_sequence with a fresh
request ID of film-rush-01, the saved base_snapshot_id and full
expected_base_checksum, and speed watch. Do not also supply seed. Execute
these six actions in this order: build_barracks, train_vanguard,
launch_attack, advance_cycle, advance_cycle, advance_cycle. Do not supply a
stop_when condition. Check the returned status and number of committed
steps. Report only ending cycle, enemy damage, and our base health.
```

**PASS:** completed; 6 steps; cycle 3; damage 34; base HP 96.

**If not:** stop. Inspect the returned prefix/error; do not narrate a completed
experiment. Starting from the wrong branch or a stale snapshot is not a
reason to patch the expected numbers.

## 3 · Economy branch — record both cards before continuing

```text
Run a second branch from the SAME saved snapshot and full checksum. Use
apply_action_sequence with fresh request ID film-economy-01 and speed watch.
Do not supply seed or stop_when. Execute these eight actions in order:
assign_worker with resource crown_gold; advance_cycle; advance_cycle;
build_barracks; train_vanguard; advance_cycle; train_vanguard; launch_attack.
Check that it completed all eight steps. Compare the two plans at ending
cycle 3. Explain the damage-versus-base-health tradeoff in one sentence.
Do not call either plan dominant or claim that one seed establishes balance.
Pause here so I can record both different result cards.
```

**PASS:** completed; 8 steps; cycle 3; damage 54; base HP 75. Same starting
checksum shown on both cards. Record this screen now.

**Important:** Do not add `stop_when: cycle >= 3`. Economy's final training and
attack occur after its last advance-cycle action. That stop condition would
truncate the intended plan before the payoff. The finite action list is the
bound; both completed lists naturally end at cycle 3.

## 4 · Restore — a separate proof

```text
Call restore_game using the original saved snapshot ID and expected_checksum.
Verify the returned full checksum equals the saved starting checksum. Show
that the live page is back at cycle 0, with base health 100. Pause; do not
start a new plan yet.
```

**PASS:** “Restored & verified”; state prefix `35e2bab995b2`; cycle 0.

## 5 · Fresh replay — not a cached retry

```text
Rerun the exact eight-action economy plan from the same saved snapshot,
with the same expected_base_checksum and speed watch, but use a NEW request
ID film-economy-replay-01. Do not supply seed or stop_when. Compare its full
per-step actions, events, metrics, before/after checksums, and final checksum
with film-economy-01. Verify it was a fresh execution, not cached. Summarize
the comparison in one sentence and leave the replay result visible.
```

**PASS:** completed; 8 steps; no `cached: true`; all step records match;
“Replay matches, step for step.”

**If not:** stop the claim. A fresh ID prevents idempotency from looking like
reproducibility. A reload destroys page-local snapshots and tool handles;
restart at Prompt 1 after any reload.

## If you need a retake

Use a fresh tab and the whole sequence, or use new request IDs throughout.
Do not reuse an existing request ID with changed inputs. Snapshot IDs and
checksums must always come from actual results in that tab.

## Capture the implementation, not a wall of code

Open `src/huginn/webmcp.ts` at the actual `registerTool` call. Capture roughly
12–18 readable lines showing name, description, inputSchema, and execute.
Open `src/huginn/types.ts` at `GameAdapter`. The message is “wrap the game's
own state and transitions,” not “a magic forty-line universal adapter.”
