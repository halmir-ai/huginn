import { describe, expect, it, vi } from "vitest";
import { createRiverlandsAdapter, riverlandsDescription } from "../src/demo/riverlands";
import { HuginnKernel } from "../src/huginn/kernel";
import { buildToolDefinitions, registerWebMcpTools, type GameFrameCapture, type ToolActivity } from "../src/webmcp";

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
    const kernel = new HuginnKernel(createRiverlandsAdapter(), 12, async () => {});
    const activity: ToolActivity[] = [];
    const tools = buildToolDefinitions(kernel, riverlandsDescription.actions.map((action) => action.inputSchema), (event) => {
      activity.push(event);
      if (event.phase === "completed") throw new Error("Display failure");
    });
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const result = await tools.find((tool) => tool.name === "apply_action_sequence")!.execute({
        request_id: "external-test",
        actions: [{ type: "gather_food" }],
        expect: [{ metric: "food", operator: "gte", value: 9 }],
      }, { signal: new AbortController().signal });
      expect(result).toMatchObject({ status: "completed", appliedSteps: 1, verdict: "passed", checks: [{ passed: true }] });
      expect(activity.map((event) => event.phase)).toEqual(["started", "completed"]);
      expect(await kernel.getState()).toMatchObject({ state: { food: 9 } });
      expect(logged).toHaveBeenCalledOnce();
    } finally {
      logged.mockRestore();
    }
  });

  it("lets a host serialize every mutating tool without coupling the debugger to modelContext", async () => {
    const kernel = new HuginnKernel(createRiverlandsAdapter(), 12, async () => {});
    const registered: { name: string; execute: (input: Record<string, unknown>, options: { signal: AbortSignal }) => Promise<unknown> }[] = [];
    const order: string[] = [];
    vi.stubGlobal("document", { modelContext: { registerTool: async (tool: typeof registered[number]) => { registered.push(tool); } } });
    try {
      const registration = await registerWebMcpTools(
        kernel,
        riverlandsDescription.actions.map((action) => action.inputSchema),
        undefined,
        { runMutation: async (operation) => { order.push("lock"); const result = await operation(); order.push("unlock"); return result; } },
      );
      const read = registered.find((tool) => tool.name === "get_metrics")!;
      const mutate = registered.find((tool) => tool.name === "apply_action_sequence")!;
      await read.execute({}, { signal: new AbortController().signal });
      expect(order).toEqual([]);
      await mutate.execute({ request_id: "serialized", actions: [{ type: "gather" }] }, { signal: new AbortController().signal });
      expect(order).toEqual(["lock", "unlock"]);
      registration.dispose();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("captures a bounded visible frame paired to the exact live state checksum", async () => {
    const kernel = new HuginnKernel(createRiverlandsAdapter(), 12, async () => {});
    const frame: GameFrameCapture = {
      captureId: "capture-1",
      imageChecksum: "a".repeat(64),
      width: 960,
      height: 540,
      mimeType: "image/png",
      bytes: 12_345,
      previewVisible: true,
    };
    const captureFrame = vi.fn(async () => frame);
    const capture = buildToolDefinitions(kernel, [], undefined, captureFrame)
      .find((tool) => tool.name === "capture_game")!;

    await expect(capture.execute({}, { signal: new AbortController().signal })).resolves.toEqual({
      ...frame,
      stateChecksum: (await kernel.getState()).checksum,
    });
    expect(captureFrame).toHaveBeenCalledOnce();
    expect(capture.annotations?.readOnlyHint).not.toBe(true);
  });

  it("rejects frame evidence when canonical state changes while the renderer settles", async () => {
    const kernel = new HuginnKernel(createRiverlandsAdapter(), 12, async () => {});
    const capture = buildToolDefinitions(kernel, [], undefined, async () => {
      await kernel.reset(13);
      return {
        captureId: "capture-raced",
        imageChecksum: "d".repeat(64),
        width: 960,
        height: 540,
        mimeType: "image/png",
        bytes: 12_345,
        previewVisible: true,
      };
    }).find((tool) => tool.name === "capture_game")!;

    await expect(capture.execute({}, { signal: new AbortController().signal }))
      .rejects.toThrow("state changed during frame capture");
  });

  it("requires a host mutation boundary before registering visual capture", async () => {
    const kernel = new HuginnKernel(createRiverlandsAdapter(), 12, async () => {});
    vi.stubGlobal("document", { modelContext: { registerTool: vi.fn() } });
    try {
      await expect(registerWebMcpTools(kernel, [], undefined, {
        captureFrame: async () => ({
          captureId: "capture-unlocked",
          imageChecksum: "c".repeat(64),
          width: 1,
          height: 1,
          mimeType: "image/png",
          bytes: 1,
          previewVisible: true,
        }),
      })).rejects.toThrow("requires runMutation");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("serializes capture with game mutations and rejects invalid frame evidence", async () => {
    const kernel = new HuginnKernel(createRiverlandsAdapter(), 12, async () => {});
    const registered: { name: string; execute: (input: Record<string, unknown>, options: { signal: AbortSignal }) => Promise<unknown> }[] = [];
    const order: string[] = [];
    vi.stubGlobal("document", { modelContext: { registerTool: async (tool: typeof registered[number]) => { registered.push(tool); } } });
    try {
      await registerWebMcpTools(kernel, [], undefined, {
        captureFrame: async () => ({
          captureId: "capture-invalid",
          imageChecksum: "not-a-checksum",
          width: 1,
          height: 1,
          mimeType: "image/png",
          bytes: 1,
          previewVisible: true,
        }),
        runMutation: async (operation) => {
          order.push("lock");
          try { return await operation(); } finally { order.push("unlock"); }
        },
      });
      const capture = registered.find((tool) => tool.name === "capture_game")!;
      await expect(capture.execute({}, { signal: new AbortController().signal })).rejects.toThrow("image checksum");
      expect(order).toEqual(["lock", "unlock"]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("reports rejected restores without announcing completion", async () => {
    const kernel = new HuginnKernel(createRiverlandsAdapter(), 12, async () => {});
    const activity: ToolActivity[] = [];
    const restore = buildToolDefinitions(kernel, [], (event) => activity.push(event)).find((tool) => tool.name === "restore_game")!;
    await expect(restore.execute({ snapshot_id: "missing" }, { signal: new AbortController().signal })).rejects.toThrow("Unknown snapshot");
    expect(activity.map((event) => event.phase)).toEqual(["started", "failed"]);
  });

  it("does not allow the observer to mutate the input or authoritative result", async () => {
    const kernel = new HuginnKernel(createRiverlandsAdapter(), 12, async () => {});
    const tool = buildToolDefinitions(kernel, [], (event) => {
      event.input.request_id = "corrupted";
      if (event.phase === "completed") (event.result as { appliedSteps: number }).appliedSteps = 999;
    }).find((definition) => definition.name === "apply_action_sequence")!;
    const result = await tool.execute({ request_id: "unchanged", actions: [{ type: "gather_food" }] }, { signal: new AbortController().signal });
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
      properties: { setup_id: { pattern: string }; actions: { maxItems: number }; expect: { maxItems: number; items: { additionalProperties: boolean } } };
      additionalProperties: boolean;
    };
    expect(schema.properties.setup_id.pattern).toBe("^[A-Za-z0-9._-]{1,64}$");
    expect(schema.properties.actions.maxItems).toBe(50);
    expect(schema.properties.expect.maxItems).toBe(12);
    expect(schema.properties.expect.items.additionalProperties).toBe(false);
    expect(schema.additionalProperties).toBe(false);
    expect(sequence.description).toContain("named setup");
    expect(sequence.description).toContain("semantic verdict");

    const withCapture = buildToolDefinitions(kernel, [], undefined, async () => ({
      captureId: "capture-2",
      imageChecksum: "b".repeat(64),
      width: 640,
      height: 360,
      mimeType: "image/png",
      bytes: 8_192,
      previewVisible: true,
    }));
    expect(withCapture.map((tool) => tool.name)).toContain("capture_game");
  });
});
