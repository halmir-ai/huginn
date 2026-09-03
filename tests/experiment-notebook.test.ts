import { describe, expect, it } from "vitest";
import { compareRuns, economyActions, rushActions, type RunReceipt } from "../src/demo/experiment-notebook";
import { createRtsLabAdapter } from "../src/demo/rts-lab";
import { HuginnKernel } from "../src/huginn/kernel";

async function runPair() {
  const kernel = new HuginnKernel(createRtsLabAdapter(), 12, async () => {});
  const base = await kernel.createSnapshot();
  const run = async (id: string, actions = rushActions): Promise<RunReceipt> => ({
    source: "WebMCP", label: id, freshExecution: true,
    result: await kernel.applyActionSequence({ request_id: id, base_snapshot_id: base.id, expected_base_checksum: base.checksum, actions }),
  });
  return { base, run };
}

describe("experiment notebook evidence", () => {
  it("compares equal-cycle plans from the same verified base without declaring a winner", async () => {
    const { base, run } = await runPair();
    const a = await run("rush");
    const b = await run("economy", economyActions);
    expect(a.result.steps[0].beforeChecksum).toBe(base.checksum);
    expect(b.result.steps[0].beforeChecksum).toBe(base.checksum);
    expect(a.result.metrics.cycle).toBe(3);
    expect(b.result.metrics.cycle).toBe(3);
    expect(compareRuns(a, b)).toMatchObject({ kind: "comparison" });
    expect(compareRuns(a, b).detail).toContain("not proof of a dominant strategy");
  });

  it("requires fresh matching per-step evidence for replay, not just an end hash", async () => {
    const { run } = await runPair();
    const a = await run("rush-a");
    const b = await run("rush-b");
    expect(compareRuns(a, b).kind).toBe("replay");
    expect(compareRuns(a, { ...b, freshExecution: false }).kind).toBe("cached");
    expect(compareRuns(a, a).kind).toBe("cached");
    b.result.steps[0].metrics.heartwood += 1;
    expect(compareRuns(a, b).kind).toBe("diverged");
  });

  it("refuses incomplete, unequal-horizon, and different-base comparisons", async () => {
    const { run } = await runPair();
    const a = await run("rush");
    const b = await run("economy", economyActions);
    b.result.metrics.cycle = 4;
    expect(compareRuns(a, b).kind).toBe("different-horizon");
    b.result.steps[0].beforeChecksum = "different";
    expect(compareRuns(a, b).kind).toBe("different-base");
    b.result.status = "cancelled";
    expect(compareRuns(a, b).kind).toBe("incomplete");
  });
});
