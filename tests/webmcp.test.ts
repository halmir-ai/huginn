import { describe, expect, it } from "vitest";
import { createRiverlandsAdapter, riverlandsDescription } from "../src/demo/riverlands";
import { HuginnKernel } from "../src/huginn/kernel";
import { buildToolDefinitions } from "../src/huginn/webmcp";

describe("WebMCP contract", () => {
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
