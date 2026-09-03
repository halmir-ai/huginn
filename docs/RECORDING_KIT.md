# Huginn recording kit — September 2 recovery

This is a recording/rehearsal artifact, not a Devpost submission or a finished
video. Target: **2:25**, hard ceiling **under 3:00**. No narration/audio or public
YouTube video was produced in this increment. The shipped subject is RTS Lab;
Dawn and a source-code balance fix are not part of the evidence.

## Current official constraints

Rechecked through the official Devpost connector on September 2, 8:34 PM PT:
submission closes September 3 at 1 PM PT. Four equally weighted criteria are
WebMCP Leverage, Execution, Potential Impact, and Creativity & Ambition.
Required: working live URL; explanation of fit, UX, collaboration and
implementation; public YouTube video with audio under three minutes; public
source/assets/instructions with a detectable OSS license.

The September 1–2 organizer announcements recommend the working product in
the first 10–15 seconds, real agent-tool usage as the centerpiece, no dead air,
and independently replaceable clips. They explicitly permit AI narration.
Do not edit the repository, live site, or video after the deadline; maintain
free, unrestricted judge access through September 21, 5 PM PT.

Sources: [requirements and FAQ](https://webmcp.devpost.com/),
[official rules](https://webmcp.devpost.com/rules),
[organizer updates](https://webmcp.devpost.com/updates).

## Recording order, not edit order

1. Load <https://halmir-ai.github.io/huginn/> in a fresh compatible session.
   Confirm seven tools are actually discoverable; a green badge alone is not
   enough. Use an agent's real WebMCP call channel, not `Try page preset`.
2. Read `describe_game`, `list_legal_actions`, and `get_game_state`. Save
   `snapshot_game`'s returned ID/checksum. Never paste an ID from an old page.
3. Record the rush call below in watch mode. Keep the agent's tool call visible
   alongside the live canvas and the notebook's WebMCP receipt.
4. Record the economy call from the same snapshot. Hold on the comparison.
5. Call `restore_game` with that ID and checksum. Hold on “Restored & verified”
   and the starting state. This is the serialization-fidelity proof.
6. Repeat economy with **a new request ID** and identical inputs. Hold on
   “Replay matches, step for step.” This is the separate determinism proof.
7. Capture the tool-list and registration code crop, then the closing result.

Initial seed-12 checksum:
`35e2bab995b2e1d3d48d33a4c786deb75c57add009aa9af64f1c0795d563ee0a`.
If it differs, inspect the current state and build; do not fake the receipt.

### Natural-language direction for the agent

“Inspect this game's rules, state, and legal actions through WebMCP. Snapshot
seed 12. Compare a barracks/train/attack rush followed by three economy cycles
with an economy-first opening that moves one worker to gold, gathers twice,
builds a barracks, trains, gathers once more, trains again, and attacks. Start
both from the same snapshot and stop at cycle 3. Use watch speed. Explain the
damage-versus-survival tradeoff. Restore the snapshot and repeat the economy
plan with a new request ID; compare every step, not just the final hash.”

### Exact plan inputs

Both use `apply_action_sequence`, the returned `base_snapshot_id`, returned
`expected_base_checksum`, and `speed: "watch"`. Do not also supply `seed` when
supplying a snapshot. Use unique IDs such as `rush-01`, `economy-01`, and
`economy-replay-01` in a fresh page. The kernel checks legality at every step;
future plan actions need not be legal at the start.

```json
[
  { "type": "build_barracks" },
  { "type": "train_vanguard" },
  { "type": "launch_attack" },
  { "type": "advance_cycle" },
  { "type": "advance_cycle" },
  { "type": "advance_cycle" }
]
```

```json
[
  { "type": "assign_worker", "resource": "crown_gold" },
  { "type": "advance_cycle" },
  { "type": "advance_cycle" },
  { "type": "build_barracks" },
  { "type": "train_vanguard" },
  { "type": "advance_cycle" },
  { "type": "train_vanguard" },
  { "type": "launch_attack" }
]
```

### Verified seed-12 receipts

| Metric | Rush | Economy |
| --- | ---: | ---: |
| Applied steps | 6 | 8 |
| Ending cycle | 3 | 3 |
| Enemy damage | 34 | 54 |
| Home-base HP | 96 | 75 |
| Economy value | 72 | 40 |
| Army value | 30 | 60 |
| Final hash prefix | `1d4b1269940e` | `0b4cd39339b5` |

Both first-step starting hashes match the snapshot. A fresh economy replay
matched all eight step records (actions, before/after checksums, events,
metrics) and its final hash. The result is a tradeoff from one seed, not a
validated dominant strategy. Different plans may consume RNG draws differently.
The score exposed by the adapter is an illustrative formula, not the verdict.

## Edit script — approximately 290 spoken words

| Time | Footage | Narration |
| --- | --- | --- |
| 0:00–0:12 | Open on the real economy tool call and visible attack; no title slate. | “What if an agent could test a game with you—not just look at it? This is Huginn. One WebMCP call is running a visible, repeatable experiment in this browser game.” |
| 0:12–0:32 | Canvas, then tight crop of real state/legal-action output. | “For a solo game developer, a canvas hides the information an agent needs: resources, legal moves, simulation state, and random-number state. Huginn gives the agent a typed contract, while the designer watches the same world change.” |
| 0:32–0:55 | `describe_game`, snapshot receipt, rush execution. | “First, the agent reads the rules and metric definitions. It saves this live starting state, then tests a military rush. Every action is checked against what is legal at that moment. Each committed step updates the battlefield and records its metrics and checksum.” |
| 0:55–1:20 | Restore/base receipt, economy sequence, two result cards. | “Now it branches from the same snapshot and tries an economy-first opening. Both plans end at cycle three. Economy-first deals fifty-four damage instead of thirty-four—but leaves our base at seventy-five health instead of ninety-six. That's a concrete design tradeoff, not a claim that one seed proves the game is balanced.” |
| 1:20–1:45 | Explicit restore, then fresh replay. Hold matching hashes. | “Can we trust the result? Restoring returns the exact starting checksum. Running the same plan again, with a fresh request ID, matches every action, event, metric, and checksum. Snapshot fidelity and deterministic replay are two separate checks.” |
| 1:45–2:08 | Real seven-tool surface; registration and adapter code crop. | “Huginn registers seven WebMCP tools around a deterministic game adapter. There is no gameplay server in this demo. The agent works with live browser memory through bounded actions, and the human sees the execution. The page preset is labeled separately; these receipts came from actual agent calls.” |
| 2:08–2:25 | Return to battlefield/result; unobtrusive repo/live URL. | “RTS Lab is a small new game built with this contract from the start, using attributed art. Retrofitting existing games is next. The goal is a tighter loop: ask a testable question, run it together, and reproduce what you learn.” |

## Capture and review gates

- Record short genuine screen clips with the agent client visible. Do not
  fabricate a chat exchange or present page-preset footage as agent execution.
- The 1920×1080 layout fits canvas, metrics, both result cards, and the verdict.
  Use a tighter crop/callout for hashes and tool text; do not expect a full-page
  wide shot to be readable after 720p compression. Avoid live scrolling through
  raw JSON. Do not stretch or obscure the registered-tool evidence.
- Use a quiet human voice or reviewed AI narration; no unlicensed music.
  Read the script aloud, trim pauses, caption accurately, and test headphones,
  laptop speakers, and phone playback. The timing is a target, not a measured
  finished-video duration.
- Cut to the key result within 10–15 seconds. Remove setup, loading, live typing,
  waits, personal tabs, notifications, and secrets. Do not remove context that
  changes the meaning of a tool call or result.
- Cold reviewer must identify the user, problem, real agent action, visible
  outcome, and evidence of repeatability without pausing.
- Public YouTube upload and final Devpost submission require owner review and
  approval. Check processed public playback and the final duration; a local
  render or draft URL is not submission completion.

## Recovery verification receipt

- Production build preview: `http://127.0.0.1:4178/`, new isolated tab, seed 12.
- Actual client: **Codex in-app browser**, WebMCP capability. Current
  [OpenAI documentation](https://learn.chatgpt.com/docs/webmcp) confirms Codex
  and ChatGPT Work use site tools in the shared built-in browser. Live
  pre-change origin also discovered and executed tools before the repair.
- `npm run check`: 23 tests passed; `npm run build`: passed.
- Real calls: snapshot, rush, economy, explicit restore, fresh economy replay;
  all expected values above matched. Seed 99 reset followed by seed 12 restore
  returned both displayed and reported seed 12 with the original checksum.
- Desktop 1280×720 and recording-frame 1920×1080: horizontal overflow 0 px.
  At 1920×1080 the comparison verdict ended at y=925, inside the frame.
- Phone 390×844: horizontal overflow 0 px; both controls 49 px high and at
  least 66 px wide; hash fields had 0 px clipping. Native viewport screenshot
  reviewed. Full-page stitched capture was unreliable, so it was not used as
  phone evidence. Temporary viewport overrides were reset.
- No browser warning/error console entries during the main flow.
- Connected Chrome loads the page fallback but does not expose WebMCP.
  Browser automation blocks its flags page. Chrome is an optional alternative,
  not a blocker for the verified Codex route. No Chrome tool pass is claimed.
- Not yet done: finished audio/video, YouTube upload/playback QA, final default-
  branch source reconciliation, explicit Devpost rules acknowledgment, remaining
  owner form answers, and approved/verified final submission.

## WebMCP best-practice check

Source: [OpenAI site-tools developer guidance](https://learn.chatgpt.com/docs/webmcp),
fetched September 2. This is a scoped implementation review, not certification
of the evolving WebMCP specification.

| Practice | Evidence and outcome |
| --- | --- |
| Supported top-level imperative registration | Seven tools discovered and called through Codex's native WebMCP capability; no iframe or declarative dependency. |
| Narrow inputs and existing application logic | Closed schemas plus kernel runtime validation; tools and page preset call the same adapter/kernel. Unknown sequence fields and invalid stop definitions are rejected before mutation. |
| Truthful read-only hints | Only description/state/metrics/legal-action tools are read-only. Repeated live reads preserved the state checksum. |
| Visible, verifiable effects | Canvas, seed/hash, source labels, committed steps, metrics, snapshot receipt, and replay evidence reflect real calls. Preset is separately labeled. |
| Safe failure | Browser confirmed stale restore and oversized batch leave state unchanged. An illegal second action preserved and reported exactly one committed action. |
| Stop-condition validation | Browser found an invalid metric could mutate then throw. Regression was red first; fixed with preflight validation before reset/restore/actions. |
| Idempotency | Identical request retries return the cached result without rendering again. Conflicting reuse now rejects rather than silently returning unrelated evidence; regression red first. |
| Registration lifetime | Feature detection checks the method; partial registration now aborts prior registrations, and successful registration has disposal. Failure cleanup verified by red-first unit test. |
| Renderer/scheduler failure | Unit test proves an action-render failure returns its committed prefix and rollback receipt, rather than losing the receipt after mutation. |
| Cancellation | Kernel AbortSignal test passes and real tool options forward the signal. Interactive cancellation through the browser UI was not exercised; do not claim that extra layer was tested. |
| Human control and trust | Normal page UI preserved; local-only bounded game actions, no external data transmission, URL/code inputs, credentials, or permission escalation. Browser safety review remains authoritative; annotations alone are not a security guarantee. |

WebMCP provides the shared-page interaction channel. It does not certify game
balance, validate arbitrary adapters, edit source code, or make tool output
intrinsically trustworthy. Keep these boundaries in both the demo and write-up.
