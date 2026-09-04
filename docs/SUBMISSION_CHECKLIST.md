# WebMCP Challenge final checklist

Deadline: **Friday, September 4, 2026 at 1:00 AM PT**. Target submission no
later than **10:00 PM PT on September 3** where possible; otherwise preserve a
minimum upload and form buffer. No submission materials may change after the
deadline.

## Product and repository

- [x] Public repository: <https://github.com/halmir-ai/huginn>
- [x] Detectable MIT license at the repository root.
- [x] Working live origin: <https://halmir-ai.github.io/huginn/>
- [x] All necessary source, assets, and local instructions are tracked.
- [x] Literal `document.modelContext.registerTool({ ... })` example is visible
  in the README; production registration is linked.
- [x] New hackathon work and reused art are documented in
  [PROVENANCE.md](PROVENANCE.md).
- [x] Integrated and standalone pages exist for all three games.
- [x] COIL proves native Canvas 2D; THORNWATCH proves PixiJS/WebGL.
- [x] Exact THORNWATCH asset hashes and CC BY 4.0 terms are documented.
- [x] Release commit `e34117d` is on `main`; GitHub Pages run
  [33840083808](https://github.com/halmir-ai/huginn/actions/runs/33840083808)
  completed successfully.

## Release verification

- [x] `npm run check` passes: 17 files, 104 tests.
- [x] `npm run build` passes and audits all standalone dependency graphs.
- [x] `npm pack --dry-run` includes all four documented library entries.
- [x] Every tracked Markdown local link resolves.
- [x] Public integrated and standalone pages for all three games return 200.
- [x] A compatible in-app browser discovers eight tools on the final public
  COIL and THORNWATCH builds.
- [x] The final COIL Level 2 experiment returns its expected events and metrics.
- [x] The final THORNWATCH strong/weak branches return their expected metrics
  from an identical base checksum.
- [x] `capture_game` shows a PNG preview whose state checksum matches the
  final THORNWATCH state.

## Video

- [ ] Record using [TEST_THE_MOMENT_DEMO.md](demo/TEST_THE_MOMENT_DEMO.md) as
  the only script.
- [ ] Show ordinary play before tools.
- [ ] Show actual WebMCP discovery/calls—not only the in-page debugger.
- [ ] Show named setup, identical experiment base, visible sequence, semantic
  result, and state-bound capture.
- [ ] Show Canvas 2D and PixiJS/WebGL using the same tool surface.
- [ ] Keep narration accurate: no productivity, balance, or universal-engine
  claim beyond the demonstrated boundary.
- [ ] Runtime is below three minutes.
- [ ] Audio is clear; captions are accurate; no secrets or personal tabs appear.
- [ ] Review at 720p on a phone and at full resolution on a laptop.
- [ ] Upload early, wait for processing, and set the YouTube video to Public.

## Devpost

- [ ] Create the Huginn Devpost project.
- [ ] Title, tagline, description, live URL, and public repository match
  [devpost-submission.md](../devpost-submission.md).
- [ ] Select **Individual** and **New**.
- [ ] Fill the entrant country and every required questionnaire field.
- [ ] Add exact testing instructions and supported-client note.
- [ ] Add public YouTube URL.
- [ ] Add strong screenshots with readable captions.
- [ ] Verify repo, site, and video signed out/incognito.
- [ ] Submit and verify the My Projects card says **Submitted** in green.

## Freeze

- [ ] Record the final commit SHA, Pages run, video URL, and Devpost URL.
- [ ] Make no post-deadline edits.
- [ ] Keep the public repo, live site, and video unchanged and available through
  the September 21, 2026 judging deadline.
