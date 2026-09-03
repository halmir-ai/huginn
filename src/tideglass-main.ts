import "./tideglass.css";
import {
  BATTERY_CAPACITY, DESTINATIONS, HORIZON, HUGINN_BASE, LANES, STATIONS, STATION_NAMES, TIDEGLASS_VERSION,
  connectTideglassWebMcp, createTideglassAdapter, sailingCost, seaForecast, signalRoute, tideglassDescription, unassistedRoute,
  type Station, type TideglassAction, type TideglassEvent, type TideglassMetrics, type TideglassState,
} from "./demo/tideglass";
import { canonicalEqual, checksum } from "./huginn/canonical";
import { HuginnKernel } from "./huginn/kernel";
import type { RenderContext, SequenceResult, SnapshotRecord } from "./huginn/types";
import type { ToolActivity } from "./huginn/webmcp";
import { InteractionLedger, webMcpEnabled } from "./demo/interaction-ledger";
import adapterSource from "./demo/tideglass.ts?raw";
import kernelSource from "./huginn/kernel.ts?raw";
import webMcpSource from "./huginn/webmcp.ts?raw";
import canonicalSource from "./huginn/canonical.ts?raw";

type Run = SequenceResult<TideglassAction, TideglassEvent, TideglassMetrics>;
type Source = "Human UI" | "UI plan" | "WebMCP";
const root = document.querySelector<HTMLDivElement>("#app");
if (!root) throw new Error("Missing Tideglass app root.");
// This template is static. All runtime text and tool data use textContent.
root.innerHTML = `
  <main class="tg-shell">
    <header class="tg-header">
      <a id="back-link" class="tg-brand">◈ HUGINN <span>/ PLAYABLE EXPERIMENT 02</span></a>
      <a id="mode-link" class="tg-mode-link"></a>
    </header>
    <section class="tg-intro">
      <div><p class="tg-eyebrow">A coastal courier puzzle</p><h1>Tideglass <em>Relay</em></h1>
      <p class="tg-lede">Three messages. One small boat. Eight watches before the storm.</p></div>
      <div class="tg-runtime"><span id="mode-status" class="tg-pill">Checking WebMCP…</span><span id="version"></span></div>
    </section>
    <div class="tg-workspace">
      <section class="tg-chart-card" aria-label="Live game">
        <div class="tg-chart-head"><span><i class="tg-live-dot"></i> THE TIDEGLASS COAST</span><span id="forecast"></span></div>
        <div class="tg-canvas-wrap"><canvas id="coast" width="1000" height="610" aria-label="Five-station coastal chart. Use the legal action buttons to move the courier."></canvas></div>
        <div class="tg-storm"><div class="tg-storm-label"><span id="storm-label">Storm clock</span><b id="watch-label"></b></div><div id="watch-track" class="tg-watch-track" aria-hidden="true"></div></div>
        <div class="tg-scoreboard"><div><span>MESSAGES</span><b id="delivered-metric"></b></div><div><span>BATTERY</span><b id="battery-metric"></b></div><div><span>RELAY</span><b id="relay-metric"></b></div></div>
        <p id="game-status" class="tg-game-status" role="status"></p>
      </section>
      <aside class="tg-command-card">
        <p class="tg-eyebrow">You have the helm</p><h2 id="position"></h2>
        <p id="action-help" class="tg-help"></p><div id="legal-actions" class="tg-actions"></div>
        <div class="tg-manifest"><h3>Messages aboard</h3><ul id="manifest"></ul></div>
        <details class="tg-rules" open><summary>How to play</summary><ul>
          <li>Every action uses <strong>1 watch</strong>. Sailing follows the charted lanes and costs <strong>2 battery in calm seas, 3 in rough</strong>.</li>
          <li>At Relay Isle, deploy the relay for <strong>1 battery</strong>. All later sailing costs <strong>1</strong>.</li>
          <li>Deliver at each destination. Recharge <strong>+3</strong> at Haven or Relay Isle, up to ${BATTERY_CAPACITY}. Delivery and waiting cost no battery.</li>
          <li>The forecast advances after every action. All routes close after watch 8. Deliver all three messages to win.</li>
        </ul></details>
      </aside>
    </div>
    <section class="tg-controls" aria-label="Reset and snapshots">
      <div class="tg-reset"><label for="seed-input">SEED</label><input id="seed-input" type="number" min="0" max="2147483647" step="1" value="12"><button id="reset">New voyage</button></div>
      <div class="tg-snapshot-controls"><button id="snapshot">Save snapshot</button><select id="snapshot-select" aria-label="Saved snapshot"><option value="">No saved snapshot</option></select><button id="restore" disabled>Restore</button></div>
      <p id="snapshot-note">Snapshots live in this tab. The latest explicit checkpoint is protected; older snapshots share a bounded 12-entry store.</p>
    </section>
    <section class="tg-lab" aria-label="Huginn experiment notebook">
      <div class="tg-lab-title"><div><p class="tg-eyebrow">Same game. Inspectable experiment.</p><h2>The courier’s notebook</h2></div><span id="activity" class="tg-pill" aria-live="polite">Ready to play</span></div>
      <p class="tg-target"><strong>Original target:</strong> 3 messages by watch 8 with at least 2 battery; Signal already passed. <strong>New design revision:</strong> Unassisted must keep 2 battery, and Signal at least 3 more. Compare the fixed seed-12 plans at watch 8.</p>
      <div class="tg-plan-grid">
        <article><span class="tg-plan-letter">A</span><h3>Signal route</h3><p>Haven → Relay Isle → Saltmill → Lantern → Breakwater. Deploy at Relay Isle; deliver at each destination.</p><button id="signal-plan">Run Signal route · UI plan</button></article>
        <article><span class="tg-plan-letter">B</span><h3>Unassisted route</h3><p>The same sailing route and watches. Wait at Relay Isle instead of deploying. All other actions are identical.</p><button id="unassisted-plan">Run Unassisted route · UI plan</button></article>
      </div>
      <p class="tg-help">These buttons reset to seed 12 and run through the same kernel as individual moves. They are page controls; only calls received through WebMCP are labeled WebMCP.</p>
      <p id="run-comparison" class="tg-comparison">No measured run in this tab. Compare plans at the same watch and source version; a passing baseline is a valid result.</p>
      <div class="tg-evidence-grid"><div><h3>Visible action trace <span id="trace-count">0</span></h3><ol id="trace" class="tg-trace"></ol></div>
        <div><h3>Receipt <button id="download-receipt" class="tg-small-button">Download JSON</button></h3><pre id="receipt">No completed action or tool call yet.</pre></div></div>
      <details class="tg-tools"><summary id="tool-summary">Tool surface</summary><ul id="tool-list"></ul><p id="tool-note">Waiting for browser capability check.</p></details>
      <details class="tg-tools"><summary>Live state, metrics &amp; complete rules</summary><p>Readable in both modes. This inspector exposes the same canonical state, metric semantics, and rules used by the tools.</p><h3>Current state and metrics</h3><pre id="state-inspector"></pre><h3>Rules and metric definitions</h3><pre id="rules-inspector"></pre></details>
      <details class="tg-tools"><summary>Interaction measurements</summary><p>Page commands, not model tokens or browser-tool envelopes. Both modes keep the same game and controls. UI plan previews are excluded. <a id="comparison-link">See the paired pilot and its limitations.</a></p><pre id="interaction-counts"></pre></details>
      <p id="error" class="tg-error" role="alert"></p>
    </section>
    <footer class="tg-footer"><p>Original vector coast · MIT · deterministic Huginn kernel</p><p id="source-identity"></p><p id="live-checksum"></p></footer>
  </main>`;

