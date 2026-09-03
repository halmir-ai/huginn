# Playable games and paired feature trials

Status: SUPERSEDED after owner review, 2026-09-03. Emberfall and Ironwood are
unapproved spikes, not submission candidates. The current gate is two complete,
standalone arcade games: COIL (evolved Snake) and STARFALL (three-ball pinball).
No feature comparison starts until their ordinary human play loops are checked.
The earlier plan is retained below to explain the change of direction.

Original status: in progress, 2026-09-03. This supersedes the earlier decision to stop at
the RTS Lab and Tideglass micro-examples. Preserve those examples and receipts
as historical evidence; their interaction counts are not results for these games.

## Product acceptance

- Emberfall: an action arena RPG with move/slash/dodge, pressure from enemies,
  readable telegraphs, three waves and a final boss, and an actual win/loss loop.
- Ironwood: a small gather/build/fight RTS with moving workers, wood/gold,
  construction, recruitment, autonomous combat, raids, and an enemy stronghold.
- Selected owner-supplied painted art, coherent terrain, camera, scale and HUD.
  The canvas is the hero, not an experiment dashboard with decoration.
- Human keyboard/pointer controls and pause/restart work without any agent.
- Simulation is pure and seedable; the same game source can run without any
  Huginn imports. Fixed simulation steps are inputs, not wall-clock behavior.
- Both integrations reuse the existing seven tools. A tool experiment pauses
  the human clock, drives the actual renderer, and visibly labels agent control.

## Fair feature-authoring comparison

Freeze a playable source revision first. Export two standalone projects per
game: a normal game with no Huginn code at all, and identical game source plus
the adapter/kernel. Do not call a disabled-registration build an unintegrated
control. Assert bare bundles contain no protocol runtime.

Give fresh Codex tasks identical feature specifications, acceptance targets,
seed and source, model/settings, and ordinary code/test/browser permissions.
Only the treatment receives Huginn. Allow the control to write its own tests
or diagnostic code, and count that work. Do not force a point-and-click strategy
when source-level tests would be reasonable. Each task owns one checkout, port,
browser tab and evidence directory; do not share browser state or solutions.

Record outcome, source diff, changed production/test/instrumentation lines,
actual tool/browser calls, failures/retries and elapsed time. Only report token
counts if task-specific metering is available. One pair is a demonstration,
not a statistical efficiency claim. Publish null for unavailable measures,
preserve unsuccessful runs, and never invent a winning margin.

Features are additional visible mechanics, not changing a constant. Freeze
their exact contracts after the baseline games pass, before either task starts.

## Visual evidence matrix

- Desktop 1440×900: ready, active action/combat, and win/loss for each game.
- Mobile 390×844: main viewport and usable touch controls; no horizontal overflow.
- Numeric gates: no console errors, all selected assets load, main touch targets
  at least 44px, no simulation mutations caused by animation time.
- Lead approval: immediately recognizable game scene, legible action, meaningful
  human choices and a satisfying objective. Tests alone cannot pass this gate.
