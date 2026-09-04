# Provenance

## New hackathon work

This repository was initialized on August 30, 2026 for The WebMCP Challenge.
The Huginn kernel, WebMCP tool registration, experiment debugger, COIL,
STARFALL, THORNWATCH, tests, and docs authored here are new hackathon work.

## Pre-existing games

Dawn of People is a separate pre-existing game that was considered for a
retrofit. No Dawn source code or art was copied into this repository, and the
submission does not claim it as an implemented integration.

Before importing anything, record the exact source commit, ownership/license,
which files are included, asset attribution, and the `pre-webmcp` baseline tag.
The public submission must make the new WebMCP work distinguishable from the
pre-existing game.

## Pre-existing selected game art

RTS Lab uses eight exact-copy PNGs selected on August 30, 2026 from the owner's
pre-existing Gameplay Collections v1 library. The user explicitly authorized
publishing this selected subset under CC BY 4.0. Source collection manifests
record each set as `ready`, `painted-rpg`, and `built-in-imagegen`.

THORNWATCH uses eleven exact-copy PNGs selected on September 3, 2026 from the
same owner's Painted RPG generation library: a terrain source, three towers,
three enemy silhouettes, a gate, and three effects. The user explicitly
authorized reuse and publication. Neither selection was transformed.

The selections are recorded in `public/assets/rts-lab/sources.json` and
`public/assets/thornwatch/sources.json` with source paths, exact SHA-256 hashes,
and manifest paths. `docs/ASSET_LICENSE.md` applies only to those listed hashes;
all new reducers, rendering composition, adapters, WebMCP, and experiment code
remain hackathon-period work under the repository's MIT license.