function element<T extends HTMLElement = HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing Tideglass element: ${id}`);
  return found as T;
}
const put = (id: string, value: string) => { element(id).textContent = value; };
const canvas = element<HTMLCanvasElement>("coast");
const drawing = canvas.getContext("2d");
if (!drawing) throw new Error("Canvas 2D unavailable.");
const ctx: CanvasRenderingContext2D = drawing;
const coordinates: Record<Station, [number, number]> = {
  haven: [125, 323], relay_isle: [362, 307], saltmill: [602, 145], lantern: [777, 310], breakwater: [608, 482],
};
const snapshots = new Map<string, SnapshotRecord>();
const requestSources = new Map<string, Source>();
const runs: { result: Run; source: Source }[] = [];
let currentState: TideglassState;
let uiBusy = false;
let activeTools = 0;
let sequenceNumber = 0;
let traceCount = 0;
let lastReceipt: unknown = null;
const sourceDigest = await checksum({ adapter: adapterSource, kernel: kernelSource, webmcp: webMcpSource, canonical: canonicalSource });
const identity = { game: tideglassDescription.id, rulesVersion: TIDEGLASS_VERSION, huginnBase: HUGINN_BASE, sourceDigest,
  digestFormat: "SHA-256 of Huginn canonical JSON object containing adapter, kernel, webmcp, canonical source strings" };

// The nested page needs one level up when Vite uses its relative Pages base.
const baseUrl = import.meta.env.BASE_URL;
const siteRoot = baseUrl === "./" || baseUrl === "" ? new URL("../", location.href) : new URL(baseUrl, location.origin);
element<HTMLAnchorElement>("back-link").href = siteRoot.href;
const offMode = !webMcpEnabled(location.search);
const ledger = new InteractionLedger(tideglassDescription.id, !offMode);
element<HTMLAnchorElement>("comparison-link").href = new URL("compare/", siteRoot).href;
const modeUrl = new URL(location.href);
if (offMode) modeUrl.searchParams.delete("webmcp"); else modeUrl.searchParams.set("webmcp", "off");
element<HTMLAnchorElement>("mode-link").href = modeUrl.href;
put("mode-link", offMode ? "WebMCP on · same UI ↗" : "WebMCP off · same UI ↗");
put("version", `Rules ${TIDEGLASS_VERSION} · seed 12`);
put("source-identity", `Authored from Huginn ${HUGINN_BASE.slice(0, 12)} · current rules/core source ${sourceDigest}`);
put("rules-inspector", JSON.stringify(tideglassDescription, null, 2));

function drawCoast(state: TideglassState): void {
  const sea = ctx.createLinearGradient(0, 0, 1000, 610);
  sea.addColorStop(0, "#153f49"); sea.addColorStop(1, "#092830");
  ctx.fillStyle = sea; ctx.fillRect(0, 0, 1000, 610);
  ctx.strokeStyle = "#72b5be18"; ctx.lineWidth = 1;
  for (let x = 35; x < 1000; x += 54) for (let y = 28; y < 610; y += 54) {
    ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x + 3, y); ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 3); ctx.stroke();
  }
  // Drawn from fixed geometry. No art, animation, or timing feeds the reducer.
  ctx.strokeStyle = "#9ad4d429";
  for (let i = 0; i < 12; i++) {
    const y = 47 + i * 49;
    ctx.beginPath(); ctx.moveTo(15, y); ctx.bezierCurveTo(110, y - 14, 177, y + 20, 241, y + 5); ctx.stroke();
  }
  ctx.save(); ctx.globalAlpha = 0.10 + state.watch * 0.018; ctx.fillStyle = "#a6c4d0";
  ctx.beginPath(); ctx.moveTo(870 - state.watch * 8, 0); ctx.bezierCurveTo(730, 85, 920, 147, 1000, 242); ctx.lineTo(1000, 0); ctx.fill(); ctx.restore();
  ctx.font = "600 14px system-ui"; ctx.fillStyle = "#99b6bb"; ctx.fillText("STORM FRONT", 823, 44);
  ctx.strokeStyle = "#bedbd873"; ctx.lineWidth = 2;
  for (const [a, b] of LANES) {
    const [ax, ay] = coordinates[a], [bx, by] = coordinates[b];
    const active = a === state.station || b === state.station;
    ctx.setLineDash([5, 9]); ctx.strokeStyle = state.relay ? "#70dcbb8c" : active ? "#f5d397a6" : "#a4c7cb54";
    ctx.lineWidth = active ? 3 : 2; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const station of STATIONS) {
    const [x, y] = coordinates[station];
    const delivered = DESTINATIONS.includes(station as typeof DESTINATIONS[number]) && state.delivered[station as typeof DESTINATIONS[number]];
    const active = state.station === station;
    ctx.fillStyle = "#41757b"; ctx.strokeStyle = "#68a2a18a"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(x, y + 8, station === "relay_isle" ? 70 : 55, 39, -0.13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = active ? "#f3d6a0" : "#aec9b7";
    ctx.beginPath(); ctx.ellipse(x - 3, y, station === "relay_isle" ? 51 : 38, 26, -0.13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#193f46"; ctx.fillStyle = "#224b50"; ctx.lineWidth = 3;
    if (station === "relay_isle") {
      ctx.beginPath(); ctx.moveTo(x - 11, y + 9); ctx.lineTo(x, y - 22); ctx.lineTo(x + 11, y + 9); ctx.closePath(); ctx.stroke();
      ctx.fillRect(x - 13, y + 9, 26, 5);
      if (state.relay) {
        ctx.strokeStyle = "#89f1c5"; ctx.lineWidth = 3;
        for (const radius of [29, 40]) { ctx.beginPath(); ctx.arc(x, y - 18, radius, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
      }
    } else {
      ctx.fillRect(x - 12, y - 13, 24, 24); ctx.beginPath(); ctx.moveTo(x - 18, y - 13); ctx.lineTo(x, y - 27); ctx.lineTo(x + 18, y - 13); ctx.fill();
      ctx.fillStyle = "#e8bf7b"; ctx.fillRect(x - 3, y - 5, 6, 10);
    }
    if (delivered) { ctx.fillStyle = "#8cf0ca"; ctx.beginPath(); ctx.arc(x + 36, y - 24, 13, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#173e40"; ctx.font = "bold 17px system-ui"; ctx.fillText("✓", x + 29, y - 18); }
    ctx.textAlign = "center"; ctx.font = "600 20px system-ui"; ctx.fillStyle = "#f5eedc"; ctx.fillText(STATION_NAMES[station], x, y + 66);
    ctx.font = "13px system-ui"; ctx.fillStyle = "#bfd6d6";
    ctx.fillText(station === "haven" ? "HOME · CHARGE" : station === "relay_isle" ? "RELAY · CHARGE" : delivered ? "MESSAGE DELIVERED" : "MESSAGE ABOARD", x, y + 88);
  }
  const [x, y] = coordinates[state.station];
  ctx.save(); ctx.translate(x, y - 74); ctx.fillStyle = "#f7ce85"; ctx.strokeStyle = "#112f39"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-16, 4); ctx.lineTo(16, 4); ctx.lineTo(8, 15); ctx.lineTo(-8, 15); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 3); ctx.lineTo(0, -25); ctx.lineTo(15, -4); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  ctx.textAlign = "left"; ctx.fillStyle = "#9ababd"; ctx.font = "13px system-ui";
  ctx.fillText("— —  SAILING LANE", 32, 565); ctx.fillText("▲  YOUR COURIER", 230, 565);
  ctx.textAlign = "center"; ctx.font = "600 13px system-ui"; ctx.fillText("N", 77, 69);
  ctx.strokeStyle = "#84a5aa"; ctx.beginPath(); ctx.moveTo(77, 82); ctx.lineTo(77, 119); ctx.moveTo(59, 100); ctx.lineTo(95, 100); ctx.stroke();
}

function updateBusy(): void {
  const busy = uiBusy || activeTools > 0;
  for (const button of document.querySelectorAll<HTMLButtonElement>("#legal-actions button, #reset, #snapshot, #signal-plan, #unassisted-plan")) button.disabled = busy;
  element<HTMLButtonElement>("restore").disabled = busy || !element<HTMLSelectElement>("snapshot-select").value;
  element<HTMLInputElement>("seed-input").disabled = busy;
  put("interaction-counts", JSON.stringify(ledger.report(), null, 2));
}

function showReceipt(source: Source, kind: string, data: unknown): void {
  lastReceipt = { identity, source, kind, data };
  put("receipt", JSON.stringify(lastReceipt, null, 2));
}

function rememberSnapshot(snapshot: SnapshotRecord, source: Source): void {
  snapshots.set(snapshot.id, snapshot);
  while (snapshots.size > 12) snapshots.delete(snapshots.keys().next().value!);
  const select = element<HTMLSelectElement>("snapshot-select"); select.replaceChildren();
  for (const item of snapshots.values()) {
    const option = document.createElement("option"); option.value = item.id;
    option.textContent = `${item.id.slice(0, 22)} · seed ${item.seed}`; select.append(option);
  }
  select.value = snapshot.id;
  put("snapshot-note", `${source} snapshot · ${snapshot.id} · SHA-256 ${snapshot.checksum}. Latest explicit checkpoint protected; older snapshots may expire. Tab-local.`);
  updateBusy();
}

function recordRun(result: Run, source: Source): void {
  showReceipt(source, "apply_action_sequence", result);
  put("activity", `${source} · ${result.status} · ${result.appliedSteps} steps`);
  const previous = runs.at(-1);
  const outcome = `${source}: ${result.metrics.delivered}/3 messages · ${result.metrics.battery} battery · watch ${result.metrics.watch}/8 · target ${result.metrics.target_met ? "met" : "not met"}.`;
  let comparison = "";
  if (previous && result.steps.length > 0 && previous.result.steps.length > 0) {
    const sameBase = previous.result.steps[0].beforeChecksum === result.steps[0].beforeChecksum;
    const sameActions = canonicalEqual(previous.result.steps.map((s) => s.action), result.steps.map((s) => s.action));
    if (sameBase && sameActions && previous.result.status === "completed" && result.status === "completed" && !result.cached) {
      comparison = canonicalEqual(previous.result.steps, result.steps) && previous.result.finalChecksum === result.finalChecksum
        ? " Same-build replay: all step records and final checksum match the previous run."
        : " Replay mismatch: inspect both receipts.";
    } else if (sameBase && previous.result.metrics.watch === result.metrics.watch) {
      comparison = ` Same initial checksum and ending watch as previous ${previous.source} run (${previous.result.metrics.delivered}/3, ${previous.result.metrics.battery} battery). Different plans do not establish replay equality.`;
    } else comparison = " Previous run has a different base or horizon; no controlled comparison claimed.";
  }
  put("run-comparison", outcome + comparison);
  runs.push({ result: structuredClone(result), source }); if (runs.length > 4) runs.shift();
  if (result.status === "error") put("error", `Stopped after ${result.appliedSteps} committed actions: ${result.stopReason} at index ${result.errorIndex}. Use the receipt's rollback snapshot to restore if needed.`);
}

