import { describe, expect, it, vi } from "vitest";
import { createRiverlandsAdapter, riverlandsDescription } from "../src/demo/riverlands";
import { HuginnKernel } from "../src/huginn/kernel";
import { buildToolDefinitions, registerWebMcpTools, type ToolActivity } from "../src/huginn/webmcp";
import { createRtsLabAdapter, rtsLabDescription } from "../src/demo/rts-lab";

describe("WebMCP contract", () => {
  it("cleans up partial registration and detects the actual method", async () => {
    const kernel = new HuginnKernel(createRiverlandsAdapter(), 12, async () => {});
    let signal: AbortSignal | undefined;
    let count = 0;
    vi.stubGlobal("document", { modelContext: { registerTool: async (_tool: unknown, options: { signal: AbortSignal }) => {
      signal = options.signal;
      count += 1;
      if (count === 2) throw new Error("Registration denied");
    } } });
    try {
      await expect(registerWebMcpTools(kernel, [])).rejects.toThrow("Registration denied");
      expect(signal?.aborted).toBe(true);
      vi.stubGlobal("document", { modelContext: {} });
      expect((await registerWebMcpTools(kernel, [])).supported).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("reports actual external tool lifecycle and preserves results when observers fail", async () => {
    const kernel = new HuginnKernel(createRtsLabAdapter(), 12, async () => {});
    const activity: ToolActivity[] = [];
    const tools = buildToolDefinitions(kernel, rtsLabDescription.actions.map((action) => action.inputSchema), (event) => {
      activity.push(event);
      if (event.phase === "completed") throw new Error("Display failure");
    });
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const result = await tools.find((tool) => tool.name === "apply_action_sequence")!.execute({
        request_id: "external-test",
        actions: [{ type: "build_barracks" }],
      }, { signal: new AbortController().signal });
      expect(result).toMatchObject({ status: "completed", appliedSteps: 1 });
      expect(activity.map((event) => event.phase)).toEqual(["started", "completed"]);
      expect(await kernel.getState()).toMatchObject({ state: { barracksBuilt: true } });
      expect(logged).toHaveBeenCalledOnce();
    } finally {
      logged.mockRestore();
    }
  });

  it("reports rejected restores without announcing completion", async () => {
    const kernel = new HuginnKernel(createRtsLabAdapter(), 12, async () => {});
    const activity: ToolActivity[] = [];
    const restore = buildToolDefinitions(kernel, [], (event) => activity.push(event)).find((tool) => tool.name === "restore_game")!;
    await expect(restore.execute({ snapshot_id: "missing" }, { signal: new AbortController().signal })).rejects.toThrow("Unknown snapshot");
    expect(activity.map((event) => event.phase)).toEqual(["started", "failed"]);
  });

  it("does not allow the observer to mutate the input or authoritative result", async () => {
    const kernel = new HuginnKernel(createRtsLabAdapter(), 12, async () => {});
    const tool = buildToolDefinitions(kernel, [], (event) => {
      event.input.request_id = "corrupted";
      if (event.phase === "completed") (event.result as { appliedSteps: number }).appliedSteps = 999;
    }).find((definition) => definition.name === "apply_action_sequence")!;
    const result = await tool.execute({ request_id: "unchanged", actions: [{ type: "build_barracks" }] }, { signal: new AbortController().signal });
    expect(result).toMatchObject({ requestId: "unchanged", appliedSteps: 1 });
  });

  it("exposes the bounded hero tool and marks inspection tools read-only", () => {
    const kernel = new HuginnKernel(createRiverlandsAdapter(), 12, async () => {});
    const tools = buildToolDefinitions(
      kernel,
      riverlandsDescription.actions.map((action) => action.inputSchema),
    );

    expect(tools.map((tool) => tool.name)).toEqual([
      "describe_game",
      "get_game_state",
      "get_metrics",
      "list_legal_actions",
      "snapshot_game",
      "restore_game",
      "apply_action_sequence",
    ]);
    expect(tools.filter((tool) => tool.annotations?.readOnlyHint).map((tool) => tool.name)).toEqual([
      "describe_game",
      "get_game_state",
      "get_metrics",
      "list_legal_actions",
    ]);

    const sequence = tools.find((tool) => tool.name === "apply_action_sequence")!;
    const schema = sequence.inputSchema as {
      properties: { actions: { maxItems: number } };
      additionalProperties: boolean;
    };
    expect(schema.properties.actions.maxItems).toBe(50);
    expect(schema.additionalProperties).toBe(false);
  });
});
