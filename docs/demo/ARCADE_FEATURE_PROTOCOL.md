# Game-first feature trials

Status: both pairs completed and independently accepted. The frozen feature
briefs below are independent of the tools used to implement them. See
[COIL_FEATURE_TRIAL_RESULTS.md](COIL_FEATURE_TRIAL_RESULTS.md) and
[STARFALL_FEATURE_TRIAL_RESULTS.md](STARFALL_FEATURE_TRIAL_RESULTS.md) for the
honest results, including the unfavorable efficiency measurements.

## Preconditions

COIL is a complete Snake score-chaser: movement, growth, timed bonus fruit,
increasing pressure, death and immediate retry. STARFALL is a real three-ball
pinball session: launch, contact-based flippers, bumpers, drain and score chase.
Neither game has a scripted victory quota or an injected near-win state.

Check ordinary play before exposing tools. Preserve the game implementation
unchanged between treatments. The standalone control contains no Huginn runtime,
adapter, tool registration or experiment dock. Existing old replay counts must
never be applied to these games or used as feature-trial results.

## COIL feature: emergency shield

Add a once-per-run emergency shield, activated with Q or a clearly labeled touch
button. Activation arms the shield for the next 10 cell advances. Its charge is
spent on activation. The next otherwise-fatal wall or self collision consumes
the protection, leaves the snake in its previous valid cells, and keeps the run
alive; that advance still consumes time. It must not award food or score. The
player can choose another direction on the following advance. A later collision
without protection kills normally. Show armed/remaining/used states. Pause must
not consume duration. Restart restores one charge. State roundtrip and seeded
replay must include all new shield state. Preserve existing Snake rules.

## STARFALL feature: launch ball saver

For each freshly launched ball, add a one-use ball saver lasting exactly the
first 960 physics frames (8 simulated seconds at 120 Hz). If a drain occurs
strictly before that window expires, return the ball to the ready launch lane
without spending a ball or resetting score/lights/multiplier. Consuming the saver
must not refresh it when that same saved ball is relaunched. A normal drain
spends a ball; the next new ball receives a fresh saver. A drain at frame 960 or
later spends the ball normally. Pausing must not consume the window. Show the
countdown and a distinct visible saved-ball event. Preserve all physics. New
state must survive roundtrip/replay. Restart restores original session state.

## Assignment and isolation

Each game gets two fresh tasks, started together after the same clean baseline
is exported: ordinary game vs identical source plus Huginn. Same configured
model/effort, same feature brief and tests, independent directories/ports/tabs.
No inherited implementation transcripts or sharing solutions. A difference in
actual model settings invalidates a paired efficiency claim.

Both may inspect source, write unit tests, use normal browser controls, and add
their own diagnostic code. The control is not forced into inefficient clicking.
Only the treatment receives the existing Huginn tool integration. Include any
new diagnostic/integration work in the source-change measurement.

This measures incremental feature work after the optional integration exists,
not total game creation or the payback of writing that integration. Report the
pre-existing integration footprint separately; it is not a zero-cost baseline.

Require real browser play before and after the feature, a regression test that
fails on the unchanged baseline, passing final checks, and one commit. Record
failed commands and infrastructure retries; do not silently restart the trial.

## Measurements and limits

- Acceptance outcome and any unmet requirements, independently checked.
- Wall time from assignment to first final result (includes tool waiting;
  not equivalent to active model computation).
- Production, tests, diagnostics and docs added/deleted lines separately.
- Actual browser/tool calls and failed commands, not pixel-click estimates.
- Task-specific token totals only if available from that task's usage metadata;
  report null otherwise. Never convert account usage percentages to task tokens.
- No aggregate efficiency conclusion from one pair per game. Publish unfavorable
  or inconclusive results too. Visual comparisons use the actual source revisions.

The feature implementations are real branches of the same game. Any trimmed
video must be labeled edited and retain links to the complete tasks and source.
