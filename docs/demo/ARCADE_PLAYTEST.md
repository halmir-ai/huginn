# Arcade baseline: actual play and browser evidence

2026-09-03. These are correctness/playability checks, not an efficiency study.
The feature-authoring comparison remains unmeasured. Enjoyment still needs
human judgment; passing tests alone does not establish it.

## Ordinary play, with no Huginn runtime

COIL was played using its visible start button, timed arrow-key turns, Space
pause, and direction buttons. A real food collection changed score 0 → 10
and length 5 → 6. Running into a wall ended the run. Retry restored score 0
and length 5 while retaining the local best. Phone controls measured 49×45px;
the 390px viewport had a 390px document width.

STARFALL was played using launch, Z/X, pause/resume and flipper buttons. A
complete three-ball session ended normally at 2,725 points and multiplier 2×.
This is one observed human-control test run, not a target or scripted win.
At 390×844, the final layout showed the whole table (top 276.9, bottom 746.9)
and both 48px flipper buttons (bottom 826.9), with no horizontal overflow.
Desktop controls and complete table also fit the tested 1496×828 viewport.
Checked browser error logs were empty.

Earlier dev-server edits reloaded a Snake run, and one browser locator wait
expired before a pinball drain. These were retained as test-workflow retries;
the final checks used the production preview without hot reload. They are not
hidden gameplay or feature-trial failures.

## Native WebMCP, not a local debug hook

The Codex in-app browser discovered and called all seven registered tools on
both games. Calls and full results are preserved in
[`tests/fixtures/arcade/native-browser-smoke.json`](../../tests/fixtures/arcade/native-browser-smoke.json).
Checks span final UI takeover polish and metric-description completion; the
simulation behavior did not change during these browser checks. This receipt
is a local correctness smoke, not a deployed-build identity or token study.

- COIL: eight typed actions moved ten cells, ate the original seed-12 fruit,
  and returned score 10 / length 6. Restore matched the initial checksum.
  A distinct request resetting seed 12 reproduced every step and final hash.
- STARFALL: launch and fixed-frame flipper inputs stopped on the first drain
  after 16 committed actions. Result: 425 points, four bumper hits, one sling
  hit, two balls remaining, 3.6 displayed simulation seconds. Restore matched
  the initial checksum; a seed-reset replay matched every step and final hash.
- COIL takeover: the human button worked at tick zero, resumed an existing
  score-10/length-6 run without resetting it, and offered a working retry after
  an agent-caused collision. The canvas remained visible during tool actions.

## Build checks

`npm run check`: 79 tests passed, 12 files. `npm run build` passed, including
the transitive standalone-bundle audit. The audit rejects protocol code in
either plain game's executable dependency graph; it was tested with a poisoned
shared chunk before accepting the real builds.

Protected regressions were observed failing before their fixes: an asynchronous
live-state read could pair an old checksum with new state; STARFALL initially
omitted three metric descriptions. Both now have passing guards. Historical
Tideglass receipts were preserved, with a separately generated current-kernel
Node replay instead of relabeling old browser evidence.

The rejected RPG/RTS spikes are not in the build or public source. Their local
work was preserved outside the repository, not erased.

## Next independent test

Follow [ARCADE_FEATURE_PROTOCOL.md](ARCADE_FEATURE_PROTOCOL.md): freeze this
baseline, export identical game source with and without the optional bridge,
then implement the same requested feature in two fresh tasks. Preserve actual
failures and any unfavorable result. Do not translate these smoke-test counts
into token, latency, code-change or iteration savings.
