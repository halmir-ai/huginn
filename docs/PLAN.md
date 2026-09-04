# Huginn submission freeze plan

The WebMCP Challenge deadline is **Friday, September 4, 2026 at 1:00 AM PT**
after the announced 12-hour extension. Huginn is feature-frozen. Until the
deadline, only release verification, demo production, submission copy, and
critical fixes are in scope.

## Locked product

Huginn is an optional typed test port for live browser games. The submission
contains:

- a protocol-independent experiment kernel;
- a separate imperative WebMCP registration layer;
- an optional visible debugger and game-capture capability;
- three playable games with keyboard, pointer, and touch controls;
- no-Huginn standalone builds for all three games;
- native Canvas 2D and PixiJS/WebGL engine evidence;
- curated late-game setups and portable semantic regression scenarios;
- a complete integration guide and coding-agent instrumentation contract.

The submission claim is deliberately narrow: Huginn makes selected gameplay
moments visible, addressable, and reproducible for a coding agent. It does not
claim lower token use, faster authoring, automatic balance, or a replacement
for human play.

## Final proof

The under-three-minute video uses:

1. an ordinary-play montage of COIL, STARFALL, and THORNWATCH;
2. a COIL Level 2 branch from one named setup and identical base checksum;
3. a THORNWATCH two-plan comparison from one setup and identical base checksum;
4. a state-bound `capture_game` PNG on the PixiJS/WebGL result;
5. the Canvas-versus-Pixi architecture boundary and standalone-build proof.

The exact narration, prompts, expected metrics, and recovery steps are in
[the final demo guide](demo/TEST_THE_MOMENT_DEMO.md).

## Release order

1. Keep the repo limited to the locked product and current documentation.
2. Run `npm run check`, `npm run build`, and `npm pack --dry-run`.
3. Push the exact release commit to the feature branch and `main`.
4. Wait for GitHub Pages, then repeat tool discovery and one mutating experiment
   on the public origin in a compatible in-app browser.
5. Record, edit, caption, upload, and review the public YouTube video.
6. Complete the Devpost fields, verify all links signed out, submit, and confirm
   the project is marked **Submitted**.
7. Make no changes to the repo, video, live site, or submission after the
   deadline. Keep all materials public and working through judging.

## Explicit cuts

No new games, tools, backends, authentication, autonomous planner, level editor,
analytics dashboard, generic adapter marketplace, or live source-code editing.
Discarded prototypes and old efficiency comparisons are not part of the final
release.
