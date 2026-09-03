# Tideglass Relay — baseline handoff

Built as a new coastal courier game in `/Users/radek/code/huginn-tideglass-authoring`,
branch `codex/tideglass-authoring`, from Huginn
`63b6c41053ec99b8088f285442a30991d7ee20a8`. This is actual authoring and measured
baseline evidence. No tuning change, invented defect, port, generated art, new
dependency, deployment, or edit to a shared entry/core file was made.

Rules version: **0.1.0-baseline**. The existing `HuginnKernel`, canonical codec,
and `registerWebMcpTools` are reused directly. Original canvas/vector geometry
is MIT. No debug globals or alternate simulation are exposed.

## Result and fixed plans

Before collecting results, the target was fixed at **3 messages delivered by
watch 8 with at least 2 battery**, with seed **12**. Every action consumes one
watch. Both plans end at watch 8 and follow exactly the same sailing path.

| Watch | A — Signal route (reference) | B — Unassisted route (contrast) |
| --- | --- | --- |
| 1 | `sail` → `relay_isle` | same |
| 2 | `deploy_relay` | `wait` |
| 3 | `sail` → `saltmill` | same |
| 4 | `deliver` | same |
| 5 | `sail` → `lantern` | same |
| 6 | `deliver` | same |
| 7 | `sail` → `breakwater` | same |
| 8 | `deliver` | same |

Exact reference input:

```json
{
  "request_id": "recording-signal-001",
  "seed": 12,
  "speed": "watch",
  "actions": [
    {"type":"sail","to":"relay_isle"},
    {"type":"deploy_relay"},
    {"type":"sail","to":"saltmill"},
    {"type":"deliver"},
    {"type":"sail","to":"lantern"},
    {"type":"deliver"},
    {"type":"sail","to":"breakwater"},
    {"type":"deliver"}
  ]
}
```

For B, replace the second action with `{"type":"wait"}` and use a fresh
request ID. To branch from a snapshot, replace `seed` with `base_snapshot_id`
and `expected_base_checksum` from that page's real receipt; never send both
seed and snapshot ID. All exact action objects also live in the adapter exports
`signalRoute`, `unassistedRoute`, and the baseline fixture.

| Measured plan | Status | Deliveries | Battery | Ending watch | Target |
| --- | --- | ---: | ---: | ---: | --- |
| Signal route | completed | 3 | 3 | 8 | met |
| Unassisted route | completed | 3 | 0 | 8 | not met |

The reference baseline passed on its first measured implementation. The
contrast is a deliberate alternative plan, not an implementation defect. This
is a one-seed rule experiment, not evidence of fun, general balance, or agent
superiority. No change/retest story should be fabricated from it.

An honest next experiment, **proposed but not run**, is a fixed seed sweep
0–31 with both unchanged eight-watch plans. Predeclare that Signal route must
deliver 3 with at least 2 battery on all 32 seeds; report both plans' pass rates
and battery ranges. Prediction: the reference passes all seeds because its
worst-case sailing/deployment cost is 7 of 10 battery. This requires no rule
edit and tests robustness to forecast variation.

## Receipt and identity

Source digest:
`db2b997d34b4beb350d9c647ee47b8aefe908fdd798bb8f0d1e4853d3292be3d`.
This is SHA-256 of Huginn canonical JSON containing four source strings under
keys `adapter`, `kernel`, `webmcp`, and `canonical`. It identifies the measured
rules/core source, not the HTML/CSS bundle or a deployment. The page shows this
digest, rules version, base commit, and full live state checksum.

| State | Canonical SHA-256 |
| --- | --- |
| Seed 12 initial | `b87c669726a3bcd6a85bdea7f3932f01afb61407a7af330199261ae129f27c0d` |
| Signal route final | `47bd666843405955b85fcc190085777732be63ede36b720d649bc3b17785668b` |
| Unassisted route final | `b57b326fa70858264c067b422d377e008c3d48483beb6a6b53a910bf3662eaad` |

Evidence files, relative to this worktree:

- `tests/fixtures/tideglass/baseline.json`: complete snapshot, both action lists,
  all 16 baseline step records, metrics, checksums, and fresh-kernel replay
  equality. Produced using real HuginnKernel in Vitest, not labeled WebMCP.
- `tests/fixtures/tideglass/browser-smoke.json`: compact observations from
  actual in-app-browser tools and ordinary UI clicks.

Real browser tool calls covered **all seven tools**: `describe_game`,
`get_game_state`, `get_metrics`, `list_legal_actions`, `snapshot_game`,
`restore_game`, and `apply_action_sequence`. Initial snapshot ID was
`snapshot-1-b87c669726`. Calls `browser-signal-a` and `browser-unassisted-b`
matched the Node baseline. A fresh tab, with request `browser-fresh-signal`
and seed 12, matched every reference step record and final checksum. The
snapshot ID is historical evidence; it cannot be reused in another tab.

## Human play and comparison controls

