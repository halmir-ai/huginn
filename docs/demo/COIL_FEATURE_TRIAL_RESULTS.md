# COIL paired feature trial

Status: completed and independently accepted on 2026-09-03.

This is one controlled feature-authoring pair, not a general productivity
benchmark. Both tasks started together from identical COIL game files and the
same seed, feature brief, model (`gpt-5.6-sol`) and reasoning effort (`ultra`).
Both could inspect source, write tests and use ordinary browser controls. Only
the treatment received the already-existing Huginn integration.

The shared game-source digest was
`d20ad6c85740b447d204c69dd900ee8c539c4e938d283c93f0e9ebc45341f077`
from repository commit `d984c0941b928ec4eeae161f1fc1bd62256e6eaa`.

## Outcome

Both tasks implemented the once-per-run emergency shield and passed their
tests/builds. Independent ordinary-control acceptance then found the same
usability defect in both first results: after a shield block, the automatic
clock allowed only one 148 ms cell interval to turn away. Both tasks received
the same follow-up. Their second commits pause indefinitely, require a legal
perpendicular turn and then resume the preserved run. The simulation and agent
batch semantics did not change.

| Measure | Standalone control | With Huginn |
| --- | ---: | ---: |
| Final acceptance | Pass after follow-up | Pass after follow-up |
| Task turns | 2 | 2 |
| Wall time, first assignment to final result | 15m 57s | 17m 20s |
| Input tokens | 3,594,963 | 5,746,844 |
| Cached input within that total | 3,286,144 | 5,377,664 |
| Derived non-cached input | 308,819 | 369,180 |
| Output tokens | 25,092 | 33,423 |
| Reported task total | 3,620,055 | 5,780,267 |
| Production diff | +97 / -17 | +118 / -18 |
| Test diff | +210 / -2 | +205 / -2 |
| Task-report diff | +122 / -0 | +71 / -0 |
| Codex shell-call envelopes | 24 | 28 |
| Codex browser-call envelopes | 14 | 23 |
| Recorded failed attempts | 3 | 4 |

Token values are the final cumulative task metadata. Cached input is already
included in input and is not added again. No currency conversion is made.
Browser-call envelopes can contain several ordinary interactions or WebMCP
calls, so they are not treated as click counts. The recorded failures include
the required red regressions and retained implementation/evidence retries.

The treatment began with 829 physical lines of optional integration and
entrypoint wiring that the control did not contain. That pre-existing footprint
is reported separately and is not disguised as zero-cost or included in the
incremental feature diff.

## What the pair supports

It does **not** support the hypothesis that Huginn necessarily makes feature
authoring faster or cheaper. In this pair, the control finished sooner and used
fewer tokens and changed lines.

It does support the narrower WebMCP claim: Huginn changes what can be verified
about a running canvas game. The treatment read canonical live state, stored and
restored checksummed snapshots, drove a typed action sequence to the exact wall
collision, and proved that seed/state replay matched. Independent parent
verification repeated that flow in Codex's in-app browser: six typed actions
ended alive at tick 18 with a `shield-blocked` event and checksum
`33bc4902b43d8f90fc4cf375ef9ee176fa30fbf59c77d3456c130d4f8a658aa4`;
restoring the checkpoint returned the exact initial checksum. It then handed
control to a human, held the shield recovery, queued Up, and resumed alive at
tick 19.

The standalone task could test the reducer and play the feature normally, but
the running canvas exposed no comparable typed state/checksum interface. This
single result argues for Huginn as a validation and collaboration layer, not as
a universal code-generation shortcut.

## Inspect the complete evidence

- [Standalone source branch](https://github.com/halmir-ai/huginn/tree/codex/trial-coil-plain)
- [Huginn source branch](https://github.com/halmir-ai/huginn/tree/codex/trial-coil-huginn)
- [Standalone task transcript](https://chatgpt.com/s/cx_6a99ae8fe4e08191becce187708a008d)
- [Huginn task transcript](https://chatgpt.com/s/cx_6a99ae931c048191bac24d00d4f4e221)

The STARFALL pair is a separate trial and must be reported independently. One
pair per game is still too small for an aggregate efficiency claim.
