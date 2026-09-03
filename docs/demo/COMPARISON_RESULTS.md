# Two-game interaction pilot

Recorded in the Codex in-app browser on September 2, 2026 (Pacific).
[Playable comparison page](https://halmir-ai.github.io/huginn/compare/) ·
[Frozen protocol](COMPARISON_PROTOCOL.md) ·
[Machine-readable results](../../public/demo/comparison/results.json).

## Measured result

| Same completed experiment | RTS Lab | Tideglass Relay |
| --- | ---: | ---: |
| Semantic game actions in either mode | 22 | 24 |
| Ordinary game commands received by page | 25 | 27 |
| Mutating WebMCP calls | 6 | 6 |
| Read-only WebMCP calls | 7 | 7 |
| Total WebMCP calls | 13 | 13 |
| Matching per-step states **and metrics** across modes | 22/22 | 24/24 |
| Matching complete records in the fresh WebMCP replay | 8/8 | 8/8 |
| Browser envelopes carrying game commands, UI / WebMCP | 3 / 3 | 3 / 3 |
| Model tokens, latency advantage, iteration/code savings | Not measured | Not measured |

Each condition saved one initial checkpoint, ran two fixed plans, restored
twice, and replayed the second plan. The three UI envelopes each contained a
series of ordinary clicks; the three WebMCP envelopes contained real tool
calls. An envelope is not a page command. Seven additional WebMCP read calls
were included in the total, not hidden from the comparison.

The UI condition also collected state-inspector observations and readiness
waits; the raw receipts enumerate those separately. A collection-only retry
in the RTS UI run is disclosed in its receipt: the human-readable counter
panel was initially parsed as JSON, then read as text without repeating a
game command. No model-token estimate is derived from those observations or
from JSON size. The counter panel cannot observe assistant reasoning.

RTS seed 12 ended at cycle 3: rush **34 damage / 96 base HP**, economy
**54 damage / 75 base HP**. Tideglass rules `0.2.0-refinement`, seed 12, ended
at watch 8: Signal **3 deliveries / 5 battery**, Unassisted **3 / 2**.

## What is controlled

Within each pair: same source commit, seed, initial canonical state, plans,
rules, renderer, human controls, save/restore and full state inspector. Only
WebMCP registration is switched off. This is not a comparison with every
Huginn component removed. Preset plans and hidden JavaScript hooks were not
used in the measured runs. Both conditions permit ordinary browser batching.

RTS source: `90aee14`. Tideglass source: `e902cc0`. These different games need
not share a build, but both conditions for each game do. Raw files retain
each actual tool input/response and every UI-observed state. Later publication
adds documentation and evidence without altering these measured rules.

This is one preplanned replay probe per game, not two independent agents
solving unknown tasks. It supports outcome parity and a page-command reduction
for these workloads. It does not establish a general speedup, fewer tokens,
fewer model turns, fewer coding iterations, or improved fun/balance.

## Actual source iteration—separate evidence

Tideglass's original Signal baseline already met its first goal. A new design
request then required the unchanged Unassisted route to retain two battery
while Signal kept its three-battery advantage. One rule candidate changed
`BATTERY_CAPACITY` from 10 to 12. Actual browser runs and fresh replays
confirmed both new results. The original receipt and before/after code remain
preserved; this was not an invented defect.

The rule itself changed one executable line. Version/descriptive metadata,
tests and evidence also changed; their exact added/deleted line counts and the
edit/check log are in [TIDEGLASS_REFINEMENT.md](TIDEGLASS_REFINEMENT.md).
There is no paired UI-only coding trial, so no iteration/code-savings ratio.

At its original authoring commit, the new game plus adapter totaled 221 lines;
the page/rendering, CSS and HTML totaled 470, with 189 test lines. The same
seven tool definitions and kernel were reused, with no new package dependency.
The shared checkpoint fix below is separate engineering work, not hidden
inside an adapter-cost claim.

## Failed rehearsal retained

The earlier RTS UI preflight on `c70862d` failed: automatic rollback snapshots
evicted the user's explicit checkpoint after enough individual commands. The
collector also failed to assert a restore before continuing on the wrong
branch. [The failed record is retained](../../public/demo/comparison/rts-ui-preflight-failure.json).
It is excluded from completed-work counts, not erased.

`90aee14` protects the latest explicit checkpoint and a sequence's named base
while keeping the store bounded at 12. Three tests were observed failing on
the old implementation, then passing with the fix. Both completed conditions
started on the corrected build. The corrected collector asserts each restore.

## Reproduce and audit

The published receipt verifier is part of `npm run check`. It recomputes
SHA-256 for the UI-observed states, checks every tool step and metric against
them, verifies restores, distinct request IDs, fresh replay, full action
counts and page-ledger counts. A negative-control run proved its state
integrity test fails when that guard is absent. Tests also reject a missing
restore and an invented token count.

```sh
npm run check
node tools/comparison-proof.mjs public/demo/comparison
```

The second command re-derives the summary from the saved raw observations;
it does not perform new browser trials. To collect new trials, follow the
frozen protocol on fresh pages, save the same receipt shape, then pass that
artifact directory to the verifier. Never copy a snapshot ID into another
page or describe a cached request as a fresh execution.

Visual checks covered ordinary mobile play at 390×844 in Chrome and the
desktop pages: no horizontal overflow; primary game controls at least 44px
tall. The Codex in-app browser supplied the actual WebMCP evidence. Browser
viewport/full-page capture behavior varied, so screenshots were checked
against the observed DOM dimensions, not assumed dimensions.
