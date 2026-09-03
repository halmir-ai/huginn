import "./trials.css";

const github = "https://github.com/halmir-ai/huginn";
const app = document.querySelector<HTMLElement>("#app");

if (!app) throw new Error("Missing trials page root.");

app.innerHTML = `
  <main>
    <nav aria-label="Huginn navigation">
      <a class="brand" href="../">HUGINN <span>/ ARCADE</span></a>
      <div class="nav-links">
        <a href="../games/coil/">COIL</a>
        <a href="../games/starfall/">STARFALL</a>
        <a href="${github}">Source ↗</a>
      </div>
    </nav>

    <header class="hero">
      <p class="eyebrow">FEATURE-AUTHORING TRIALS · PLANNED</p>
      <h1>Same game.<br /><em>New feature.</em><br />Two ways to build it.</h1>
      <p class="lead">Optional WebMCP exposes live canvas game state, legal actions, and bounded experiments.</p>
      <div class="hero-meta">
        <span>Feature-authoring comparison: <strong>not measured yet</strong></span>
        <a href="#method">Read the trial contract ↓</a>
      </div>
    </header>

    <section class="principle" aria-labelledby="principle-title">
      <p class="eyebrow">THE CONTROL IS REAL</p>
      <h2 id="principle-title">One source. One feature brief. One model configuration.</h2>
      <p>Both treatments may inspect source, write tests, and use browser controls and diagnostics. The control genuinely excludes the Huginn runtime; only the optional treatment has its live game interface.</p>
    </section>

    <section class="game-grid" aria-label="Planned game trials">
      <article class="game-card coil">
        <div class="art-frame">
          <img src="../assets/arcade/coil.png" alt="COIL, a neon Snake game, in play on its grid." />
        </div>
        <div class="card-body">
          <p class="eyebrow">01 / COIL · SNAKE</p>
          <h2>Emergency shield</h2>
          <p class="feature">Specified feature trial: a once-per-run shield that protects the next fatal collision, then leaves the run alive without awarding score.</p>
          <div class="treatments" aria-label="COIL treatment links">
            <a class="action primary" href="../games/coil/">Play with Huginn <span>→</span></a>
            <a class="action" href="../games/coil/plain/">Play standalone <span>→</span></a>
          </div>
          <p class="fine-print">Same game source, configured model, and feature brief. The standalone version has no Huginn runtime, adapter, tool registration, or experiment dock.</p>
        </div>
      </article>

      <article class="game-card starfall">
        <div class="art-frame">
          <img src="../assets/arcade/starfall.png" alt="STARFALL pinball table with illuminated bumpers and flippers." />
        </div>
        <div class="card-body">
          <p class="eyebrow">02 / STARFALL · PINBALL</p>
          <h2>Launch ball saver</h2>
          <p class="feature">Specified feature trial: each newly launched ball gets one saver for its first eight simulated seconds before a normal drain applies.</p>
          <div class="treatments" aria-label="STARFALL treatment links">
            <a class="action primary" href="../games/starfall/">Play with Huginn <span>→</span></a>
            <a class="action" href="../games/starfall/plain/">Play standalone <span>→</span></a>
          </div>
          <p class="fine-print">Same game source, configured model, and feature brief. The standalone version has no Huginn runtime, adapter, tool registration, or experiment dock.</p>
        </div>
      </article>
    </section>

    <section id="method" class="method" aria-labelledby="method-title">
      <div>
        <p class="eyebrow">AGENT ON-RAMP</p>
        <h2 id="method-title">Ask about the running game, then make a bounded move.</h2>
      </div>
      <ol>
        <li><code>describe_game</code> + <code>list_legal_actions</code><span>Read rules, controls, and the actions available right now.</span></li>
        <li><code>snapshot_game</code> + <code>apply_action_sequence</code><span>Save a known state, then try only legal actions in a bounded sequence.</span></li>
        <li><code>get_metrics</code> + <code>restore_game</code><span>Review the result and return to the saved point for a comparable next attempt.</span></li>
      </ol>
      <p class="method-links"><a href="${github}/blob/main/src/play/bridge.ts">Inspect the bridge library ↗</a> <span aria-hidden="true">·</span> <a href="${github}">Browse the source repository ↗</a></p>
    </section>

    <section class="evidence" aria-labelledby="evidence-title">
      <p class="eyebrow">WHAT WILL BE REPORTED</p>
      <h2 id="evidence-title">Acceptance and evidence, not a promised outcome.</h2>
      <p>When the paired trials run, this page can append acceptance results, unmet requirements, source revisions, checks, browser/tool calls, failed commands, and task links. It will not infer token cost, iteration savings, or speed from page interaction counts.</p>
      <div id="trial-results" class="pending" aria-live="polite">Results slot — pending the completed paired trials.</div>
      <div id="trial-task-links" class="task-links">Task and source links slot — pending the completed paired trials.</div>
    </section>

    <aside class="pilot-note">
      <p class="eyebrow">EARLIER INTERACTION PILOT</p>
      <p><a href="../compare/">Earlier interaction pilot (different games) ↗</a> records browser interaction evidence for RTS Lab and Tideglass. Those are not COIL or STARFALL feature-trial results.</p>
    </aside>

    <footer>
      <span>Huginn · MIT code</span>
      <span>Optional WebMCP for live, bounded game experiments</span>
    </footer>
  </main>
`;
