import "./comparison.css";

type Trial = {
  game: string; sourceCommit: string; uiCommands: number; webmcpMutations: number;
  webmcpReads: number; webmcpTotal: number; matchedSteps: number; replaySteps: number;
  gameBearingBrowserEnvelopes: { ui: number; webmcp: number };
  rawReceipts: string[];
};

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `<main><p>Loading the recorded experiment receipts…</p></main>`;
const root = new URL("../", location.href);
const dataRoot = new URL("demo/comparison/", root);
const github = "https://github.com/halmir-ai/huginn";
const escape = (value: string | number) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]!);
const url = (path: string) => new URL(path, root).href;

try {
  const response = await fetch(new URL("results.json", dataRoot));
  if (!response.ok) throw new Error(`Evidence request returned ${response.status}`);
  const report = await response.json() as { format: string; games: Trial[] };
  if (report.format !== "huginn/comparison-pilot-v1" || report.games.length !== 2) throw new Error("Unexpected evidence format");

  const card = (game: Trial) => {
    const strategy = game.game === "rts-lab";
    const name = strategy ? "Ashenbanner RTS Lab" : "Tideglass Relay";
    const path = strategy ? "lab/" : "tideglass/";
    return `<article class="game-card ${strategy ? "strategy" : "courier"}">
      <p class="kicker">${strategy ? "01 / STRATEGY" : "02 / LOGISTICS PUZZLE"}</p>
      <h2>${name}</h2>
      <p>${strategy ? "Compare military rush and economy-first build orders at cycle 3." : "Deliver three messages across a coastal network before the eighth watch."}</p>
      <div class="actions"><a class="primary" href="${url(path)}">Play with WebMCP ↗</a><a href="${url(`${path}?webmcp=off`)}">WebMCP off · same UI</a></div>
      <dl class="numbers"><div><dt>Ordinary game commands</dt><dd>${game.uiCommands}</dd></div><div><dt>WebMCP mutations</dt><dd>${game.webmcpMutations}</dd></div><div><dt>Matching state transitions</dt><dd>${game.matchedSteps}<span>/${game.matchedSteps}</span></dd></div></dl>
      <p class="result-note">Plus ${game.webmcpReads} read-only WebMCP calls (${game.webmcpTotal} total). One snapshot, two plans, two restores, one fresh replay. Replay matched all ${game.replaySteps} step records.</p>
      <p class="scope-note">Browser calls carrying game commands: ${game.gameBearingBrowserEnvelopes.ui} UI / ${game.gameBearingBrowserEnvelopes.webmcp} WebMCP. Both allowed batching. Page commands are not browser calls or tokens.</p>
      <details><summary>Inspect this pair’s original receipts</summary><p>Recorded source <a href="${github}/commit/${escape(game.sourceCommit)}">${escape(game.sourceCommit)}</a>; seed 12. This is a preplanned replay, not a cold-start agent trial.</p><div class="receipt-links">${game.rawReceipts.map((file) => `<a href="${new URL(file, dataRoot).href}">${file.includes("ui-off") ? "UI-off receipt ↗" : "Real WebMCP receipt ↗"}</a>`).join("")}</div></details>
    </article>`;
  };

  app.innerHTML = `
    <main>
      <nav aria-label="Huginn navigation"><a class="brand" href="${url("")}">◈ HUGINN</a><a href="${github}">Open-source repo ↗</a></nav>
      <header><p class="kicker">PLAYABLE EXAMPLES / INSPECTABLE EVIDENCE</p><h1>Two games.<br><em>One experiment contract.</em></h1><p class="intro">Give a coding agent rules, live state and legal actions. Let it run an experiment while you watch—and reproduce what happened.</p><div class="chips"><span>7 shared WebMCP tools</span><span>Live, visible execution</span><span>Seeded replay</span></div></header>

      <section class="start" aria-labelledby="start-title"><div><p class="kicker">JUDGE QUICK START</p><h2 id="start-title">Open a game. Try a plan. Ask an agent.</h2></div><ol><li><b>Play:</b> ordinary controls and labeled page presets work without an agent.</li><li><b>Connect:</b> open the same URL in a WebMCP-capable browser and ask the agent to discover the tools.</li><li><b>Experiment:</b> inspect the rules, save a snapshot, run a plan, restore, then replay with a new request ID.</li></ol><p>Actual calls are labeled WebMCP. Page presets are labeled UI. No login, API key, installation or gameplay server is needed.</p></section>

      <section class="game-grid" aria-label="Playable example games">${report.games.map(card).join("")}</section>

      <section class="interpretation"><p class="kicker">WHAT THIS PILOT DOES—AND DOES NOT—SHOW</p><h2>Fewer page commands. The same verified behavior.</h2><p>Both routes completed the same actions, from identical starting states. Every per-step state checksum and metric matched. The WebMCP route returned per-step events and checksums directly; the UI route used a full, deliberately generous state inspector.</p><p>The count difference demonstrates the batching interface in these two examples. It does <strong>not</strong> establish lower token cost, fewer coding iterations, faster execution, or better games. This is one paired replay per game, carried out by the same operator with fixed plans—not a comparative model benchmark.</p><div class="unknowns"><span>Model-token cost <b>Not measured</b></span><span>Iteration savings <b>Not measured</b></span><span>Code savings <b>Not measured</b></span></div><p><a href="${github}/blob/codex/video-strategy/docs/demo/COMPARISON_PROTOCOL.md">Read the predeclared protocol ↗</a> · <a href="${new URL("results.json", dataRoot).href}">Download verified results JSON ↗</a></p></section>

      <section class="authoring"><div><p class="kicker">BUILT WITH THE CONTRACT FROM THE START</p><h2>From a design request<br>to a measurable revision.</h2></div><div><p>Tideglass was authored in a separate Codex task. Its original Signal route already met the first design target. We preserved that result, then explicitly requested a new resource-budget revision: make the same no-relay route finish with two battery, while retaining the relay’s advantage.</p><p>The before/after source, exact plans and measured receipts are available in the <a href="${github}/blob/codex/video-strategy/docs/demo/TIDEGLASS_REFINEMENT.md">authoring record</a>. This is an example of measured iteration, not evidence of iteration savings.</p><p>The original new game and adapter share a <b>221-line file</b>; its original page, rendering, CSS and HTML add <b>470 lines</b>. The adapter is real integration work—not a “forty lines for any game” claim. No new package dependency was added.</p></div></section>

      <details class="failure"><summary>The first rehearsal found a real bug. We kept the evidence.</summary><p>On source c70862d, repeated single-click actions could evict an explicit checkpoint because every call created an automatic rollback snapshot. The UI trial then failed. The browser harness also needed to verify each restore before continuing. We preserved that failed rehearsal, fixed retention for both routes, added three regression tests, and restarted the paired trial on the corrected build. It is not counted as a completed performance run.</p><p><a href="${new URL("rts-ui-preflight-failure.json", dataRoot).href}">Failed preflight receipt ↗</a> · <a href="${github}/commit/90aee14">Checkpoint fix and tests ↗</a></p></details>

      <section class="closing"><h2>The designer chooses what “better” means.<br>Huginn makes the behavior inspectable.</h2><p>Visual testing and human play still matter. This layer adds a discoverable, typed way to test the running simulation—without pretending pixels alone explain its rules.</p><a class="primary" href="${url("")}">Run your own experiment ↗</a></section>
      <footer>Huginn · MIT code · RTS art CC BY 4.0 · Tideglass original vector coast · <a href="${github}/blob/codex/video-strategy/docs/ASSET_LICENSE.md">Asset provenance</a></footer>
    </main>`;
} catch (error) {
  app.innerHTML = `<main><h1>Evidence is temporarily unavailable.</h1><p>${escape(String(error))}</p><p><a href="${url("")}">Play RTS Lab</a> · <a href="${url("tideglass/")}">Play Tideglass Relay</a></p></main>`;
}
