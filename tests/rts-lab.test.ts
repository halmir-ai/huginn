import { describe, expect, it } from "vitest";
import {
  createRtsLabAdapter,
  type RtsLabAction,
} from "../src/demo/rts-lab";
import { HuginnKernel } from "../src/huginn/kernel";

const noDelay = async () => {};

const rush: RtsLabAction[] = [
  { type: "build_barracks" },
  { type: "train_vanguard" },
  { type: "launch_attack" },
];

const economy: RtsLabAction[] = [
  { type: "assign_worker", resource: "crown_gold" },
  { type: "advance_cycle" },
  { type: "advance_cycle" },
  { type: "build_barracks" },
  { type: "train_vanguard" },
  { type: "advance_cycle" },
  { type: "train_vanguard" },
  { type: "launch_attack" },
];

describe("RTS Lab adapter", () => {
  it("round-trips canonical state and rejects an invalid worker total", () => {
    const adapter = createRtsLabAdapter();
    const state = adapter.initialState(12);
    expect(adapter.deserialize(adapter.serialize(state))).toEqual(state);
    expect(() =>
      adapter.deserialize({ ...state, workersOnHeartwood: 2, workersOnGold: 2 }),
    ).toThrow("exactly two workers");
  });

  it("only lists state-legal actions", () => {
    const adapter = createRtsLabAdapter();
    const initial = adapter.initialState(12);
    const initialTypes = adapter.listLegalActions(initial).map(({ action }) => action.type);
    expect(initialTypes).toContain("build_barracks");
    expect(initialTypes).not.toContain("train_vanguard");

    const built = adapter.reduce(initial, { type: "build_barracks" }).state;
    const builtTypes = adapter.listLegalActions(built).map(({ action }) => action.type);
    expect(builtTypes).not.toContain("build_barracks");
    expect(builtTypes).toContain("train_vanguard");
  });

  it("replays the same seed and build order identically", async () => {
    const first = new HuginnKernel(createRtsLabAdapter(), 12, noDelay);
    const second = new HuginnKernel(createRtsLabAdapter(), 77, noDelay);
    const runA = await first.applyActionSequence({ request_id: "rush-a", seed: 12, actions: rush });
    const runB = await second.applyActionSequence({ request_id: "rush-b", seed: 12, actions: rush });
    expect(runB.steps).toEqual(runA.steps);
    expect(runB.finalChecksum).toBe(runA.finalChecksum);
  });

  it("branches two legal strategies from one snapshot and exposes a different outcome", async () => {
    const kernel = new HuginnKernel(createRtsLabAdapter(), 12, noDelay);
    const snapshot = await kernel.createSnapshot();
    const rushRun = await kernel.applyActionSequence({
      request_id: "branch-rush",
      base_snapshot_id: snapshot.id,
      expected_base_checksum: snapshot.checksum,
      actions: rush,
    });
    const economyRun = await kernel.applyActionSequence({
      request_id: "branch-economy",
      base_snapshot_id: snapshot.id,
      expected_base_checksum: snapshot.checksum,
      actions: economy,
    });

    expect(rushRun.status).toBe("completed");
    expect(economyRun.status).toBe("completed");
    expect(economyRun.finalChecksum).not.toBe(rushRun.finalChecksum);
    expect(economyRun.metrics.enemy_damage).toBeGreaterThan(rushRun.metrics.enemy_damage);
    expect(economyRun.metrics.strategy_score).toBeGreaterThan(rushRun.metrics.strategy_score);

    await expect(
      kernel.applyActionSequence({
        request_id: "branch-stale-base",
        base_snapshot_id: snapshot.id,
        expected_base_checksum: "0".repeat(64),
        actions: [],
      }),
    ).rejects.toThrow("experiment base changed");
  });
});