async function render(state: TideglassState, context: RenderContext<TideglassAction, TideglassEvent>): Promise<void> {
  currentState = state;
  const metrics = adapter.metrics(state);
  drawCoast(state);
  put("version", `Rules ${TIDEGLASS_VERSION} · seed ${state.seed}`);
  element<HTMLInputElement>("seed-input").value = String(state.seed);
  put("forecast", `NEXT WATCH: ${seaForecast(state).toUpperCase()} · SAIL ${sailingCost(state)} BATTERY`);
  put("position", STATION_NAMES[state.station]);
  put("action-help", state.watch < HORIZON ? "Choose a legal action. Every choice advances one watch." : "The storm has closed the lanes. Start a new voyage or restore a snapshot.");
  put("watch-label", `${state.watch} / ${HORIZON}`);
  put("storm-label", state.watch === HORIZON ? "Storm has arrived" : `${HORIZON - state.watch} watches until the storm`);
  const track = element("watch-track"); track.replaceChildren();
  for (let index = 0; index < HORIZON; index++) { const segment = document.createElement("span"); segment.className = index < state.watch ? "spent" : ""; track.append(segment); }
  put("delivered-metric", `${metrics.delivered} / 3`); put("battery-metric", `${state.battery} / ${BATTERY_CAPACITY}`); put("relay-metric", state.relay ? "ONLINE" : "OFFLINE");
  const status = metrics.delivered === 3 ? `All messages delivered. ${metrics.target_met ? "Design target met." : "Battery reserve is below the design target."}`
    : state.watch === HORIZON ? `Storm closed the route. ${metrics.delivered} of 3 messages delivered.` : "Deliver to Saltmill, Lantern, and Breakwater before watch 8.";
  put("game-status", status); element("game-status").classList.toggle("success", metrics.target_met);
  const manifest = element("manifest"); manifest.replaceChildren();
  for (const station of DESTINATIONS) {
    const item = document.createElement("li"); item.classList.toggle("delivered", state.delivered[station]);
    item.textContent = `${state.delivered[station] ? "✓" : "◇"} ${STATION_NAMES[station]} · ${state.delivered[station] ? "delivered" : "aboard"}`; manifest.append(item);
  }
  const actions = element("legal-actions"); actions.replaceChildren();
  for (const legal of adapter.listLegalActions(state)) {
    const button = document.createElement("button"); button.type = "button"; button.dataset.action = legal.action.type;
    const label = document.createElement("strong"); label.textContent = legal.label;
    const reason = document.createElement("span"); reason.textContent = legal.reason; button.append(label, reason);
    button.addEventListener("click", () => void perform("Human UI", () => runActions([legal.action], "Human UI"))); actions.append(button);
  }
  const source = context.requestId ? requestSources.get(context.requestId) ?? "WebMCP" : activeTools > 0 ? "WebMCP" : "Human UI";
  const item = document.createElement("li");
  const label = document.createElement("b"); label.textContent = `W${state.watch} · ${source}`;
  const detail = document.createElement("span"); detail.textContent = context.kind === "action" ? context.events.map((event) => event.message).join(" ") + ` (${metrics.delivered}/3 · ${state.battery} battery)` : `${context.kind === "reset" ? "New voyage" : "Snapshot restored"} · seed ${state.seed}.`;
  item.append(label, detail); element("trace").prepend(item);
  if (context.kind === "action") traceCount += 1;
  while (element("trace").children.length > 50) element("trace").lastElementChild?.remove();
  put("trace-count", `${traceCount} actions this tab`);
  const stateChecksum = await checksum(adapter.serialize(state));
  put("live-checksum", `Live state SHA-256 ${stateChecksum}`);
  put("state-inspector", JSON.stringify({ checksum: stateChecksum, state: adapter.serialize(state), metrics }, null, 2));
  updateBusy();
}

