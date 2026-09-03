import { afterEach, describe, expect, it, vi } from "vitest";
import { canonicalJson, checksum } from "../src/huginn/canonical";
import { HuginnKernel } from "../src/huginn/kernel";
import { buildToolDefinitions } from "../src/huginn/webmcp";
import {
  HUGINN_BASE, TIDEGLASS_VERSION, connectTideglassWebMcp, createTideglassAdapter, signalRoute, unassistedRoute,
  type TideglassAction,
} from "../src/demo/tideglass";
import adapterSource from "../src/demo/tideglass.ts?raw";
import kernelSource from "../src/huginn/kernel.ts?raw";
import webMcpSource from "../src/huginn/webmcp.ts?raw";
import canonicalSource from "../src/huginn/canonical.ts?raw";
import baseline from "./fixtures/tideglass/baseline.json";

const noDelay = async () => {};
const fresh = (seed = 12) => new HuginnKernel(createTideglassAdapter(), seed, noDelay);

afterEach(() => vi.unstubAllGlobals());

describe("Tideglass Relay baseline", () => {
  it("round-trips detached canonical state at every step, including seed zero", () => {
    const adapter = createTideglassAdapter();
    for (const seed of [0, 12, 2147483647]) {
      let state = adapter.initialState(seed);
      for (const action of signalRoute) {
        const before = canonicalJson(state);
        const copy = adapter.deserialize(adapter.serialize(state));
        expect(copy).toEqual(state);
        expect(copy.delivered).not.toBe(state.delivered);
        const transition = adapter.reduce(state, action);
        expect(canonicalJson(state)).toBe(before);
        state = transition.state;
      }
      expect(adapter.deserialize(adapter.serialize(state))).toEqual(state);
    }
  });

  it("rejects malformed, extra, missing, incompatible and inconsistent state", () => {
    const adapter = createTideglassAdapter();
    const initial = adapter.initialState(12);
    const invalid: unknown[] = [null, [], {}, { ...initial, extra: true }, { ...initial, version: "future" },
      { ...initial, format: "other" }, { ...initial, seed: -1 }, { ...initial, rng: 0 },
      { ...initial, rng: 13 }, { ...initial, watch: 9 }, { ...initial, watch: 0.5 },
      { ...initial, battery: 11 }, { ...initial, battery: NaN }, { ...initial, battery: 9 },
      { ...initial, station: "unknown" }, { ...initial, relay: "false" }, { ...initial, relay: true },
      { ...initial, delivered: [] }, { ...initial, delivered: { saltmill: true, lantern: false, breakwater: false } },
      { ...initial, delivered: { ...initial.delivered, unknown: false } },
      { ...initial, delivered: { saltmill: 1, lantern: false, breakwater: false } }];
    for (const value of invalid) expect(() => adapter.deserialize(value)).toThrow();
    const { rng: _rng, ...missing } = initial;
    expect(() => adapter.deserialize(missing)).toThrow();
    expect(() => adapter.initialState(2147483648)).toThrow();
  });

  it("filters adjacency, charging, battery, delivery, deployment and storm legality", () => {
    const adapter = createTideglassAdapter();
    let state = adapter.initialState(12);
    const actions = () => adapter.listLegalActions(state).map((entry) => entry.action);
    expect(actions()).toEqual([{ type: "sail", to: "relay_isle" }, { type: "wait" }]);
    state = adapter.reduce(state, signalRoute[0]).state;
    expect(actions()).toContainEqual({ type: "deploy_relay" });
    expect(actions()).toContainEqual({ type: "recharge" });
    expect(actions()).not.toContainEqual({ type: "deliver" });
    state = adapter.reduce(state, signalRoute[1]).state;
    expect(actions()).not.toContainEqual({ type: "deploy_relay" });
    state = adapter.reduce(state, signalRoute[2]).state;
    expect(actions()).toContainEqual({ type: "deliver" });
    expect(actions()).not.toContainEqual({ type: "recharge" });
    state = adapter.reduce(state, signalRoute[3]).state;
    expect(actions()).not.toContainEqual({ type: "deliver" });
    expect(adapter.listLegalActions({ ...state, battery: 0 }).map((entry) => entry.action)).toEqual([{ type: "wait" }]);
    for (const action of signalRoute.slice(4)) state = adapter.reduce(state, action).state;
    expect(actions()).toEqual([]);
    expect(() => adapter.reduce(state, { type: "wait" })).toThrow("Illegal");
  });

  it("does not accept action fields outside its closed schema", async () => {
    const invalid = { type: "sail", to: "relay_isle", extra: true } as TideglassAction;
    const adapter = createTideglassAdapter();
    expect(() => adapter.reduce(adapter.initialState(12), invalid)).toThrow("Illegal");
    const run = await fresh().applyActionSequence({ request_id: "extra-field", actions: [invalid] });
    expect(run).toMatchObject({ status: "error", appliedSteps: 0, errorIndex: 0 });
    const tools = buildToolDefinitions(fresh(), adapter.description.actions.map((action) => action.inputSchema));
    const schema = tools.find((tool) => tool.name === "apply_action_sequence")!.inputSchema as {
      properties: { actions: { items: { oneOf: { additionalProperties: boolean; properties: { type: { const: string }; to?: { enum: string[] } } }[] } } };
    };
    expect(schema.properties.actions.items.oneOf).toHaveLength(5);
    expect(new Set(schema.properties.actions.items.oneOf.map((entry) => entry.properties.type.const)).size).toBe(5);
    expect(schema.properties.actions.items.oneOf.every((entry) => entry.additionalProperties === false)).toBe(true);
    expect(schema.properties.actions.items.oneOf[0].properties.to?.enum).toHaveLength(5);
  });

  it("preserves the exact invalid prefix and restores the original checksum", async () => {
    const kernel = fresh();
    const before = await kernel.getState();
    const run = await kernel.applyActionSequence({ request_id: "invalid-prefix", actions: [
      { type: "sail", to: "relay_isle" }, { type: "deliver" }, { type: "sail", to: "saltmill" },
    ] });
    expect(run).toMatchObject({ status: "error", appliedSteps: 1, errorIndex: 1, stopReason: "action-not-legal", metrics: { watch: 1, delivered: 0 } });
    expect((await kernel.getState()).checksum).toBe(run.steps[0].afterChecksum);
    await kernel.restoreSnapshot(run.rollbackSnapshotId, before.checksum);
    expect(await kernel.getState()).toEqual(before);
  });

  it("replays seed 12 on a fresh kernel with every step record equal", async () => {
    for (const actions of [signalRoute, unassistedRoute]) {
      const a = await fresh().applyActionSequence({ request_id: "fresh-a", seed: 12, actions });
      const b = await fresh(77).applyActionSequence({ request_id: "fresh-b", seed: 12, actions });
      expect(a.status).toBe("completed"); expect(b.status).toBe("completed");
      expect(a.appliedSteps).toBe(8); expect(b.steps).toEqual(a.steps); expect(b.finalChecksum).toBe(a.finalChecksum);
      expect(b.cached).toBeUndefined();
    }
  });

  it("branches equal-watch plans from one verified snapshot and rejects a stale receipt", async () => {
    const kernel = fresh(); const base = await kernel.createSnapshot();
    const a = await kernel.applyActionSequence({ request_id: "branch-a", base_snapshot_id: base.id, expected_base_checksum: base.checksum, actions: signalRoute });
    const b = await kernel.applyActionSequence({ request_id: "branch-b", base_snapshot_id: base.id, expected_base_checksum: base.checksum, actions: unassistedRoute });
    expect(a.status).toBe("completed"); expect(b.status).toBe("completed");
    expect(a.steps[0].beforeChecksum).toBe(base.checksum); expect(b.steps[0].beforeChecksum).toBe(base.checksum);
    expect(a.metrics.watch).toBe(8); expect(b.metrics.watch).toBe(8);
    expect(a.finalChecksum).not.toBe(b.finalChecksum);
    await expect(kernel.restoreSnapshot(base.id, "0".repeat(64))).rejects.toThrow("stale or incorrect");
    await kernel.restoreSnapshot(base.id, base.checksum);
    expect(await kernel.getState()).toEqual({ state: base.value, checksum: base.checksum });
  });

  it("renders each committed watch and stops cancellation at its actual prefix", async () => {
    const visible: number[] = [];
    const controller = new AbortController();
    const adapter = createTideglassAdapter((state, context) => { if (context.kind === "action") visible.push(state.watch); });
    const kernel = new HuginnKernel(adapter, 12, async () => { if (visible.length === 3) controller.abort(); });
    const run = await kernel.applyActionSequence({ request_id: "cancel", actions: signalRoute, speed: "watch" }, controller.signal);
    expect(visible).toEqual([1, 2, 3]); expect(run).toMatchObject({ status: "cancelled", appliedSteps: 3, metrics: { watch: 3 } });
    expect(run.finalChecksum).toBe(run.steps[2].afterChecksum);
  });

  it("caps charging and advances RNG once for charging and waiting too", () => {
    const adapter = createTideglassAdapter();
    const moved = adapter.reduce(adapter.initialState(12), { type: "sail", to: "relay_isle" }).state;
    const charged = adapter.reduce(moved, { type: "recharge" }).state;
    const waited = adapter.reduce(moved, { type: "wait" }).state;
    expect(charged.battery).toBe(10); expect(waited.battery).toBe(moved.battery);
    expect(charged.rng).toBe(waited.rng); expect(charged.watch).toBe(2);
    expect(adapter.deserialize(charged)).toEqual(charged);
  });

  it("skips registration entirely in off mode and registers seven real definitions in on mode", async () => {
    const registerTool = vi.fn(async () => {});
    let reads = 0;
    vi.stubGlobal("document", { get modelContext() { reads++; return { registerTool }; } });
    const kernel = fresh(); const base = await kernel.getState();
    const off = await connectTideglassWebMcp(kernel, "?webmcp=off");
    expect(off).toMatchObject({ disabled: true, supported: false, toolNames: [] });
    expect(reads).toBe(0); expect(registerTool).not.toHaveBeenCalled();
    expect(await kernel.getState()).toEqual(base);
    const on = await connectTideglassWebMcp(kernel, "");
    expect(on.supported).toBe(true); expect(registerTool).toHaveBeenCalledTimes(7);
    expect(on.toolNames).toEqual(["describe_game", "get_game_state", "get_metrics", "list_legal_actions", "snapshot_game", "restore_game", "apply_action_sequence"]);
    // This is a registration unit test, not a real browser WebMCP-call claim.
    expect(await kernel.getState()).toEqual(base);
  });

  it("handles unavailable WebMCP without changing the game", async () => {
    vi.stubGlobal("document", {});
    expect(await connectTideglassWebMcp(fresh(), "")).toMatchObject({ disabled: false, supported: false, toolNames: [] });
  });

  it("records the measured baseline and its fresh-kernel replay evidence", async () => {
    const kernel = fresh(); const snapshot = await kernel.createSnapshot();
    const reference = await kernel.applyActionSequence({ request_id: "baseline-signal", base_snapshot_id: snapshot.id, expected_base_checksum: snapshot.checksum, actions: signalRoute });
    const contrast = await kernel.applyActionSequence({ request_id: "baseline-unassisted", base_snapshot_id: snapshot.id, expected_base_checksum: snapshot.checksum, actions: unassistedRoute });
    const replay = await fresh(77).applyActionSequence({ request_id: "baseline-fresh-replay", seed: 12, actions: signalRoute });
    const receipt = {
      evidenceSource: "Node/Vitest with real HuginnKernel; not a browser WebMCP call",
      rulesVersion: TIDEGLASS_VERSION, huginnBase: HUGINN_BASE,
      sourceDigest: await checksum({ adapter: adapterSource, kernel: kernelSource, webmcp: webMcpSource, canonical: canonicalSource }),
      targetDeclaredBeforeMeasurement: { delivered: 3, maxWatch: 8, minimumBattery: 2 },
      snapshot, plans: { signalRoute, unassistedRoute }, reference, contrast,
      freshReplay: { requestId: replay.requestId, constructorSeed: 77, resetSeed: 12, appliedSteps: replay.appliedSteps,
        allStepRecordsEqual: canonicalJson(replay.steps) === canonicalJson(reference.steps), finalChecksum: replay.finalChecksum },
    };
    expect(reference.status).toBe("completed"); expect(contrast.status).toBe("completed");
    expect(reference.metrics).toMatchObject({ watch: 8, delivered: 3, target_met: true });
    expect(contrast.metrics.watch).toBe(8);
    expect(receipt.freshReplay.allStepRecordsEqual).toBe(true);
    expect(receipt).toEqual(baseline);
  });
});
