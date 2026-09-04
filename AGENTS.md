# Huginn

## Mission

Huginn makes live browser games legible and experimentally controllable through
WebMCP. The hackathon proof must stay visible, deterministic, bounded, and
useful to a human game designer.

## Product boundary

- The submission examples are COIL (campaign Snake), STARFALL (three-ball
  pinball), and THORNWATCH (tower defense). Human playability comes before
  protocol evidence; abandoned prototypes do not belong in the release tree.
- Integrated examples reuse the same kernel and seven core WebMCP tools, plus
  the generic `capture_game` host capability. Arcade `/plain/` builds exclude
  the protocol runtime entirely.
- The deterministic kernel is authoritative; rendering never mutates sim state.
- Every mutation must validate against the current legal-action set.
- WebMCP sequences use prefix semantics: stop before the first invalid action and
  report the exact committed prefix.
- Never use `Math.random()`, wall-clock time, DOM state, or render timing inside a
  simulation transition.
- Keep tool inputs bounded and closed-schema. Do not accept code, selectors,
  arbitrary predicates, URLs, filesystem paths, or network targets.
- Code is MIT. Only explicitly selected, hashed, provenance-tracked art under
  `public/assets/thornwatch/` is licensed CC BY 4.0.

## Source boundaries

- `src/huginn/` is the protocol-independent experiment library. It must not
  import WebMCP, the debugger, game examples, or page code.
- `src/webmcp/` is the browser transport and the only public layer that knows
  about `document.modelContext`.
- `src/game-runtime/` is a small protocol-free reference runtime shared by
  ordinary human play and integrated examples.
- `src/debugger/` is the optional dock, receipts, and reference composition.
- `src/games/` contains real example game rules and views; `src/play/` contains
  only page composition entry points. Plain entries must not import Huginn,
  WebMCP, or debugger code.

Follow `docs/INTEGRATION.md` for human adoption and
`docs/AGENT_INTEGRATION.md` when a coding agent instruments a game.

## Verify

Run `npm run check` for routine changes and `npm run build` before deployment.
Snapshot roundtrip, seeded replay, legality, cancellation, and visible-render
tests are protected submission gates.

## Git flow

Use small conventional commits on feature branches after the public baseline.
Never commit credentials, generated build output, or Devpost participant state.
