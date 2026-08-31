# Demo video production plan

## Objective

Make one idea unforgettable in under three minutes: Huginn lets a designer ask
an agent to run a controlled experiment on live canvas-game state, watch every
action happen, and compare counterfactuals from the same snapshot and RNG seed.
The same contract works when retrofitted onto an existing game and when designed
into a new agent-built game from the start.

Target runtime is 2:35–2:45. The hard limit is three minutes, but the edit should
not depend on the final seconds. The working product must appear in the first
15 seconds.

## Protected production budget

Reserve eight to ten hours after the golden flow is stable:

- 60–90 minutes: final storyboard, narration, and evidence-to-claim review.
- 90 minutes: clean capture in short, independently replaceable clips.
- 2–3 hours: first edit with callouts, pacing, and dead-air removal.
- 60–90 minutes: narration cleanup, captions, and audio-level pass.
- 60 minutes: two cold reviews and consolidated change list.
- 2 hours: targeted retakes, final edit, upload, and public-link verification.

The first full cut is due on September 1. September 2 is deliberately available
for seeing what does not land and recording it again.

## Story arc and shot list

### 0:00–0:12 — Cold-open hero moment

- Start inside the working product, already loaded and authenticated.
- Show the designer's request: test whether one opening is economically weaker.
- Immediately show the agent invoke the experiment and the game fast-forward
  visibly. No logo animation, setup, live typing, or terminal.
- On-screen promise: “Controlled playtests on live browser-game state.”

### 0:12–0:26 — Problem

- Explain that a canvas exposes pixels, not the live board, legal moves, economy,
  RNG state, or save timeline an agent needs.
- Show one brief before/after contrast: opaque canvas versus Huginn's structured
  state and legal actions.

### 0:26–1:17 — Existing-game experiment

- Let the agent call `describe_game` and obtain metric semantics.
- Show `list_legal_actions`; make the anti-hallucination constraint explicit.
- Run one `apply_action_sequence` call. Every committed step updates the
  rendered world and the experiment HUD at a fast but readable pace.
- Keep the UI framed around the game, current tool, turn, and key metric. Avoid
  scrolling through raw JSON.

### 1:17–1:51 — Counterfactual and proof

- Snapshot the same live state, run opening A, restore, then run opening B with
  identical seed and conditions.
- Put the two outcome curves or compact result cards side by side.
- Show matching replay checksums and one meaningful divergence in the chosen
  metric. Explain what the designer learned in a single sentence.

### 1:51–2:19 — Born agent-legible

- Cut to RTS Lab, a new 16×12 strategy game built with the Huginn contract from
  its first reducer and clearly identified as new hackathon-period code.
- Use the same `describe_game`, `list_legal_actions`,
  `apply_action_sequence`, `snapshot`, and `restore` tools.
- Show one fast economy-first versus military-rush comparison that exposes a
  dominant build order and verifies a balance change from the same seed. Keep
  this to one visual payoff, not a second tutorial.
- Briefly label the selected original generated strategy art as reused under
  CC BY 4.0 with documented provenance; game, adapter, and WebMCP work are new.

### 2:19–2:34 — Why WebMCP

- Show the seven registered WebMCP tools in the supported browser and a tight
  code crop around `document.modelContext.registerTool`.
- State the boundary clearly: WebMCP exposes live in-memory game state and typed
  actions that the DOM and pixels cannot reliably supply.
- Mention bounded actions, cancellation, snapshot fidelity, and deterministic
  replay as visible trust features—not as an architecture inventory.

### 2:34–2:42 — Close

- Return to the result, not a README.
- Closing line: “Retrofit it or build with it—Huginn turns a browser game into
  an experiment a designer and agent can run together.”
- Show project name, live URL, and public repository briefly.

## Capture and edit standard

- Record at 1440p or clean 1080p with a stable crop, large readable text, and no
  desktop notifications, personal tabs, secrets, or unrelated browser chrome.
- Use 125–150% UI zoom where needed. Test legibility after YouTube compression
  at 720p and on a phone.
- Record short clips rather than one fragile live take. Remove setup, waiting,
  loading, mouse hunting, corrections, and all non-essential typing.
- Use restrained callouts and consistent visual hierarchy. The canvas remains
  the hero; tool names and evidence support it.
- Narrate from a written script with a quiet mic position. Apply noise cleanup,
  light compression, and a limiter; verify speech on headphones, laptop
  speakers, and a phone.
- Use accurate burned-in or uploaded captions. Avoid music unless it is clearly
  owned or licensed and never let it compete with narration.

## Evidence discipline

Every spoken claim needs a visible receipt:

| Claim | Required on-screen evidence |
| --- | --- |
| The agent understands the game | Rule and metric semantics from `describe_game` |
| It cannot invent a move | Current output from `list_legal_actions` |
| Runs are visible | Canvas and HUD update for every committed action |
| The comparison is controlled | Same snapshot, seed, stop rule, and action inputs |
| A replay is deterministic | Matching per-step events, metrics, and checksums |
| WebMCP is essential | Live tool invocation plus registered-tool code |
| The contract generalizes | Same named tools running against both real adapters |
| RTS Lab is new work | Hackathon-dated source history plus provenance notes |

Do not claim multi-game generality unless RTS Lab passes the two-game scope
fuse and both adapters work in the production browser. Do not call the fixture
a finished game or imply WebMCP itself edits source code.

## Review gates

### Cold-judge pass

A reviewer who knows nothing about the project can answer, without pausing:

1. Who has the problem?
2. What did the agent do that ordinary page automation could not?
3. What changed in the live game?
4. Why should the result be trusted?
5. Where can the project be tried and inspected?

### Technical-skeptic pass

- The screen shows a real supported browser and real registered WebMCP tools.
- The hero sequence is repeatable from a clean session.
- The result is not a precomputed animation or unexplained metric.
- Tool calls, visible actions, and narration agree.
- Limitations and provenance are honest.

### Publication pass

- Runtime is below 2:45 and the product works in the first 15 seconds.
- Public YouTube playback works in an incognito window with clear 720p text.
- Audio and captions are understandable; no copyrighted music is present.
- Live URL, repository link, and submission screenshots all match the video.
- No credentials, notifications, personal data, or internal-only URLs appear.
