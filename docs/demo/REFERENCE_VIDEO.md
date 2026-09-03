# Reference walkthrough: what it is and what was checked

[Watch / download MP4](https://halmir-ai.github.io/huginn/demo/huginn-reference-walkthrough.mp4)
· [GitHub file](../../public/demo/huginn-reference-walkthrough.mp4)
· [Actual experiment receipt](../../public/demo/experiment-receipt.json)

This is a **2:18 teaching aid**, not the final hackathon submission video.
It uses genuine still captures after real WebMCP calls in the Codex built-in
browser. Synthetic narration and editorial recording cues were added offline.
It is not continuous footage, does not show the full Codex window, and does
not depict a new-game authoring session. Both the video and its narration
disclose this. The full Codex window was unavailable to the recording controls.

## Source and attribution

- Game URL: <https://halmir-ai.github.io/huginn/>
- Source build: `34ec13b9d75b4ee31ca2e2c7c9933da55401f90b`
- Production JS: `assets/index-BYjn2WPc.js`
- Capture: September 2, 2026 Pacific, seed 12, 1920×1080 browser viewport.
- Real calls: description, legal actions, snapshot, rush, economy, restore,
  fresh economy replay, state, metrics. No page-preset footage.
- Game code/narration/production script: this MIT repository.
- Game art visible in captures: selected original RTS assets, CC BY 4.0,
  credited to this project's creator with source paths/hashes in
  [ASSET_LICENSE.md](../ASSET_LICENSE.md). The film crops and scales screenshots
  and adds editorial labels; it does not alter the game-state evidence.
- Voice: local macOS Samantha text-to-speech, not a recording of the participant.

## Verification

- Fresh economy replay: all eight per-step action/event/metric/checksum
  records equal; final checksum equal; no cached response.
- Exact restore: checksum equal to the saved seed-12 starting checksum.
- Rush: 6 committed steps, cycle 3, damage 34, base HP 96.
- Economy: 8 committed steps, cycle 3, damage 54, base HP 75.
- Browser warning/error log empty during the captured flow.
- `npm run check`: 23 tests passed. `npm run build`: passed.
- Renderer script passed `node --check` and completed all seven segments.
- Export: H.264, 1920×1080, AAC stereo at 48 kHz, duration 138.154667 seconds.
- Audio signal check: mean -18.9 dB, peak -4.3 dB in the initial render; the
  revised render uses identical audio inputs. This is not a subjective voice
  quality review. Listen before reusing any synthesized narration.
- The comparison frame was visually reviewed; large editorial cues repeat
  the genuine measurements so the guide remains readable without interpreting
  tiny notebook text. The guide is not evidence of final YouTube/phone quality.
- Final MP4 SHA-256:
  `f8e17bb295fa5cdc4287cab5cb291f936c51e2a995d04c9defcfce00eeb2e1ce`.

## Re-rendering

The [manifest](reference-walkthrough.json) contains the chapter narration and
frame mapping. [render-reference-walkthrough.mjs](../../tools/render-reference-walkthrough.mjs)
consumes six real 1920×1080 screenshots named `01-start.png` through
`06-replay.png`, using the same page layout as the source build. It requires
macOS `say`, `ffmpeg`, `ffprobe`, and a path to an installed `sharp` module.

```sh
node tools/render-reference-walkthrough.mjs CAPTURE_DIRECTORY NEW_OUTPUT_DIRECTORY SHARP_MODULE_PATH
```

It creates a new directory and refuses to overwrite an earlier package.
Generated intermediate voice/frames/clips stay under ignored `artifacts/` in
the working copy. The generated SRT is an approximate sentence-timed rehearsal
transcript, not final submission captions. Public distribution is limited to
the MP4 and the non-sensitive experiment receipt.
