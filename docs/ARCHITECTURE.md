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

[`src/games/`](../src/games/) contains the playable COIL and STARFALL examples.
[`src/play/`](../src/play/) contains only page composition and chooses whether
to import the debugger. A standalone entry imports its game, view, and the
protocol-free game runtime; it cannot reach core, WebMCP, or debugger through
its transitive bundle.

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
`npm run build` also builds the website and audits both standalone games'
complete dependency graphs for protocol leakage. Generated output is not
committed.

## Change rule

New engine integrations belong in their game or in a separate adapter package.
A new capability belongs in core only if it is transport-independent. A new
browser protocol concern belongs in `webmcp`; display-only diagnostics belong
in `debugger`. Do not add game-specific tools to the seven-tool transport.
