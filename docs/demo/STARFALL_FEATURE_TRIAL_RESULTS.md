# STARFALL paired feature trial

Status: completed and independently accepted on 2026-09-03.

This is one controlled feature-authoring pair, not a general productivity
benchmark. Both tasks started together from identical STARFALL game files and
the same seed, feature brief, model (`gpt-5.6-sol`) and reasoning effort
(`ultra`). Both could inspect source, write tests and use ordinary browser
controls. Only the treatment received the already-existing Huginn integration.

The shared game-source digest was
`dfe113132823c38d3fe6f117c31d3e8e9244f60bdb9411e159a570bb08dc332c`
from repository commit `d984c0941b928ec4eeae161f1fc1bd62256e6eaa`.

## Outcome

Both tasks implemented the launch ball saver and passed their tests and builds.
The saver lasts for exactly the first 960 simulated physics frames: frame 959
saves and frame 960 spends the ball. A save preserves score, constellation
lights and multiplier, does not spend the ball, and does not rearm on relaunch.
The next genuinely new ball receives a fresh saver. Pause consumes no simulated
time, and the state survives serialization and deterministic replay.

Independent acceptance found one accounting defect only in the treatment's
first result: a saved crossing incremented both `ballSaves` and `drains` even
though no ball was spent. The treatment was required to prove the regression
red, then corrected the canonical equation to
`launches = drains + ballSaves + inPlay`. Its final task result, source, tests
and native WebMCP receipt all use the corrected semantics.

| Measure | Standalone control | With Huginn |
| --- | ---: | ---: |
| Final acceptance | Pass | Pass after accounting correction |
| Task turns | 1 | 1 |
| Wall time, first assignment to final result | 14m 57s | 23m 17s |
| Input tokens | 6,321,322 | 11,704,422 |
| Cached input within that total | 6,170,624 | 11,516,672 |
| Derived non-cached input | 150,698 | 187,750 |
| Output tokens | 42,023 | 56,464 |
| Reported task total | 6,363,345 | 11,760,886 |
| Production diff | +58 / -17 | +66 / -25 |
| Test diff | +69 / -2 | +66 / -3 |
| Task-report diff | +123 / -0 | +56 / -0 |
| Codex shell-call envelopes | 34 | 33 |
| Codex browser-call envelopes | 28 | 59 |

Token values are the final cumulative task metadata. Cached input is already
included in input and is not added again. No currency conversion is made.
Browser-call envelopes can contain several ordinary interactions or WebMCP
calls, so they are not treated as click counts. The treatment's acceptance
correction and refreshed browser proof remain included rather than being
silently removed or restarted.

The treatment also began with the optional Huginn runtime, bridge and dock that
the control did not contain. That pre-existing footprint is reported separately
and is not disguised as zero-cost or included in the incremental feature diff.

## What the pair supports

It does **not** support the hypothesis that Huginn necessarily makes feature
authoring faster, cheaper or smaller. In this pair, the control finished sooner,
used fewer tokens and changed fewer production lines.

It supports the narrower WebMCP claim: Huginn improves what a human and agent can
inspect and reproduce in a running canvas game. On the corrected treatment, an
ordinary first-ball crossing visibly showed `SAVED` while native WebMCP reported
`ballSaves=1`, `drains=0`, three balls remaining, score 425, two lit bumpers and
checksum
`9cfcac65ba731db01e64f06eca54cf2af4f0ae621afa180433152274f69173a2`.
The saved relaunch remained unarmed; its later unsaved drain spent one ball; the
next new ball exposed a fresh eight-second saver. Two identical three-action
runs from the saved snapshot ended at the same checksum
`9bbc29db9c7d407a1f7e79b07943af1be779c15f6781fe53a3463ff82bfd2dad`,
and restore returned the exact saved checksum.

The standalone task could test the reducer and play the feature normally, but
the running canvas exposed no comparable typed state, legal-action, checksum or
restore interface. This result argues for Huginn as a live validation and
collaboration layer, not as a universal code-generation shortcut.

## Inspect the complete evidence

- [Standalone source branch](https://github.com/halmir-ai/huginn/tree/codex/trial-starfall-plain)
- [Huginn source branch](https://github.com/halmir-ai/huginn/tree/codex/trial-starfall-huginn)
- [Standalone task transcript](https://chatgpt.com/s/cx_6a99b34dc870819186662709d2b69002)
- [Huginn task transcript](https://chatgpt.com/s/cx_6a99b4c83928819187d7755abb9b069b)

Together with the separate COIL pair, these are still only two observations.
They do not justify an aggregate efficiency claim.
