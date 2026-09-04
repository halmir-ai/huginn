import { describe, expect, it } from "vitest";
import { createRiverlandsAdapter, riverlandsDescription, type RiverlandsAction } from "../src/demo/riverlands";
import { HuginnKernel } from "../src/huginn/kernel";
import { createRegressionScenario, sequenceInputFromScenario } from "../src/huginn/scenario";
import type { SequenceInput } from "../src/huginn/types";

const noDelay = async () => {};

describe("semantic regression expectations", () => {
  it("returns an explicit passed or failed verdict from final metrics", async () => {
    const kernel = new HuginnKernel(createRiverlandsAdapter(), 12, noDelay);
    const passed = await kernel.applyActionSequence({
      request_id: "expect-pass", seed: 12, actions: [{ type: "gather_food" }],
      expect: [{ metric: "food", operator: "gte", value: 9 }, { metric: "wellbeing", operator: "eq", value: 80 }],
    });
    expect(passed).toMatchObject({ verdict: "passed", checks: [
      { metric: "food", operator: "gte", expected: 9, actual: passed.metrics.food, passed: true },
      { metric: "wellbeing", operator: "eq", expected: 80, actual: 80, passed: true },
    ] });

    const failed = await kernel.applyActionSequence({
      request_id: "expect-fail", seed: 12, actions: [],
      expect: [{ metric: "food", operator: "lte", value: 6 }],
    });
    expect(failed).toMatchObject({ verdict: "failed", checks: [{ actual: 7, passed: false }] });

    await expect(kernel.applyActionSequence({
      request_id: "expect-pass", seed: 12, actions: [{ type: "gather_food" }],
      expect: [{ metric: "food", operator: "lte", value: 9 }],
    })).rejects.toThrow("different input");
  });

  it("uses not-requested without expectations and inconclusive for cancelled execution", async () => {
    const kernel = new HuginnKernel(createRiverlandsAdapter(), 12, noDelay);
    expect(await kernel.applyActionSequence({ request_id: "no-expect", actions: [] })).toMatchObject({ verdict: "not-requested", checks: [] });

    const controller = new AbortController();
    controller.abort();
    const cancelled = await kernel.applyActionSequence({
      request_id: "expect-cancel", actions: [{ type: "gather_food" }],
      expect: [{ metric: "food", operator: "gte", value: 7 }],
    }, controller.signal);
    expect(cancelled).toMatchObject({ status: "cancelled", verdict: "inconclusive", checks: [{ passed: true }] });
  });

  it("evaluates stopped sequences and advertises the bounded capability", async () => {
    const kernel = new HuginnKernel(createRiverlandsAdapter(), 12, noDelay);
    const stopped = await kernel.applyActionSequence({
      request_id: "expect-stopped", seed: 12, actions: [{ type: "gather_food" }, { type: "gather_food" }],
      stop_when: { metric: "food", operator: "gte", value: 9 },
      expect: [{ metric: "food", operator: "gte", value: 9 }],
    });
    expect(stopped).toMatchObject({ status: "stopped", verdict: "passed", appliedSteps: 1 });
    expect((await kernel.describeGame()).capabilities).toMatchObject({
      semanticExpectations: true,
      maxExpectationsPerSequence: 12,
    });
  });

  it("rejects malformed expectations before mutation or rendering", async () => {
    let renders = 0;
    const kernel = new HuginnKernel(createRiverlandsAdapter(() => { renders += 1; }), 12, noDelay);
    const before = await kernel.getState();
    const invalid = [
      [{ metric: "missing", operator: "eq", value: 1 }],
      [{ metric: "food", operator: "gte", value: "7" }],
      [{ metric: "food", operator: "eq", value: true }],
      [{ metric: "food", operator: "eq", value: 7, extra: true }],
      Array.from({ length: 13 }, () => ({ metric: "food", operator: "eq" as const, value: 7 })),
    ];
    for (const expectInput of invalid) {
      await expect(kernel.applyActionSequence({ request_id: `invalid-${renders}-${expectInput.length}`, actions: [{ type: "gather_food" }], expect: expectInput } as unknown as SequenceInput<RiverlandsAction>)).rejects.toThrow();
    }
    expect(await kernel.getState()).toEqual(before);
    expect(renders).toBe(0);
  });
});

describe("portable regression scenarios", () => {
  it("preserves only seeded portable regression input", () => {
    const input: SequenceInput<RiverlandsAction> = {
      request_id: "portable", seed: 12, speed: "watch", actions: [{ type: "gather_food" }],
      stop_when: { metric: "food", operator: "gte", value: 9 },
      expect: [{ metric: "food", operator: "gte", value: 9 }],
    };
    const scenario = createRegressionScenario(riverlandsDescription, input, "Food check", "Stable replay");
    expect(scenario).toMatchObject({
      format: "huginn/regression-v1", id: "regression-huginn-riverlands-fixture-portable", title: "Food check", description: "Stable replay",
      game: { id: riverlandsDescription.id, title: riverlandsDescription.title, version: riverlandsDescription.version },
      input: { seed: 12, actions: input.actions, stop_when: input.stop_when, expect: input.expect },
    });
    expect(scenario?.input).not.toHaveProperty("request_id");
    expect(sequenceInputFromScenario(scenario!, "replay")).toEqual({
      request_id: "replay", speed: "fast", seed: 12, actions: input.actions, stop_when: input.stop_when, expect: input.expect,
    });
    expect(createRegressionScenario(riverlandsDescription, { ...input, request_id: "not safe!" })).toBeNull();
    expect(createRegressionScenario(riverlandsDescription, { ...input, seed: undefined })).toBeNull();
    expect(createRegressionScenario(riverlandsDescription, { ...input, expect: [] })).toBeNull();
  });
});
