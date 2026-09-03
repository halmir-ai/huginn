# Huginn arcade submission — final recording script

This is the current public-video script. Target runtime: **2:42**. Hard limit:
**under 3:00 with audio**. The first ten seconds show the working product and
an actual WebMCP call in Codex's in-app browser.

The film makes one bounded claim: Huginn gives a designer and coding agent a
shared, repeatable way to inspect and test a running canvas game. It does not
claim general speed, token, code, cost, balance, or quality improvements.

## Locked STARFALL receipt values

These values were reproduced on the public origin at commit `214bf2c` through
the actual WebMCP tools in Codex's in-app browser.

| Receipt field | Locked value |
| --- | --- |
| Starting checksum | `cb5a72d7618b3a3afeeb588de415f8816ffe5b185f782bc2ab008810c0beda6f` |
| Stop condition | `ballSaves >= 1` |
| Committed steps | `16` |
| Crossing event | `save` at tick `436` |
| Preserved progress | score `425`, lights `2`, multiplier `1`, balls `3` |
| Final metrics | `ballSaves=1`, `drains=0`, `ballsRemaining=3` |
| Final checksum | `9cfcac65ba731db01e64f06eca54cf2af4f0ae621afa180433152274f69173a2` |
| Replay proof | `16/16` complete step records match |

The verified public run restored the exact starting checksum and its fresh
request matched all 16 action, event, metric and before/after-checksum records.

## Exact WebMCP capture

Use a fresh public game tab in Codex's in-app browser. Keep the Codex
conversation beside the game so the actual site-tool card, canvas, and result
can appear in the same recording. Do not use page controls as a substitute for
agent calls.

### COIL: checkpoint, six-action shield test, and human handoff

1. Call `describe_game`, `list_legal_actions`, and `snapshot_game` through the
   page's actual WebMCP tools.
2. At seed 12, the fresh checkpoint checksum must be:
   `c9a345f3b59a1cd74bd7f699b9f3c3445720e60ff9436ddba6671768a80ddcd4`.
   Use the snapshot ID returned by the current tab.
3. Run this exact call:

```json
{
  "request_id": "coil-shield-film-a",
  "base_snapshot_id": "<RETURNED_COIL_SNAPSHOT_ID>",
  "expected_base_checksum": "c9a345f3b59a1cd74bd7f699b9f3c3445720e60ff9436ddba6671768a80ddcd4",
  "actions": [
    { "type": "advance", "steps": 10 },
    { "type": "advance", "steps": 5 },
    { "type": "shield" },
    { "type": "advance", "steps": 1 },
    { "type": "advance", "steps": 1 },
    { "type": "advance", "steps": 1 }
  ],
  "speed": "watch"
}
```

The result must contain six committed actions, a final `shield-blocked` wall
event, `alive: true`, `tick: 18`, `score: 0`, and this exact final checksum:

```text
33bc4902b43d8f90fc4cf375ef9ee176fa30fbf59c77d3456c130d4f8a658aa4
```

4. Restore the exact checkpoint:

```json
{
  "snapshot_id": "<RETURNED_COIL_SNAPSHOT_ID>",
  "expected_checksum": "c9a345f3b59a1cd74bd7f699b9f3c3445720e60ff9436ddba6671768a80ddcd4"
}
```

5. From that restored state, run only the setup prefix:

```json
{
  "request_id": "coil-handoff-film-a",
  "expected_base_checksum": "c9a345f3b59a1cd74bd7f699b9f3c3445720e60ff9436ddba6671768a80ddcd4",
  "actions": [
    { "type": "advance", "steps": 10 },
    { "type": "advance", "steps": 5 },
    { "type": "shield" }
  ],
  "speed": "fast"
}
```

6. Stop using tools. Click the visible **Take control** button. The human clock
   makes two safe moves and then attempts the wall crossing. The armed shield
   saves the snake and the recovery view holds indefinitely. Press Up, then
   **Resume run**. Capture the northward move with the run alive at tick 19.

### STARFALL: first-ball save, restore, and deterministic replay

Call `describe_game`, `list_legal_actions`, and `snapshot_game` through actual
WebMCP. The snapshot must describe seed 12 and return
`cb5a72d7618b3a3afeeb588de415f8816ffe5b185f782bc2ab008810c0beda6f`.

Define the fixed-frame inputs:

- `L`: `{"type":"advance","frames":30,"left":true,"right":false}`
- `N`: `{"type":"advance","frames":30,"left":false,"right":false}`
- `R`: `{"type":"advance","frames":30,"left":false,"right":true}`

