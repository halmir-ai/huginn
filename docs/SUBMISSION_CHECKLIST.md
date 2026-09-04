# Submission checklist

Sources: registration email and official Devpost requirements/announcements
rechecked September 2, 2026. Deadline:
**September 3, 2026 at 1:00 PM Pacific**. Internal submission target remains
10:00 AM so the deadline is not the first complete attempt. Do not modify the
submitted repo, live site, or video after the 1 PM deadline. Keep the live app
free and unrestricted through September 21 at 5 PM Pacific.

## Access and runtime

- [x] Public HTTPS URL opens without judge setup or credentials:
  <https://halmir-ai.github.io/huginn/>.
- [x] Codex's in-app browser discovers and successfully calls the WebMCP tools.
- [x] Confirm Codex is a supported built-in-browser client against current
  [OpenAI site-tools guidance](https://learn.chatgpt.com/docs/webmcp).
- [ ] Optional alternative: Chrome 149+ with `chrome://flags/#enable-webmcp-testing` discovers and
  successfully calls the same tools. Connected Chrome currently reports
  WebMCP unavailable; automated access to its flags page is blocked. This is
  not a blocker for the verified Codex built-in-browser route.
- [x] A clean-session rehearsal confirms assets, gameplay, snapshot/restore,
  and the golden experiment work on the deployed origin.

## Public repository

- [x] Public repository: <https://github.com/halmir-ai/huginn>.
- [x] All RTS Lab source, selected assets, provenance, and local instructions
  are present in the repository.
- [x] Top-level MIT `LICENSE` exists; selected RTS art is separately documented
  under CC BY 4.0.
- [x] GitHub visibly detects the MIT license in the repository header/About area.
- [x] The imperative WebMCP registration is easy to find in
  `src/webmcp/index.ts`; it calls `registerTool` with name, description,
  closed JSON Schema, and an executable handler.
- [ ] Default branch contains the final submission commit and all links in the
  README work from an incognito session.

## Devpost text

- [ ] Explain why live in-browser game state makes playtesting a strong WebMCP
  use case rather than a backend or ordinary DOM-automation problem.
- [ ] Explain the user-experience improvement: natural-language experiments,
  visible execution, legal actions, and immediate structured results.
- [ ] State what the designer and agent can now do together: branch a live
  timeline, run counterfactual build orders from the same initial RNG state,
  and replay the same plan. Do not claim an unshown balance change or Dawn
  retrofit; different plans can consume RNG draws differently.
- [ ] Briefly explain the implementation: game adapter, canonical state,
  checksums, snapshot/restore, strict tools, committed-prefix sequences, and
  visible rendering.

## Public demo video

- [ ] Public YouTube URL, under three minutes, with clear narration or audio.
- [ ] The working product and core value appear within the first 15 seconds.
- [ ] The video visibly proves tool discovery, legal actions, live execution,
  same-snapshot branching, deterministic evidence, and the public URLs.
- [ ] Captions, audio mix, phone playback, 720p YouTube compression, and an
  incognito public-link check all pass.

See [VIDEO_PLAN.md](VIDEO_PLAN.md) for the protected production window and shot
plan. No feature is allowed to consume that window after feature freeze.
Use [RECORDING_KIT.md](RECORDING_KIT.md) for the September 2 recovery flow.

## Owner and form gates

- [ ] Explicit rules acknowledgment is recorded in local Devpost state.
- [ ] Country, learning level, career-value answer, and accurate tested-client
  disclosure are supplied by the owner; do not infer them.
- [ ] Final video and public-link review complete; publication approved.
- [ ] Final Devpost submission explicitly approved and verified Submitted,
  not merely Draft. Nothing has been submitted by this recovery increment.
