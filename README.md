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

## Status

This repository is the new WebMCP work for [The WebMCP Challenge](https://webmcp.devpost.com/).
The first executable increment is a deterministic kernel and a small integration
fixture. Dawn of People will be the hero game after its source/assets boundary is
documented; the fixture is not presented as the final game demo.

## Run locally

```sh
npm install
npm run dev
```

WebMCP local development currently requires Chrome 149+ with
`chrome://flags/#enable-webmcp-testing` enabled. The page still runs normally in
other browsers and reports that tools are unavailable.

## Verify

```sh
npm run check
npm run build
```

See [docs/PLAN.md](docs/PLAN.md), [docs/TOOL_CONTRACT.md](docs/TOOL_CONTRACT.md),
and [docs/PROVENANCE.md](docs/PROVENANCE.md).
