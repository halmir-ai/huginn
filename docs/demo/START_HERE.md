# Huginn arcade submission — start here

The current recording source of truth is
**[ARCADE_FINAL_SCRIPT.md](ARCADE_FINAL_SCRIPT.md)**. Open it first. It contains
the exact 2:42 narration, COIL tool payloads and checksums, locked STARFALL
ball-saver receipt values, shot timing, cut points, the one-page recording
checklist, claim limits, and a 30-second backup cut.

## Open these in order

1. [Final arcade script and recording checklist](ARCADE_FINAL_SCRIPT.md)
2. [COIL · Snake](https://halmir-ai.github.io/huginn/) in Codex's in-app browser
3. [STARFALL · Pinball](https://halmir-ai.github.io/huginn/games/starfall/) in
   a separate fresh Codex in-app-browser tab
4. [Feature-trial results](https://halmir-ai.github.io/huginn/trials/) for the
   honest closing shot

Do not record from an earlier script. Do not begin final capture until the
public origin contains both accepted features and a fresh public receipt
reproduces every locked STARFALL value in the final script.

## Hard gates before recording

- Codex discovers and calls all seven registered WebMCP tools on each public
  game. A connection badge, page preset, or local checkpoint button is not
  evidence of an agent call.
- COIL's exact six-action run ends alive at tick 18 with `shield-blocked` and
  checksum `33bc4902b43d8f90fc4cf375ef9ee176fa30fbf59c77d3456c130d4f8a658aa4`.
- COIL restores its exact seed-12 checkpoint, runs the three-action setup
  prefix, hands the live page to the human, holds recovery, queues Up, and
  continues alive.
- STARFALL uses the same fixed seed-12 flipper plan with
  `stop_when: ballSaves >= 1`. The first early crossing visibly saves ball one
  without spending a ball or resetting score, lights, or multiplier.
- STARFALL restores the exact checkpoint and a fresh request replays the same
  action/event/metric/checksum records. All displayed values come from this
  public run, never an older drain receipt.
- The finished film is public on YouTube, contains clear audio and accurate
  captions, is under three minutes, and passes a signed-out 720p phone review.

## Record order

1. Capture the complete COIL tool flow and human handoff in replaceable clips.
2. Capture the complete STARFALL save, restore, and replay; retain the machine-
   readable receipt and fill every public-value placeholder.
3. Capture short ordinary-play clips of both games.
4. Capture both completed paired-result sections for the honest close.
5. Record the exact narration in short paragraphs, then edit in the order and
   at the cut points specified by the final script.

The required conclusion is narrow: Huginn produced better live-state evidence
in both completed pairs; it did not lower authoring cost in either, and two
pairs support no general efficiency claim.
