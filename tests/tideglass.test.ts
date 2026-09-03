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
import baselineRaw from "./fixtures/tideglass/baseline.json?raw";
import browserBaselineRaw from "./fixtures/tideglass/browser-smoke.json?raw";
import refinement from "./fixtures/tideglass/refinement.json";
import currentKernel from "./fixtures/tideglass/current-kernel-node.json";

const noDelay = async () => {};
const fresh = (seed = 12) => new HuginnKernel(createTideglassAdapter(), seed, noDelay);
const fileSha256 = async (text: string) => Array.from(new Uint8Array(
  await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)),
), (byte) => byte.toString(16).padStart(2, "0")).join("");

afterEach(() => vi.unstubAllGlobals());

describe("Tideglass Relay refinement", () => {
  it("meets the explicitly new seed-12 reserve target at the unchanged horizon", async () => {
    const reference = await fresh().applyActionSequence({ request_id: "new-target-signal", seed: 12, actions: signalRoute });
    const contrast = await fresh().applyActionSequence({ request_id: "new-target-unassisted", seed: 12, actions: unassistedRoute });
    for (const run of [reference, contrast]) {
      expect(run.status).toBe("completed");
      expect(run.metrics).toMatchObject({ delivered: 3, watch: 8 });
    }
    expect(contrast.metrics.battery).toBeGreaterThanOrEqual(2);
    expect(reference.metrics.battery - contrast.metrics.battery).toBeGreaterThanOrEqual(3);
  });

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
      { ...initial, battery: 13 }, { ...initial, battery: NaN }, { ...initial, battery: 11 },
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
    expect(charged.battery).toBe(12); expect(waited.battery).toBe(moved.battery);
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

  it("preserves historical receipts as archival evidence, not current-build expectations", async () => {
    expect(await fileSha256(baselineRaw)).toBe("1ef389196d6eaf201529e53e91550408156cc1852582c6e23491f547fe2f730f");
    expect(await fileSha256(browserBaselineRaw)).toBe("0cba7c9bbe2568abf74d028fced1f7472850a15dab83a49e8a2c11e1ae9121fd");
    expect(baseline.rulesVersion).toBe("0.1.0-baseline");
    expect(baseline.snapshot.value.battery).toBe(10);
    expect(baseline.reference.metrics).toMatchObject({ delivered: 3, watch: 8, battery: 3, target_met: true });
    expect(baseline.contrast.metrics).toMatchObject({ delivered: 3, watch: 8, battery: 0, target_met: false });
    expect(await checksum(baseline.snapshot.value)).toBe(baseline.snapshot.checksum);
    expect(signalRoute).toEqual(baseline.plans.signalRoute);
    expect(unassistedRoute).toEqual(baseline.plans.unassistedRoute);
    for (const run of [baseline.reference, baseline.contrast]) {
      expect(run.steps[0].beforeChecksum).toBe(baseline.snapshot.checksum);
      for (let i = 1; i < run.steps.length; i++) expect(run.steps[i].beforeChecksum).toBe(run.steps[i - 1].afterChecksum);
      expect(run.steps.at(-1)?.afterChecksum).toBe(run.finalChecksum);
    }
    // Versioned snapshots deliberately reject cross-build restoration.
    expect(() => createTideglassAdapter().deserialize(baseline.snapshot.value)).toThrow("Incompatible");
  });

  it("validates current-kernel provenance and replays the preserved refinement without relabeling it", async () => {
    const kernel = fresh(); const snapshot = await kernel.createSnapshot();
    const reference = await kernel.applyActionSequence({ request_id: "refinement-signal", base_snapshot_id: snapshot.id, expected_base_checksum: snapshot.checksum, actions: signalRoute });
    const contrast = await kernel.applyActionSequence({ request_id: "refinement-unassisted", base_snapshot_id: snapshot.id, expected_base_checksum: snapshot.checksum, actions: unassistedRoute });
    expect(refinement.rulesVersion).toBe(TIDEGLASS_VERSION);
    expect(refinement.huginnBase).toBe(HUGINN_BASE);
    expect(refinement.sourceDigest).toBe("94adf84f610ce8a1c8f45445d91734985413dda1ef445474c4e6f240a989300c");
    expect(currentKernel.sourceDigest).toBe(await checksum({ adapter: adapterSource, kernel: kernelSource, webmcp: webMcpSource, canonical: canonicalSource }));
    expect(currentKernel.originalRefinementSourceDigest).toBe(refinement.sourceDigest);
    expect(currentKernel.snapshot).toEqual(snapshot);
    expect(refinement.sourceDigest).not.toBe(baseline.sourceDigest);
    expect(snapshot).toEqual(refinement.snapshot);
    expect(snapshot.checksum).not.toBe(baseline.snapshot.checksum);
    expect(refinement.plans).toEqual({ signalRoute, unassistedRoute });
    expect(reference).toEqual(refinement.reference);
    expect(contrast).toEqual(refinement.contrast);
    expect(reference.metrics).toMatchObject({ watch: 8, delivered: 3, battery: 5, target_met: true });
    expect(contrast.metrics).toMatchObject({ watch: 8, delivered: 3, battery: 2, target_met: true });
    expect(reference.metrics.battery - contrast.metrics.battery).toBe(3);
    expect(refinement.measured).toEqual({ batteryAdvantage: 3, newTargetMet: true });
    expect(refinement.revisionTargetDeclaredBeforeTuning).toEqual({ seed: 12, endingWatch: 8, unassistedDeliveries: 3, minimumUnassistedBattery: 2, minimumSignalBatteryAdvantage: 3 });
    expect(refinement.prediction).toEqual({ referenceBattery: 5, contrastBattery: 2, batteryAdvantage: 3 });
    for (const [index, actions] of [signalRoute, unassistedRoute].entries()) {
      const measured = [reference, contrast][index];
      const old = [baseline.reference, baseline.contrast][index];
      const expectedReplay = refinement.freshReplay[index];
      const replay = await fresh(77).applyActionSequence({ request_id: expectedReplay.requestId, seed: 12, actions });
      expect(replay.status).toBe("completed");
      expect(replay.cached).toBeUndefined();
      expect(replay.steps).toEqual(measured.steps);
      expect(replay.finalChecksum).toBe(measured.finalChecksum);
      const currentMeasurement = currentKernel.results[index];
      expect(currentMeasurement.run.steps).toEqual(measured.steps);
      expect(currentMeasurement.run.finalChecksum).toBe(measured.finalChecksum);
      expect(currentMeasurement.replay.steps).toEqual(measured.steps);
      expect(currentMeasurement.replay.finalChecksum).toBe(measured.finalChecksum);
      expect(expectedReplay).toEqual({ requestId: replay.requestId, constructorSeed: 77, resetSeed: 12, appliedSteps: 8, allStepRecordsEqual: true, finalChecksum: replay.finalChecksum });
      expect(measured.finalChecksum).not.toBe(old.finalChecksum);
      measured.steps.forEach((step, i) => {
        expect(step.action).toEqual(old.steps[i].action);
        expect(step.events).toEqual(old.steps[i].events);
        expect(step.metrics.battery).toBe(old.steps[i].metrics.battery + 2);
        const { battery: _newBattery, target_met: _newTarget, ...newMetrics } = step.metrics;
        const { battery: _oldBattery, target_met: _oldTarget, ...oldMetrics } = old.steps[i].metrics;
        expect(newMetrics).toEqual(oldMetrics);
      });
    }
  });
});
