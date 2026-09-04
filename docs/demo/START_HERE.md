# Huginn regression demo — start here

The current recording source of truth is
**[REGRESSION_DEMO_SCRIPT.md](REGRESSION_DEMO_SCRIPT.md)**. Open it first. It
contains the 2:35–2:45 run of show, exact operator prompts, public regression
inputs and expected metrics, historical STARFALL accounting mismatch, live
pass/fail flow, Save regression JSON step, same-seed replay/checksum proof,
plain-vs-integrated shot, audio checklist, and claim limits.

## Open these in order

1. [Regression demo script and recording checklist](REGRESSION_DEMO_SCRIPT.md)
2. [STARFALL · Pinball](https://halmir-ai.github.io/huginn/games/starfall/) in
   Codex's in-app browser (hero)
3. [COIL · Snake](https://halmir-ai.github.io/huginn/) in Codex's in-app browser
4. [Feature-trial results](https://halmir-ai.github.io/huginn/trials/) for the
   historical mismatch and honest close
5. [Tool contract](../TOOL_CONTRACT.md) and [arcade playability evidence](ARCADE_PLAYTEST.md)
6. [Historical arcade script](ARCADE_FINAL_SCRIPT.md) (useful prior material;
   not the current recording source of truth)

Do not record from the historical script. Do not begin final capture until the
public origin contains both accepted features, the two public regression JSONs,
and a fresh supported-browser run passes the expected metrics.

## Hard gates before recording

- Codex discovers all seven registered WebMCP tools on each public game.
  STARFALL calls the complete set; COIL uses actual inspection, snapshot, and
  sequence tools as the short transfer proof. A connection badge, page preset,
  or local checkpoint button is not evidence of an agent call.
- The STARFALL scenario in [public/regressions/starfall-ball-saver.json](../../public/regressions/starfall-ball-saver.json)
  passes five checks: `ballSaves=1`, `drains=0`, `ballsRemaining=3`,
  `score=425`, and `lights=2`.
- The COIL scenario in [public/regressions/coil-shield-recovery.json](../../public/regressions/coil-shield-recovery.json)
  passes four checks: `alive=true`, `tick=18`, `score=0`, and
  `shieldStepsLeft=0`.
- Each passing run saves the regression JSON, restores the checkpoint, and
  repeats with a fresh request ID. Compare every step and checksum; a cached
  request is not replay evidence.
- Plain `/plain/` builds remain normally playable and contain no protocol
  runtime. The integrated pages add the optional dock and live test port.
- The finished film is public on YouTube, contains clear audio and accurate
  captions, is under three minutes, and passes a signed-out 720p phone review.

## Record order

1. Capture STARFALL's historical mismatch card, then its passing live
   regression, Save regression JSON, restore, and same-seed replay.
2. Capture the COIL passing regression as transfer proof, including the visible
   shield-blocked recovery and four semantic checks.
3. Capture a short ordinary-play plain-build shot and the integrated dock.
4. Record the exact narration in short paragraphs, then edit in the timing and
   shot order specified by the regression demo script.

The required conclusion is narrow: Huginn provides an optional typed test port
for selected live browser-game behavior. The completed pairs did not show lower
authoring cost, and two pairs support no general efficiency claim.

## Keep the evidence honest

The historical feature-trial pages remain useful context: [COIL result](COIL_FEATURE_TRIAL_RESULTS.md),
[STARFALL result](STARFALL_FEATURE_TRIAL_RESULTS.md), and [arcade playability
evidence](ARCADE_PLAYTEST.md). Do not turn their timing, token, or code-change
measurements into a productivity claim. Do not present an old receipt as a
current checksum; retain the live downloaded JSON and receipt from the actual
take.
