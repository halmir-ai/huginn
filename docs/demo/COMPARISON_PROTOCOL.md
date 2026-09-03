# Predeclared interaction pilot

Frozen before collecting the paired runs. This is a small descriptive pilot,
not a model benchmark or proof of universal efficiency.

## Question and scope

Can both routes reach the same verified game outcomes, and how many semantic
commands must the page receive? Separately, can a fresh authoring task make
a measurable game-design change using Huginn's feedback?

- Integrated: real top-level WebMCP tools.
- Comparison: the same game and complete human UI, `?webmcp=off`; registration
  is skipped. Rules, reducer, seed, legal moves, checkpoints, and inspector
  remain identical. This is **WebMCP off**, not a game with all Huginn code removed.
- Both permit ordinary browser automation and batching. No page presets,
  hidden state, JavaScript debug hooks, direct reducer calls, or source reading
  to replace runtime interaction during the measured segment.
- Preplanned replay probes and fresh-agent problem-solving trials are
  different studies. A replay probe cannot establish reasoning-token savings.

## Freeze each run

Record source/build, game, mode, exact initial seed/state/checksum, plan, ending
horizon, caller type, and which observations are allowed. Start a fresh page
for every condition. Use the same fixed plans in a replay probe; count all
outcome-affecting operations, including restores and setup snapshots.

For a later fresh-agent study, also freeze model/version/reasoning, initial
prompt/context, success predicate, allowed runtime tools, and stopping budget.
Use separate fresh sessions, alternate condition order, retain failures, and
give both conditions the same target—not prior answers from the other run.

## Primary RTS task

Seed 12, cycle 0. Save the starting point, run the following rush plan, restore
the starting point, run economy, restore again, and replay economy. All lists
must complete; do not use `stop_when`.

Rush: build barracks; train vanguard; attack; advance cycle three times.

Economy: assign one worker to Crown Gold; advance twice; build barracks; train;
advance once; train again; attack.

Success requires identical initial state, rush at cycle 3 with damage 34 and
base HP 96, economy at cycle 3 with damage 54 and base HP 75, and economy replay
matching the same final state. The integrated path additionally records and
compares all eight replay steps. Report any difference in proof strength:
a matching UI final state alone is not per-step replay evidence.

Restore explicitly in both conditions for the primary count, even though a
WebMCP batch can also name its base snapshot. Do not give one condition a
setup action that is excluded from the other's count.

## Secondary Tideglass task

Freeze the integrated source after the explicitly requested battery-budget
revision, then use that same source in both modes. Historical rules 0.1.0
authoring receipts are a separate before/after record, not part of this pair.
Seed 12, watch 0. Save the base, run Signal route, restore, run Unassisted
route, restore, and replay Unassisted with a new request ID. No page presets.

Signal: sail to Relay Isle; deploy relay; sail to Saltmill; deliver; sail to
Lantern; deliver; sail to Breakwater; deliver. Unassisted replaces only the
second action with wait. All three runs complete eight actions at watch 8.
Compare every step checksum and metric across modes, plus every complete step
record in the WebMCP replay. This is 24 semantic actions, one snapshot and two
explicit restores in each condition. The revision target is three deliveries
with at least two battery for Unassisted and a three-battery advantage for
Signal; report measured values, not the prediction.

## Metrics: keep distinct units distinct

| Field | Meaning |
| --- | --- |
| Page UI commands | Normal game button handlers invoked, excluding non-game navigation/inspection/export |
| Page WebMCP calls | Actual registered tool executions, including reads; also break out mutating commands |
| Semantic actions | Successfully committed game transitions, regardless of transport |
| Browser/assistant envelopes | Agent tool invocations; a single browser envelope may contain many clicks |
| Observations | DOM/screenshot/state inspection operations; not game actions |
| Errors / retries | Every rejected call, invalid prefix, reload, or repeated attempt; never silently discarded |
| Model tokens | First-party per-run input/output/cached usage only; otherwise unavailable |
| Edit-test iterations | One source change followed by its check; a runtime retry is not an edit iteration |
| Code changes | Git added/deleted physical lines by file/category; not hours, complexity, or quality |

Page telemetry cannot observe model tokens, reasoning, browser observations,
or transport envelopes. JSON bytes are a payload-size measurement only, not
a token estimate. Account-wide usage percentages are not per-run token cost.
No dollar claim without exact model/billing context. Missing stays `null`.

## Code-effort accounting

Record the one-time game implementation, adapter/WebMCP glue, equivalent human
controls, tests, and documentation separately where the files permit it. If
game logic and adapter live in one file, report that combined scope instead
of pretending every line is integration overhead. Exclude existing kernel,
art, generated build files, and the filming package from adapter-cost claims.

Measure later source-change diff separately from tests, UI work, and docs.
The authoring session begins with a stated design target and measured baseline.
Never inject an undisclosed defect, move the target after seeing the result,
or call a single seed evidence of game balance or fun.

## Decision rule and limits

First report success parity. Only compare counts for completed equivalent
work; include failures as failures, not smaller successful counts. Distinguish
the command-count advantage of batching from model efficiency. No token or
iteration savings ratio until paired comparable agent trials provide it.

Start with RTS plus a distinct logistics example. A third game is optional
only after both work in the deployed browser and the video has a complete cut.
One paired run per game is a smoke/pilot; do not report statistical significance,
market impact, or general model-performance improvement from it.
