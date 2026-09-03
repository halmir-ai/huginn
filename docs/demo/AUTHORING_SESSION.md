# Optional fresh Codex authoring session

**Status: a launch brief, not completed demo evidence.** Do not imply this
session, new game, or improvement already exists. The authoring task must
run in its own workspace and must not edit the working RTS submission page.

## What to build

**Tideglass Relay:** a tiny coastal courier/logistics puzzle. Move among five
stations, place a relay, and deliver three messages before the storm closes
the route. Canvas nodes/links, a courier, a clear storm clock, and readable
delivery/battery metrics. It demonstrates a different action space from RTS,
without requiring a new art pipeline.

This is a new sample, not a Dawn or Regnara retrofit. Those existing games are
future integrations. Riverlands in `src/demo/riverlands.ts` is currently a
kernel fixture, not another shipped game.

## Paste this as the initial task

```text
Build a small browser game called Tideglass Relay as an isolated Huginn
authoring demonstration. Read the public Huginn source at commit
34ec13b9d75b4ee31ca2e2c7c9933da55401f90b from
https://github.com/halmir-ai/huginn. If working locally, the reference checkout
is /Users/radek/code/huginn; it is read-only for this task.

Do not fork or modify the live RTS page. Create the new sample in your own
workspace or worktree. Preserve Huginn's MIT license and source attribution.
Reuse the existing kernel/types/canonical/WebMCP implementation; do not
replace it with an imitation of the seven tools or global JS debug hooks.
No deployment, merge, external publishing, paid services, or generated art.

Make one polished but tiny logistics puzzle: five coastal stations, a courier,
limited battery, three deliveries, and an eight-watch storm deadline. Expose
a closed finite action vocabulary, explicit legal actions, and a deterministic
pure transition function. Include RNG in saved state. Rendering cannot affect
the simulation. All ordinary UI actions and WebMCP actions use the same game
logic. Use original vector/canvas drawing, not assets from unrelated repos.

Implement the GameAdapter contract from src/huginn/types.ts and register the
same seven tools on the top-level page using the existing registration layer.
Show the live world, current build/rule version, seed, watch, deliveries,
battery, snapshot checksum, per-action trace, and source-labeled real tool
receipts. Keep this UI separate: the existing RTS notebook is RTS-specific.
Use a bounded action batch and fresh request IDs for repeats.

Choose and document a design target BEFORE collecting results: a relay-first
route should deliver all three messages within eight watches while retaining
at least two battery. Supply one legal reference plan and one contrasting
plan. It is acceptable for the first build to meet the target. Do not secretly
insert a defect so a later recording appears to discover it.

First deliver the game, tests, and local URL, with measured baseline results
and exact source/build identity. Stop BEFORE changing a rule to improve those
results, so the human can record and authorize the next step. Label any
intentionally designed calibration scenario as such. Do not claim fun,
general balance, or superiority over click-based testing.

Required proof: snapshot roundtrip; fresh same-seed/same-plan replay with all
step records equal; invalid-action prefix behavior; distinct legal action
schemas; all seven tools discovered and actually called in the built-in
browser; visible rendering during a batch. Run the scoped tests and build.
If WebMCP is unavailable, report it, not a preset or console-call substitute.
Keep a compact evidence receipt and three recording prompts. If a generic
framework, a port, or large art work is needed, stop and report the blocker.
```

## Record the real session in three short clips

### A · Intent + baseline

Capture the genuine initial request and finished game, with a time-compression
label over the cut. Do not present a reconstructed exchange as the original.
Then send:

```text
Use this game's real WebMCP tools. Describe the rules and the predeclared
design target. Snapshot seed 12 and run the documented reference plan in watch
mode. Report actual deliveries, battery, and ending watch. Does this run meet
the target? Keep the receipt and build identity. Do not edit code yet.
```

### B · One defensible change

Only if baseline misses the target, send:

```text
Use that measured result to propose the smallest rule change that could meet
the existing design target. Preserve initial conditions, legal actions, RNG
draw order, the reference plan, and the target itself. Explain the prediction
before editing. Then implement one transition-only tuning change, add a
regression test, and rebuild. Do not change the goal to fit the outcome.
```

If baseline already passes, do not fake a failure. State that it passed and
choose an honest additional target, defined before the next measurement—or
use the default final-film segment instead.

### C · Check the prediction

```text
Open the rebuilt page in a fresh tab. Do not reuse the old page's snapshot ID.
Using real WebMCP calls and new request IDs, reconstruct seed 12, verify the
intended initial conditions, and run the unchanged reference plan. Show both
build versions and the before/after metrics. Repeat the new run once and
compare all step records. State whether the original target is now met and
what this limited test does not establish.
```

## Gate for inclusion in the film

- Two genuinely different games work with the same Huginn core.
- New sample is reachable in the judge-accessible final deployment, not just
  a local screenshot. Integrating/deploying it is a separate approved step.
- The source diff and real before/after receipts exist, with build identities.
- Both versions use the same predetermined target, initial conditions, seed,
  reference action list, and horizon. Check legality again after a rule change.
- Same-build replays match; different builds need not have matching hashes.
  Never reuse a page-local snapshot across builds or describe cross-version
  hashes as deterministic-replay proof.
- The authoring segment replaces 26 seconds of the script; total stays <3 min.
- The complete first cut and final-video review still have protected time.

If any gate is missing, use the default script. The complete, repeatable RTS
demonstration remains the submission's safe path.