The exact action envelope is:

```text
{"type":"launch"} + [L, N, R, N] × 7 + [L, N]
```

Expand that notation into the explicit action array in the real tool call:

```json
{
  "request_id": "starfall-saver-film-a",
  "base_snapshot_id": "<RETURNED_STARFALL_SNAPSHOT_ID>",
  "expected_base_checksum": "cb5a72d7618b3a3afeeb588de415f8816ffe5b185f782bc2ab008810c0beda6f",
  "actions": [
    { "type": "launch" },
    { "type": "advance", "frames": 30, "left": true, "right": false },
    { "type": "advance", "frames": 30, "left": false, "right": false },
    { "type": "advance", "frames": 30, "left": false, "right": true },
    { "type": "advance", "frames": 30, "left": false, "right": false },
    { "type": "advance", "frames": 30, "left": true, "right": false },
    { "type": "advance", "frames": 30, "left": false, "right": false },
    { "type": "advance", "frames": 30, "left": false, "right": true },
    { "type": "advance", "frames": 30, "left": false, "right": false },
    { "type": "advance", "frames": 30, "left": true, "right": false },
    { "type": "advance", "frames": 30, "left": false, "right": false },
    { "type": "advance", "frames": 30, "left": false, "right": true },
    { "type": "advance", "frames": 30, "left": false, "right": false },
    { "type": "advance", "frames": 30, "left": true, "right": false },
    { "type": "advance", "frames": 30, "left": false, "right": false },
    { "type": "advance", "frames": 30, "left": false, "right": true },
    { "type": "advance", "frames": 30, "left": false, "right": false },
    { "type": "advance", "frames": 30, "left": true, "right": false },
    { "type": "advance", "frames": 30, "left": false, "right": false },
    { "type": "advance", "frames": 30, "left": false, "right": true },
    { "type": "advance", "frames": 30, "left": false, "right": false },
    { "type": "advance", "frames": 30, "left": true, "right": false },
    { "type": "advance", "frames": 30, "left": false, "right": false },
    { "type": "advance", "frames": 30, "left": false, "right": true },
    { "type": "advance", "frames": 30, "left": false, "right": false },
    { "type": "advance", "frames": 30, "left": true, "right": false },
    { "type": "advance", "frames": 30, "left": false, "right": false },
    { "type": "advance", "frames": 30, "left": false, "right": true },
    { "type": "advance", "frames": 30, "left": false, "right": false },
    { "type": "advance", "frames": 30, "left": true, "right": false },
    { "type": "advance", "frames": 30, "left": false, "right": false }
  ],
  "stop_when": {
    "metric": "ballSaves",
    "operator": "gte",
    "value": 1
  },
  "speed": "watch"
}
```

Record the first early bottom crossing and the distinct saved-ball feedback.
The call must stop because `ballSaves >= 1`, not because a drain was spent.
Capture adjacent step metrics proving:

```text
event:          save at tick 436
appliedSteps:   16
score:          425 -> 425
lights:         2 -> 2
multiplier:     1 -> 1
ballsRemaining: 3 -> 3
finalChecksum:  9cfcac65ba731db01e64f06eca54cf2af4f0ae621afa180433152274f69173a2
```

Call `restore_game` with the returned snapshot ID and
`cb5a72d7618b3a3afeeb588de415f8816ffe5b185f782bc2ab008810c0beda6f`. Then rerun the identical expanded
action array from the same snapshot with request ID `starfall-saver-film-b` and
`speed: "fast"`. Compare every committed action, event, metric, before checksum,
and after checksum. The final cut may show **REPLAY MATCHES** only when
all `16/16` records and final checksum
`9cfcac65ba731db01e64f06eca54cf2af4f0ae621afa180433152274f69173a2`
match exactly.

## Exact 2:42 edit script

Quoted text is narration. Everything else is screen and edit direction.

### 0:00–0:10 — Problem and genuine call

Open mid-flight on COIL beside the genuine Codex `apply_action_sequence` card.
Keep the WebMCP tool header visible. Show the protected wall impact, then freeze
on `shield-blocked`, `alive: true`, and `tick: 18`.

On-screen: **ACTUAL WEBMCP · CODEX IN-APP BROWSER**

> A coding agent can build a convincing canvas game. But can a designer verify
> what actually happened? This is a real WebMCP call inside Codex.

**Cut at 0:10:** hard cut on the shield impact; no title animation.

### 0:10–0:25 — Playable games first

