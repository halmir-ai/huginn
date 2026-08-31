# Provenance

## New hackathon work

This repository was initialized on August 30, 2026 for The WebMCP Challenge.
The Huginn kernel, WebMCP tool registration, experiment HUD, tests, docs, and
adapters authored here are new hackathon work.

## Pre-existing games

Dawn of People is a separate pre-existing game and the intended hero integration.
Its deterministic reducer and versioned save codec were identified as integration
seams. No Dawn source code or art has been copied into this repository yet.

Before importing anything, record the exact source commit, ownership/license,
which files are included, asset attribution, and the `pre-webmcp` baseline tag.
The public submission must make the new WebMCP work distinguishable from the
pre-existing game.

## Pre-existing selected RTS art

RTS Lab uses eight exact-copy PNGs selected on August 30, 2026 from the owner's
pre-existing Gameplay Collections v1 library. The user explicitly authorized
publishing this selected subset under CC BY 4.0. Source collection manifests
record each set as `ready`, `painted-rpg`, and `built-in-imagegen`.

The selection is recorded in `public/assets/rts-lab/sources.json` with source
paths, exact SHA-256 hashes, and manifest paths. The files were not transformed
for the submission. `docs/ASSET_LICENSE.md` applies only to this selected
subset; all new RTS reducer, rendering, adapter, WebMCP, and experiment code is
hackathon-period work under the repository's MIT license.
