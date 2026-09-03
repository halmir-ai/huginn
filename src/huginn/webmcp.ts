import type { HuginnKernel } from "./kernel";
import type { Metrics, SequenceInput, ToolExecutionOptions } from "./types";

interface ModelContextTool {
  name: string;
  title?: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  execute: (input: Record<string, unknown>, options: ToolExecutionOptions) => Promise<unknown>;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
}

interface ModelContext {
  registerTool(tool: ModelContextTool, options?: { signal?: AbortSignal; exposedTo?: string[] }): Promise<void>;
}

declare global {
  interface Document {
    readonly modelContext?: ModelContext;
  }
}

const emptySchema = { type: "object", properties: {}, additionalProperties: false } as const;

export type ToolActivity =
  | { phase: "started"; name: string; input: Record<string, unknown> }
  | { phase: "completed"; name: string; input: Record<string, unknown>; result: unknown }
  | { phase: "failed"; name: string; input: Record<string, unknown>; error: string };

type ActivityObserver = (activity: ToolActivity) => void;

export function buildToolDefinitions<State, Action, Event, GameMetrics extends Metrics>(
  kernel: HuginnKernel<State, Action, Event, GameMetrics>,
  actionSchemas: Record<string, unknown>[],
  onActivity?: ActivityObserver,
): ModelContextTool[] {
  const readOnly = { readOnlyHint: true };
  const actionItems = actionSchemas.length === 1 ? actionSchemas[0] : { oneOf: actionSchemas };

  const definitions: ModelContextTool[] = [
    {
      name: "describe_game",
      title: "Describe game",
      description: "Explain this live game's rules, goals, metrics, action vocabulary, experiment limits, seed, checksum, and capabilities before planning a test.",
      inputSchema: emptySchema,
      execute: async () => kernel.describeGame(),
      annotations: readOnly,
    },
    {
      name: "get_game_state",
      title: "Get game state",
      description: "Return the current canonical simulation state and checksum as structured data; this reads live browser memory, not pixels.",
      inputSchema: emptySchema,
      execute: async () => kernel.getState(),
      annotations: readOnly,
    },
    {
      name: "get_metrics",
      title: "Get game metrics",
      description: "Return the current exposed playtest metrics and canonical state checksum. Call describe_game for metric semantics.",
      inputSchema: emptySchema,
      execute: async () => kernel.getMetrics(),
      annotations: readOnly,
    },
    {
      name: "list_legal_actions",
      title: "List legal actions",
      description: "Return only actions legal in the current live state, with the checksum they were computed against. Use this before mutating the game.",
      inputSchema: emptySchema,
      execute: async () => kernel.listLegalActions(),
      annotations: readOnly,
    },
    {
      name: "snapshot_game",
      title: "Snapshot game",
      description: "Store a bounded canonical snapshot of the live game in page memory so an experiment can be restored or branched.",
      inputSchema: emptySchema,
      execute: async () => kernel.createSnapshot(),
    },
    {
      name: "restore_game",
      title: "Restore game",
      description: "Verify and visibly restore a snapshot created on this page. Reject unknown, tampered, or stale snapshots.",
      inputSchema: {
        type: "object",
        properties: {
          snapshot_id: { type: "string", minLength: 1, maxLength: 128 },
          expected_checksum: { type: "string", pattern: "^[a-f0-9]{64}$" },
        },
        required: ["snapshot_id"],
        additionalProperties: false,
      },
      execute: async (input) => kernel.restoreSnapshot(input.snapshot_id as string, input.expected_checksum as string | undefined),
    },
    {
      name: "apply_action_sequence",
      title: "Run visible game experiment",
      description: "Apply up to 50 typed actions visibly and sequentially. Each action is checked against current legal actions; cancellation, stop conditions, and errors preserve and report the exact committed prefix.",
      inputSchema: {
        type: "object",
        properties: {
          request_id: { type: "string", pattern: "^[A-Za-z0-9._-]{1,64}$" },
          seed: { type: "integer", minimum: 0, maximum: 2147483647 },
          base_snapshot_id: { type: "string", minLength: 1, maxLength: 128 },
          expected_base_checksum: { type: "string", pattern: "^[a-f0-9]{64}$" },
          actions: { type: "array", maxItems: 50, items: actionItems },
          stop_when: {
            type: "object",
            properties: {
              metric: { type: "string", minLength: 1, maxLength: 64 },
              operator: { enum: ["eq", "gte", "lte"] },
              value: { type: "number" },
            },
            required: ["metric", "operator", "value"],
            additionalProperties: false,
          },
          speed: { enum: ["fast", "watch"] },
        },
        required: ["request_id", "actions"],
        additionalProperties: false,
      },
      execute: async (input, options) =>
        kernel.applyActionSequence(input as unknown as SequenceInput<Action>, options?.signal),
    },
  ];

  // The notebook observes actual tool executions. A display failure must never
  // change a committed simulation result or turn it into a failed tool call.
  const notify = (activity: ToolActivity) => {
    try {
      onActivity?.(structuredClone(activity));
    } catch (error) {
      console.error("WebMCP activity display failed", error);
    }
  };
  return definitions.map((definition) => ({
    ...definition,
    execute: async (input, options) => {
      notify({ phase: "started", name: definition.name, input });
      try {
        const result = await definition.execute(input, options);
        notify({ phase: "completed", name: definition.name, input, result });
        return result;
      } catch (error) {
        notify({ phase: "failed", name: definition.name, input, error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    },
  }));
}

export async function registerWebMcpTools<State, Action, Event, GameMetrics extends Metrics>(
  kernel: HuginnKernel<State, Action, Event, GameMetrics>,
  actionSchemas: Record<string, unknown>[],
  onActivity?: ActivityObserver,
): Promise<{ supported: boolean; toolNames: string[]; dispose: () => void }> {
  const context = document.modelContext;
  if (typeof context?.registerTool !== "function") return { supported: false, toolNames: [], dispose: () => {} };

  const controller = new AbortController();
  const definitions = buildToolDefinitions(kernel, actionSchemas, onActivity);
  try {
    for (const definition of definitions) {
      await context.registerTool(definition, { signal: controller.signal });
    }
  } catch (error) {
    controller.abort();
    throw error;
  }
  return {
    supported: true,
    toolNames: definitions.map((tool) => tool.name),
    dispose: () => controller.abort(),
  };
}
