# Architecture and dependency boundaries

Huginn is one package with four public layers and two example-only layers. The
separation is enforced by imports and by the standalone-game bundle audit, not
only by naming.

```text
                         optional
                    ┌──────────────┐
                    │   debugger   │  dock, receipts, downloads
                    └──────┬───────┘
                           │
game / engine ──adapter──▶ core ◀── webmcp ──▶ document.modelContext
      │                    ▲
      └── renderer ◀───────┘

examples only:  games ──▶ game-runtime
                play  ──▶ games + game-runtime [+ debugger when integrated]
```

## Public layers

| Source | Package import | Owns | Must not own |
| --- | --- | --- | --- |
| [`src/huginn/`](../src/huginn/) | `@halmir/huginn` | Kernel, canonical state/checksums, adapter contract, experiment and regression types | `document.modelContext`, DOM UI, example rules |
| [`src/webmcp/`](../src/webmcp/) | `@halmir/huginn/webmcp` | Tool schemas, handlers, browser registration, activity events | Game rules, debugger markup |
| [`src/game-runtime/`](../src/game-runtime/) | `@halmir/huginn/game-runtime` | Tiny reducer-first runtime used by the examples | WebMCP or experiment tools |
| [`src/debugger/`](../src/debugger/) | `@halmir/huginn/debugger` | Optional dock, checkpoint controls, receipts, regression download, reference composition | Game-specific rules |

[`src/games/`](../src/games/) contains the playable COIL, STARFALL, and
THORNWATCH examples.
[`src/play/`](../src/play/) contains only page composition and chooses whether
to import the debugger. A standalone entry imports its game, view, and the
protocol-free game runtime; it cannot reach core, WebMCP, or debugger through
its transitive bundle.

## Engine boundary

The renderer stays on the game side of the adapter. COIL and STARFALL call the
native Canvas 2D API; THORNWATCH uses PixiJS 8 with a WebGL renderer. All three
use the same `GameDefinition`/`GameRuntime` boundary and the same WebMCP tool
construction. The static boundary is covered by
[`renderer-boundaries.test.ts`](../tests/renderer-boundaries.test.ts); manually
recorded metadata from an actual in-app-browser discovery and capture smoke run
is retained in
[`engine-browser-smoke.json`](../tests/fixtures/arcade/engine-browser-smoke.json).
The fixture explicitly does not claim independently verifiable PNG evidence;
the live pages are the reproducible proof surface.

`capture_game` is also engine-neutral. The WebMCP layer accepts an optional
host callback that returns bounded PNG metadata after displaying its preview.
The reference debugger freezes mutation, lets two animation frames settle,
captures the page's current canvas, and rejects the result if canonical state
changed across that boundary. Pixi enables a preserved drawing buffer for the
readback. No Pixi type or browser canvas enters the core kernel.

## Authority model

The deterministic state passed through the adapter is authoritative. Rendering
is a projection of that state and must never mutate it. Human controls and
agent tools must dispatch through the same transition path; otherwise a game
can display state that snapshots and checksums do not contain.

Huginn deliberately does not edit source code, plan game strategy, or replace
human feel testing. It gives a browser agent a bounded test port into the state
and transitions the game already owns.

## Build outputs

`npm run build:library` emits four ESM entry points plus declarations into
`dist/library/` and imports each package subpath in Node as a smoke test.
`npm run build` also builds the website and audits all three standalone games'
complete dependency graphs for protocol leakage. Generated output is not
committed.

## Change rule

New engine integrations belong in their game or in a separate adapter package.
A new capability belongs in core only if it is transport-independent. A new
browser protocol concern belongs in `webmcp`; display-only diagnostics belong
in `debugger`. Do not add game-specific tools to the shared transport. The
only optional extra in the reference pages is the generic `capture_game` host
capability.
