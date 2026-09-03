import "./style.css";
import {
  createRtsLabAdapter,
  rtsLabDescription,
  type RtsLabAction,
  type RtsLabEvent,
  type RtsLabState,
} from "./demo/rts-lab";
import { HuginnKernel } from "./huginn/kernel";
import { checksum } from "./huginn/canonical";
import type { RenderContext } from "./huginn/types";
import { registerWebMcpTools, type ToolActivity } from "./huginn/webmcp";
import { compareRuns, economyActions, rushActions, type RtsResult, type RunReceipt } from "./demo/experiment-notebook";
import { InteractionLedger, webMcpEnabled } from "./demo/interaction-ledger";

const siteToolsEnabled = webMcpEnabled(location.search);
const ledger = new InteractionLedger("huginn-rts-lab", siteToolsEnabled);

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing app root.");

const toolNames = [
  "describe_game",
  "get_game_state",
  "get_metrics",
  "list_legal_actions",
  "snapshot_game",
  "restore_game",
  "apply_action_sequence",
];

app.innerHTML = `
  <main class="shell">
    <nav class="game-nav" aria-label="Example games">
      <a href="./" aria-current="page">RTS Lab · strategy</a>
      <a href="./tideglass/">Tideglass Relay · logistics</a>
      <a href="#play-controls">Play yourself</a>
      <a id="mode-switch" href="${siteToolsEnabled ? "?webmcp=off" : "./"}">${siteToolsEnabled ? "Compare: WebMCP off" : "Enable WebMCP"}</a>
    </nav>
    <header class="masthead">
      <div>
        <p class="eyebrow">Huginn · WebMCP playtesting layer</p>
        <div class="title-row">
          <h1>RTS Lab</h1>
          <span id="seed" class="seed-tag">seed 12</span>
        </div>
        <p class="lede">Branch a live strategy game. Run two build orders from the same moment. Watch the counterfactual unfold.</p>
      </div>
      <div class="runtime-panel">
        <span id="webmcp-status" class="status-pill">Checking WebMCP…</span>
        <span id="checksum" class="checksum">state loading</span>
      </div>
    </header>

    <section class="workspace">
      <article class="battle-card">
        <div class="card-heading">
          <div>
            <p class="eyebrow">Live browser memory · rendered visibly</p>
            <h2>Ashenbanner frontier</h2>
          </div>
          <div class="faction-key" aria-label="Factions">
            <span><i class="sunforge-dot"></i>Sunforge</span>
            <span><i class="thornmaw-dot"></i>Thornmaw</span>
          </div>
        </div>

        <div class="canvas-frame">
          <canvas id="battlefield" width="960" height="600" aria-label="Visible RTS battlefield"></canvas>
          <div id="action-flash" class="action-flash" aria-live="polite">Awaiting experiment</div>
          <div class="canvas-legend">
            <span><b>16 × 12</b> battlefield</span>
            <span>typed state · not pixels</span>
          </div>
        </div>

        <dl id="metrics" class="metrics"></dl>

        <div class="controls">
          <button id="run-experiment" class="primary-action">
            <span>Try page preset</span>
            <small>rush vs economy · both end at cycle 3</small>
          </button>
          <button id="reset" class="secondary-action">Reset</button>
        </div>
      </article>

      <aside class="lab-card">
        <div class="card-heading lab-heading">
          <div>
            <p class="eyebrow">Live experiment notebook</p>
            <h2>What changed—and why?</h2>
          </div>
          <span id="run-state" class="status-pill muted">Ready</span>
        </div>

        <p class="experiment-question">Ask your agent to inspect, snapshot, and run a plan. Actual WebMCP results appear here. The page preset is a separate, labeled preview.</p>
        <p id="tool-activity" class="tool-activity" aria-live="polite">Waiting for an agent tool call.</p>
        <p id="snapshot-receipt" class="snapshot-receipt">No snapshot receipt yet.</p>

        <div class="branch-grid">
          <article id="rush-card" class="branch-card" data-branch="rush">
            <div class="branch-heading">
              <span class="branch-index">A</span>
              <div><b id="rush-label">Run A</b><small id="rush-source">No result yet</small></div>
            </div>
            <dl id="rush-result" class="branch-result"><div><dt>Status</dt><dd>Not run</dd></div></dl>
          </article>

          <div id="comparison-base" class="versus">base not yet compared</div>

          <article id="economy-card" class="branch-card" data-branch="economy">
            <div class="branch-heading">
              <span class="branch-index">B</span>
              <div><b id="economy-label">Run B</b><small id="economy-source">No result yet</small></div>
            </div>
            <dl id="economy-result" class="branch-result"><div><dt>Status</dt><dd>Not run</dd></div></dl>
          </article>
        </div>

        <div id="verdict" class="verdict">
          <span class="verdict-kicker">Evidence, not a scripted winner</span>
          <strong>Run two plans from the same snapshot.</strong>
          <p>The notebook compares the last two distinct requests. Repeating the same plan with a new request ID checks replay fidelity.</p>
        </div>

        <div class="trace-wrap">
          <div class="trace-heading"><span>Visible action trace</span><span id="step-count">0 steps</span></div>
          <ol id="trace" class="trace"><li><span>—</span><strong>Experiment is ready.</strong></li></ol>
        </div>
      </aside>
    </section>

    <section id="play-controls" class="play-panel" aria-labelledby="play-title">
      <div class="card-heading">
        <div><p class="eyebrow">Same game logic · human or agent</p><h2 id="play-title">Play & inspect</h2></div>
        <span id="mode-label" class="seed-tag">${siteToolsEnabled ? "WebMCP enabled" : "WebMCP OFF · identical UI"}</span>
      </div>
      <p class="play-help">Every currently legal move is a button. Save a checkpoint, try a plan, then restore and try another. Switching WebMCP mode opens a fresh game; it changes registration, not the rules.</p>
      <div id="legal-actions" class="legal-actions" aria-label="Currently legal actions"></div>
      <div class="checkpoint-controls">
        <button id="save-checkpoint" class="secondary-action">Save checkpoint</button>
        <button id="restore-checkpoint" class="secondary-action" disabled>Restore checkpoint</button>
        <label>Seed <input id="seed-input" type="number" min="0" max="2147483647" value="12"></label>
        <button id="reset-seed" class="secondary-action">Start seed</button>
        <button id="export-receipt" class="secondary-action">Download experiment receipt</button>
      </div>
      <p id="manual-feedback" role="status">Choose a legal move, or ask your agent to run a bounded plan.</p>
      <details><summary>Rules and metric definitions</summary><div id="game-rules" class="rules-copy"></div></details>
      <details><summary>Inspect current simulation state</summary><pre id="state-inspector"></pre></details>
      <details><summary>Interaction measurements — what we can actually count</summary>
        <p>These are commands received by the page, not assistant turns or browser-tool envelopes. Browser observations, discovery, model tokens, and code edits are not visible here. Missing values stay unknown. Preset previews are excluded.</p>
        <dl id="interaction-counts" class="measurement-counts"></dl>
        <p>For an honest pilot, start a fresh tab in each mode, use the same seed and task, and count browser observations and edits separately. This compares the WebMCP channel, not an uninstrumented game.</p>
      </details>
    </section>

    <section class="tool-strip" aria-label="Registered WebMCP tools">
      <div><span class="live-mark"></span><strong id="tool-count">WebMCP tool surface</strong></div>
      <div class="tool-list">${toolNames.map((name) => `<code>${name}</code>`).join("")}</div>
    </section>

    <footer>
      <span>Huginn experiment protocol v1</span>
      <span>Selected original game art · CC BY 4.0</span>
    </footer>
  </main>
`;