The top-level page is `/tideglass/`; `/tideglass/?webmcp=off` returns before
touching registration and says **“WebMCP off, same UI”**. Actual discovery on
that document returned no tools. Both modes retain identical game controls,
normal DOM rules, legal action buttons, trace, reset/seed, snapshots, and the
expandable **“Live state, metrics & complete rules”** inspector. The inspector
contains every metric and its meaning, full canonical state and checksum, and
the full game description. Tool/error text is rendered using `textContent`.

Human reference labels, in order: **Sail to Relay Isle**, **Deploy relay**,
**Sail to Saltmill**, **Deliver to Saltmill**, **Sail to Lantern**,
**Deliver to Lantern**, **Sail to Breakwater**, **Deliver to Breakwater**.
Each button also shows its current watch and battery cost.

The off-mode browser run clicked those eight individual buttons. DOM readings
showed watches 1–8, and **all eight state checksums equaled the WebMCP run's
step checksums**. Human **Save snapshot** and **Restore** also returned the
initial checksum. Console warnings/errors were empty in checked tabs.

**Run Signal route · UI plan** and **Run Unassisted route · UI plan** are
explicit page presets, reset to seed 12, and are present in both modes. They
must not be described as WebMCP calls. Actual calls alone get the WebMCP receipt
label. **Download JSON** saves the latest receipt with its source and identity.

No timed UI-versus-WebMCP benchmark was measured here. The parent owns the
InteractionLedger and later controlled trial. Eight human action clicks versus
one eight-action tool mutation describes these inputs; it excludes inspection,
setup, latency, errors, and convenience presets, so it is not a speed result.

## Validation and limits

- `npm run check`: **exit 0**, 35 tests across 5 files; Tideglass adds 12 tests.
- `npm run build`: **exit 0** on this worktree. The existing build entry still
  produces the RTS page; the parent owns final multipage wiring.
- Tideglass also compiled successfully as its own Vite production input via
  the programmatic command below, without changing `vite.config.ts`.
- Tests cover strict codec rejection/roundtrip, detached pure transitions,
  legal filtering, closed game schemas, exact invalid prefix and rollback,
  all-step fresh replay for both plans, equal-horizon branching, charging/RNG,
  cancellation with each committed render, off-mode zero registration/API
  reads, and exact baseline fixture equality.
- Browser evidence used the Vite development page. Screenshots were inspected
  in the authoring task, without standalone image files. At 1280×720, document
  width and scroll width were both 1280; visible buttons were at least 44px
  tall. A requested 390×844 viewport override did not change the observed
  width, so **mobile visual validation remains unverified**; override reset.
- Each transition awaits its renderer and the real kernel's watch scheduler;
  per-step render unit tests and the browser's watch-by-watch trace passed.
  An attempted mid-batch screenshot raced the tool invocation, so **a screenshot
  of an intermediate WebMCP frame was not established**. Capture that in the
  final recording pass rather than implying that it exists.

Runtime source size before docs/fixtures: adapter 221 lines / 13,369 bytes;
entry/rendering 335 lines / 25,492 bytes; CSS 121 lines / 9,735 bytes; HTML
14 lines / 522 bytes. Total **691 lines / 49,118 bytes**. Tests: 189 lines /
12,243 bytes. Baseline JSON: 584 lines / 15,882 bytes. No new package dependency.

## Run and integrate

```sh
cd /Users/radek/code/huginn-tideglass-authoring
npm ci
npm run dev -- --host 127.0.0.1 --port 4188 --strictPort
```

Open `http://127.0.0.1:4188/tideglass/` or its `?webmcp=off` counterpart.
The page imports `/src/tideglass-main.ts`. The back link uses
`import.meta.env.BASE_URL` and goes one directory up when that base is `./`.
No external art or other assets are needed.

Standalone production compile used for this handoff:

```sh
node --input-type=module -e 'import {build} from "vite"; await build({configFile:false,base:"./",build:{outDir:"artifacts/tideglass-build",rollupOptions:{input:{tideglass:"tideglass/index.html"}}}})'
```

The parent should cherry-pick this commit, add the multipage Vite entry and
navigation, integrate its shared checkpoint-retention fix and interaction
measurements, then rerun the gates and both browser modes on the final build.
Do not copy a replacement kernel from this branch. The baseline fixture locks
its measured source digest: a parent kernel change requires a newly measured
fixture/identity, while retaining this historical baseline receipt. This is
not a tuning change. Never imply hashes from different source versions prove
same-build replay. Final production/deployment and video are parent work.

## Three recording prompts

1. **Baseline:** “Use the real Tideglass WebMCP tools. Describe the fixed
   target, snapshot seed 12, then run Signal route in watch mode. Report the
   actual result and identity. Do not edit code.” Expected baseline is a pass.
2. **Honest contrast:** “From the same verified snapshot, run Unassisted route
   with a fresh request ID. Compare deliveries and battery at watch 8. State
   that this is a contrasting plan, not a discovered defect.”
3. **Reproduce and compare access:** “Open a fresh tab, reconstruct seed 12,
   run Signal route, and compare all steps. On `?webmcp=off`, use the same human
   controls and inspector. Report measured interaction results if captured;
   otherwise claim only outcome parity. Do not claim a speed advantage.”
