import "./style.css";
import { createRiverlandsAdapter, riverlandsDescription, type RiverlandsAction, type RiverlandsEvent, type RiverlandsState } from "./demo/riverlands";
import { HuginnKernel } from "./huginn/kernel";
import type { RenderContext } from "./huginn/types";
import { registerWebMcpTools } from "./huginn/webmcp";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing app root.");

app.innerHTML = `
  <main>
    <header class="hero">
      <p class="eyebrow">WebMCP game experiments</p>
      <h1>Huginn</h1>
      <p class="lede">An agent can understand the live game, choose legal moves, run a visible experiment, and reproduce the result from the same seed.</p>
      <div class="status-row">
        <span id="webmcp-status" class="pill">Checking WebMCP…</span>
        <span id="checksum" class="mono"></span>
      </div>
    </header>

    <section class="workspace">
      <article class="game-card">
        <div class="card-heading">
          <div>
            <p class="eyebrow">Integration fixture</p>
            <h2>Riverlands settlement</h2>
          </div>
          <span id="turn" class="turn">Turn 0</span>
        </div>
        <div id="settlement" class="settlement" aria-label="Visible game state"></div>
        <dl id="metrics" class="metrics"></dl>
        <div class="controls">
          <button id="run-demo">Run seeded experiment</button>
          <button id="reset" class="secondary">Reset seed 12</button>
        </div>
        <p class="fixture-note">This compact economy proves the kernel. Dawn of People replaces it as the submission hero after provenance review.</p>
      </article>

      <aside class="experiment-card">
        <div class="card-heading">
          <div>
            <p class="eyebrow">Committed-prefix ledger</p>
            <h2>Experiment trace</h2>
          </div>
          <span id="run-state" class="pill muted">Idle</span>
        </div>
        <ol id="trace" class="trace"><li>Waiting for an experiment.</li></ol>
      </aside>
    </section>
  </main>
`;

const metricsElement = document.querySelector<HTMLDListElement>("#metrics")!;
const settlementElement = document.querySelector<HTMLDivElement>("#settlement")!;
const traceElement = document.querySelector<HTMLOListElement>("#trace")!;
const checksumElement = document.querySelector<HTMLSpanElement>("#checksum")!;
const statusElement = document.querySelector<HTMLSpanElement>("#webmcp-status")!;
const runStateElement = document.querySelector<HTMLSpanElement>("#run-state")!;
const turnElement = document.querySelector<HTMLSpanElement>("#turn")!;

let renderIndex = 0;

async function render(
  state: RiverlandsState,
  context: RenderContext<RiverlandsAction, RiverlandsEvent>,
) {
  renderIndex += 1;
  turnElement.textContent = `Turn ${state.turn}`;
  metricsElement.innerHTML = Object.entries({
    Food: state.food,
    Wood: state.wood,
    People: `${state.population}/${state.housing}`,
    Wellbeing: `${state.wellbeing}%`,
  })
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`)
    .join("");

  const houses = Math.max(1, Math.ceil(state.housing / 2));
  settlementElement.innerHTML = `
    <div class="river"></div>
    <div class="houses">${Array.from({ length: houses }, () => "<span class='house'>⌂</span>").join("")}</div>
    <div class="people">${Array.from({ length: state.population }, () => "<span class='person'>●</span>").join("")}</div>
    <div class="pulse" style="--pulse:${renderIndex}"></div>
  `;

  if (context.kind === "reset") {
    traceElement.innerHTML = "<li>State reset from seed 12.</li>";
  } else if (context.kind === "restore") {
    traceElement.insertAdjacentHTML("beforeend", "<li><strong>Restored</strong> a verified snapshot.</li>");
  } else if (context.action) {
    const eventText = context.events.map((event) => event.type.replaceAll("_", " ")).join(", ");
    traceElement.insertAdjacentHTML(
      "beforeend",
      `<li><strong>${context.action.type.replaceAll("_", " ")}</strong><span>${eventText}</span></li>`,
    );
    traceElement.scrollTop = traceElement.scrollHeight;
  }
}

const adapter = createRiverlandsAdapter(render);
const kernel = new HuginnKernel(adapter, 12);
await kernel.initialize();

async function refreshChecksum() {
  const current = await kernel.getState();
  checksumElement.textContent = `state ${current.checksum.slice(0, 12)}`;
}

const registration = await registerWebMcpTools(
  kernel,
  riverlandsDescription.actions.map((action) => action.inputSchema),
).catch((error: unknown) => {
  console.error("WebMCP registration failed", error);
  return { supported: false, toolNames: [], dispose: () => {} };
});

statusElement.textContent = registration.supported
  ? `${registration.toolNames.length} WebMCP tools live`
  : "WebMCP unavailable — page demo still works";
statusElement.classList.toggle("ready", registration.supported);
await refreshChecksum();

document.querySelector<HTMLButtonElement>("#run-demo")!.addEventListener("click", async () => {
  runStateElement.textContent = "Running visibly";
  runStateElement.classList.add("ready");
  traceElement.innerHTML = "";
  const actions: RiverlandsAction[] = [
    { type: "gather_wood" },
    { type: "gather_wood" },
    { type: "build_house" },
    { type: "gather_food" },
    { type: "grow_population" },
    { type: "gather_food" },
    { type: "end_turn" },
  ];
  try {
    const result = await kernel.applyActionSequence({
      request_id: `page-demo-${Date.now()}`,
      seed: 12,
      actions,
      speed: "watch",
    });
    runStateElement.textContent = `${result.status} · ${result.appliedSteps} steps`;
  } catch (error) {
    runStateElement.textContent = error instanceof Error ? error.message : "Experiment failed";
  }
  await refreshChecksum();
});

document.querySelector<HTMLButtonElement>("#reset")!.addEventListener("click", async () => {
  await kernel.reset(12);
  runStateElement.textContent = "Idle";
  runStateElement.classList.remove("ready");
  await refreshChecksum();
});

window.addEventListener("beforeunload", () => registration.dispose());