const adapter = createTideglassAdapter(render);
const kernel = new HuginnKernel(adapter, 12);

async function perform(source: Source, action: () => Promise<unknown>, name = "apply_action_sequence"): Promise<void> {
  if (uiBusy || activeTools > 0) return;
  uiBusy = true; put("error", ""); updateBusy();
  if (source === "Human UI") ledger.start("UI", name);
  try {
    const result = await action();
    if (source === "Human UI") ledger.complete("UI", name, result);
  } catch (error) {
    if (source === "Human UI") ledger.fail("UI", name);
    put("error", `${source}: ${error instanceof Error ? error.message : String(error)}`);
  }
  finally { uiBusy = false; updateBusy(); }
}

async function runActions(actions: TideglassAction[], source: Source, seed?: number): Promise<Run> {
  const requestId = `ui-${++sequenceNumber}`;
  requestSources.set(requestId, source);
  try {
    const result = await kernel.applyActionSequence({ request_id: requestId, actions, ...(seed === undefined ? {} : { seed }), speed: "watch" });
    recordRun(result, source);
    return result;
  } finally { requestSources.delete(requestId); }
}

function observeTool(activity: ToolActivity): void {
  if (activity.phase === "started") {
    ledger.start("WebMCP", activity.name, activity.input);
    activeTools += 1;
    put("activity", `WebMCP · ${activity.name} running`); put("error", "");
    if (typeof activity.input.request_id === "string") requestSources.set(activity.input.request_id, "WebMCP");
  } else {
    if (activity.phase === "failed") ledger.fail("WebMCP", activity.name);
    else ledger.complete("WebMCP", activity.name, activity.result);
    activeTools = Math.max(0, activeTools - 1);
    if (typeof activity.input.request_id === "string") requestSources.delete(activity.input.request_id);
    if (activity.phase === "failed") { put("error", `WebMCP ${activity.name}: ${activity.error}`); showReceipt("WebMCP", activity.name, { error: activity.error }); }
    else {
      if (activity.name === "snapshot_game") rememberSnapshot(activity.result as SnapshotRecord, "WebMCP");
      if (activity.name === "apply_action_sequence") recordRun(activity.result as Run, "WebMCP");
      else { showReceipt("WebMCP", activity.name, activity.result); put("activity", `WebMCP · ${activity.name} completed`); }
    }
  }
  updateBusy();
}