Show ordinary human play: COIL collects a fruit; STARFALL launches, flips, and
hits a bumper. Use keyboard or touch footage, not an automated victory state.

On-screen: **PLAYABLE WITH KEYBOARD OR TOUCH**

> COIL is evolved Snake. STARFALL is three-ball pinball. Both are playable with
> keyboard or touch. The hard part is testing the stateful rules behind the
> pixels.

**Cut at 0:25:** cut on the STARFALL bumper flash.

### 0:25–0:42 — Discover, inspect, checkpoint

In the fresh COIL tab, show Codex discovering all seven site tools. Tight-cut
the actual `describe_game`, `list_legal_actions`, and `snapshot_game` cards.
Hold the snapshot ID and exact starting checksum for three seconds.

On-screen: **RULES → LEGAL ACTIONS → CHECKPOINT**

> Huginn adds a seven-tool contract to this live page. The agent reads the
> rules, asks which actions are legal now, and saves a checksummed checkpoint.
> We keep watching the same canvas.

**Cut at 0:42:** match the checkpoint hash to the sequence's base-hash field.

### 0:42–1:04 — COIL's six-action result

Show the actual payload and visible watch-speed execution. Add a small counter:
`1 advance 10`, `2 advance 5`, `3 shield`, `4–6 advance 1`. At impact, crop the
final step's event and metrics. Hold the full final checksum for four seconds.

On-screen: **6 TYPED ACTIONS · 18 CELL ATTEMPTS**

> From that checkpoint, one bounded call sends exactly six actions: advance
> ten, advance five, arm the shield, then three single advances. At tick
> eighteen, the wall hit is recorded as shield-blocked. Score stays zero, the
> snake stays alive, and its final checksum begins 33bc.

**Cut at 1:04:** cut from the final checksum to `restore_game`.

### 1:04–1:25 — Restore and hand control to the human

Show the actual restore returning the starting checksum. Show the real
three-action setup-prefix call. Click **Take control**, let the human-clock wall
crossing trigger the recovery view, press Up, and click **Resume run**. Freeze
on the northward move.

On-screen: **AGENT → HUMAN · SAME LIVE PAGE**

> Restore verifies the original checksum and visibly returns the board. I run
> only the three-action setup prefix, then click Take control. The shield blocks
> under human control, the game holds for a decision, I queue Up, resume, and
> reach tick nineteen alive.

**Cut at 1:25:** cut on the first northward movement.

### 1:25–1:55 — STARFALL's visible ball-saver experiment

Show the actual snapshot and `starfall-saver-film-a` call. Keep the table large
while the fixed-frame flipper inputs render. Hold the first early crossing and
distinct saved-ball feedback. Then show adjacent pre-save/post-save metrics,
actual restore, and the fresh replay results side by side.

On-screen after filling the public receipt:

```text
BALL 1 SAVED · ballSaves 1
score          425 = 425
lights         2 = 2
multiplier     1 = 1
ballsRemaining 3 = 3
16/16 STEP RECORDS MATCH
9cfcac65ba73…
```

> The same contract drives STARFALL's physical table. From seed twelve, the
> timed flipper plan now stops on its first early crossing. Instead of spending
> ball one, the saver returns it to the launch lane. The receipt shows one save,
> while score, multiplier, and constellation lights remain exactly as they were
> before the crossing. Restore returns the starting checksum. A fresh request
> replays the same plan, and every committed action, event, metric, and checksum
> matches.

**Cut at 1:55:** cut from the matching replay hashes to the canvas/receipt split.

### 1:55–2:10 — Why canvas validation matters

Split screen: moving canvas on the left; current legal actions, seed,
before/after checksums, events, and metrics on the right. Text must remain
readable after 720p compression.

> A screenshot can show where the ball appears. It does not expose the
> canonical legal-action list, hidden RNG, exact restored state, or whether a
> replay matched. Huginn complements human play and tests with inspectable live
> evidence.

**Cut at 2:10:** cut to the completed paired-result page.

### 2:10–2:33 — Honest authoring result

Pan once across both measured pairs: COIL `15m 57s` versus `17m 20s`, then
STARFALL `14m 57s` versus `23m 17s`. Hold the two evidence-quality cards.

On-screen: **TWO PAIRS · NO GENERAL EFFICIENCY CLAIM**

> Did that lower feature-authoring cost? Not in our two controlled pairs.
> Standalone was faster, used fewer tokens, and changed fewer production lines
> in both. Huginn's narrower gain was checksummed live state: exact collision
> and save receipts, restore, replay, and human handoff. Better evidence, not
> lower cost.

