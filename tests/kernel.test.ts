import { describe, expect, it } from "vitest";
import { canonicalJson } from "../src/huginn/canonical";
import { createRiverlandsAdapter, type RiverlandsAction } from "../src/demo/riverlands";
import { HuginnKernel } from "../src/huginn/kernel";
import type { SequenceInput } from "../src/huginn/types";

const actions: RiverlandsAction[] = [
  { type: "gather_wood" },
  { type: "gather_wood" },
  { type: "build_house" },
  { type: "gather_food" },
  { type: "grow_population" },
  { type: "end_turn" },
];

const noDelay = async () => {};

describe("canonical state", () => {
  it("sorts object keys recursively", () => {
    expect(canonicalJson({ z: 2, a: { y: 1, b: 0 } })).toBe(
      canonicalJson({ a: { b: 0, y: 1 }, z: 2 }),
    );
  });
});

describe("HuginnKernel", () => {
  it("rejects invalid stop conditions and extra fields before any mutation or render", async () => {
    let renders = 0;
    const kernel = new HuginnKernel(createRiverlandsAdapter(() => { renders += 1; }), 12, noDelay);
    const before = await kernel.getState();
    await expect(kernel.applyActionSequence({
      request_id: "invalid-stop", seed: 99, actions: [{ type: "gather_food" }],
      stop_when: { metric: "not_a_metric", operator: "gte", value: 1 },
    })).rejects.toThrow("Stop metric");
    expect(await kernel.getState()).toEqual(before);
    expect(renders).toBe(0);
    await expect(kernel.applyActionSequence({
      request_id: "extra-field", actions: [], surprise: true,
    } as unknown as SequenceInput<RiverlandsAction>)).rejects.toThrow("Unknown sequence field");
  });

  it("rejects a reused request ID with a different payload", async () => {
    const kernel = new HuginnKernel(createRiverlandsAdapter(), 12, noDelay);
    const first = await kernel.applyActionSequence({ request_id: "collision", actions: [{ type: "gather_food" }] });
    await expect(kernel.applyActionSequence({ request_id: "collision", actions: [{ type: "gather_wood" }] })).rejects.toThrow("different input");
    expect((await kernel.getState()).checksum).toBe(first.finalChecksum);
  });

  it("reports the committed step when a renderer fails, and permits rollback", async () => {
    const kernel = new HuginnKernel(createRiverlandsAdapter((_state, context) => {
      if (context.kind === "action") throw new Error("Canvas unavailable");
    }), 12, noDelay);
    const before = await kernel.getState();
    const result = await kernel.applyActionSequence({ request_id: "render-error", actions: [{ type: "gather_food" }, { type: "gather_wood" }] });
    expect(result).toMatchObject({ status: "error", stopReason: "render-or-schedule-failed", appliedSteps: 1 });
    expect(result.finalChecksum).toBe((await kernel.getState()).checksum);
    await kernel.restoreSnapshot(result.rollbackSnapshotId);
    expect(await kernel.getState()).toEqual(before);
  });

  it("restores a snapshot to an identical checksum and legal-action set", async () => {
    const kernel = new HuginnKernel(createRiverlandsAdapter(), 12, noDelay);
    const before = await kernel.listLegalActions();
    const snapshot = await kernel.createSnapshot();

    await kernel.applyActionSequence({ request_id: "mutate", actions: [{ type: "gather_food" }] });
    const restored = await kernel.restoreSnapshot(snapshot.id, snapshot.checksum);
    const after = await kernel.listLegalActions();

    expect(restored.checksum).toBe(snapshot.checksum);
    expect(after).toEqual(before);
  });

  it("restores the snapshot seed along with its serialized state", async () => {
    const kernel = new HuginnKernel(createRiverlandsAdapter(), 12, noDelay);
    const snapshot = await kernel.createSnapshot();

    await kernel.reset(99);
    await kernel.restoreSnapshot(snapshot.id, snapshot.checksum);

    expect((await kernel.describeGame()).current.seed).toBe(12);
  });

  it("restores the base snapshot seed before branching a sequence", async () => {
    const kernel = new HuginnKernel(createRiverlandsAdapter(), 12, noDelay);
    const snapshot = await kernel.createSnapshot();

    await kernel.reset(99);
    await kernel.applyActionSequence({
      request_id: "branch-seed",
      base_snapshot_id: snapshot.id,
      expected_base_checksum: snapshot.checksum,
      actions: [{ type: "gather_food" }],
    });

    expect((await kernel.describeGame()).current.seed).toBe(12);
  });

  it("replays the same seed and action sequence identically", async () => {
    const first = new HuginnKernel(createRiverlandsAdapter(), 99, noDelay);
    const second = new HuginnKernel(createRiverlandsAdapter(), 12, noDelay);

    const runA = await first.applyActionSequence({ request_id: "a", seed: 99, actions });
    const runB = await second.applyActionSequence({ request_id: "b", seed: 99, actions });

    expect(runB.steps.map(({ afterChecksum, events, metrics }) => ({ afterChecksum, events, metrics }))).toEqual(
      runA.steps.map(({ afterChecksum, events, metrics }) => ({ afterChecksum, events, metrics })),
    );
    expect(runB.finalChecksum).toBe(runA.finalChecksum);
  });

  it("stops before an illegal action and preserves the successful prefix", async () => {
    const kernel = new HuginnKernel(createRiverlandsAdapter(), 12, noDelay);
    const result = await kernel.applyActionSequence({
      request_id: "illegal-prefix",
      actions: [{ type: "gather_food" }, { type: "build_house" }, { type: "end_turn" }],
    });

    expect(result.status).toBe("error");
    expect(result.appliedSteps).toBe(1);
    expect(result.errorIndex).toBe(1);
    expect(result.stopReason).toBe("action-not-legal");
  });

  it("reports browser cancellation with the exact rendered prefix", async () => {
    const controller = new AbortController();
    let actionRenders = 0;
    const adapter = createRiverlandsAdapter((_state, context) => {
      if (context.kind === "action") {
        actionRenders += 1;
        controller.abort();
      }
    });
    const kernel = new HuginnKernel(adapter, 12, noDelay);

    const result = await kernel.applyActionSequence(
      { request_id: "cancelled", actions: [{ type: "gather_food" }, { type: "gather_wood" }] },
      controller.signal,
    );

    expect(result.status).toBe("cancelled");
    expect(result.appliedSteps).toBe(1);
    expect(actionRenders).toBe(1);
  });

  it("deduplicates a repeated request id without applying it twice", async () => {
    const kernel = new HuginnKernel(createRiverlandsAdapter(), 12, noDelay);
    const first = await kernel.applyActionSequence({ request_id: "same", actions: [{ type: "gather_food" }] });
    const second = await kernel.applyActionSequence({ request_id: "same", actions: [{ type: "gather_food" }] });

    expect(second).toEqual({ ...first, cached: true });
    expect((await kernel.getState()).checksum).toBe(first.finalChecksum);
  });
});
