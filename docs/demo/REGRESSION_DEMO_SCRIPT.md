# Huginn regression demo — recording source of truth

Target runtime: **2:42** (acceptable range: **2:35–2:45**). Record a live,
supported browser session at the public game URLs. The film's claim is narrow:
Huginn makes important gameplay behavior inspectable, checkable, and replayable
through the same visible browser game a human is watching.

> **Huginn gives coding agents a typed test port into the live browser games they create, turning opaque canvas gameplay into visible, reproducible experiments.**

This script supersedes the older arcade-only recording flow for this demo. It
uses STARFALL as the hero, COIL as transfer proof, and the shipped semantic
regression path: an optional `expect` list on a visible
`apply_action_sequence`, followed by **Save regression** and a fresh same-seed
replay. A regression is optional evidence for behavior that matters; it is not
a required ceremony for every edit.

## Locked story and evidence

The first Huginn-assisted STARFALL acceptance run found a real accounting
mismatch: an early saved crossing incremented both `ballSaves` and `drains`,
even though the ball was not spent. The corrected invariant is
`launches = drains + ballSaves + inPlay`. The final live run reports
`ballSaves=1`, `drains=0`, `ballsRemaining=3`, `score=425`, and `lights=2`.
See [the trial record](STARFALL_FEATURE_TRIAL_RESULTS.md) for the correction
history and caveats.

The passing public scenarios are the machine-readable source for the operator
inputs and expectations:

- [STARFALL ball-saver regression](../../public/regressions/starfall-ball-saver.json): seed `12`; stop when `ballSaves >= 1`; expect `ballSaves=1`,
  `drains=0`, `ballsRemaining=3`, `score=425`, `lights=2`.
- [COIL shield-recovery regression](../../public/regressions/coil-shield-recovery.json): seed `12`; expect `alive=true`, `tick=18`, `score=0`,
  `shieldStepsLeft=0`.

The JSON files contain no request ID, snapshot ID, or checksum. The operator
must supply a fresh safe `request_id` for every execution, and must display the
checksums returned by the live tools. Do not paste a request ID or checksum from
an older tab.

## Recording run of show

### 0:00–0:12 — Open on the hero

Show the integrated STARFALL page already loaded in the Codex in-app browser:
the pinball canvas, score/ball/multiplier readouts, ball-saver indicator, and
the Huginn dock. Make the actual tool call visible beside the canvas. The dock
must read **Connected · 7 live browser tools**; a page preset or green badge
alone is not evidence.

Audio: “This is STARFALL, a real browser game. I want to check one behavior
that matters after a feature change: a saved ball must not be counted as a
spent drain.”

### 0:12–0:31 — Show the problem and the boundary

Cut briefly to the trial result or a prepared text card showing the historical
failure: `ballSaves=1` and `drains=1` for one saved crossing. State that the
canvas showed a ball return, but the semantic accounting was wrong. Keep this
explicitly labelled **historical first result**, not the current verdict.

Audio: “The first acceptance result exposed a real mismatch. The saved ball
returned, but two counters said it had also been spent. The fix is a semantic
regression, not a screenshot comparison.”

### 0:31–1:19 — Run the passing STARFALL regression live

Use the actual WebMCP tools, never the page preset. Give the agent this exact
operator prompt:

> On the live STARFALL page, use the actual WebMCP tools. Call
> `describe_game`, `get_game_state`, `get_metrics`, and `list_legal_actions`
> first. Then call `snapshot_game` and retain its returned ID and checksum. Run the exact input
> in `public/regressions/starfall-ball-saver.json` with a fresh request ID
> `starfall-regression-live-01`, `speed: "watch"`, and seed `12`.
> Include its `stop_when` and all five `expect` checks unchanged. Do not use a
> page preset. Keep the canvas and the tool result visible while it runs.

If the agent needs the action pattern expanded, use exactly:

```text
launch + [L, N, R, N] × 7 + [L, N]
L = advance 30 frames, left=true, right=false
N = advance 30 frames, left=false, right=false
R = advance 30 frames, left=false, right=true
```

Hold on the visible ball return, **SAVED** state, and the dock's semantic
verdict **Regression passed · 5/5 checks**. The sequence should stop at the
first save, not at a spent drain. Show the final receipt values:

```text
ballSaves       1
drains          0
ballsRemaining  3
score           425
lights          2
verdict         passed (5/5)
```

Do not imply that these five metrics are a balance proof; they are a fixed
behavioral contract for this seeded scenario.

### 1:19–1:48 — Save the regression and prove replay

After the passing result, click **Save regression**. Show the downloaded JSON
as `huginn/regression-v1` data containing the seed, typed actions,
`stop_when`, and expectations. The browser download is a portable artifact;
it does not silently write into the repository's `public/regressions/` folder.

Give the agent this exact prompt:

