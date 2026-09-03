# Huginn

Huginn turns a running browser game into a controlled experiment an AI agent can
conduct while its human collaborator watches.

**Live demo:** <https://halmir-ai.github.io/huginn/>

Canvas games hide their meaningful state from the DOM: the current board, legal
moves, economy, RNG state, and save timeline live in JavaScript memory. Huginn
exposes that state through WebMCP as bounded, typed tools. An agent can inspect
the rules, choose only legal actions, run a visible sequence, snapshot the game,
restore it, and replay the same seed to verify a result.

The load-bearing tool is `apply_action_sequence`. It validates every action
against the live state, renders every committed step, records metrics and a
checksum, supports cancellation, and stops before the first illegal action.
The imperative registration boundary is intentionally easy to inspect in
[src/huginn/webmcp.ts](src/huginn/webmcp.ts).

## Status

This repository is the new WebMCP work for [The WebMCP Challenge](https://webmcp.devpost.com/).
The first complete demo is **RTS Lab**, a small strategy game designed around the
Huginn contract from its first reducer. Its visible comparison restores one
verified snapshot, runs military-rush and economy-first branches against the
same seed, and reports the tradeoffs at the same ending cycle with per-step
metrics and checksums. Actual WebMCP calls populate the live notebook; the page
preset is clearly labeled and does not impersonate an agent invocation.

Dawn of People is a planned retrofit, **not a shipped integration**. The current
live demo proves the new-game path only. RTS Lab is a small deterministic slice,
not a full real-time RTS or evidence of a generally dominant strategy.

## Run locally

```sh
npm install
npm run dev
```

Use the **Codex in-app browser** for the rehearsed path. OpenAI's
[site-tools documentation](https://learn.chatgpt.com/docs/webmcp) confirms that
Codex and ChatGPT Work use WebMCP in the shared built-in browser. The September 2
rehearsal verified actual calls there. Chrome 149+ with
`chrome://flags/#enable-webmcp-testing` is an optional alternative; the connected
Chrome was not WebMCP-enabled. The page preset also works without WebMCP, but
is not a substitute for an agent-tool test.

See the [recording kit](docs/RECORDING_KIT.md) for the exact agent flow,
expected hashes, narration, and remaining publication gates.

## Verify

```sh
npm run check
npm run build
```

Huginn's code is MIT licensed. The eight selected RTS Lab PNGs are separately
released under CC BY 4.0 with exact source paths and hashes in
[docs/ASSET_LICENSE.md](docs/ASSET_LICENSE.md).

See [docs/PLAN.md](docs/PLAN.md), [docs/TOOL_CONTRACT.md](docs/TOOL_CONTRACT.md),
[docs/PROVENANCE.md](docs/PROVENANCE.md), and the
[submission checklist](docs/SUBMISSION_CHECKLIST.md).