element("reset").addEventListener("click", () => void perform("Human UI", async () => {
  const input = element<HTMLInputElement>("seed-input");
  if (!input.value.trim() || !input.checkValidity()) throw new Error("Enter an integer seed from 0 through 2147483647.");
  await kernel.reset(Number(input.value));
  const result = await kernel.getState();
  showReceipt("Human UI", "reset", result); put("activity", "Human UI · new voyage");
  return result;
}, "reset"));
element("snapshot").addEventListener("click", () => void perform("Human UI", async () => {
  const snapshot = await kernel.createSnapshot(); rememberSnapshot(snapshot, "Human UI"); showReceipt("Human UI", "snapshot_game", snapshot);
  return snapshot;
}, "snapshot_game"));
element("restore").addEventListener("click", () => void perform("Human UI", async () => {
  const id = element<HTMLSelectElement>("snapshot-select").value;
  const snapshot = snapshots.get(id); if (!snapshot) throw new Error("Choose a snapshot first.");
  const result = await kernel.restoreSnapshot(id, snapshot.checksum);
  showReceipt("Human UI", "restore_game", result); put("activity", "Human UI · snapshot restored");
  return result;
}, "restore_game"));
element("snapshot-select").addEventListener("change", updateBusy);
element("signal-plan").addEventListener("click", () => void perform("UI plan", () => runActions(signalRoute, "UI plan", 12)));
element("unassisted-plan").addEventListener("click", () => void perform("UI plan", () => runActions(unassistedRoute, "UI plan", 12)));
element("download-receipt").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({ latestReceipt: lastReceipt ?? { identity, state: adapter.serialize(currentState) }, interactions: ledger.report() }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "tideglass-receipt.json"; link.click(); URL.revokeObjectURL(url);
});

await kernel.initialize();
try {
  const registration = await connectTideglassWebMcp(kernel, location.search, observeTool);
  put("mode-status", registration.disabled ? "WebMCP off, same UI" : registration.supported ? "WEBMCP CONNECTED · 7 TOOLS" : "WEBMCP UNAVAILABLE · UI READY");
  put("tool-summary", registration.disabled ? "WebMCP disabled · zero tools registered" : `${registration.toolNames.length} WebMCP tools registered`);
  for (const name of registration.toolNames) { const item = document.createElement("li"); item.textContent = name; element("tool-list").append(item); }
  put("tool-note", registration.disabled ? "Controlled baseline: registration was skipped entirely. Human controls and game rules are identical to WebMCP mode."
    : registration.supported ? "Actual tool calls produce WebMCP receipts above. Registration alone is not proof that a client discovered or called these tools."
    : "This browser does not expose document.modelContext.registerTool. Play normally; real WebMCP calls are unavailable here.");
  window.addEventListener("pagehide", registration.dispose, { once: true });
} catch (error) {
  put("mode-status", "WEBMCP REGISTRATION FAILED · UI READY");
  put("error", `WebMCP registration: ${error instanceof Error ? error.message : String(error)}`);
}
