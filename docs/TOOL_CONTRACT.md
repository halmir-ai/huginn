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

## Sequence semantics

Sequences commit one action at a time. Each action is checked against the legal
set for the then-current state. On cancellation, a stop condition, or an invalid
action, the exact successful prefix remains committed and is returned. Huginn
auto-snapshots the base state so the user can undo or branch deliberately.

The first release caps a request at 50 actions and a visible speed of 80–250 ms
per step. Tool schemas reject unknown properties and do not accept executable
predicates, DOM selectors, URLs, or external I/O.
