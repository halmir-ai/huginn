# Tideglass Relay — explicitly new design revision

The original **0.1.0-baseline Signal route already passed its original target**:
3 messages, watch 8, 3 battery. Unassisted delivered 3 with 0 battery. This
revision answers a newly requested design target; it is not a discovered bug.

## Target, prediction, and result

Before editing the rule, the owner declared: keep **seed 12**, the same eight
actions per plan, and ending **watch 8**. Unassisted must deliver all 3 messages
with **at least 2 battery**, and Signal must retain **at least 3 more battery**
than Unassisted.

The recorded prediction was to raise the initial battery budget and capacity
from **10 to 12**. The unchanged plans spend 7 and 10 battery respectively,
so predicted finals were **Signal 5, Unassisted 2, gap 3**. This is the smallest
integer budget increase that meets the requested reserve with these costs.

| Build | Plan | Deliveries | Ending watch | Battery |
| --- | --- | ---: | ---: | ---: |
| Historical 0.1.0-baseline | Signal | 3 | 8 | 3 |
| Historical 0.1.0-baseline | Unassisted | 3 | 8 | 0 |
| New 0.2.0-refinement | Signal | 3 | 8 | 5 |
| New 0.2.0-refinement | Unassisted | 3 | 8 | 2 |

**The new target was met**, in Node and actual browser WebMCP runs. This is a
resource-budget refinement. It does not establish fun, general balance,
optimality of either plan, or any UI/WebMCP efficiency advantage.

## Exact change and preserved conditions

Only one executable game-rule line changed:

```diff
-export const BATTERY_CAPACITY = 10;
+export const BATTERY_CAPACITY = 12;
```

That constant already controls initial charge, the recharge cap, and the codec
upper bound. The adjustment changes this resource budget intentionally; it
does not claim identical initial battery across versions. No transition body,
sailing cost, recharge rate, relay cost, action vocabulary/schema, lane,
destination, RNG function/draw order, metric formula, seed, or plan changed.
The plan comparisons within each version start from that version's own
verified snapshot. Historical snapshots are rejected by the new version.

Metadata changed to `0.2.0-refinement` and the actual pre-revision authoring
base `a71cacb92e107cd4c8ab0ef1afcf8f709233b60c`. This base already includes the
owner's checkpoint-retention fix (cherry-pick of `90aee14`). That shared fix is
not part of the final refinement commit. Descriptive rules and battery metric
text state capacity 12, the new paired target, and the original baseline pass.
The existing `target_met` metric keeps its original per-run meaning; the new
three-battery comparison is calculated from the two completed receipts.

The final delta from `a71cacb` is recorded by category below. Counts are Git
added/deleted lines, including comments and whitespace where applicable.

| Category | Added / deleted lines | Scope |
| --- | --- | --- |
| Executable game rule | 1 / 1 | `BATTERY_CAPACITY` only |
| Adapter metadata/descriptive text | 8 / 7 | version/base, rules, metric text |
| Tests | 77 / 21 | `tests/tideglass.test.ts` |
| Current Node receipt | 605 / 0 | new `refinement.json` |
| Actual browser receipt | 58 / 0 | new `refinement-browser.json` |
| Documentation | 177 / 0 | this file |

Historical `baseline.json` and `browser-smoke.json` are byte-for-byte unchanged.
Their file SHA-256 values are pinned in tests:

- `baseline.json`: `1ef389196d6eaf201529e53e91550408156cc1852582c6e23491f547fe2f730f`
- `browser-smoke.json`: `0cba7c9bbe2568abf74d028fced1f7472850a15dab83a49e8a2c11e1ae9121fd`

Original implementation/evidence remain accessible at authoring commit
`dbb6a24f502275dd3432a56b6d72b946d0d382e1` and the owner's integration commit
`fc2aa21`. The old receipt test was split into archival integrity/behavior
checks and a separate current-source receipt/replay check. No cross-build
checksum equality is asserted or presented as replay proof.

## Actual edit and verification record

There was **one game-rule candidate and one successful rule edit→target-test
attempt**. For transparency, the full edit→test sequence was:

1. Added the newly requested target assertion while the old 10-battery rule
   was still present. Ran
   `npx vitest run tests/tideglass.test.ts -t 'explicitly new seed-12 reserve target'`.
   **Exit 1:** Unassisted battery was 0, expected at least 2; 1 failed and 12
   skipped. This was a new-specification check, not evidence that the original
   goal failed, and not a failed tuning candidate. The owner core fix was
   already present during this pre-change check.
2. Changed the single budget constant and its version/descriptive metadata.
   Ran the same targeted command. **Exit 0:** 1 passed and 12 skipped. No
   alternate rule was attempted and no rule correction followed.
