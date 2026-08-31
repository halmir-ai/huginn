# Submission plan

## Thesis

Agents should run experiments on games, not merely click at them. A game designer
can ask Huginn to branch from a known state, run a bounded strategy, watch it play
out, compare metrics, and reproduce the finding from the same seed.

## Hero flow

1. Open Dawn of People and ask the agent to describe the live game.
2. Ask whether a chosen opening creates an economic disadvantage.
3. The agent obtains legal actions and calls one bounded action sequence.
4. Every committed action visibly updates the game and experiment HUD.
5. The agent snapshots, restores, and tests a counterfactual from identical state.
6. Matching checksums prove reproducibility; metric semantics explain the result.

## Protected gates

- Snapshot → restore preserves the canonical simulation checksum and legal actions.
- Same seed + same actions produces identical per-step events, metrics, and hashes.
- An illegal action is never applied or silently skipped.
- Each successful action produces one visible renderer/HUD update.
- Browser cancellation returns the exact committed prefix.
- The production URL is discoverable and callable in ChatGPT's in-app browser.
- Public repo, detectable MIT license, provenance notes, live HTTPS URL, and a
  narrated public demo under three minutes are all valid without authentication.

## Schedule (deadline: September 3, 2026 at 1:00 PM PT)

The video is a scored product surface, not end-of-project documentation. No new
feature is allowed to consume its protected production window.

- August 30: public skeleton, exact tool contract, deterministic runner spike;
  lock the video thesis, hero moment, and acceptance checklist.
- August 31 by noon: Dawn adapter, legal actions, snapshot/restore, visible HUD,
  and determinism gates. By 6:00 PM, deploy the golden experiment candidate.
- September 1 by 10:00 AM: complete a dress rehearsal in the actual ChatGPT
  in-app browser. Feature freeze at noon. Capture short clips and finish a
  complete rough cut that evening.
- September 2: cold-judge review, retakes, final edit, narration mix, captions,
  phone/laptop playback QA, and public YouTube upload by 3:00 PM. Finish the
  Devpost page, screenshots, and testing instructions that evening.
- September 3: 8:00 AM incognito link rehearsal, 9:30 AM code/content freeze,
  and submission by 11:00 AM. No primary recording or feature work.

See [VIDEO_PLAN.md](VIDEO_PLAN.md) for the shot plan and quality gates and
[WINNER_REVIEW.md](WINNER_REVIEW.md) for the evidence behind them.

## Explicit cuts

Regnara, Battle Craft, analytics dashboards, multiplayer, backend/auth, an
autonomous planner, cloud saves, and a generic adapter marketplace are out of the
hackathon scope. A second Sindri/Eitri proof gets at most three hours only after
all Dawn gates are green and the first complete video cut exists.
