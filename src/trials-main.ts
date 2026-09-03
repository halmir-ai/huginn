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
      <p class="eyebrow">TWO PAIRED TRIALS · COMPLETE</p>
      <h1>Same game.<br /><em>New feature.</em><br />Two ways to build it.</h1>
      <p class="lead">Optional WebMCP exposes live canvas game state, legal actions, and bounded experiments.</p>
      <div class="hero-meta">
        <span>Both paired results: <strong>better proof, not lower cost</strong></span>
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
          <p class="trial-verdict"><strong>Accepted after 2 task turns each.</strong> The standalone task was faster and smaller; Huginn produced reproducible live-state evidence the canvas alone could not expose.</p>
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
          <p class="trial-verdict"><strong>Accepted in 1 task turn each.</strong> The standalone task was faster and smaller; Huginn corrected an accounting mismatch, then proved save, relaunch, renewal and replay from live state.</p>
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
      <p class="eyebrow">COIL · ACTUAL RESULT</p>
      <h2 id="evidence-title">A useful result does not have to flatter the product.</h2>
      <p>Both implementations passed after the same human-play acceptance correction. Huginn did not reduce time, tokens, or changed lines in this single pair. It did provide canonical state, legal actions, checksummed restore, and exact replay from the running canvas. That is the claim this evidence supports.</p>
      <div id="trial-results" class="result-grid" aria-live="polite">
        <article class="result-card"><span>Standalone</span><strong>15m 57s</strong><small>3.62M total task tokens · +97/-17 production lines</small></article>
        <article class="result-card accent"><span>With Huginn</span><strong>17m 20s</strong><small>5.78M total task tokens · +118/-18 production lines</small></article>
        <article class="result-card wide"><span>What changed</span><strong>Evidence quality</strong><small>Typed six-action replay ended alive at tick 18, restored the exact checkpoint checksum, then handed the preserved run back to a human.</small></article>
      </div>
      <div id="trial-task-links" class="task-links"><a href="${github}/blob/main/docs/demo/COIL_FEATURE_TRIAL_RESULTS.md">Full measurements and caveats ↗</a> · <a href="https://chatgpt.com/s/cx_6a99ae8fe4e08191becce187708a008d">Standalone task ↗</a> · <a href="https://chatgpt.com/s/cx_6a99ae931c048191bac24d00d4f4e221">Huginn task ↗</a></div>
    </section>

    <section class="evidence" aria-labelledby="starfall-evidence-title">
      <p class="eyebrow">STARFALL · ACTUAL RESULT</p>
      <h2 id="starfall-evidence-title">The second pair repeats the honest result.</h2>
      <p>Both implementations passed the same frozen gameplay contract. The treatment required an accounting correction before acceptance. Huginn again cost more in this single pair, while its live tools exposed the exact saved-ball lifecycle and reproducible checksums.</p>
      <div class="result-grid" aria-live="polite">
        <article class="result-card"><span>Standalone</span><strong>14m 57s</strong><small>6.36M total task tokens · +58/-17 production lines</small></article>
        <article class="result-card accent"><span>With Huginn</span><strong>23m 17s</strong><small>11.76M total task tokens · +66/-25 production lines</small></article>
        <article class="result-card wide"><span>What changed</span><strong>Live lifecycle proof</strong><small>Saved ball: score 425, two lights, three balls, ballSaves 1, drains 0; unarmed relaunch, fresh next-ball saver, exact restore and matching replay.</small></article>
      </div>
      <div class="task-links"><a href="${github}/blob/main/docs/demo/STARFALL_FEATURE_TRIAL_RESULTS.md">Full measurements and caveats ↗</a> · <a href="https://chatgpt.com/s/cx_6a99b34dc870819186662709d2b69002">Standalone task ↗</a> · <a href="https://chatgpt.com/s/cx_6a99b4c83928819187d7755abb9b069b">Huginn task ↗</a></div>
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
