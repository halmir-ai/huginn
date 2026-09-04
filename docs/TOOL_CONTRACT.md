# Tool contract

Huginn uses the imperative WebMCP API directly. Read tools are marked read-only;
mutating tools use strict JSON Schemas and structured results.

The implementation is split deliberately: the transport-independent kernel is
exported from [`src/huginn/`](../src/huginn/), while tool construction and the
only `document.modelContext` registration boundary live in
[`src/webmcp/`](../src/webmcp/). The optional debugger consumes activity events;
it does not define a second tool contract.

## Tools

- `describe_game`: rules, victory/failure conditions, metric semantics, action
  vocabulary, curated named setups, capability limits, seed, turn, and checksum.
- `get_game_state`: canonical structured simulation state, never pixels.
- `get_metrics`: current metrics with definitions supplied by `describe_game`.
- `list_legal_actions`: only actions valid against the current checksum.
- `apply_action_sequence`: bounded visible execution with request idempotency,
  optional named-setup initialization, stale-state protection, closed stop
  conditions, cancellation, per-step events/metrics/checksums, and optional
  semantic expectations.
- `snapshot_game`: stores a bounded canonical snapshot in page memory.
- `capture_game` (optional host capability): encodes the current canvas as a
  bounded PNG, displays one current preview, and returns its dimensions, byte
  count, image checksum, and the exact canonical state checksum. It is visual
  evidence, not a restorable state snapshot.
- `restore_game`: verifies and restores a known snapshot, then renders it.

The seven core tools are engine-independent. Current integrated example pages
also supply `capture_game`, for eight discovered tools. Hosts without a canvas
or without a safe frame-capture path can omit it without changing the kernel
or the other tool schemas.

`capture_game` returns compact JSON metadata rather than embedding a base64 PNG
in the tool result. The host must make the captured frame visible in the page,
cap it at 8 MiB and 8192 pixels per axis, and return a SHA-256 image checksum.
The reference debugger serializes capture with other mutations so the paired
state checksum cannot race the human game clock. It also waits for a settled
browser paint and compares canonical checksums before and after the frame
callback. A custom callback must provide the equivalent renderer flush; a
state change makes the tool reject the evidence.

Snapshots retain both canonical simulation state (including adapter RNG state)
and the kernel's seed metadata. Both restore paths validate canonical
round-tripping before committing state and seed together.

The page retains at most 12 snapshots. The latest explicit checkpoint (from
`snapshot_game` or the equivalent human control) is protected from automatic
rollback eviction until another explicit checkpoint replaces it. Remaining
entries expire oldest-first. A named sequence base is also protected while
that sequence prepares its rollback. This gives single-click and batched
experiments the same dependable checkpoint without unbounded memory growth.

The live notebook observes started/completed/failed WebMCP calls. It records
real sequence results without changing them; observer failures cannot change
the kernel's return value. The canvas render supplies current seed/checksum and
committed action feedback. Page presets are explicitly labeled separately.

Replay evidence requires distinct request IDs and newly rendered executions.
A cached request-ID retry is marked `cached: true`, not a new deterministic run.
A matching final hash
alone is insufficient: the notebook compares per-step actions, events, metrics,
and checksums. Build-order comparisons additionally require matching first-step
base checksums and ending cycles. Single-seed outcomes are not balance proofs.

## Sequence semantics

`setup_id` selects a curated state constructor published by the game adapter.
It may be paired with a seed and is mutually exclusive with
`base_snapshot_id`. The caller cannot supply state fields. Huginn constructs
the setup, requires it to round-trip through the game's ordinary save codec,
commits its seed, and visibly renders it before applying the first action. This
lets an agent test a late campaign or combat moment without replaying unrelated
content while keeping setup authority in game code.

Sequences commit one action at a time. Each action is checked against the legal
set for the then-current state. On cancellation, a stop condition, or an invalid
action, the exact successful prefix remains committed and is returned. Huginn
auto-snapshots the base state so the user can undo or branch deliberately.

When a sequence names `base_snapshot_id`, `expected_base_checksum` guards that
snapshot rather than whatever branch currently happens to be rendered. This is
what permits several counterfactuals to start from one verified base after an
earlier branch has changed the live state.

The first release caps a request at 50 actions and a visible speed of 80–250 ms
per step. Tool schemas reject unknown properties and do not accept executable
predicates, DOM selectors, URLs, or external I/O.

Sequence envelopes and stop definitions are also validated in the kernel before
any reset, restore, or action. Reusing a cached request ID with different input
is rejected. Stop conditions are checked after each committed step. Action
transition/render/scheduler failures return an error-status prefix and rollback
receipt; always inspect `status` and `stopReason`. A render failure means a
committed step might not be visible. Catastrophic adapter initialization or
snapshot preparation failures may still reject the call.

## Optional semantic expectations

`apply_action_sequence.expect` accepts at most 12 final-metric checks. Each
check names a documented metric and uses `eq`, `gte`, or `lte`. Equality accepts
numbers, strings, or booleans of the same type as the metric; ordered comparisons
are numeric only. The kernel validates the complete expectation envelope before
it resets, restores, renders, or mutates the game.

Every sequence result includes a `verdict` and `checks` receipt:

- `not-requested`: the caller supplied no expectations.
- `passed`: the sequence completed or met its stop condition and every
  expectation matched the final metrics.
- `failed`: the sequence completed or stopped, but at least one expectation did
  not match.
- `inconclusive`: execution was cancelled or ended in an error, so matching
  intermediate metrics do not count as a regression pass.

The semantic verdict is deliberately separate from tool execution status. A
valid tool call can return `status: completed` and `verdict: failed`; that is a
useful behavioral regression, not a protocol error.

## Portable regression scenario

A completed seeded expectation run can be saved as
`huginn/regression-v1`: game identity and version, seed, optional portable
`setup_id`, typed actions, optional stop condition, and semantic expectations.
Request IDs and playback speed are assigned at replay time, so a fresh run
cannot be mistaken for an idempotent cached response. Named in-memory snapshots
are excluded because they are not portable across page sessions.

The checked-in examples include
[COIL's Level 2 signal-gate setup](../public/regressions/coil-level-2-shield.json),
[THORNWATCH's near-road defense](../public/regressions/thornwatch-meadow-defense.json),
[COIL's original shield recovery](../public/regressions/coil-shield-recovery.json),
and [STARFALL saved-ball accounting](../public/regressions/starfall-ball-saver.json).
The corresponding live receipts—not the portable scenario files—supply exact
checksums demonstrating same-build, same-seed, same-action replay. Stable metric
expectations state the behavior that should survive later gameplay changes; a
version change still requires deliberate fixture review.
