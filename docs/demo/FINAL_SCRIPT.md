# Huginn — final-film script

**RTS-only base cut.** Target 2:35. Read only the quoted paragraphs.
Timing is an editing target, not the measured duration of a finished film.
Say “HOO-gin” consistently. Say “Web M C P” and “A P I.”

September 2 update: the [Tideglass authoring revision](TIDEGLASS_REFINEMENT.md)
and [paired replay evidence](COMPARISON_RESULTS.md) now exist. This document
preserves the earlier base cut. Its generic alternate below must not be read
as a description of the actual Tideglass baseline, which passed its original
target. A two-game edit should use the documented new-target story and replace,
not append to, the authoring slot.

## 0:00–0:12 · Hook: show the result first

**Picture:** Real economy-branch attack, then a tight crop of the two result
cards. Briefly retain the Codex tool call. Title in a corner: “Huginn”.

> An AI-built game can look convincing. But how does it actually play? This is
> Huginn: a designer and coding agent running experiments together, inside the
> live game.

## 0:12–0:30 · Why games, and who needs this

**Picture:** Return to the battlefield; briefly show structured state beside
it. On-screen: “Looks playable ≠ behavior verified”.

> Games bring code, visuals, rules, and interaction together. That's why they
> make such revealing tests for coding agents. For a solo developer, though,
> checking a screenshot or clicking one path doesn't establish that the
> mechanics behave as intended.

## 0:30–0:48 · The agent gets a contract

**Picture:** Actual `describe_game`, `list_legal_actions`, snapshot receipt.
Do not scroll through all the JSON. Highlight rules, legal moves, saved start.

> Huginn exposes the game's live state, rules, legal actions, and metrics
> through WebMCP. First, the agent saves this starting point. Then it runs a
> military rush. The game checks each action, renders it, and records what
> changed.

## 0:48–1:12 · Counterfactual with a useful answer

**Picture:** Economy branch runs from the same snapshot. Hold the two cards.
Large editorial labels: “34 → 54 damage” and “96 → 75 base health”.

> Now try economy first, from the same snapshot. Both plans end at cycle three.
> The second deals fifty-four damage instead of thirty-four, but leaves our
> base with seventy-five health instead of ninety-six. That's a specific design
> tradeoff we can investigate—not a guess from watching the animation.

## 1:12–1:36 · Reproducibility, not a staged winner

**Picture:** Restore receipt and beginning state; then a fresh economy run.
Hold “Replay matches, step for step.”

> Can we reproduce it? Restoring recovers the exact starting state. A fresh
> run of the same plan matches all eight steps: actions, events, metrics, and
> checksums. This is one controlled example, not proof that the whole game is
> balanced.

## 1:36–1:56 · Why this belongs in the browser

**Picture:** Real site-tool list, short registration-code crop, back to game.
Use the actual `document.modelContext.registerTool` boundary from the repo.

> WebMCP connects the agent to the same browser memory and rendered world the
> designer is using. No separate gameplay server is needed here. Huginn wraps
> the game's own logic with bounded tools. Visual testing still matters; now
> we also have an inspectable behavioral test.

## 1:56–2:22 · Authoring thesis — default, truthful version

**Picture:** Actual adapter contract and RTS code; then the result again.
Label “RTS Lab: built with Huginn” and “Next: author → experiment → improve”.

> RTS Lab is a small new game built around this contract. The next step is to
> make that part of authoring: give the agent a design goal, let it measure
> behavior, change the game, and retest. The designer still decides what feels
> right. Huginn supplies the evidence.

## 2:22–2:35 · Close on the product

**Picture:** Hero game with result cards, then live URL/repo in readable type.
No long credits. Put detailed art attribution in the description/repo.

> Huginn turns “does this game look right?” into “what does this game actually
> do?” Try the live demo, inspect the open-source adapter, and run your own
> experiment.

---

## Alternate 1:56–2:22 · Only after authoring proof exists

**Do not read this over hypothetical footage.** Replace the default section,
never append it. First complete the gates in [AUTHORING_SESSION.md](AUTHORING_SESSION.md).

**Picture:** Actual fresh-task prompt; new game; real failing design-target
receipt; actual source diff; rebuilt game's real improved result. Label edited
time compression. Keep both build identities and the same seed/plan available.

> Here, Codex builds a new game with Huginn from the start. We set a measurable
> design goal. The first experiment misses it. Codex changes one rule, then
> reruns the same seeded plan. The result now meets that target. That's measured
> iteration—not just another convincing screenshot.

Replace the words “misses it” and “meets that target” with a concise actual
metric only after it is measured. If the first build already meets the goal,
show that honestly and choose a genuine refinement; do not inject a fake bug.
If a deliberate calibration fixture is used, explicitly label it as one.