3. Added the measured current fixture and split the historical/current tests;
   updated capacity expectations. `npm run check` **exit 0: 40 tests, 5 files**
   (14 Tideglass tests). `npm run build` **exit 0**. This is the evidence/test
   integration cycle, not another game-rule iteration.
4. Added the actual browser receipt and handoff. Artifact QA compared every
   recorded step checksum, battery history, metric, and identity with the Node
   receipt. **Exit 0**. No executable source or test changed in this cycle.

Separately, one Node/Vite SSR measurement script executed the real kernel's
two snapshot branches and both fresh-kernel replays and wrote `refinement.json`.
All completed. Browser work then made **10 actual WebMCP calls**: seven
distinct tools, including four action sequences (two plans and two replays).
There were no failed browser tool calls in this revision. Final artifact QA
compared every recorded browser step checksum and metric with the Node receipt.
No token counts, elapsed-time comparison, iteration savings, or speedup were
measured or inferred.

## Receipts, hashes, and exact inputs

- `tests/fixtures/tideglass/refinement.json`: current source identity, initial
  snapshot, exact plans, both complete eight-step results, target/prediction,
  and both fresh-kernel replay comparisons.
- `tests/fixtures/tideglass/refinement-browser.json`: actual tool requests,
  all step checksums, battery histories, metrics, restore, and independent
  fresh-tab replay evidence for each plan.

Source digest at the original refinement recording:
`94adf84f610ce8a1c8f45445d91734985413dda1ef445474c4e6f240a989300c`.
As before, this hashes canonical JSON containing the exact `adapter`, `kernel`,
`webmcp`, and `canonical` source strings. It excludes page HTML/CSS and is not
a deployment identity. It differs from the preserved baseline digest.

The arcade integration later fixed asynchronous read atomicity in the shared
kernel. The original Node and browser refinement files above are retained
unchanged as historical evidence. `current-kernel-node.json` is a separate,
fresh Node-only replay of both plans and both seed-reset replays on the new
kernel; regenerate it with `node tools/measure-tideglass-current.mjs`.
It records its actual source digest and is tested against current source.
The old browser call counts are not measurements of the new build or arcade
games. No Tideglass rules or serialized-state version changed in this fix.

| Current state | Canonical SHA-256 |
| --- | --- |
| Seed 12 initial | `214e8d0afad2814393a86b2264bfb35f53c82fa7b45162f514548f9d17234cbc` |
| Signal final | `ad3847b07a7e3bf830952893283aea632355183e34cc0f92a47fdec1e4e0a902` |
| Unassisted final | `66bef7a0629aa0c6b8eb062f6f0b3e81591111d2ff50a1ac4eaf03f8842e4a28` |

Real browser snapshot: `snapshot-1-214e8d0afa`, verified against the current
initial checksum. Both plans branched from it. `restore_game` returned that
same checksum. Request IDs were `revision-browser-signal` and
`revision-browser-unassisted`, then `revision-fresh-browser-signal` and
`revision-fresh-browser-unassisted` in two separate new tabs. Each replay's
**entire eight-step record array and final checksum matched its same-build
plan**. Checked browser console warnings/errors were empty.

The unchanged reference action list is:

```json
[
  {"type":"sail","to":"relay_isle"},
  {"type":"deploy_relay"},
  {"type":"sail","to":"saltmill"},
  {"type":"deliver"},
  {"type":"sail","to":"lantern"},
  {"type":"deliver"},
  {"type":"sail","to":"breakwater"},
  {"type":"deliver"}
]
```

Unassisted replaces only action 2 with `{"type":"wait"}`. New recordings must
use fresh request IDs and their own page-local snapshot, or `seed: 12` instead
of a snapshot. Never reuse the historical IDs across tabs/builds.

## Parent integration handoff

The dev server remains `http://127.0.0.1:4188/tideglass/`. Run it with
`npm run dev -- --host 127.0.0.1 --port 4188 --strictPort` in the isolated
worktree if needed. Browser checks used this dev page; the unchanged existing
`npm run build` still targets RTS until the owner adds its multipage wiring.

Only the final refinement commit should be cherry-picked. No page, CSS, core,
configuration, old receipt, or parent-checkout file was edited in this revision.
The parent-owned page still has static **“up to 10”**, **“no tuning change has
been made”**, and old snapshot-retention copy. Update those during integration
and expose the new paired target; the authoritative game description, inspector
state, version, and battery denominator already reflect the revised adapter.
The budget is capacity 12, recharge +3; the new outcome is Signal 5 versus
Unassisted 2 at watch 8, gap 3. Historical original target remains distinct.

No current UI-off performance measurement, mobile recheck, intermediate-frame
screenshot, deployment, or final integrated-production claim is made here.
The parent owns telemetry, final UI copy, multipage build and recording checks.
