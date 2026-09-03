# Huginn

## Mission

Huginn makes live browser games legible and experimentally controllable through
WebMCP. The hackathon proof must stay visible, deterministic, bounded, and
useful to a human game designer.

## Product boundary

- RTS Lab is the working strategy example; Tideglass Relay is the integrated
  logistics example. Dawn remains a future
  retrofit, not a shipped integration. Neither sample grows into a full RTS
  or a Battle Craft port.
- All examples reuse the same kernel and seven WebMCP tools. The `webmcp=off`
  comparison mode disables registration only; ordinary human controls and
  game rules remain equivalent. Page-command counts are not model tokens.
- The deterministic kernel is authoritative; rendering never mutates sim state.
- Every mutation must validate against the current legal-action set.
- WebMCP sequences use prefix semantics: stop before the first invalid action and
  report the exact committed prefix.
- Never use `Math.random()`, wall-clock time, DOM state, or render timing inside a
  simulation transition.
- Keep tool inputs bounded and closed-schema. Do not accept code, selectors,
  arbitrary predicates, URLs, filesystem paths, or network targets.
- Code is MIT. Only explicitly selected, hashed, provenance-tracked art under
  `public/assets/rts-lab/` is licensed CC BY 4.0.

## Verify

Run `npm run check` for routine changes and `npm run build` before deployment.
Snapshot roundtrip, seeded replay, legality, cancellation, and visible-render
tests are protected submission gates.

## Git flow

Use small conventional commits on feature branches after the public baseline.
Never commit credentials, generated build output, or Devpost participant state.
