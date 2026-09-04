# Huginn final demo — start here

The current recording source of truth is
**[TEST_THE_MOMENT_DEMO.md](TEST_THE_MOMENT_DEMO.md)**. Open it first. It
contains the 2:50 run of show, exact COIL and THORNWATCH operator prompts,
expected metrics, named-setup and same-checksum proof, architecture shot,
recovery instructions, audio checklist, and claim limits.

## Open these in order

1. [Final demo script and recording checklist](TEST_THE_MOMENT_DEMO.md)
2. [COIL · campaign Snake](https://halmir-ai.github.io/huginn/) in Codex's
   in-app browser
3. [THORNWATCH · tower defense](https://halmir-ai.github.io/huginn/games/thornwatch/)
   in Codex's in-app browser
4. [STARFALL · Pinball](https://halmir-ai.github.io/huginn/games/starfall/) for
   the ordinary-play montage
5. [Tool contract](../TOOL_CONTRACT.md), [integration guide](../INTEGRATION.md),
   and [architecture](../ARCHITECTURE.md)
6. [Historical regression script](REGRESSION_DEMO_SCRIPT.md) (useful prior
   material; not the current recording source of truth)

Do not record from the historical script. Do not begin final capture until the
public origin contains both accepted features, the two public regression JSONs,
and a fresh supported-browser run passes the expected metrics.

## Hard gates before recording

- Codex discovers all eight registered WebMCP tools on every public integrated
  game. A connection badge or local checkpoint button is not evidence of an
  agent call.
- COIL exposes Level 2 and Level 3 setups. The Level 2 unprotected branch dies;
  the shielded branch survives, and both begin at the same checksum.
- THORNWATCH exposes three authored route setups. The rehearsed near-road plan
  ends at 18 gate HP, 3 kills and 1 leak; the far plan ends at 12 HP, 0 kills
  and 4 leaks, from the same setup checksum.
- `capture_game` visibly adds a PNG preview whose returned state checksum
  matches the completed THORNWATCH experiment; its image checksum is distinct.
- COIL (native Canvas 2D) and THORNWATCH (PixiJS/WebGL) expose the same tool
  names, proving the adapter boundary across two renderer families.
- The two new checked-in regression scenarios replay with fresh request ids and
  pass every semantic expectation.
- Plain `/plain/` builds remain normally playable and contain no protocol
  runtime. The integrated pages add the optional dock and live test port.
- The finished film is public on YouTube, contains clear audio and accurate
  captions, is under three minutes, and passes a signed-out 720p phone review.

## Record order

1. Capture short ordinary-play shots from COIL, STARFALL and THORNWATCH.
2. Capture COIL's two Level 2 setup branches and matching base checksums.
3. Capture THORNWATCH's two 90-frame plans, exact outcome comparison, and
   `capture_game` preview.
4. Capture the Canvas-versus-Pixi engine card and architecture/plain-build shot.
5. Record the exact narration in short paragraphs, then edit in the timing and
   shot order specified by the final demo script.

The required conclusion is narrow: Huginn provides an optional typed test port
for selected live browser-game behavior. Named setups remove prerequisite play
for an authored moment; the evidence does not establish lower authoring cost.

## Keep the evidence honest

The historical feature-trial pages remain useful context: [COIL result](COIL_FEATURE_TRIAL_RESULTS.md),
[STARFALL result](STARFALL_FEATURE_TRIAL_RESULTS.md), and [arcade playability
evidence](ARCADE_PLAYTEST.md). Do not turn their timing, token, or code-change
measurements into a productivity claim. Do not present an old receipt as a
current checksum; retain the live downloaded JSON and receipt from the actual
take.