**Cut at 2:33:** return to both games, not a code or documentation page.

### 2:33–2:42 — Close

Show both playable games, then a clean two-line end card:

```text
halmir-ai.github.io/huginn
github.com/halmir-ai/huginn
```

> Huginn helps designers and agents investigate playable games on the live
> page, together. Try both games; the source and receipts are public.

End narration by 2:40 and hold the URLs for two seconds.

## One-page recording checklist

### Before capture

- [ ] Public COIL contains the accepted shield and human recovery behavior.
- [ ] Public STARFALL contains the accepted launch ball saver and `ballSaves`
      metric with spent drains counted separately.
- [ ] A fresh Codex in-app-browser tab discovers all seven actual WebMCP tools
      on each game; a badge alone is not accepted.
- [ ] Start from a fresh public tab and confirm the locked STARFALL start hash;
      never substitute the older spent-drain result.
- [ ] Fresh request IDs are used for every execution and replay.
- [ ] The recording region is clean 16:9 at 1080p or higher; notifications,
      personal tabs, credentials, and unrelated browser chrome are hidden.
- [ ] A ten-second narration test is clear on headphones and small speakers.

### Capture COIL

- [ ] Record actual tool discovery, rules, legal actions, and snapshot.
- [ ] Confirm the starting checksum is exactly `c9a345f3b59a1cd74bd7f699b9f3c3445720e60ff9436ddba6671768a80ddcd4`.
- [ ] Record the exact six-action call at watch speed.
- [ ] Confirm `shield-blocked`, six committed actions, tick 18, score 0,
      `alive: true`, and exact final checksum `33bc4902b43d8f90fc4cf375ef9ee176fa30fbf59c77d3456c130d4f8a658aa4`.
- [ ] Record exact restore, the three-action setup prefix, **Take control**,
      held recovery, Up, resume, and the live northward continuation.

### Capture STARFALL

- [ ] Record actual snapshot and the exact seed-12 fixed-frame action envelope.
- [ ] Stop on `ballSaves >= 1`, not on the old drain condition.
- [ ] Record the visible first-ball save and return to the launch lane.
- [ ] Prove balls remaining, score, lights, and multiplier are unchanged across
      the save; prove no spent-ball drain was counted.
- [ ] Record exact restore and a fresh-request replay from the same checkpoint.
- [ ] Compare actions, events, metrics, and every before/after checksum; do not
      infer replay from the final frame or final hash alone.

### Edit and publish

- [ ] The problem, playable product, and genuine WebMCP call appear by 0:10.
- [ ] Tool cards remain visibly part of Codex; overlays never impersonate tool
      output or obscure the supporting receipt.
- [ ] Hash and metric crops are readable at 720p and on a phone.
- [ ] The COIL authoring result says **better evidence, not lower cost** and is
      explicitly limited to one pair.
- [ ] No unverified feature, general efficiency claim, or balance/fun claim is
      spoken or captioned.
- [ ] Final runtime is below 3:00, narration and captions match, and audio is
      intelligible without relying on music.
- [ ] The processed YouTube link is public and works signed out; both live game
      URLs and the public repository also work signed out.

## Never show or imply

- A page preset, local checkpoint button, reconstructed tool card, or fabricated
  chat exchange presented as an agent call.
- A terminal, dependency install, browser flags page, long raw-JSON scroll,
  internal path, notification, credential, or personal account detail.
- The superseded pinball drain values or checksum. STARFALL's published numbers
  must come from the accepted ball-saver build and the `ballSaves` stop rule.
- A scripted victory, prearranged near-win, or ordinary-play score presented as
  a benchmark.
- “Canvas testing is impossible,” “the agent cannot hallucinate,” “one seed
  proves balance,” “fully deterministic games,” “works with any game,” or any
  claim that Huginn generally saves time, tokens, code, iterations, or money.

## 30-second emergency cut

Use 0:00–0:05 for the two playable games, 0:05–0:15 for the genuine COIL
six-action result, 0:15–0:22 for the STARFALL save and matching replay, and
0:22–0:30 for the paired COIL result and public URLs.

> Agents can build games, but pixels hide rules, legal moves, RNG, and save
> state. In Codex, Huginn's real WebMCP tools snapshot COIL, run six typed
> actions, record a shield-blocked wall hit, and leave it alive at tick
> eighteen. In STARFALL, a seeded ball-saver run and replay match every
> committed record. Our paired authoring trial did not lower cost; Huginn
> produced better live-state evidence. Both games, source, and receipts are
> public.
