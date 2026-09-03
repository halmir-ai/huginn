# Tool contract

Huginn uses the imperative WebMCP API directly. Read tools are marked read-only;
mutating tools use strict JSON Schemas and structured results.

## Tools

- `describe_game`: rules, victory/failure conditions, metric semantics, action
  vocabulary, capability limits, seed, turn, and checksum.
- `get_game_state`: canonical structured simulation state, never pixels.
- `get_metrics`: current metrics with definitions supplied by `describe_game`.
- `list_legal_actions`: only actions valid against the current checksum.
- `apply_action_sequence`: bounded visible execution with request idempotency,
  stale-state protection, closed stop conditions, cancellation, and per-step
  events/metrics/checksums.
- `snapshot_game`: stores a bounded canonical snapshot in page memory.
- `restore_game`: verifies and restores a known snapshot, then renders it.

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
