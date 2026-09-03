# Prior-winner polish review

## What the evidence says

The official Chrome Built-in AI Challenge 2025 recap describes more than 1,300
submissions and says winners were selected for functionality, purpose, content,
user experience, and technical execution. Its winners solve narrow, recognizable
problems and make the browser capability central to the experience:

- [AAC Board AI](https://devpost.com/software/aac-board-ai) turns assisted
  communication into one immediately understandable workflow.
- [Nutshell](https://devpost.com/software/nutshell-auftp2) makes hands-free web
  access the product, with explicit calibration and interaction feedback.
- [Mentelo](https://devpost.com/software/mentelo-interactive-chrome-extension-you-can-talk-to)
  keeps its ask-and-act loop inside familiar, browser-native surfaces.
- [Marionette](https://devpost.com/software/marionette-the-on-device-multimodal-ai-agent)
  makes the browser-agent loop inspectable as intent, perception, action, and
  observed result.

The official [Chrome winner recap](https://developer.chrome.com/blog/ai-challenge-winners-2025)
and [event criteria](https://googlechromeai2025.devpost.com/) explicitly reward
visual quality and easy-to-understand UX alongside functionality and technical
execution. That makes polish part of the judged product rather than decoration.

OpenAI Build Week's official [winner list](https://openai.com/build-week/) and
the winning Devpost pages show the same judge-facing shape:

- [Echo Canvas](https://devpost.com/software/echo-canvas-ujzksi) centers one
  memorable A/B “portal moment” in an otherwise technical spatial-audio tool.
- [Mechanica](https://devpost.com/software/xiaoqiang) pairs a visually striking
  interactive machine with provenance, 267 unit tests, 67 Playwright scenarios,
  and explicit refusal of unsupported claims.
- [Second Voice](https://devpost.com/software/second-voice-uk1peq) makes human
  confirmation part of the main interaction instead of hiding safety in copy.
- [veTriage](https://devpost.com/software/veterinary-four-color-triage-app)
  backs a clear frontline workflow with human override, automated checks, and
  evidence of real use.
- [Pulse](https://devpost.com/software/pulse-ewjaf9) makes deterministic state
  transitions and auditability visible while bounding the model's role.

Exact opening hooks are inferred from the documented product flows where
timestamped video playback was unavailable. Placements, features, and embedded
video links were verified from official winner announcements and Devpost pages.

## Repeated polish patterns

1. **One hero interaction carries the story.** The best projects can be recalled
   as one action and one payoff, not a list of screens.
2. **The audience and pain are concrete.** The opening answers who needs this
   before explaining architecture.
3. **The platform fit is concrete.** The browser or model capability is central
   to the demonstrated workflow. This does not establish that no other
   architecture could solve the problem.
4. **Trust is visible.** Confirmation, deterministic state, policy gates,
   provenance, audit trails, and honest abstention appear in the product.
5. **Proof follows payoff.** Metrics, tests, replay, pilot use, and limitations
   substantiate the impressive moment after judges understand why it matters.
6. **The submission minimizes judge effort.** Strong tagline, working URL,
   readable screenshots, public code, and a short coherent video all tell the
   same story.

## Consequences for Huginn

- The hero moment is not “seven tools registered.” It is the game visibly
  replaying two branches from the same state and revealing a measured design
  tradeoff.
- The designer remains the protagonist; the agent is a bounded experiment
  operator.
- Legal actions, snapshot identity, seed, checksums, and renderer updates must be
  legible in the product rather than left for narration.
- The public page and video should use the same one-sentence claim and the same
  golden experiment.
- Technical depth appears only after the complete outcome is understood.
- A clean single-game proof is more competitive than an unfinished platform
  tour. Generality is a closing implication unless a second adapter is truly
  working.

## Judge-facing acceptance test

A judge should be able to watch only the first 30 seconds and accurately say:

> Huginn lets a game designer direct an agent to run visible, reproducible
> experiments through a structured contract to live browser-game state,
> alongside ordinary visual and interaction testing.

By the end, the judge should have seen a working result, why WebMCP is required,
why the experiment is trustworthy, and where to try and inspect it.
