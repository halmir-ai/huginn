import { HuginnKernel, type HuginnScheduler } from "../huginn/kernel";
import type { GameAdapter, Metrics, SequenceInput, ToolExecutionOptions } from "../huginn/types";

export interface ModelContextTool {
  name: string;
  title?: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  execute: (input: Record<string, unknown>, options: ToolExecutionOptions) => Promise<unknown>;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
}

export interface ModelContext {
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

export type ActivityObserver = (activity: ToolActivity) => void;

/** Compact evidence for a frame that is rendered visibly by the host page. */
export interface GameFrameCapture {
  captureId: string;
  imageChecksum: string;
  width: number;
  height: number;
  mimeType: "image/png";
  bytes: number;
  previewVisible: true;
}

/**
 * Capture the renderer only after it has painted the frozen canonical state.
 * The WebMCP wrapper rejects the result if that state changes before return.
 */
export type FrameCapture = () => Promise<GameFrameCapture>;

export interface ConnectHuginnWebMcpOptions {
  initialSeed?: number;
  schedule?: HuginnScheduler;
  onActivity?: ActivityObserver;
  runMutation?: MutationRunner;
  captureFrame?: FrameCapture;
}

export type MutationRunner = (operation: () => Promise<unknown>) => Promise<unknown>;

export interface RegisterWebMcpOptions {
  runMutation?: MutationRunner;
  captureFrame?: FrameCapture;
}

function validateFrameCapture(value: GameFrameCapture): GameFrameCapture {
  if (!value || typeof value !== "object") throw new Error("Frame capture did not return metadata");
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(value.captureId)) throw new Error("Frame capture returned an invalid capture ID");
  if (!/^[a-f0-9]{64}$/.test(value.imageChecksum)) throw new Error("Frame capture returned an invalid image checksum");
  if (!Number.isInteger(value.width) || value.width < 1 || value.width > 8192) throw new Error("Frame capture width is outside the supported range");
  if (!Number.isInteger(value.height) || value.height < 1 || value.height > 8192) throw new Error("Frame capture height is outside the supported range");
  if (value.mimeType !== "image/png") throw new Error("Frame capture must use image/png");
  if (!Number.isInteger(value.bytes) || value.bytes < 1 || value.bytes > 8 * 1024 * 1024) throw new Error("Frame capture is outside the 8 MiB limit");
  if (value.previewVisible !== true) throw new Error("Frame capture must be shown visibly on the page");
  return structuredClone(value);
}

export function buildToolDefinitions<State, Action, Event, GameMetrics extends Metrics>(
  kernel: HuginnKernel<State, Action, Event, GameMetrics>,
  actionSchemas: Record<string, unknown>[],
  onActivity?: ActivityObserver,
  captureFrame?: FrameCapture,
): ModelContextTool[] {
  const readOnly = { readOnlyHint: true };
  const actionItems = actionSchemas.length === 1 ? actionSchemas[0] : { oneOf: actionSchemas };

  const definitions: ModelContextTool[] = [
    {
      name: "describe_game",
      title: "Describe game",
      description: "Explain this live game's rules, goals, metrics, action vocabulary, curated named setups, experiment limits, seed, checksum, and capabilities before planning a test.",
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
      description: "Store a canonical snapshot of the live game in page memory. The latest explicit checkpoint is protected from automatic rollback eviction; older snapshots share a bounded 12-entry store.",
      inputSchema: emptySchema,
      execute: async () => kernel.createSnapshot(),
    },
    ...(captureFrame ? [{
      name: "capture_game",
      title: "Capture visible game frame",
      description: "Capture the live game canvas as a bounded PNG, show that frame visibly in the page debugger, and return compact image metadata paired with the exact canonical state checksum. This is visual evidence, not a restorable state snapshot.",
      inputSchema: emptySchema,
      execute: async () => {
        const before = await kernel.getState();
        const frame = validateFrameCapture(await captureFrame());
        const after = await kernel.getState();
        if (before.checksum !== after.checksum) {
          throw new Error("Canonical game state changed during frame capture; discard the visual evidence and retry");
        }
        return { ...frame, stateChecksum: after.checksum };
      },
    } satisfies ModelContextTool] : []),
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
      description: "Optionally begin from a curated named setup, then apply up to 50 typed actions visibly and sequentially. Each action is checked against current legal actions; cancellation, stop conditions, and errors preserve and report the exact committed prefix. Optional semantic expectations return an explicit semantic verdict.",
      inputSchema: {
        type: "object",
        properties: {
          request_id: { type: "string", pattern: "^[A-Za-z0-9._-]{1,64}$" },
          setup_id: { type: "string", pattern: "^[A-Za-z0-9._-]{1,64}$" },
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
          expect: {
            type: "array",
            maxItems: 12,
            items: {
              type: "object",
              properties: {
                metric: { type: "string", minLength: 1, maxLength: 64 },
                operator: { enum: ["eq", "gte", "lte"] },
                value: { type: ["number", "string", "boolean"] },
              },
              required: ["metric", "operator", "value"],
              additionalProperties: false,
            },
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
  options: RegisterWebMcpOptions = {},
): Promise<{ supported: boolean; toolNames: string[]; dispose: () => void }> {
  const context = typeof document === "undefined" ? undefined : document.modelContext;
  if (typeof context?.registerTool !== "function") return { supported: false, toolNames: [], dispose: () => {} };
  if (options.captureFrame && !options.runMutation) {
    throw new Error("captureFrame requires runMutation so pixels and canonical state are captured atomically");
  }

  const controller = new AbortController();
  const definitions = buildToolDefinitions(kernel, actionSchemas, onActivity, options.captureFrame);
  const registeredDefinitions = options.runMutation
    ? definitions.map((definition) => ({
        ...definition,
        execute: definition.annotations?.readOnlyHint
          ? definition.execute
          : (input: Record<string, unknown>, toolOptions: ToolExecutionOptions) =>
              options.runMutation!(() => definition.execute(input, toolOptions)),
      }))
    : definitions;
  if (!document.modelContext) throw new Error("WebMCP context disappeared before registration");
  try {
    for (const definition of registeredDefinitions) {
      await document.modelContext.registerTool(definition, { signal: controller.signal });
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

/**
 * Convenience path for a game that already exposes a complete GameAdapter.
 * Core execution remains usable without this browser transport.
 */
export async function connectHuginnWebMcp<State, Action, Event, GameMetrics extends Metrics>(
  adapter: GameAdapter<State, Action, Event, GameMetrics>,
  options: ConnectHuginnWebMcpOptions = {},
) {
  const kernel = new HuginnKernel(
    adapter,
    options.initialSeed ?? 12,
    options.schedule,
  );
  await kernel.initialize();
  const registration = await registerWebMcpTools(
    kernel,
    adapter.description.actions.map((action) => action.inputSchema),
    options.onActivity,
    { runMutation: options.runMutation, captureFrame: options.captureFrame },
  );
  return {
    kernel,
    ...registration,
  };
}
