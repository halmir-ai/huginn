# Huginn

Huginn turns a running browser game into a controlled experiment an AI agent can
conduct while its human collaborator watches.

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
same seed, and reports the stronger outcome with per-step metrics and checksums.

Dawn of People remains the planned hero retrofit. Together, the two demos show
both adoption paths: instrument an existing game, or make a new game
agent-legible from the start.

## Run locally

```sh
npm install
npm run dev
```

WebMCP local development currently requires Chrome 149+ with
`chrome://flags/#enable-webmcp-testing` enabled. The page still runs normally in
other browsers and its built-in branch comparison still runs normally.

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
