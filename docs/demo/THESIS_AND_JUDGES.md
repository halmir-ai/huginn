# The thesis, with defensible claims

## One sentence

**Coding agents can build games; Huginn gives designers and agents a shared,
repeatable way to investigate how those games behave.**

The user is a solo developer or small game team using coding agents. The
problem is the gap between generating a convincing artifact and verifying
its interactive rules. The product is a game adapter plus a visible experiment
workflow—not a chatbot, an analytics dashboard, or an autonomous QA promise.

## Why games are a meaningful wedge

Games combine code, art, interaction, and stateful rules in one artifact. They
are a recurring public showcase format and a research evaluation setting for
coding agents. Do not invent a percentage of agent usage or say “everyone
judges models by games.” We have examples and benchmarks, not market sizing.

Primary sources reviewed September 2–3, 2026:

- [OpenAI Developers Showcase](https://developers.openai.com/showcase) has a
  dedicated game category and multiple game demos. This establishes a visible
  use case, not a usage share.
- [GameDevBench](https://arxiv.org/abs/2602.11103) studies game development as
  a multimodal benchmark, including gameplay and graphical feedback. This
  supports the complexity of the task, not a Huginn performance claim.
- [Roblox OpenGameEval](https://about.roblox.com/newsroom/2025/12/opengameeval-benchmark-agentic-ai-assistants-roblox-studio)
  motivates executable evaluation of stateful mechanics rather than only
  isolated coding tasks.
- [GameXpert-Bench](https://arxiv.org/abs/2608.21833) combines live interaction,
  deterministic behavioral checks, and regression checks for game work.

Our inference: a polished screenshot and one successful click-through provide
limited evidence about a game's mechanics across trajectories. Human play,
visual checks, unit tests, and behavioral experiments are complementary.

## Why WebMCP—not “because canvas is impossible”

The advantage is a supported, structured contract to **this live page**:
current state, legal actions, bounded execution, and verifiable results. The
designer and agent operate the same world and watch changes together.

[OpenAI site-tool guidance](https://learn.chatgpt.com/docs/webmcp) describes
this shared-page model. It recommends narrow inputs, reuse of application
logic, verifiable results, and preserving the normal UI. The
[WebMCP draft](https://webmachinelearning.github.io/webmcp/) defines the tool
registration and execution interface. Huginn supplies the game-specific
semantics, determinism, rendering, and receipts; the standard does not supply
or guarantee those on its own.

A canvas game **can** be tested with mouse/keyboard automation, screenshots,
application instrumentation, or a bespoke harness. A backend could also run
a simulation. Huginn's demonstrated benefit is making a reusable in-page
experiment contract available to a compatible agent without moving this live
session to a separate simulation service. The completed COIL pair measured one
incremental feature task and did not show a speed, token, or code-size advantage
for Huginn. It did show stronger structured live-state evidence. One pair is not
a general productivity or defect-yield result.

## Map the film to the actual rubric

Official criteria re-fetched through Devpost on September 3, 05:14 UTC.
See [The WebMCP Challenge](https://webmcp.devpost.com/).

| Criterion | What we show | What would weaken it |
| --- | --- | --- |
| WebMCP Leverage | Real discovered tools, saved live state, visible branches and replay | Badge/preset only; a console hook passed off as WebMCP |
| Execution | One coherent live workflow with readable outcomes and recovery | A library tour; several unfinished game pages |
| Potential Impact | A solo developer asking a concrete question and getting inspectable evidence | Unsupported adoption numbers or “AI QA for every game” |
| Creativity & Ambition | Branch-and-replay experiments; optional actual authoring feedback loop | Merely showing an agent make a move |

The official rubric is evidence about what judges assess, not a formula that
guarantees winning. [Earlier winner review](../WINNER_REVIEW.md) suggests one
memorable workflow, readable evidence, and low judge effort. Those are our
editorial inferences, not claims about how any private judging decision was made.

## Sample-game decision

| Candidate | Honest role today | Deadline decision |
| --- | --- | --- |
| COIL | Complete score-chasing Snake game; WebMCP and genuine standalone builds | Hero interaction and human handoff |
| STARFALL | Complete three-ball pinball game using the same contract | Short generality proof |
| COIL paired trial | Completed with public source/tasks and unfavorable efficiency result | Honest authoring evidence near the close |
| RTS Lab / Tideglass | Shipped earlier protocol experiments | Backup footage or technical appendix only |
| Dawn / Regnara / Battle Craft | Existing projects without a completed Huginn retrofit | Future work; do not promise in the film |

## Words to avoid—and what to say instead

- Not “WebMCP makes the game better.” Say “It lets us measure a stated target,
  make a change, and check the result”—only when that loop was demonstrated.
- Not “The agent cannot hallucinate.” Say “The kernel rejects illegal actions
  before committing them.” An agent can still propose a wrong action.
- Not “A seed makes every comparison fair.” Say “Both plans begin at the same
  snapshot; different plans may consume random draws differently.”
- Not “Fully deterministic games.” Say “The tested adapter's same-seed,
  same-action replay matched all recorded steps.”
- Not “Works with any engine in forty lines.” Say “The game must satisfy a
  defined adapter contract; integration effort depends on its architecture.”
- Not “This proves fun/balance.” Say “This answers one bounded behavioral
  question. Human playtesting and broader experiments remain necessary.”
- Not “Retrofitted our existing RTS.” RTS Lab is new; selected art is reused
  under [documented CC BY 4.0 terms](../ASSET_LICENSE.md).
