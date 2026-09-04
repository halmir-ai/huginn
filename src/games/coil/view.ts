import type { GameMountOptions, GameRuntime } from "../../game-runtime";
import { BONUS_STEPS, COIL_LEVELS, GRID_HEIGHT, GRID_WIDTH, campaignLevelFor, levelProgressFor, levelWalls, opposite, speedLevelFor, stepDurationMs, vectors } from "./game";
import type { Cell, CoilAction, CoilEvent, CoilState, Direction } from "./game";
import "./view.css";

const CELL = 28, PAD = 20;
const W = GRID_WIDTH * CELL + PAD * 2, H = GRID_HEIGHT * CELL + PAD * 2;
const center = (cell: Cell) => ({ x: PAD + (cell.x + .5) * CELL, y: PAD + (cell.y + .5) * CELL });
const arrow = (rotation: number) => `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" style="transform:rotate(${rotation}deg)"><path d="m6 14 6-6 6 6M12 8v12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
type ShieldPauseTarget = { readonly control: "human" | "agent"; pause(owner?: "human" | "agent"): void };

/** Keep presentation timing out of simulation while guaranteeing a human recovery decision. */
export function pauseHumanAfterShieldBlock(runtime: ShieldPauseTarget, events: CoilEvent[]): boolean {
  if (runtime.control !== "human" || !events.some(event => event.type === "shield-blocked")) return false;
  runtime.pause();
  return true;
}

export function isNativeButtonActivationKey(key: string, code: string): boolean {
  return key === "Enter" || key === " " || code === "Space";
}

/** Canvas animation and human input are deliberately outside the game rules. */
export function mountCoil(root: HTMLElement, runtime: GameRuntime<CoilState, CoilAction, CoilEvent>, _options: GameMountOptions): () => void {
  root.innerHTML = `<section class="coil" aria-label="COIL arcade game">
    <header class="coil-header"><div class="coil-brand"><span class="coil-mark" aria-hidden="true"></span><div><h1>COIL</h1><p>AFTER HOURS ARCADE</p></div></div><div class="coil-run-info"><span class="coil-live-dot"></span><span>ONE MORE RUN.</span></div><button class="coil-pause coil-icon-button" type="button" aria-label="Pause game" title="Pause · Space"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M8 5v14M16 5v14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></button></header>
    <div class="coil-playfield"><div class="coil-scorebar"><div class="coil-score-block"><span>SCORE</span><strong class="coil-score">0000</strong></div><div class="coil-best-block"><span>PERSONAL BEST</span><strong class="coil-best">0000</strong></div><div class="coil-speed-block"><span>LEVEL</span><strong><span class="coil-level">01</span><i class="coil-speed-bars" aria-hidden="true"><b></b><b></b><b></b><b></b><b></b><b></b></i></strong></div></div>
      <div class="coil-board"><canvas width="${W}" height="${H}" tabindex="0" aria-label="Snake board. Arrow keys or WASD turn. Q arms the emergency shield. Space starts, pauses, and retries. Swipe on the board or use the direction buttons below."></canvas>
        <div class="coil-overlay"><div class="coil-overlay-card"><span class="coil-eyebrow">THREE LEVELS. ONE LIFE.</span><h2>Stay hungry.<br>Stay alive.</h2><p class="coil-overlay-copy">Cross the Signal Gates. Survive the Night Maze.<br>Chase coral. Risk it for gold.</p><button type="button" class="coil-primary"><span>LET’S PLAY</span><svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button><span class="coil-overlay-hint">ARROWS / WASD TO TURN · SPACE TO START</span></div></div>
        <div class="coil-countdown" hidden aria-live="polite"><strong>3</strong><span>FIND YOUR FLOW</span></div>
        <div class="coil-toast" hidden></div>
      </div>
      <div class="coil-underboard"><div class="coil-next"><span class="coil-food-dot"></span><span class="coil-progress-label">5 FRUIT TO GOLD</span><i class="coil-fruit-progress"><b></b><b></b><b></b><b></b><b></b></i></div><div class="coil-gold-timer" hidden><span>GOLD ON THE BOARD</span><strong></strong><i><b></b></i></div><span class="coil-length">LENGTH 05</span></div>
      <div class="coil-shield-panel"><button type="button" class="coil-shield" title="Block one fatal collision in the next 10 cell advances. One charge per run."><kbd>Q</kbd> EMERGENCY SHIELD</button><span class="coil-shield-status">READY · 1 CHARGE</span></div>
      <div class="coil-controls"><p><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> <span>or WASD</span><i></i><kbd>SPACE</kbd> <span>pause</span></p><span>WALLS ARE REAL. SO IS YOUR TAIL.</span></div>
      <div class="coil-mobile-controls"><p>SWIPE TO TURN<br><span>or find your rhythm below</span></p><div class="coil-dpad" aria-label="Direction controls"><button type="button" data-direction="n" aria-label="Turn up">${arrow(0)}</button><button type="button" data-direction="w" aria-label="Turn left">${arrow(-90)}</button><span class="coil-dpad-center" aria-hidden="true"></span><button type="button" data-direction="e" aria-label="Turn right">${arrow(90)}</button><button type="button" data-direction="s" aria-label="Turn down">${arrow(180)}</button></div></div>
    </div><p class="coil-announcer" aria-live="polite" aria-atomic="true"></p>
  </section>`;
  const section = root.querySelector<HTMLElement>(".coil")!;
  const el = <T extends HTMLElement = HTMLElement>(selector: string) => section.querySelector<T>(selector)!;
  const canvas = el<HTMLCanvasElement>("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("COIL requires a canvas-capable browser.");
  const overlay = el(".coil-overlay"), eyebrow = el(".coil-eyebrow"), heading = el(".coil-overlay h2"), copy = el(".coil-overlay-copy"), primary = el<HTMLButtonElement>(".coil-primary"), primaryText = el(".coil-primary span"), overlayHint = el(".coil-overlay-hint"), pauseButton = el<HTMLButtonElement>(".coil-pause"), countdown = el(".coil-countdown"), toast = el(".coil-toast");
  const scoreText = el(".coil-score"), bestText = el(".coil-best"), levelText = el(".coil-level"), lengthText = el(".coil-length"), progressLabel = el(".coil-progress-label"), goldTimer = el(".coil-gold-timer"), announcer = el(".coil-announcer");
  const shieldButton = el<HTMLButtonElement>(".coil-shield"), shieldStatus = el(".coil-shield-status");
  let state = runtime.state, previous = state, alive = true, raf = 0, lastStepAt = 0, movedAt = 0, deathAt = 0, toastUntil = 0;
  let countdownAt: number | null = null, started = state.tick > 0, advancing = false, modeWasPlaying = runtime.playing;
  let queue: Direction[] = [], swipe: { x: number; y: number; id: number } | null = null;
  let shieldRequested = false, shieldRecovery = false;
  let bursts: { x: number; y: number; gold: boolean; born: number; points: number }[] = [];
  let best = 0, runBest = 0;
  try { const saved = Number(localStorage.getItem("coil.best.v1")); if (Number.isSafeInteger(saved) && saved > 0) best = saved; } catch { /* Private browsing and disabled storage retain the session best. */ }
  runBest = best;
  const pad = (value: number) => String(value).padStart(4, "0");
  const clearInput = () => { queue = []; swipe = null; };
  const announce = (message: string) => { announcer.textContent = message; };
  function showToast(message: string, gold = false) {
    toast.textContent = message; toast.classList.toggle("coil-toast-gold", gold); toast.hidden = false; toastUntil = performance.now() + 1700;
  }

  function updateOverlay() {
    const dead = state.phase === "dead";
    const count = countdownAt !== null;
    const external = runtime.control === "agent";
    const takeoverLabel = dead ? "Retry game" : "Take control";
    overlay.hidden = external || (!dead && runtime.playing) || count;
    countdown.hidden = !count;
    const recoveryReady = !shieldRecovery || queue.length > 0;
    pauseButton.disabled = !external && (dead || (!started && !count) || !recoveryReady);
    primary.disabled = false;
    section.classList.toggle("coil-external", external);
    section.classList.toggle("coil-shield-recovery", shieldRecovery);
    pauseButton.classList.toggle("coil-takeover", external);
    el(".coil-run-info > span:last-child").textContent = external ? "EXTERNAL CONTROL" : "ONE MORE RUN.";
    pauseButton.setAttribute("aria-label", external ? takeoverLabel : runtime.playing || count ? "Pause game" : "Resume game");
    pauseButton.title = external ? `${takeoverLabel} · Space` : runtime.playing || count ? "Pause · Space" : "Resume · Space";
    pauseButton.innerHTML = external
      ? `<span>${takeoverLabel}</span><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="m8 5 10 7-10 7Z" fill="currentColor"/></svg>`
      : runtime.playing || count
      ? '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M8 5v14M16 5v14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>'
      : '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="m8 5 10 7-10 7Z" fill="currentColor"/></svg>';
    if (overlay.hidden) return;
    if (dead) {
      eyebrow.textContent = state.score > runBest ? "A NEW PERSONAL BEST" : "GOOD RUN. GO AGAIN.";
      heading.textContent = "One more?";
      copy.innerHTML = `<span class="coil-final-score">${pad(state.score)}</span><span class="coil-final-caption">POINTS · ${state.foodsEaten} FRUIT · ${state.snake.length} LENGTH</span>`;
      primaryText.textContent = "RUN IT BACK";
      overlayHint.textContent = `${state.death === "wall" ? "THE WALL GOT YOU." : "YOUR TAIL GOT YOU."} SPACE TO RETRY`;
    } else if (shieldRecovery) {
      const direction = queue[0] && ({ n: "UP", e: "RIGHT", s: "DOWN", w: "LEFT" } as const)[queue[0]];
      eyebrow.textContent = "IMPACT DEFLECTED";
      heading.textContent = "Shield held.";
      copy.textContent = direction ? `${direction} is ready. Resume when you are set.` : "Your coil is intact. Choose a legal turn before movement resumes.";
      primaryText.textContent = direction ? "RESUME RUN" : "CHOOSE A DIRECTION";
      primary.disabled = !direction;
      overlayHint.textContent = direction ? `${direction} READY · SPACE OR BUTTON TO RESUME` : "ARROWS / WASD OR DIRECTION BUTTONS TO TURN";
    } else if (started) {
      eyebrow.textContent = runtime.control === "agent" ? "BOARD ON HOLD" : "TAKE A BREATH";
      heading.textContent = "Night’s not over.";
      copy.textContent = "Your coil will be right here.";
      primaryText.textContent = "KEEP GOING";
      overlayHint.textContent = "SPACE TO RESUME";
    } else {
      eyebrow.textContent = "THE NIGHT IS YOUNG";
      heading.innerHTML = "Stay hungry.<br>Stay alive.";
      copy.innerHTML = "An old obsession. A new high score.<br>Chase coral. Risk it for gold.";
      primaryText.textContent = "LET’S PLAY";
      overlayHint.textContent = "ARROWS / WASD TO TURN · SPACE TO START";
    }
  }

  function beginCountdown() {
    if (runtime.busy) return;
    clearInput(); started = true; countdownAt = performance.now(); runtime.pause();
    countdown.querySelector("strong")!.textContent = "3";
    updateOverlay(); canvas.focus({ preventScroll: true }); announce("Get ready. Three, two, one.");
  }

  async function primaryAction() {
    if (runtime.busy || countdownAt !== null) return;
    if (shieldRecovery && queue.length === 0) { announce("Choose a legal direction before resuming."); return; }
    if (state.phase === "dead") {
      runBest = best;
      await runtime.reset();
      if (alive) beginCountdown();
    } else if (!started) beginCountdown();
    else {
      const recoveryDirection = shieldRecovery ? queue[0] : null;
      if (!shieldRecovery) clearInput();
      shieldRecovery = false; runtime.play(); canvas.focus({ preventScroll: true });
      announce(recoveryDirection ? `${({ n: "Up", e: "Right", s: "Down", w: "Left" } as const)[recoveryDirection]} queued. Resumed.` : "Resumed.");
    }
  }

  function pause() {
    countdownAt = null; clearInput(); runtime.pause(); updateOverlay(); announce("Paused.");
  }
  function toggle() {
    if (countdownAt !== null || runtime.playing) pause();
    else void primaryAction();
  }

  function queueTurn(direction: Direction) {
    if (state.phase !== "playing" || (!runtime.playing && countdownAt === null && !shieldRecovery) || runtime.control !== "human") return;
    if (shieldRecovery) {
      if (direction === state.direction || direction === opposite[state.direction]) return;
      queue = [direction]; updateOverlay();
      announce(`${({ n: "Up", e: "Right", s: "Down", w: "Left" } as const)[direction]} ready. Press Space or Resume Run.`);
      return;
    }
    const from = queue[queue.length - 1] ?? state.pendingDirection ?? state.direction;
    if (direction === from || direction === opposite[from] || queue.length >= 3) return;
    queue.push(direction);
  }

  function requestShield() {
    if (state.phase !== "playing" || state.shieldCharges === 0 || runtime.control !== "human") return;
    // Retain a press during an in-flight human action until the driver is idle.
    shieldRequested = true;
    canvas.focus({ preventScroll: true });
  }

  async function flushShield() {
    if (!shieldRequested || runtime.busy) return;
    shieldRequested = false;
    await runtime.dispatch({ type: "shield" });
  }

  async function advanceHuman() {
    if (advancing || !runtime.playing || runtime.busy || state.phase !== "playing") return;
    advancing = true;
    try {
      if (state.pendingDirection === null && queue.length) {
        const direction = queue.shift()!;
        if (direction !== state.direction && direction !== opposite[state.direction]) await runtime.dispatch({ type: "turn", direction });
      }
      await flushShield();
      if (alive && runtime.playing && !runtime.busy && state.phase === "playing") await runtime.dispatch({ type: "advance", steps: 1 });
    } finally { advancing = false; }
  }

  const directionKeys: Record<string, Direction> = { ArrowUp: "n", ArrowRight: "e", ArrowDown: "s", ArrowLeft: "w", w: "n", d: "e", s: "s", a: "w" };
  const keyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey || (event.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName))) return;
    if (event.target instanceof HTMLElement && event.target.closest("button") && isNativeButtonActivationKey(event.key, event.code)) return;
    const direction = directionKeys[event.key] ?? directionKeys[event.key.toLowerCase()];
    if (direction) { event.preventDefault(); if (!event.repeat) queueTurn(direction); }
    if (event.key.toLowerCase() === "q") { event.preventDefault(); if (!event.repeat) requestShield(); }
    if (event.code === "Space" || event.key === " ") { event.preventDefault(); if (!event.repeat) toggle(); }
    if (event.key === "Escape" && (runtime.playing || countdownAt !== null)) { event.preventDefault(); pause(); }
  };
  const pointerDown = (event: PointerEvent) => {
    if (event.pointerType === "mouse") { canvas.focus({ preventScroll: true }); return; }
    swipe = { x: event.clientX, y: event.clientY, id: event.pointerId };
    canvas.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event: PointerEvent) => {
    if (!swipe || event.pointerId !== swipe.id) return;
    const dx = event.clientX - swipe.x, dy = event.clientY - swipe.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 16) return;
    queueTurn(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? "e" : "w" : dy > 0 ? "s" : "n");
    swipe = { x: event.clientX, y: event.clientY, id: event.pointerId };
  };
  const pointerUp = () => { swipe = null; };
  const loseFocus = () => { clearInput(); if (runtime.playing || countdownAt !== null) pause(); };
  const visibility = () => { if (document.hidden) loseFocus(); };
  const onFocusOut = (event: FocusEvent) => { if (event.relatedTarget && !section.contains(event.relatedTarget as Node)) loseFocus(); };
  primary.addEventListener("click", primaryAction);
  pauseButton.addEventListener("click", toggle);
  shieldButton.addEventListener("click", requestShield);
  section.addEventListener("keydown", keyDown);
  section.addEventListener("focusout", onFocusOut);
  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointermove", pointerMove);
  canvas.addEventListener("pointerup", pointerUp);
  canvas.addEventListener("pointercancel", pointerUp);
  window.addEventListener("blur", loseFocus);
  document.addEventListener("visibilitychange", visibility);
  section.querySelectorAll<HTMLButtonElement>("[data-direction]").forEach(button => {
    button.addEventListener("pointerdown", event => { event.preventDefault(); queueTurn(button.dataset.direction as Direction); canvas.focus({ preventScroll: true }); });
    button.addEventListener("click", event => { if (event.detail === 0) queueTurn(button.dataset.direction as Direction); });
  });

  const unsubscribe = runtime.subscribe((next, events, kind) => {
    const now = performance.now();
    if (kind === "reset" || kind === "restore") {
      previous = next; movedAt = 0; bursts = []; clearInput(); shieldRequested = false; shieldRecovery = false; countdownAt = null; deathAt = 0; started = next.tick > 0; runBest = best;
    } else if (events.some(event => event.type === "level-start")) {
      previous = next; movedAt = 0; clearInput(); shieldRequested = false; shieldRecovery = false;
    } else if (next.tick !== state.tick) {
      previous = state; movedAt = now;
      // Batched or restored moves should not interpolate through unrelated cells.
      if (next.tick - state.tick !== 1) previous = next;
    }
    state = next;
    if (state.tick > 0) started = true;
    if (kind === "mode") {
      if (runtime.playing && !modeWasPlaying) { lastStepAt = now; movedAt = 0; previous = state; }
      if (!runtime.playing) clearInput();
      if (runtime.control === "agent") { countdownAt = null; shieldRequested = false; shieldRecovery = false; }
      modeWasPlaying = runtime.playing;
    }
    if (state.score > best) {
      best = state.score;
      try { localStorage.setItem("coil.best.v1", String(best)); } catch { /* Session-only best is still useful. */ }
    }
    scoreText.textContent = pad(state.score); bestText.textContent = pad(best);
    const campaignLevel = campaignLevelFor(state);
    levelText.textContent = String(campaignLevel).padStart(2, "0"); lengthText.textContent = `${COIL_LEVELS[campaignLevel - 1].title.toUpperCase()} · LENGTH ${String(state.snake.length).padStart(2, "0")}`;
    shieldButton.disabled = state.phase !== "playing" || state.shieldCharges === 0 || runtime.control !== "human";
    shieldStatus.textContent = state.shieldStepsLeft > 0 ? `ARMED · ${state.shieldStepsLeft} ADVANCES LEFT` : state.shieldCharges ? "READY · 1 CHARGE" : "USED · RESTART TO RECHARGE";
    section.classList.toggle("coil-shield-armed", state.shieldStepsLeft > 0);
    const progress = levelProgressFor(state) % 5;
    progressLabel.textContent = campaignLevel < 3 ? `${5 - progress} FRUIT TO LEVEL ${campaignLevel + 1}` : `${5 - progress} FRUIT TO GOLD`;
    section.querySelectorAll<HTMLElement>(".coil-fruit-progress b").forEach((dot, i) => dot.classList.toggle("lit", i < progress));
    section.querySelectorAll<HTMLElement>(".coil-speed-bars b").forEach((bar, i) => bar.classList.toggle("lit", i < Math.min(6, speedLevelFor(state))));
    goldTimer.hidden = !state.bonus;
    if (state.bonus) {
      goldTimer.querySelector("strong")!.textContent = `${(state.bonus.remaining * stepDurationMs(state) / 1000).toFixed(1)}s`;
      (goldTimer.querySelector("i b") as HTMLElement).style.width = `${state.bonus.remaining / BONUS_STEPS * 100}%`;
    }
    const humanShieldBlock = runtime.control === "human" && events.some(event => event.type === "shield-blocked");
    if (humanShieldBlock) { shieldRecovery = true; clearInput(); }
    for (const event of events) {
      if (event.type === "food" || event.type === "bonus") bursts.push({ ...center(event), points: event.points, gold: event.type === "bonus", born: now });
      if (event.type === "speed-up") { showToast(`SPEED ${String(event.level).padStart(2, "0")} · GOLD IS LIVE`, true); announce(`Speed level ${event.level}. Golden fruit on the board, worth 50 points.`); }
      if (event.type === "level-start") { showToast(`LEVEL ${String(event.level).padStart(2, "0")} · ${event.title.toUpperCase()}`, true); announce(`Level ${event.level}. ${event.title}. Shield replenished.`); }
      if (event.type === "bonus") { showToast("GOLD RUSH. +50", true); announce("Golden fruit. 50 points."); }
      if (event.type === "shield-armed") { showToast("SHIELD ARMED · 10 ADVANCES"); announce("Emergency shield armed for the next ten cell advances. Charge used."); }
      if (event.type === "shield-blocked") { clearInput(); showToast("SHIELD BLOCKED THE HIT · TURN NOW"); announce("Shield blocked the collision. Protection used. Choose a legal direction, then resume."); }
      if (event.type === "shield-expired") { showToast("SHIELD EXPIRED"); announce("Emergency shield expired. No charge remaining."); }
      if (event.type === "death") { deathAt = now; clearInput(); shieldRequested = false; shieldRecovery = false; countdownAt = null; announce(`Run over. ${state.score} points. ${state.death === "wall" ? "You hit the wall." : "You hit your body."} Press Space to try again.`); }
    }
    if (humanShieldBlock) pauseHumanAfterShieldBlock(runtime, events);
    section.classList.toggle("coil-dead", state.phase === "dead");
    updateOverlay();
  });

  function drawFruit(cell: Cell, t: number, gold: boolean, remaining = BONUS_STEPS) {
    const c = center(cell), pulse = (Math.sin(t / (gold ? 155 : 240)) + 1) / 2;
    ctx!.save(); ctx!.translate(c.x, c.y);
    ctx!.shadowColor = gold ? "#ffc75d" : "#ff7b79"; ctx!.shadowBlur = 15 + pulse * 6;
    const fill = ctx!.createRadialGradient(-3, -4, 1, 0, 0, 12);
    fill.addColorStop(0, gold ? "#fff0b4" : "#ffbd9b"); fill.addColorStop(.55, gold ? "#ffcd61" : "#ff887e"); fill.addColorStop(1, gold ? "#e79d32" : "#ee5266");
    ctx!.fillStyle = fill; ctx!.beginPath(); ctx!.arc(0, 1, gold ? 9.3 : 8.6, 0, Math.PI * 2); ctx!.fill(); ctx!.shadowBlur = 0;
    ctx!.strokeStyle = gold ? "#fff0a1" : "#a9f1c9"; ctx!.lineWidth = 2; ctx!.lineCap = "round"; ctx!.beginPath(); ctx!.moveTo(0, -6); ctx!.quadraticCurveTo(1, -13, 6, -12); ctx!.stroke();
    ctx!.fillStyle = "rgba(255,255,255,.65)"; ctx!.beginPath(); ctx!.ellipse(-3.2, -2.8, 1.6, 2.5, .7, 0, Math.PI * 2); ctx!.fill();
    if (gold) {
      ctx!.strokeStyle = "rgba(255,205,97,.2)"; ctx!.lineWidth = 1.7; ctx!.beginPath(); ctx!.arc(0, 0, 15.5, 0, Math.PI * 2); ctx!.stroke();
      ctx!.strokeStyle = "#ffd677"; ctx!.beginPath(); ctx!.arc(0, 0, 15.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * remaining / BONUS_STEPS); ctx!.stroke();
    }
    ctx!.restore();
  }

  function drawSnake(t: number) {
    const interpolating = runtime.playing && movedAt > 0 && state.phase === "playing";
    const blend = interpolating ? Math.min(1, (t - movedAt) / stepDurationMs(state)) : 1;
    const points = state.snake.map((cell, i) => {
      const old = previous.snake[Math.min(i, previous.snake.length - 1)] ?? cell;
      return center({ x: old.x + (cell.x - old.x) * blend, y: old.y + (cell.y - old.y) * blend });
    });
    ctx!.save(); ctx!.lineJoin = "round"; ctx!.lineCap = "round";
    // Wide, rounded connected geometry remains readable even at phone scale.
    const path = () => { ctx!.beginPath(); for (let i = points.length - 1; i >= 0; i--) { const p = points[i]; if (i === points.length - 1) ctx!.moveTo(p.x, p.y); else ctx!.lineTo(p.x, p.y); } };
    ctx!.shadowColor = state.phase === "dead" ? "#ff8783" : "#4be3b4"; ctx!.shadowBlur = state.phase === "dead" ? 13 : 18;
    ctx!.strokeStyle = state.phase === "dead" ? "#d87980" : "#43cda8"; ctx!.lineWidth = 20; path(); ctx!.stroke(); ctx!.shadowBlur = 0;
    const tail = points[points.length - 1], head = points[0];
    if (state.shieldStepsLeft > 0) {
      ctx!.strokeStyle = "#b7eaff"; ctx!.lineWidth = 2;
      ctx!.beginPath(); ctx!.arc(head.x, head.y, 20, 0, Math.PI * 2); ctx!.stroke();
    }
    const gradient = ctx!.createLinearGradient(tail.x - 1, tail.y, head.x + 1, head.y + 1);
    gradient.addColorStop(0, state.phase === "dead" ? "#a76780" : "#39bda6"); gradient.addColorStop(1, state.phase === "dead" ? "#ffaaa0" : "#acffe1");
    ctx!.strokeStyle = gradient; ctx!.lineWidth = 17; path(); ctx!.stroke();
    // Small dorsal marks give the body texture without visually separating cells.
    for (let i = 2; i < points.length - 1; i++) {
      const p = points[i]; ctx!.fillStyle = "rgba(10,64,59,.22)"; ctx!.beginPath(); ctx!.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx!.fill();
    }
    const vector = vectors[state.direction];
    const angle = Math.atan2(vector.y, vector.x);
    ctx!.translate(head.x, head.y); ctx!.rotate(angle);
    ctx!.fillStyle = state.phase === "dead" ? "#ffb2a7" : "#acffe1"; ctx!.beginPath(); ctx!.roundRect(-11, -10.5, 24, 21, 8); ctx!.fill();
    for (const y of [-5.2, 5.2]) {
      ctx!.fillStyle = "#103d38";
      if (state.phase === "dead") { ctx!.strokeStyle = "#6d414b"; ctx!.lineWidth = 1.8; ctx!.beginPath(); ctx!.moveTo(3.8, y - 1.8); ctx!.lineTo(7.4, y + 1.8); ctx!.moveTo(7.4, y - 1.8); ctx!.lineTo(3.8, y + 1.8); ctx!.stroke(); }
      else { ctx!.beginPath(); ctx!.ellipse(5.8, y, 2.3, 2.9, 0, 0, Math.PI * 2); ctx!.fill(); ctx!.fillStyle = "#f4ffed"; ctx!.beginPath(); ctx!.arc(6.4, y - .7, .7, 0, Math.PI * 2); ctx!.fill(); }
    }
    ctx!.restore();
  }

  function render(t: number) {
    if (!alive) return;
    if (shieldRequested && !advancing) void flushShield();
    if (countdownAt !== null) {
      const elapsed = t - countdownAt;
      countdown.querySelector("strong")!.textContent = String(Math.max(1, 3 - Math.floor(elapsed / 550)));
      if (elapsed >= 1650) { countdownAt = null; lastStepAt = t; runtime.play(); announce("Go."); }
    }
    if (runtime.playing && !runtime.busy && state.phase === "playing" && t - lastStepAt >= stepDurationMs(state)) { lastStepAt = t; void advanceHuman(); }
    if (!toast.hidden && t >= toastUntil) toast.hidden = true;
    ctx!.clearRect(0, 0, W, H);
    const backdrop = ctx!.createLinearGradient(0, 0, W, H); backdrop.addColorStop(0, "#101927"); backdrop.addColorStop(.6, "#101c28"); backdrop.addColorStop(1, "#152331");
    ctx!.fillStyle = backdrop; ctx!.fillRect(0, 0, W, H);
    const pool = ctx!.createRadialGradient(W * .62, H * .55, 10, W * .55, H * .5, W * .7); pool.addColorStop(0, "rgba(48,111,100,.10)"); pool.addColorStop(1, "rgba(8,11,22,0)"); ctx!.fillStyle = pool; ctx!.fillRect(0, 0, W, H);
    ctx!.save();
    if (deathAt && t - deathAt < 260) { const strength = (1 - (t - deathAt) / 260) * 4; ctx!.translate(Math.sin(t / 13) * strength, Math.cos(t / 17) * strength); }
    ctx!.strokeStyle = "rgba(166,204,214,.045)"; ctx!.lineWidth = 1;
    ctx!.beginPath();
    for (let x = 1; x < GRID_WIDTH; x++) { ctx!.moveTo(PAD + x * CELL, PAD); ctx!.lineTo(PAD + x * CELL, H - PAD); }
    for (let y = 1; y < GRID_HEIGHT; y++) { ctx!.moveTo(PAD, PAD + y * CELL); ctx!.lineTo(W - PAD, PAD + y * CELL); }
    ctx!.stroke();
    ctx!.strokeStyle = state.phase === "dead" ? "rgba(255,123,128,.6)" : `rgba(128,216,198,${.22 + Math.sin(t / 1900) * .025})`; ctx!.lineWidth = 1;
    ctx!.strokeRect(PAD - .5, PAD - .5, GRID_WIDTH * CELL + 1, GRID_HEIGHT * CELL + 1);
    ctx!.strokeStyle = state.phase === "dead" ? "#ff8c8e" : "#63c9b5"; ctx!.lineWidth = 2;
    for (const [x, y, dx, dy] of [[PAD, PAD, 1, 1], [W - PAD, PAD, -1, 1], [PAD, H - PAD, 1, -1], [W - PAD, H - PAD, -1, -1]]) { ctx!.beginPath(); ctx!.moveTo(x + dx * 12, y); ctx!.lineTo(x, y); ctx!.lineTo(x, y + dy * 12); ctx!.stroke(); }
    for (const wall of levelWalls(campaignLevelFor(state))) {
      const x = PAD + wall.x * CELL + 3, y = PAD + wall.y * CELL + 3;
      const glow = ctx!.createLinearGradient(x, y, x + CELL - 6, y + CELL - 6);
      glow.addColorStop(0, "rgba(105,174,190,.36)"); glow.addColorStop(1, "rgba(41,91,111,.58)");
      ctx!.fillStyle = glow; ctx!.shadowColor = "rgba(120,220,224,.18)"; ctx!.shadowBlur = 9;
      ctx!.beginPath(); ctx!.roundRect(x, y, CELL - 6, CELL - 6, 5); ctx!.fill(); ctx!.shadowBlur = 0;
      ctx!.strokeStyle = "rgba(178,239,235,.2)"; ctx!.lineWidth = 1; ctx!.stroke();
    }
    if (state.food) drawFruit(state.food, t, false);
    if (state.bonus) drawFruit(state.bonus, t, true, state.bonus.remaining);
    drawSnake(t);
    bursts = bursts.filter(burst => t - burst.born < 850);
    for (const burst of bursts) {
      const progress = (t - burst.born) / 850;
      ctx!.globalAlpha = 1 - progress;
      ctx!.fillStyle = burst.gold ? "#ffda82" : "#ffaaa2";
      for (let i = 0; i < 9; i++) {
        const angle = i * Math.PI * 2 / 9, distance = 8 + progress * (25 + i % 3 * 6);
        ctx!.beginPath(); ctx!.arc(burst.x + Math.cos(angle) * distance, burst.y + Math.sin(angle) * distance, (1 - progress) * 2.5 + .5, 0, Math.PI * 2); ctx!.fill();
      }
      ctx!.font = "700 20px ui-monospace, SFMono-Regular, monospace"; ctx!.textAlign = "center";
      ctx!.fillText(`+${burst.points}`, burst.x, burst.y - 20 - progress * 35);
    }
    ctx!.globalAlpha = 1; ctx!.restore();
    raf = requestAnimationFrame(render);
  }
  raf = requestAnimationFrame(render);
  primary.focus({ preventScroll: true });
  return () => {
    alive = false; clearInput(); cancelAnimationFrame(raf); unsubscribe();
    window.removeEventListener("blur", loseFocus); document.removeEventListener("visibilitychange", visibility);
    section.removeEventListener("keydown", keyDown); section.removeEventListener("focusout", onFocusOut);
    canvas.removeEventListener("pointerdown", pointerDown); canvas.removeEventListener("pointermove", pointerMove); canvas.removeEventListener("pointerup", pointerUp); canvas.removeEventListener("pointercancel", pointerUp);
    root.innerHTML = "";
  };
}