const canvas = document.querySelector<HTMLCanvasElement>("#battlefield")!;
const maybeContext = canvas.getContext("2d");
if (!maybeContext) throw new Error("Canvas 2D is unavailable.");
const context: CanvasRenderingContext2D = maybeContext;

const metricsElement = document.querySelector<HTMLDListElement>("#metrics")!;
const traceElement = document.querySelector<HTMLOListElement>("#trace")!;
const checksumElement = document.querySelector<HTMLSpanElement>("#checksum")!;
const statusElement = document.querySelector<HTMLSpanElement>("#webmcp-status")!;
const runStateElement = document.querySelector<HTMLSpanElement>("#run-state")!;
const actionFlashElement = document.querySelector<HTMLDivElement>("#action-flash")!;
const stepCountElement = document.querySelector<HTMLSpanElement>("#step-count")!;
const verdictElement = document.querySelector<HTMLDivElement>("#verdict")!;
const rushResultElement = document.querySelector<HTMLDListElement>("#rush-result")!;
const economyResultElement = document.querySelector<HTMLDListElement>("#economy-result")!;
const rushCard = document.querySelector<HTMLElement>("#rush-card")!;
const economyCard = document.querySelector<HTMLElement>("#economy-card")!;
const runButton = document.querySelector<HTMLButtonElement>("#run-experiment")!;
const resetButton = document.querySelector<HTMLButtonElement>("#reset")!;
const seedElement = document.querySelector<HTMLSpanElement>("#seed")!;
const toolActivityElement = document.querySelector<HTMLParagraphElement>("#tool-activity")!;
const snapshotReceiptElement = document.querySelector<HTMLParagraphElement>("#snapshot-receipt")!;
const comparisonBaseElement = document.querySelector<HTMLDivElement>("#comparison-base")!;
const legalActionsElement = document.querySelector<HTMLDivElement>("#legal-actions")!;
const manualFeedback = document.querySelector<HTMLParagraphElement>("#manual-feedback")!;
const stateInspector = document.querySelector<HTMLPreElement>("#state-inspector")!;
const measurementCounts = document.querySelector<HTMLDListElement>("#interaction-counts")!;
const checkpointButton = document.querySelector<HTMLButtonElement>("#save-checkpoint")!;
const restoreCheckpointButton = document.querySelector<HTMLButtonElement>("#restore-checkpoint")!;
const resetSeedButton = document.querySelector<HTMLButtonElement>("#reset-seed")!;
let manualCheckpoint: { id: string; checksum: string } | null = null;
let manualRunning = false;
let manualRequestCounter = 0;

