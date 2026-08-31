# Huginn

## Mission

Huginn makes live browser games legible and experimentally controllable through
WebMCP. The hackathon proof must stay visible, deterministic, bounded, and
useful to a human game designer.

## Product boundary

- Dawn of People is the hero integration.
- The deterministic kernel is authoritative; rendering never mutates sim state.
- Every mutation must validate against the current legal-action set.
- WebMCP sequences use prefix semantics: stop before the first invalid action and
  report the exact committed prefix.
- Never use `Math.random()`, wall-clock time, DOM state, or render timing inside a
  simulation transition.
- Keep tool inputs bounded and closed-schema. Do not accept code, selectors,
  arbitrary predicates, URLs, filesystem paths, or network targets.

## Verify

Run `npm run check` for routine changes and `npm run build` before deployment.
Snapshot roundtrip, seeded replay, legality, cancellation, and visible-render
tests are protected submission gates.

## Git flow

Use small conventional commits on feature branches after the public baseline.
Never commit credentials, generated build output, or Devpost participant state.
