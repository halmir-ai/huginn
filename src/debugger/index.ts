import { HuginnKernel } from "../huginn/kernel";
import { createRegressionScenario, type RegressionScenario } from "../huginn/scenario";
import { registerWebMcpTools, type GameFrameCapture, type ToolActivity } from "../webmcp";
import type { GameAdapter, SequenceInput, SequenceResult, SnapshotRecord } from "../huginn/types";
import type { GameMetrics, GameRuntime } from "../game-runtime";
import "./dock.css";

/** Opinionated reference composition. Plain games never import this module. */
export async function attachHuginnDebugger<S, A, E>(runtime: GameRuntime<S, A, E>, dock: HTMLElement) {
  let humanDispatch = false;
  let request = 0;
  let saved: SnapshotRecord | undefined;
  let portableRegression: RegressionScenario<A> | undefined;
  let priorRegression: { signature: string; steps: string; finalChecksum: string } | undefined;
  let captureUrl: string | undefined;
  let captureCount = 0;
  let disposed = false;
  const captureUrls = new Set<string>();
  const receipts: ToolActivity[] = [];
  const adapter: GameAdapter<S, A, E, GameMetrics> = {
    description: runtime.game.description,
    setups: runtime.game.setups,
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

  const app = document.querySelector<HTMLElement>("#app");
  const siteRoot = new URL(app?.dataset.siteRoot || "../../", location.href);
  const scenarioFile = runtime.game.description.id === "coil"
    ? "coil-level-2-shield.json"
    : runtime.game.description.id === "starfall"
      ? "starfall-ball-saver.json"
      : runtime.game.description.id === "thornwatch"
        ? "thornwatch-meadow-defense.json"
        : undefined;
  const exampleLink = scenarioFile
    ? `<a href="${new URL(`regressions/${scenarioFile}`, siteRoot).href}">Open this game's example regression JSON ↗</a>`
    : "";
  dock.className = "agent-dock";
  dock.innerHTML = `<div class="dock-title"><strong>HUGINN</strong><span id="tool-connection">Connecting to the browser…</span></div>
    <div class="dock-actions"><button type="button" id="checkpoint-save">Save checkpoint</button><button type="button" id="checkpoint-restore" disabled>Restore</button><button type="button" id="receipt-download">Download receipt</button><button type="button" id="regression-download" disabled>Save regression</button></div>
    <p id="tool-activity" role="status">Play yourself, or ask your browser agent to inspect and experiment.</p>
    <p id="regression-status" class="regression-status" data-verdict="not-requested" role="status">Regression checks are optional · build normally, add expectations only when behavior needs proof.</p>
    <figure id="game-capture" class="game-capture" hidden><img alt="Latest game frame captured by the browser agent"><figcaption></figcaption></figure>
    <details><summary>Agent experiment guide</summary><p>Call <code>describe_game</code> and <code>list_legal_actions</code>. If the game publishes a named setup, use its <code>setup_id</code> to test that authored moment without replaying unrelated progression. Run a bounded <code>apply_action_sequence</code>; add optional <code>expect</code> checks to turn an important outcome into a pass/fail regression. Call <code>capture_game</code> when a rendered frame is material evidence. Seeded expectation runs can be saved as small replayable JSON files. Tool mutations pause the human clock; setup initialization and every step still render on this canvas.</p>${exampleLink}<pre id="tool-recent">No agent tool calls yet.</pre></details>`;
  const status = dock.querySelector<HTMLElement>("#tool-activity")!;
  const recent = dock.querySelector<HTMLElement>("#tool-recent")!;
  const regressionStatus = dock.querySelector<HTMLElement>("#regression-status")!;
  const saveButton = dock.querySelector<HTMLButtonElement>("#checkpoint-save")!;
  const restoreButton = dock.querySelector<HTMLButtonElement>("#checkpoint-restore")!;
  const regressionButton = dock.querySelector<HTMLButtonElement>("#regression-download")!;
  const capturePreview = dock.querySelector<HTMLElement>("#game-capture")!;
  const captureImage = capturePreview.querySelector<HTMLImageElement>("img")!;
  const captureCaption = capturePreview.querySelector<HTMLElement>("figcaption")!;
  const releaseCaptureUrl = (url: string | undefined) => {
    if (!url || !captureUrls.delete(url)) return;
    URL.revokeObjectURL(url);
  };
  const waitForSettledPaint = () => new Promise<void>((resolve) => {
    // The simulation remains frozen by GameRuntime.runExclusive while both the
    // native Canvas RAF loops and Pixi's ticker get a complete paint boundary.
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  const captureFrame = async (): Promise<GameFrameCapture> => {
    if (disposed) throw new Error("The game debugger was disposed before frame capture");
    const canvas = app?.querySelector<HTMLCanvasElement>("canvas");
    if (!canvas) throw new Error("No live game canvas is available to capture");
    await waitForSettledPaint();
    if (disposed) throw new Error("The game debugger was disposed during frame capture");
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      value => value ? resolve(value) : reject(new Error("The live game canvas could not be encoded")),
      "image/png",
    ));
    if (disposed) throw new Error("The game debugger was disposed during frame capture");
    if (blob.size > 8 * 1024 * 1024) throw new Error("The captured PNG exceeds the 8 MiB limit");
    const imageChecksum = [...new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()))]
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");
    if (disposed) throw new Error("The game debugger was disposed during frame capture");
    const nextUrl = URL.createObjectURL(blob);
    captureUrls.add(nextUrl);
    const priorUrl = captureUrl;
    captureUrl = nextUrl;
    captureImage.src = nextUrl;
    capturePreview.hidden = false;
    try {
      await captureImage.decode();
      if (disposed) throw new Error("The game debugger was disposed during frame capture");
    } catch (error) {
      releaseCaptureUrl(nextUrl);
      if (captureUrl === nextUrl) captureUrl = priorUrl;
      if (!disposed && priorUrl) captureImage.src = priorUrl;
      else if (!disposed) {
        captureImage.removeAttribute("src");
        capturePreview.hidden = true;
      }
      if (disposed) throw error;
      throw new Error("The captured PNG could not be displayed in the page debugger");
    }
    releaseCaptureUrl(priorUrl);
    const captureId = `frame-${Date.now().toString(36)}-${++captureCount}`;
    captureCaption.textContent = `${canvas.width}×${canvas.height} PNG · ${imageChecksum.slice(0, 12)}`;
    return {
      captureId,
      imageChecksum,
      width: canvas.width,
      height: canvas.height,
      mimeType: "image/png",
      bytes: blob.size,
      previewVisible: true,
    };
  };
  const setRegressionStatus = (verdict: "not-requested" | "passed" | "failed" | "inconclusive", message: string) => {
    regressionStatus.dataset.verdict = verdict;
    regressionStatus.textContent = message;
  };
  const observe = (activity: ToolActivity) => {
    receipts.push(structuredClone(activity));
    // Keep the notebook bounded while retaining all calls in a typical demo.
    if (receipts.length > 400) receipts.shift();
    status.textContent = `WebMCP · ${activity.name} · ${activity.phase}`;
    if (activity.phase === "completed") recent.textContent = JSON.stringify(activity.result, null, 2);
    if (activity.phase === "failed") recent.textContent = activity.error;
    if (activity.name !== "apply_action_sequence") return;
    const input = activity.input as unknown as SequenceInput<A>;
    if (activity.phase === "started") {
      portableRegression = undefined;
      regressionButton.disabled = true;
      if (input.expect?.length) setRegressionStatus("not-requested", `Regression running · ${input.expect.length} semantic checks`);
      return;
    }
    if (activity.phase === "failed") {
      portableRegression = undefined;
      regressionButton.disabled = true;
      setRegressionStatus("inconclusive", "Regression inconclusive · the tool call did not complete");
      return;
    }
    if (activity.phase !== "completed") return;
    const result = activity.result as SequenceResult<A, E, GameMetrics>;
    if (result.cached) {
      portableRegression = undefined;
      regressionButton.disabled = true;
      setRegressionStatus("inconclusive", "Cached response · not a fresh regression replay");
      return;
    }
    if (result.verdict === "not-requested") {
      portableRegression = undefined;
      regressionButton.disabled = true;
      setRegressionStatus("not-requested", "Experiment complete · no regression expectations requested");
      return;
    }
    const passed = result.checks.filter(check => check.passed).length;
    const label = result.verdict === "passed" ? "passed" : result.verdict === "failed" ? "failed" : "inconclusive";
    setRegressionStatus(result.verdict, `Regression ${label} · ${passed}/${result.checks.length} checks`);
    if (result.verdict !== "passed") {
      portableRegression = undefined;
      regressionButton.disabled = true;
      return;
    }
    const scenario = createRegressionScenario(
      runtime.game.description,
      input,
      `${runtime.game.description.title}: ${input.request_id}`,
      "Captured from an actual WebMCP apply_action_sequence call.",
    ) ?? undefined;
    if (!scenario) {
      portableRegression = undefined;
      regressionButton.disabled = true;
      setRegressionStatus("inconclusive", "Regression passed · add an explicit seed to save and replay it");
      return;
    }
    const signature = JSON.stringify(scenario.input);
    const steps = JSON.stringify(result.steps);
    if (priorRegression?.signature === signature) {
      if (priorRegression.steps !== steps || priorRegression.finalChecksum !== result.finalChecksum) {
        portableRegression = undefined;
        regressionButton.disabled = true;
        setRegressionStatus("inconclusive", "Regression passed, but the fresh replay differed · inspect the receipt");
        return;
      }
      setRegressionStatus("passed", `Fresh replay matched · ${passed}/${result.checks.length} checks · ${result.finalChecksum.slice(0, 12)}`);
    } else {
      setRegressionStatus("passed", `Regression passed · ${passed}/${result.checks.length} checks · fresh replay ready`);
    }
    priorRegression = { signature, steps, finalChecksum: result.finalChecksum };
    portableRegression = scenario;
    regressionButton.disabled = false;
  };
  const registration = await registerWebMcpTools(
    kernel,
    adapter.description.actions.map(action => action.inputSchema),
    observe,
    { runMutation: operation => runtime.runExclusive(operation), captureFrame },
  ).catch((error: unknown) => {
    status.textContent = `Tool registration failed: ${error instanceof Error ? error.message : String(error)}`;
    return { supported: false, toolNames: [] as string[], dispose: () => {} };
  });
  const supported = registration.supported;
  dock.querySelector("#tool-connection")!.textContent = supported
    ? `Connected · ${registration.toolNames.length} live browser tools`
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
      registeredTools: registration.toolNames,
      tools: receipts, current: await kernel.getState(), metrics: await kernel.getMetrics(),
      note: "Actual WebMCP calls only. Human play and local checkpoint buttons are not counted as agent calls. Tokens are not measured here.",
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url; link.download = `${runtime.game.description.id}-receipt.json`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  regressionButton.addEventListener("click", () => {
    if (!portableRegression) return;
    const filename = `${portableRegression.id}.json`;
    const url = URL.createObjectURL(new Blob([JSON.stringify(portableRegression, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url; link.download = filename; link.click();
    status.textContent = `Regression JSON saved · ${filename}`;
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  const pageHide = () => {
    if (disposed) return;
    disposed = true;
    registration.dispose();
    for (const url of [...captureUrls]) releaseCaptureUrl(url);
    captureUrl = undefined;
    captureImage.removeAttribute("src");
  };
  window.addEventListener("pagehide", pageHide, { once: true });
  return { kernel, supported, dispose: () => { window.removeEventListener("pagehide", pageHide); pageHide(); } };
}
