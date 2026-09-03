# Huginn: record this, in this order

**The pitch:** Coding agents can build a game. Huginn helps a designer and agent
investigate how it actually plays—through visible, repeatable experiments.

This is the production guide, not a submitted Devpost entry. The original
default film below is the verified RTS flow. There are now two playable games:
[RTS Lab](https://halmir-ai.github.io/huginn/) and
[Tideglass Relay](https://halmir-ai.github.io/huginn/tideglass/), plus the
[paired comparison](https://halmir-ai.github.io/huginn/compare/). A measured
source revision now exists; an existing-game retrofit still does not.

## The three things to open

1. [The word-for-word film script](FINAL_SCRIPT.md). Read the quoted narration;
   the rest is direction, not speech.
2. [The copy/paste recording prompts](RECORDING_PROMPTS.md). Send one at a time.
   Each has a visible PASS condition and a recovery instruction.
3. [The live game](https://halmir-ai.github.io/huginn/) inside Codex's built-in
   browser. Keep the agent conversation beside the game for the genuine calls.

Watch the [2:18 narrated reference walkthrough](https://halmir-ai.github.io/huginn/demo/huginn-reference-walkthrough.mp4)
([GitHub download](../../public/demo/huginn-reference-walkthrough.mp4)).
It is a teaching aid assembled from actual
page screenshots after real WebMCP calls. It uses synthetic narration. It is
not continuous screen footage, does not show the Codex window, and is not the
final hackathon video. Use it to recognize the right screen and result.

[Capture details and verification](REFERENCE_VIDEO.md) include the actual
machine-readable experiment receipt and the video's provenance.

## Before recording — five minutes

- Use a current Codex desktop app and a model with site tools enabled. Official
  [OpenAI guidance](https://learn.chatgpt.com/docs/webmcp) currently lists Sol
  and Terra; Luna does not expose WebMCP. Do not change account permissions or
  spend time configuring Chrome if the verified built-in-browser route works.
- Open a fresh game tab. Seven **actually discoverable** site tools are the
  prerequisite; a green badge alone is not proof. Run Prompt 1 before recording.
- Record a clean 16:9 region at 1080p or higher. Hide personal tabs and
  notifications yourself. Show the game large enough to read. Record a
  separate tight notebook crop; a wide shot cannot carry tiny hash text.
- Test ten seconds of voice first. Wear headphones; check for clipping or
  room noise. Record narration separately from screen actions. No music needed.
- Save clips as `01-hook`, `02-inspect`, `03-rush`, `04-compare`,
  `05-restore`, `06-replay`, `07-code`, `08-close`.
- Do not try to type, narrate, and run the whole experiment in one take.

## Record order (different from edit order)

1. Run Prompts 1–3. Record the snapshot, rush, and economy branches.
2. **Pause on the two different result cards now.** Record the comparison
   close-up before replay replaces the cards with two identical economy runs.
3. Run Prompts 4–5. Record exact restore and the fresh replay.
4. Capture the actual site-tool list and a short code crop of
   [registration](../../src/huginn/webmcp.ts) and
   [adapter contract](../../src/huginn/types.ts).
5. Record the spoken script in short paragraphs. Start the edit with the
   best genuine attack/comparison shot, even though it was recorded third.

### The result you should see

| At the end of cycle 3 | Rush | Economy-first |
| --- | ---: | ---: |
| Damage to enemy | 34 | 54 |
| Your base HP | 96 | 75 |
| Economy value | 72 | 40 |
| Committed actions | 6 | 8 |

The correct conclusion is **more damage, less protection**. Neither plan wins
the whole game in this example. One seed is not evidence of overall balance.

Snapshot prefix: `35e2bab995b2`. Rush final: `1d4b1269940e`.
Economy final: `0b4cd39339b5`. Fresh economy replay must match all eight
action/event/metric/checksum records, not merely the final prefix.

## The edit: 2:35 target, never 3:00

- Show a real result within the first 12 seconds. No opening logo animation.
- Keep each tool invocation that supports a claim visible briefly. Cut waits,
  not the context needed to understand what actually ran.
- Use three large, consistent callouts: **SAME START**, **DIFFERENT OUTCOME**,
  **SAME PLAN, SAME RESULT**. Keep labels outside important UI evidence.
- Put the main numerical comparison on screen for at least six seconds.
- Use your own quiet narration. Captions should match the final recording,
  not an earlier script. Aim for 140–150 words per minute; leave result holds.
- If a segment fails twice, use its recovery instruction and move on. Do not
  replace real calls with the `Try page preset` button without labeling it.

## Authoring evidence now available

[AUTHORING_SESSION.md](AUTHORING_SESSION.md) preserves the original brief.
The task has now built Tideglass and measured a real revision. Use
[TIDEGLASS_REFINEMENT.md](TIDEGLASS_REFINEMENT.md) for actual before/after values,
source delta and action lists. The original Signal route passed. A new goal
then required two battery on the no-relay route; changing capacity 10 → 12
yielded Unassisted 0 → 2 and Signal 3 → 5, at the same seed and horizon.

The evidence gate is met, but the final film still needs actual footage and
your narration. Do not read the generic “first build fails” line from the old
alternate over this example: the original baseline passed, and the target
changed explicitly. Keep the full film under three minutes; do not append a
second unedited demonstration. The [comparison results](COMPARISON_RESULTS.md)
support page-command counts only, not token or iteration savings.

## Final review — ask someone who has never seen Huginn

Without pausing, can they answer:

1. Who is it for? A solo developer or small team using coding agents.
2. What is the problem? A working-looking game still needs behavioral testing.
3. What did the agent do? Run two plans from a saved live state and replay one.
4. Why WebMCP? Structured access to the same live page the designer is watching.
5. What is proved? This bounded experiment is reproducible—not that the game
   is universally balanced or fun.

If any answer is unclear, simplify that section. Watch the final export on a
phone at 720p, listen on small speakers, then verify the processed public
YouTube link in a signed-out session. The official requirements call for a
public YouTube video under three minutes **with audio**. A local reference
video or an unreviewed upload is not completion.

## Scope and claim checks

- [Thesis, sources, and judging strategy](THESIS_AND_JUDGES.md)
- [Detailed technical receipts](../RECORDING_KIT.md)
- [Official challenge](https://webmcp.devpost.com/)

Formal Devpost drafting still requires the participant's rules acknowledgment
through `$review-hackathon-rules`. This recording package does not change that
state and sends nothing to Devpost.
