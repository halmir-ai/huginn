import { HuginnKernel } from "../huginn/kernel";
import { buildToolDefinitions, type ToolActivity } from "../huginn/webmcp";
import type { GameAdapter, SnapshotRecord } from "../huginn/types";
import type { GameMetrics, GameRuntime } from "./core";
import "./dock.css";

/** This is the only integration edge. Plain games never import this module. */
export async function attachHuginn<S, A, E>(runtime: GameRuntime<S, A, E>, dock: HTMLElement) {
  let humanDispatch = false;
  let request = 0;
  let saved: SnapshotRecord | undefined;
  const receipts: ToolActivity[] = [];
  const adapter: GameAdapter<S, A, E, GameMetrics> = {
    description: runtime.game.description,
    initialState: seed => runtime.game.initialState(seed),
    listLegalActions: state => runtime.game.legalActions(state),
    reduce: (state, action) => runtime.game.reduce(state, action),
    metrics: state => runtime.game.metrics(state),
    serialize: state => structuredClone(state),
    deserialize: value => runtime.game.deserialize(value),
    render: (state, context) => runtime.publish(state, context.events, context.kind),
  };
  const kernel = new HuginnKernel(adapter, runtime.initialSeed, delay => new Promise(resolve => {
    requestAnimationFrame(() => window.setTimeout(resolve, humanDispatch ? 0 : delay));
  }));
  runtime.installDriver({
    dispatch: async action => {
      humanDispatch = true;
      try {
        const result = await kernel.applyActionSequence({ request_id: `human-${++request}`, actions: [action], speed: "fast" });
        if (result.status === "error") throw new Error(result.stopReason);
      } finally { humanDispatch = false; }
    },
    reset: seed => kernel.reset(seed),
  });
  await kernel.initialize();

  dock.className = "agent-dock";
  dock.innerHTML = `<div class="dock-title"><strong>HUGINN</strong><span id="tool-connection">Connecting to the browser…</span></div>
    <div class="dock-actions"><button type="button" id="checkpoint-save">Save checkpoint</button><button type="button" id="checkpoint-restore" disabled>Restore</button><button type="button" id="receipt-download">Download receipt</button></div>
    <p id="tool-activity" role="status">Play yourself, or ask your browser agent to inspect and experiment.</p>
    <details><summary>Agent experiment guide</summary><p>Call <code>describe_game</code> and <code>list_legal_actions</code>. Save a checkpoint, run a bounded <code>apply_action_sequence</code>, inspect metrics, then restore and try another plan. Tool mutations pause the human clock; every step still renders on this canvas. Press the game's Play button to take back control.</p><pre id="tool-recent">No agent tool calls yet.</pre></details>`;
  const status = dock.querySelector<HTMLElement>("#tool-activity")!;
  const recent = dock.querySelector<HTMLElement>("#tool-recent")!;
  const saveButton = dock.querySelector<HTMLButtonElement>("#checkpoint-save")!;
  const restoreButton = dock.querySelector<HTMLButtonElement>("#checkpoint-restore")!;
  const observe = (activity: ToolActivity) => {
    receipts.push(structuredClone(activity));
    // Keep the notebook bounded while retaining all calls in a typical demo.
    if (receipts.length > 400) receipts.shift();
    status.textContent = `WebMCP · ${activity.name} · ${activity.phase}`;
    if (activity.phase === "completed") recent.textContent = JSON.stringify(activity.result, null, 2);
    if (activity.phase === "failed") recent.textContent = activity.error;
  };
  const definitions = buildToolDefinitions(kernel, adapter.description.actions.map(action => action.inputSchema), observe);
  const lifecycle = new AbortController();
  let supported = false;
  if (typeof document.modelContext?.registerTool === "function") {
    try {
      for (const definition of definitions) {
        const execute = definition.execute;
        await document.modelContext.registerTool({
          ...definition,
          execute: (input, options) => definition.annotations?.readOnlyHint
            ? execute(input, options)
            : runtime.runExclusive(() => execute(input, options)),
        }, { signal: lifecycle.signal });
      }
      supported = true;
    } catch (error) {
      lifecycle.abort();
      status.textContent = `Tool registration failed: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  dock.querySelector("#tool-connection")!.textContent = supported
    ? "Connected · 7 live browser tools"
    : "Human play ready · use a WebMCP-compatible browser for agent tools";
  saveButton.addEventListener("click", async () => {
    try {
      saved = await runtime.runExclusive(() => kernel.createSnapshot());
      restoreButton.disabled = false;
      status.textContent = `Checkpoint saved · ${saved.checksum.slice(0, 12)}`;
    } catch (error) { status.textContent = String(error); }
  });
  restoreButton.addEventListener("click", async () => {
    if (!saved) return;
    try {
      const checkpoint = saved;
      await runtime.runExclusive(() => kernel.restoreSnapshot(checkpoint.id, checkpoint.checksum));
      status.textContent = `Checkpoint restored · ${saved.checksum.slice(0, 12)}`;
    } catch (error) { status.textContent = String(error); }
  });
  dock.querySelector("#receipt-download")!.addEventListener("click", async () => {
    const receipt = {
      format: "huginn/playable-game-receipt-v1", game: runtime.game.description,
      registeredTools: supported ? definitions.map(tool => tool.name) : [],
      tools: receipts, current: await kernel.getState(), metrics: await kernel.getMetrics(),
      note: "Actual WebMCP calls only. Human play and local checkpoint buttons are not counted as agent calls. Tokens are not measured here.",
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url; link.download = `${runtime.game.description.id}-receipt.json`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  window.addEventListener("pagehide", () => lifecycle.abort(), { once: true });
  return { kernel, supported, dispose: () => lifecycle.abort() };
}
