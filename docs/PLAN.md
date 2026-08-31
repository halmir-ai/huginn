# Submission plan

## Thesis

Agents should run experiments on games, not merely click at them. A game designer
can ask Huginn to branch from a known state, run a bounded strategy, watch it play
out, compare metrics, and reproduce the finding from the same seed. The
submission proves both adoption paths: Huginn can retrofit an existing game and
can be the test contract a new agent-built game implements from its first reducer.

## Primary hero: retrofit an existing game

1. Open Dawn of People and ask the agent to describe the live game.
2. Ask whether a chosen opening creates an economic disadvantage.
3. The agent obtains legal actions and calls one bounded action sequence.
4. Every committed action visibly updates the game and experiment HUD.
5. The agent snapshots, restores, and tests a counterfactual from identical state.
6. Matching checksums prove reproducibility; metric semantics explain the result.

## Generality proof: build agent-legible from the start

Create RTS Lab inside the Huginn submission using a small, provenance-tracked
subset of the project's original generated strategy art and new hackathon-period
game code. It is deliberately tiny: one 16×12 battlefield, two teams, workers,
one resource economy, one production building, one combat unit per side, and a
closed build-order action vocabulary.

The coding-agent workflow implements the Huginn adapter with the reducer, then a
browser agent uses the same tool names as Dawn to compare economy-first and
military-rush openings, restore the identical initial snapshot, and identify a
dominant strategy. A balance adjustment is made outside WebMCP, then the agent
reruns the same seed to verify the improvement. Commit history and provenance
distinguish reused CC BY 4.0 art from new game and WebMCP implementation.

## Protected gates

- Snapshot → restore preserves the canonical simulation checksum and legal actions.
- Same seed + same actions produces identical per-step events, metrics, and hashes.
- An illegal action is never applied or silently skipped.
- Each successful action produces one visible renderer/HUD update.
- Browser cancellation returns the exact committed prefix.
- The production URL is discoverable and callable in ChatGPT's in-app browser.
- Dawn and RTS Lab register the same core contract from separate game adapters.
- The landing URL links directly to both runnable games without setup or login.
- Reused Dawn and RTS assets have explicit ownership, license, and provenance.
- Public repo, detectable MIT license, provenance notes, live HTTPS URL, and a
  narrated public demo under three minutes are all valid without authentication.

## Two-game scope fuse

Dawn remains the required submission. RTS Lab stays only if, by September 1
at 8:00 AM, it has all of the following:

- one rendered battlefield with workers, bases, resources, and visible combat;
- deterministic reducer, legal actions, snapshot/restore, and checksums;
- one complete two-branch experiment through the shared WebMCP tools;
- same-origin deployment beside Dawn and documented asset provenance;
- no new tool family, service, authentication, or bespoke agent prompt.

If any condition misses the cutoff, RTS Lab becomes a post-hackathon example
and the Dawn video proceeds unchanged.

## Schedule (deadline: September 3, 2026 at 1:00 PM PT)

The video is a scored product surface, not end-of-project documentation. No new
feature is allowed to consume its protected production window.

- August 30: public skeleton, exact tool contract, deterministic runner spike;
  lock the video thesis, hero moment, and acceptance checklist. Deploy the first
  public RTS Lab slice immediately so compatible-browser and asset-path failures
  happen before the Dawn retrofit.
- August 31 by noon: Dawn adapter, legal actions, snapshot/restore, visible HUD,
  and determinism gates. By 6:00 PM, deploy the golden experiment candidate.
  Time-box RTS Lab to ten hours and reuse the contract without extensions.
- September 1 by 8:00 AM: apply the two-game scope fuse. By 10:00 AM, complete
  a dress rehearsal in the actual ChatGPT in-app browser. Feature freeze at
  noon. Capture short clips and finish a complete rough cut that evening.
- September 2: cold-judge review, retakes, final edit, narration mix, captions,
  phone/laptop playback QA, and public YouTube upload by 3:00 PM. Finish the
  Devpost page, screenshots, and testing instructions that evening.
- September 3: 8:00 AM incognito link rehearsal, 9:30 AM code/content freeze,
  and submission by 11:00 AM. No primary recording or feature work.

See [VIDEO_PLAN.md](VIDEO_PLAN.md) for the shot plan and quality gates and
[WINNER_REVIEW.md](WINNER_REVIEW.md) for the evidence behind them.

## Explicit cuts

Regnara, a full Battle Craft web port, analytics dashboards, multiplayer,
backend/auth, an autonomous planner, cloud saves, live source-code editing
through WebMCP, and a generic adapter marketplace are out of scope. RTS Lab gets
no campaign, free-form pathfinding, technology tree, fog of war, multiplayer,
level editor, or independent replay product.