> Restore the checkpoint created at the start of this run using its returned
> snapshot ID and `expected_checksum`. Then repeat the same STARFALL regression
> with a fresh request ID `starfall-regression-replay-01`, seed `12`, watch
> speed, the same actions, stop condition, and five expectations. Compare every
> action, event, metric, before/after checksum, and final checksum with the
> first run. Report a replay match only if every step matches. Do not reuse a
> cached request ID.

Show **Restored & verified**, then the dock's **Fresh replay matched · 5/5
checks** state and matching checksum prefix. Keep the external tool transcript
beside it to show the full per-step/final comparison. A cached retry is not a
new replay.

### 1:48–2:14 — Transfer the same port to COIL

Navigate to integrated COIL. Show the same dock, seven-tool connection, snake
canvas, and shield status. Use this exact operator prompt:

> On the live COIL page, use the actual WebMCP tools. Call `describe_game`,
> `get_game_state`, `get_metrics`, and `list_legal_actions` first. Then call `snapshot_game`
> and retain its returned ID and checksum. Run the exact input in
> `public/regressions/coil-shield-recovery.json` with a fresh request ID
> `coil-regression-live-01`, `speed: "watch"`, and seed `12`. Include all four
> `expect` checks unchanged. Keep the canvas visible and report the committed
> step count, `shield-blocked` event, final checksum, and semantic verdict.

The exact COIL action array is:

```json
[
  { "type": "advance", "steps": 10 },
  { "type": "advance", "steps": 5 },
  { "type": "shield" },
  { "type": "advance", "steps": 1 },
  { "type": "advance", "steps": 1 },
  { "type": "advance", "steps": 1 }
]
```

Hold on **Regression passed · 4/4 checks**, `alive=true`, `tick=18`,
`score=0`, `shieldStepsLeft=0`, and the visible shield-blocked recovery. Say
that the same typed contract transfers from pinball accounting to a Snake
collision boundary; do not claim the games share mechanics.

### 2:14–2:32 — Show plain versus integrated honestly

Open the COIL or STARFALL `/plain/` link for a short ordinary-play shot, then
return to the integrated page. Show that the plain build still plays the same
game but has no Huginn dock, tool registration, semantic verdict, checkpoint
controls, or protocol runtime. The integrated build adds the optional test port;
it does not replace normal keyboard/touch play or unit tests.

Audio: “Build normally. Reach for the live port when a gameplay state,
transition, timing boundary, or accounting rule needs a reproducible check.”

### 2:32–2:42 — Close on the result

Return to the passing STARFALL receipt, the saved JSON link, and the live
canvas. Deliver the required line exactly, then close with: “A designer and a
coding agent can now inspect the same game, rerun the same behavior, and see
what changed.”

## Shot, audio, and recording checklist

- Use a fresh supported browser tab for each integrated game. Keep the canvas,
  dock status, actual tool-call card, and recent result in one readable crop.
- Show `describe_game`, `list_legal_actions`, `snapshot_game`, the visible
  sequence, semantic verdict, **Save regression**, `restore_game`, and the fresh
  replay. Do not scroll through an unbounded raw receipt.
- Use `speed: "watch"` for the hero and COIL runs; retain enough delay for each
  committed step to be visible. Use `fast` only for setup that is not part of
  the proof.
- Record clean narration and game audio; duck game sound under tool-call
  explanation. Add accurate captions for `ballSaves=1`, `drains=0`, `tick=18`,
  `passed`, and the required positioning line.
- Record at 1440p or clean 1080p, use 125–150% browser zoom if needed, and
  verify legibility at 720p on a phone. Hide personal tabs, notifications,
  secrets, and terminal output.
- Save the downloaded regression JSON and both live receipts with the take.
  Record the public URL, browser version, repository commit, and date in the
  production log.
- If registration fails, or a result is `cached`, `failed`, or `inconclusive`,
  stop the take and start a fresh tab. Never edit a receipt to make it pass.

## Claims to avoid

Do not say or imply that Huginn:

- lowers token cost, wall time, or coding cost;
- makes coding faster, or reduces code changes, based on these trials;
- replaces visual/manual playtesting, unit tests, or human design judgment;
- proves game balance, a generally dominant strategy, or quality from one seed;
- should be used for every edit;
- makes every edit safer or automatically discovers all bugs;
- exposes model tokens through the gameplay receipt; or
- runs the plain build with a hidden disabled bridge. The plain build is a
  separate executable dependency graph without the protocol runtime.

The defensible claim is narrower: the optional WebMCP port makes selected live
game behavior typed, visible, semantically checkable, and reproducible.

## Useful source links

- [Tool contract](../TOOL_CONTRACT.md)
- [COIL feature-trial result](COIL_FEATURE_TRIAL_RESULTS.md)
- [STARFALL feature-trial result](STARFALL_FEATURE_TRIAL_RESULTS.md)
- [Arcade playability and browser evidence](ARCADE_PLAYTEST.md)
- [Repository README](../../README.md)