const assetPaths = {
  terrain: "./assets/rts-lab/terrain.png",
  worker: "./assets/rts-lab/worker.png",
  vanguard: "./assets/rts-lab/vanguard.png",
  raider: "./assets/rts-lab/raider.png",
  townhall: "./assets/rts-lab/townhall.png",
  barracks: "./assets/rts-lab/barracks.png",
  resource: "./assets/rts-lab/resource.png",
  attack: "./assets/rts-lab/attack-vfx.png",
} as const;

type AssetName = keyof typeof assetPaths;

function loadImage(source: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = source;
  });
}

const assets = Object.fromEntries(
  await Promise.all(
    Object.entries(assetPaths).map(async ([name, source]) => [name, await loadImage(source)]),
  ),
) as Record<AssetName, HTMLImageElement | null>;

function drawSprite(
  asset: AssetName,
  x: number,
  y: number,
  width: number,
  height: number,
  options: { flip?: boolean; filter?: string; alpha?: number; shadow?: number } = {},
): void {
  const image = assets[asset];
  context.save();
  context.globalAlpha = options.alpha ?? 1;
  context.filter = options.filter ?? "none";
  context.shadowColor = "rgba(0, 0, 0, .48)";
  context.shadowBlur = options.shadow ?? 12;
  context.shadowOffsetY = options.shadow ? 8 : 4;
  if (options.flip) {
    context.translate(x + width, y);
    context.scale(-1, 1);
    x = 0;
    y = 0;
  }
  if (image) {
    context.drawImage(image, x, y, width, height);
  } else {
    context.fillStyle = asset === "raider" ? "#b94b38" : "#477dc1";
    context.beginPath();
    context.arc(x + width / 2, y + height / 2, Math.min(width, height) / 3, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function roundedRect(x: number, y: number, width: number, height: number, radius: number): void {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function drawLabel(text: string, x: number, y: number, align: CanvasTextAlign = "left"): void {
  context.save();
  context.font = "700 14px Inter, system-ui, sans-serif";
  context.textAlign = align;
  context.fillStyle = "rgba(247, 241, 220, .92)";
  context.shadowColor = "rgba(0, 0, 0, .75)";
  context.shadowBlur = 5;
  context.fillText(text, x, y);
  context.restore();
}

function drawHealthBar(label: string, hp: number, x: number, y: number, width: number, enemy = false): void {
  roundedRect(x, y, width, 20, 10);
  context.fillStyle = "rgba(6, 12, 15, .8)";
  context.fill();
  const innerWidth = Math.max(0, (width - 4) * (hp / 100));
  if (innerWidth > 0) {
    roundedRect(x + 2, y + 2, innerWidth, 16, 8);
    const gradient = context.createLinearGradient(x, y, x + width, y);
    gradient.addColorStop(0, enemy ? "#9d332b" : "#3778c6");
    gradient.addColorStop(1, enemy ? "#e9854b" : "#65b9e9");
    context.fillStyle = gradient;
    context.fill();
  }
  context.font = "700 11px Inter, system-ui, sans-serif";
  context.fillStyle = "#fff8e6";
  context.textAlign = "center";
  context.fillText(`${label}  ${hp}`, x + width / 2, y + 14);
}

function drawBattlefield(state: RtsLabState, renderContext: RenderContext<RtsLabAction, RtsLabEvent>): void {
  const width = canvas.width;
  const height = canvas.height;
  context.clearRect(0, 0, width, height);

  const field = context.createLinearGradient(0, 0, width, height);
  field.addColorStop(0, "#3f5837");
  field.addColorStop(.48, "#647248");
  field.addColorStop(1, "#4b3d32");
  context.fillStyle = field;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = .17;
  for (let row = 0; row < 5; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      drawSprite("terrain", column * 132 - 28, row * 132 - 20, 110, 110, {
        alpha: .22 + ((row + column) % 3) * .04,
        shadow: 0,
      });
    }
  }
  context.restore();

  context.strokeStyle = "rgba(244, 229, 180, .055)";
  context.lineWidth = 1;
  for (let column = 1; column < 16; column += 1) {
    context.beginPath();
    context.moveTo(column * 60, 0);
    context.lineTo(column * 60, height);
    context.stroke();
  }
  for (let row = 1; row < 12; row += 1) {
    context.beginPath();
    context.moveTo(0, row * 50);
    context.lineTo(width, row * 50);
    context.stroke();
  }

  context.save();
  context.strokeStyle = "rgba(219, 187, 121, .32)";
  context.lineWidth = 82;
  context.lineCap = "round";
  context.setLineDash([2, 7]);
  context.beginPath();
  context.moveTo(170, 420);
  context.bezierCurveTo(360, 355, 575, 275, 800, 186);
  context.stroke();
  context.restore();

  for (const [x, y, size] of [[34, 38, 126], [79, 469, 112], [804, 410, 124], [851, 20, 105]] as const) {
    drawSprite("resource", x, y, size, size, { alpha: .92, shadow: 7 });
  }

  drawSprite("townhall", 30, 205, 220, 220, { shadow: 16 });
  drawSprite("townhall", 732, 68, 205, 205, {
    filter: "hue-rotate(145deg) saturate(1.25) brightness(.88)",
    shadow: 16,
  });
  drawHealthBar("SUNFORGE", state.sunforgeBaseHp, 52, 462, 185);
  drawHealthBar("THORNMAW", state.thornmawBaseHp, 730, 285, 185, true);

  if (state.barracksBuilt) {
    drawSprite("barracks", 208, 312, 160, 160, { shadow: 12 });
    drawLabel("Barracks", 285, 470, "center");
  }
  if (state.watchtowerBuilt) {
    drawSprite("barracks", 178, 104, 116, 116, {
      filter: "brightness(.92) saturate(.8)",
      shadow: 10,
    });
    drawLabel("Watchtower", 236, 218, "center");
  }

  for (let index = 0; index < state.workersOnHeartwood; index += 1) {
    drawSprite("worker", 170 + index * 58, 58 + index * 24, 92, 92, { shadow: 8 });
  }
  for (let index = 0; index < state.workersOnGold; index += 1) {
    drawSprite("worker", 302 + index * 58, 186 + index * 18, 92, 92, {
      filter: "sepia(.2) brightness(1.08)",
      shadow: 8,
    });
  }

  const vanguardX = 238 + state.frontline * 27;
  for (let index = 0; index < state.vanguards; index += 1) {
    drawSprite("vanguard", vanguardX - index * 38, 328 + index * 42, 112, 112, { shadow: 10 });
  }
  for (let index = 0; index < Math.min(state.raiders, 4); index += 1) {
    drawSprite("raider", 698 - index * 49, 225 + index * 46, 116, 116, {
      flip: true,
      shadow: 10,
    });
  }

  const frontlineX = 260 + state.frontline * 31;
  context.save();
  context.strokeStyle = "rgba(255, 223, 138, .9)";
  context.lineWidth = 3;
  context.setLineDash([7, 7]);
  context.beginPath();
  context.moveTo(frontlineX, 235);
  context.lineTo(frontlineX, 508);
  context.stroke();
  context.restore();
  drawLabel("FRONTLINE", frontlineX, 528, "center");

  const attack = renderContext.events.find((event) => event.type === "attack_resolved");
  if (attack?.type === "attack_resolved") {
    drawSprite("attack", frontlineX - 78, 245, 220, 220, { shadow: 20 });
    context.save();
    context.font = "800 34px Georgia, serif";
    context.textAlign = "center";
    context.fillStyle = "#fff3c4";
    context.shadowColor = "#7b1d12";
    context.shadowBlur = 10;
    context.fillText(`−${attack.damage}`, frontlineX + 28, 258);
    context.restore();
  }

  context.save();
  context.fillStyle = "rgba(7, 12, 14, .72)";
  roundedRect(18, 18, 194, 42, 11);
  context.fill();
  context.font = "700 12px Inter, system-ui, sans-serif";
  context.textAlign = "left";
  context.fillStyle = "#c6d0c1";
  context.fillText(`CYCLE ${state.cycle}  ·  RNG ${state.rng.toString(16).slice(0, 6).toUpperCase()}`, 34, 44);
  context.restore();
}

function renderMetrics(state: RtsLabState): void {
  const values = [
    ["Cycle", state.cycle],
    ["Heartwood", state.heartwood],
    ["Crown Gold", state.crownGold],
    ["Vanguards", state.vanguards],
    ["Sunforge HP", state.sunforgeBaseHp],
    ["Enemy HP", state.thornmawBaseHp],
  ];
  metricsElement.innerHTML = values
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`)
    .join("");
}

function describeAction(action: RtsLabAction, events: RtsLabEvent[]): string {
  if (action.type === "assign_worker") return `Worker → ${action.resource === "crown_gold" ? "Crown Gold" : "Heartwood"}`;
  if (action.type === "advance_cycle") {
    const gathered = events.find((event) => event.type === "resources_gathered");
    return gathered?.type === "resources_gathered"
      ? `Gather +${gathered.heartwood} wood · +${gathered.crownGold} gold`
      : "Advance economy cycle";
  }
  if (action.type === "build_barracks") return "Barracks constructed";
  if (action.type === "build_watchtower") return "Watchtower constructed";
  if (action.type === "train_vanguard") return "Vanguard trained";
  const attack = events.find((event) => event.type === "attack_resolved");
  return attack?.type === "attack_resolved" ? `Attack lands · ${attack.damage} damage` : "Attack launched";
}

let visibleSteps = 0;
let pagePresetRunning = false;
let mutationCount = 0;
let activeSource = "Agent";
let receipts: RunReceipt[] = [];

function updateControls(): void {
  const busy = pagePresetRunning || mutationCount > 0 || manualRunning;
  runButton.disabled = busy;
  resetButton.disabled = busy;
  checkpointButton.disabled = busy;
  resetSeedButton.disabled = busy;
  restoreCheckpointButton.disabled = busy || !manualCheckpoint;
  for (const button of legalActionsElement.querySelectorAll("button")) button.disabled = busy;
}

async function render(
  state: RtsLabState,
  renderContext: RenderContext<RtsLabAction, RtsLabEvent>,
): Promise<void> {
  drawBattlefield(state, renderContext);
  renderMetrics(state);
  seedElement.textContent = `seed ${state.seed}`;
  checksumElement.textContent = `state ${(await checksum(state)).slice(0, 12)}`;
  stateInspector.textContent = JSON.stringify({ checksum: await checksum(state), state, metrics: createRtsLabAdapter().metrics(state) }, null, 2);
  renderLegalActions(state);

  if (renderContext.kind === "reset") {
    actionFlashElement.textContent = `Seed ${state.seed} initialized`;
  } else if (renderContext.kind === "restore") {
    actionFlashElement.textContent = "Verified snapshot restored";
  } else if (renderContext.action) {
    visibleSteps += 1;
    const description = describeAction(renderContext.action, renderContext.events);
    actionFlashElement.textContent = description;
    stepCountElement.textContent = `${visibleSteps} ${visibleSteps === 1 ? "step" : "steps"}`;
    traceElement.insertAdjacentHTML(
      "afterbegin",
      `<li><span>${activeSource} ${(renderContext.step ?? 0) + 1}</span><strong>${description}</strong></li>`,
    );
    while (traceElement.children.length > 6) traceElement.lastElementChild?.remove();
  }
}

function showBranchResult(element: HTMLDListElement, result: RtsResult): void {
  element.innerHTML = `
    <div><dt>Cycle</dt><dd>${result.metrics.cycle}</dd></div>
    <div><dt>Damage</dt><dd>${result.metrics.enemy_damage}</dd></div>
    <div><dt>Base HP</dt><dd>${result.metrics.sunforge_base_hp}</dd></div>
    <div><dt>Economy</dt><dd>${result.metrics.economy_value}</dd></div>
    <div><dt>Start</dt><dd class="mini-hash">${result.steps[0]?.beforeChecksum.slice(0, 12) ?? "No steps"}</dd></div>
    <div><dt>Final</dt><dd class="mini-hash">${result.finalChecksum.slice(0, 12)}</dd></div>
  `;
}

function recordRun(run: Omit<RunReceipt, "freshExecution">): void {
  const receipt: RunReceipt = { ...run, freshExecution: run.result.cached !== true };
  // A request-ID retry is cached by the kernel, not a fresh deterministic run.
  if (receipts.some((entry) => entry.result.requestId === receipt.result.requestId)) return;
  receipts = [...receipts, receipt].slice(-2);
  for (const [index, prefix] of ["rush", "economy"].entries()) {
    const entry = receipts[index];
    document.querySelector(`#${prefix}-label`)!.textContent = entry?.label ?? `Run ${index === 0 ? "A" : "B"}`;
    document.querySelector(`#${prefix}-source`)!.textContent = entry
      ? `${entry.source} · ${entry.result.appliedSteps} ${entry.result.appliedSteps === 1 ? "step" : "steps"} · ${entry.freshExecution ? entry.result.status : "cached response"}`
      : "No result yet";
    const target = index === 0 ? rushResultElement : economyResultElement;
    if (entry) showBranchResult(target, entry.result);
    else target.innerHTML = "<div><dt>Status</dt><dd>Not run</dd></div>";
  }
  if (receipts.length !== 2) return;
  const comparison = compareRuns(receipts[0], receipts[1]);
  const baseA = receipts[0].result.steps[0]?.beforeChecksum;
  const baseB = receipts[1].result.steps[0]?.beforeChecksum;
  comparisonBaseElement.textContent = baseA && baseA === baseB ? `shared base ${baseA.slice(0, 12)}` : "different or missing bases";
  verdictElement.classList.toggle("complete", comparison.kind === "comparison" || comparison.kind === "replay");
  verdictElement.querySelector("strong")!.textContent = comparison.heading;
  verdictElement.querySelector("p")!.textContent = comparison.detail;
}

function clearExperiment(): void {
  visibleSteps = 0;
  receipts = [];
  traceElement.innerHTML = "<li><span>—</span><strong>Experiment is ready.</strong></li>";
  stepCountElement.textContent = "0 steps";
  rushResultElement.innerHTML = "<div><dt>Status</dt><dd>Not run</dd></div>";
  economyResultElement.innerHTML = "<div><dt>Status</dt><dd>Not run</dd></div>";
  for (const [index, prefix] of ["rush", "economy"].entries()) {
    document.querySelector(`#${prefix}-label`)!.textContent = `Run ${index === 0 ? "A" : "B"}`;
    document.querySelector(`#${prefix}-source`)!.textContent = "No result yet";
  }
  comparisonBaseElement.textContent = "base not yet compared";
  rushCard.classList.remove("active", "winner");
  economyCard.classList.remove("active", "winner");
  verdictElement.classList.remove("complete");
  verdictElement.innerHTML = `
    <span class="verdict-kicker">Evidence, not a scripted winner</span>
    <strong>Run two plans from the same snapshot.</strong>
    <p>The notebook compares the last two distinct requests. Repeating the same plan with a new request ID checks replay fidelity.</p>
  `;
}

const adapter = createRtsLabAdapter(render);
const kernel = new HuginnKernel(adapter, 12);
await kernel.initialize();

function onToolActivity(activity: ToolActivity): void {
  const mutating = activity.name === "apply_action_sequence" || activity.name === "restore_game";
  toolActivityElement.textContent = `WebMCP · ${activity.name} · ${activity.phase}`;
  if (activity.phase === "started") {
    ledger.start("WebMCP", activity.name, activity.input);
    renderMeasurements();
    if (mutating) {
      mutationCount += 1;
      activeSource = "Agent";
      runStateElement.textContent = "Agent running";
      runStateElement.classList.add("ready");
      updateControls();
    }
    return;
  }
  if (mutating) {
    mutationCount = Math.max(0, mutationCount - 1);
    updateControls();
  }
  if (activity.phase === "failed") {
    ledger.fail("WebMCP", activity.name);
    renderMeasurements();
    runStateElement.textContent = mutationCount ? "Agent running" : "Tool rejected";
    runStateElement.classList.toggle("ready", mutationCount > 0);
    toolActivityElement.textContent = `WebMCP · ${activity.name} · ${activity.error}`;
    return;
  }
  ledger.complete("WebMCP", activity.name, activity.result);
  renderMeasurements();
  if (activity.name === "apply_action_sequence") {
    const result = activity.result as RtsResult;
    const cached = result.cached === true;
    recordRun({ source: "WebMCP", label: result.requestId, result });
    runStateElement.textContent = `Agent ${result.status}`;
    runStateElement.classList.toggle("ready", result.status === "completed" || result.status === "stopped");
    toolActivityElement.textContent = `WebMCP · ${activity.name} · ${result.appliedSteps} committed ${result.appliedSteps === 1 ? "step" : "steps"} · ${result.stopReason}${cached ? " · cached retry" : ""}`;
  } else if (activity.name === "snapshot_game" || activity.name === "restore_game") {
    const snapshot = activity.result as { id: string; checksum: string };
    snapshotReceiptElement.textContent = `${activity.name === "restore_game" ? "Restored & verified" : "Snapshot saved"} · ${snapshot.id} · ${snapshot.checksum.slice(0, 12)}`;
    if (activity.name === "restore_game") runStateElement.textContent = "Snapshot restored";
  }
}

const registration = siteToolsEnabled ? await registerWebMcpTools(
  kernel,
  rtsLabDescription.actions.map((action) => action.inputSchema),
  onToolActivity,
).catch((error: unknown) => {
  console.error("WebMCP registration failed", error);
  return { supported: false, toolNames: [], dispose: () => {} };
}) : { supported: false, toolNames: [], dispose: () => {} };

statusElement.textContent = !siteToolsEnabled ? "WebMCP disabled · UI comparison mode" : registration.supported
  ? `${registration.toolNames.length} WebMCP tools live`
  : "Page demo live · enable WebMCP for agent tools";
statusElement.classList.toggle("ready", registration.supported);
document.querySelector("#tool-count")!.textContent = !siteToolsEnabled ? "0 registered tools · UI comparison mode" : registration.supported ? `${registration.toolNames.length} registered tools` : "7 tools require a WebMCP browser";

let requestCounter = 0;

runButton.addEventListener("click", async () => {
  pagePresetRunning = true;
  activeSource = "Preset";
  updateControls();
  clearExperiment();
  runStateElement.textContent = "Page preset running";
  toolActivityElement.textContent = "Page preset · calls the same kernel directly, not WebMCP.";
  runStateElement.classList.add("ready");
  try {
    await kernel.reset(12);
    const base = await kernel.createSnapshot();

    snapshotReceiptElement.textContent = `Page preset snapshot · ${base.id} · ${base.checksum.slice(0, 12)}`;
    const rushResult = await kernel.applyActionSequence({
      request_id: `page-rush-${++requestCounter}`,
      base_snapshot_id: base.id,
      expected_base_checksum: base.checksum,
      actions: rushActions,
      speed: "watch",
    });
    recordRun({ source: "Page preset", label: "Military rush", result: rushResult });
    const economyResult = await kernel.applyActionSequence({
      request_id: `page-economy-${++requestCounter}`,
      base_snapshot_id: base.id,
      expected_base_checksum: base.checksum,
      actions: economyActions,
      speed: "watch",
    });
    recordRun({ source: "Page preset", label: "Economy first", result: economyResult });
    runStateElement.textContent = "Page preset complete";
    actionFlashElement.textContent = "Both plans finished at cycle 3";
  } catch (error) {
    runStateElement.textContent = "Experiment stopped";
    actionFlashElement.textContent = error instanceof Error ? error.message : "Experiment failed";
    console.error(error);
  } finally {
    pagePresetRunning = false;
    activeSource = "Agent";
    updateControls();
  }
});

resetButton.addEventListener("click", async () => {
  await manualCommand("reset", async () => {
    await kernel.reset(12);
    clearExperiment();
    runStateElement.textContent = "Ready";
    runStateElement.classList.remove("ready");
    toolActivityElement.textContent = "Waiting for an agent tool call.";
    snapshotReceiptElement.textContent = "Page reset to seed 12. Saved snapshots remain available until reload.";
    return kernel.getMetrics();
  });
});

function renderMeasurements(): void {
  const counts = ledger.report().counts;
  measurementCounts.replaceChildren();
  for (const [name, value] of [["UI commands", counts.uiCommands], ["WebMCP calls", counts.webmcpCalls], ["Committed actions", counts.committedActions], ["Rejected commands", counts.rejectedCommands], ["Model tokens", "Unknown"]]) {
    const pair = document.createElement("div");
    const term = document.createElement("dt"); term.textContent = String(name);
    const data = document.createElement("dd"); data.textContent = String(value);
    pair.append(term, data); measurementCounts.append(pair);
  }
}

function renderLegalActions(state: RtsLabState): void {
  legalActionsElement.replaceChildren();
  // Derive these from the very same adapter whose legal set guards WebMCP.
  const legal = createRtsLabAdapter().listLegalActions(state);
  for (const entry of legal) {
    const button = document.createElement("button");
    button.className = "secondary-action";
    button.textContent = entry.label;
    button.title = entry.reason;
    button.addEventListener("click", () => { void manualCommand(entry.action.type, async () => {
      const result = await kernel.applyActionSequence({ request_id: `ui-action-${++manualRequestCounter}`, actions: [entry.action], speed: "watch" });
      if (result.status === "completed") manualFeedback.textContent = `${entry.label} · committed. Cycle ${result.metrics.cycle}, enemy damage ${result.metrics.enemy_damage}, base HP ${result.metrics.sunforge_base_hp}.`;
      else manualFeedback.textContent = `Stopped after ${result.appliedSteps} actions: ${result.stopReason}`;
      return result;
    }); });
    legalActionsElement.append(button);
  }
  updateControls();
}

async function manualCommand(name: string, operation: () => Promise<unknown>): Promise<void> {
  if (manualRunning || pagePresetRunning || mutationCount) return;
  manualRunning = true;
  activeSource = "UI";
  ledger.start("UI", name);
  updateControls();
  try {
    const result = await operation();
    ledger.complete("UI", name, result);
  } catch (error) {
    ledger.fail("UI", name);
    manualFeedback.textContent = error instanceof Error ? error.message : "UI command failed";
  } finally {
    manualRunning = false;
    activeSource = "Agent";
    updateControls();
    renderMeasurements();
  }
}

checkpointButton.addEventListener("click", () => { void manualCommand("snapshot", async () => {
  manualCheckpoint = await kernel.createSnapshot();
  snapshotReceiptElement.textContent = `UI snapshot saved · ${manualCheckpoint.id} · ${manualCheckpoint.checksum.slice(0, 12)}`;
  manualFeedback.textContent = "Checkpoint saved. Restore it after trying a plan.";
  return manualCheckpoint;
}); });

restoreCheckpointButton.addEventListener("click", () => { void manualCommand("restore", async () => {
  if (!manualCheckpoint) throw new Error("Save a checkpoint first.");
  const restored = await kernel.restoreSnapshot(manualCheckpoint.id, manualCheckpoint.checksum);
  snapshotReceiptElement.textContent = `UI restored & verified · ${restored.id} · ${restored.checksum.slice(0, 12)}`;
  manualFeedback.textContent = "Checkpoint restored exactly. You can try a different plan.";
  return restored;
}); });

resetSeedButton.addEventListener("click", () => { void manualCommand("reset_seed", async () => {
  const value = Number(document.querySelector<HTMLInputElement>("#seed-input")!.value);
  await kernel.reset(value);
  clearExperiment();
  manualFeedback.textContent = `Started seed ${value}. Interaction counters remain cumulative; open a fresh tab for a new measured trial.`;
  return kernel.getMetrics();
}); });

document.querySelector("#export-receipt")!.addEventListener("click", async () => {
  const receipt = { ...ledger.report(), final: await kernel.getState(), metrics: await kernel.getMetrics(), experiments: receipts };
  const link = document.createElement("a");
  const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" }));
  link.href = url; link.download = "huginn-rts-experiment.json"; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
});

const rulesElement = document.querySelector<HTMLDivElement>("#game-rules")!;
for (const rule of [...rtsLabDescription.rules, ...rtsLabDescription.victoryConditions, ...rtsLabDescription.failureConditions, ...rtsLabDescription.metrics.map((metric) => `${metric.label}: ${metric.description}${metric.badWhen ? ` Warning: ${metric.badWhen}` : ""}`)]) {
  const paragraph = document.createElement("p"); paragraph.textContent = rule; rulesElement.append(paragraph);
}
renderMeasurements();

window.addEventListener("beforeunload", () => registration.dispose());
