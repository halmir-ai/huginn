import type { GameMountOptions, GameRuntime } from "../../play/core";
import { BUMPERS, FLIPPER, RAILS, TABLE, flipperSegment } from "./game";
import type { StarfallAction, StarfallEvent, StarfallState } from "./game";
import "./view.css";

const number = (value: number) => value.toLocaleString("en-US");
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export type StarfallFlipper = "left" | "right";

export function starfallFlipperForKey(key: string): StarfallFlipper | undefined {
  const normalized = key.length === 1 ? key.toLowerCase() : key;
  if (["a", "z", "ArrowLeft"].includes(normalized)) return "left";
  if (["d", "x", "ArrowRight"].includes(normalized)) return "right";
  return undefined;
}

export function mountStarfall(root: HTMLElement, runtime: GameRuntime<StarfallState, StarfallAction, StarfallEvent>, _options: GameMountOptions): () => void {
  root.innerHTML = `<section class="starfall" aria-label="Starfall pinball">
    <aside class="sf-console">
      <header class="sf-masthead"><span class="sf-eyebrow">ORBITAL AMUSEMENTS / NO. 03</span><h1>STAR<span>FALL</span></h1><p>THREE BALLS. INFINITE ORBIT.</p></header>
      <div class="sf-scoreglass"><span class="sf-label">SCORE</span><output class="sf-score" aria-live="polite">0</output><div class="sf-bestline"><span>PERSONAL BEST</span><b class="sf-best">0</b></div></div>
      <div class="sf-readouts"><div><span class="sf-label">BALL</span><strong class="sf-ballcount">1 <small>/ 3</small></strong></div><div><span class="sf-label">MULTIPLIER</span><strong class="sf-multiplier">1<small>×</small></strong></div></div>
      <div class="sf-objective"><div class="sf-lights" aria-label="Constellation lights"><i></i><i></i><i></i></div><h2>LIGHT THE CONSTELLATION</h2><p>Hit all three bumpers for a bigger multiplier and a 500 × bonus.</p></div>
      <div class="sf-saver" data-state="ready" aria-label="Ball saver ready"><span>BALL SAVER</span><output>READY</output></div>
      <p class="sf-message" role="status">Pull into orbit.</p>
      <div class="sf-console-buttons"><button class="sf-launch" data-control="launch">Launch ball <kbd>SPACE</kbd></button><div class="sf-secondary"><button data-control="pause">Pause</button><button data-control="restart">New game</button><button data-control="sound" aria-label="Mute game sound" aria-pressed="false">Sound on</button></div></div>
      <div class="sf-key-guide"><div><kbd>A / Z</kbd><span>or</span><kbd>←</kbd><b>LEFT FLIPPER</b></div><div><kbd>D / X</kbd><span>or</span><kbd>→</kbd><b>RIGHT FLIPPER</b></div><p>Let the ball come to you.<br>Release, then flip at the tip.</p></div>
      <span class="sf-mode" hidden>Agent experiment</span>
    </aside>
    <div class="sf-machine"><div class="sf-table-frame"><canvas width="560" height="780" tabindex="0" aria-label="Starfall pinball table. A, Z, or left arrow: left flipper. D, X, or right arrow: right flipper. Space: launch. P or Escape: pause."></canvas></div><div class="sf-apron"><span>PRECISION PINBALL</span><span class="sf-live-lamp">● <b>READY TO LAUNCH</b></span><span>EST. 2086</span></div><div class="sf-touch" aria-label="Pinball touch controls"><button data-flipper="left" aria-label="Hold left flipper">‹ <span>LEFT FLIPPER</span><kbd>A / Z / ←</kbd></button><button data-flipper="right" aria-label="Hold right flipper"><span>RIGHT FLIPPER</span> ›<kbd>D / X / →</kbd></button></div></div>
  </section>`;
  const section = root.querySelector<HTMLElement>(".starfall")!, canvas = section.querySelector("canvas")!, ctx = canvas.getContext("2d")!;
  const score = section.querySelector<HTMLOutputElement>(".sf-score")!, best = section.querySelector<HTMLElement>(".sf-best")!;
  const balls = section.querySelector<HTMLElement>(".sf-ballcount")!, multiplier = section.querySelector<HTMLElement>(".sf-multiplier")!;
  const message = section.querySelector<HTMLElement>(".sf-message")!, mode = section.querySelector<HTMLElement>(".sf-mode")!;
  const saver = section.querySelector<HTMLElement>(".sf-saver")!, saverOutput = saver.querySelector<HTMLOutputElement>("output")!;
  const launch = section.querySelector<HTMLButtonElement>("[data-control=launch]")!, pause = section.querySelector<HTMLButtonElement>("[data-control=pause]")!;
  const soundButton = section.querySelector<HTMLButtonElement>("[data-control=sound]")!, lamp = section.querySelector<HTMLElement>(".sf-live-lamp b")!;
  const lightElements = [...section.querySelectorAll<HTMLElement>(".sf-lights i")];
  let state = runtime.state, previous = state, received = performance.now(), lastTick = state.tick, alive = true, raf = 0;
  let bestScore = 0, muted = false, audio: AudioContext | undefined;
  let trail: { x: number; y: number }[] = [], flashes: { x: number; y: number; born: number; type: StarfallEvent["type"]; value: number }[] = [];
  const keys = new Set<string>(), pointers = new Map<number, "left" | "right">();
  const tapped = { left: false, right: false };
  try { const saved = Number(localStorage.getItem("starfall.best.v1")); if (Number.isSafeInteger(saved) && saved >= 0) bestScore = saved; } catch { /* Storage can be disabled; this run still keeps a local best. */ }
  best.textContent = number(bestScore);
  function enableSound(): void {
    if (muted) return;
    try { audio ??= new AudioContext(); if (audio.state === "suspended") void audio.resume().catch(() => {}); } catch { /* The game has no audio dependency. */ }
  }
  function tone(frequency: number, duration: number, volume: number, type: OscillatorType = "sine", delay = 0): void {
    if (muted || !audio || audio.state !== "running") return;
    const oscillator = audio.createOscillator(), gain = audio.createGain(), time = audio.currentTime + delay;
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, time); oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequency * 0.7), time + duration);
    gain.gain.setValueAtTime(0.001, time); gain.gain.exponentialRampToValueAtTime(volume, time + 0.008); gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(time); oscillator.stop(time + duration + 0.02);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  const held = () => ({
    left: [...keys].some(key => starfallFlipperForKey(key) === "left") || [...pointers.values()].includes("left"),
    right: [...keys].some(key => starfallFlipperForKey(key) === "right") || [...pointers.values()].includes("right"),
  });
  function updateHeld(): void {
    const input = held();
    section.querySelector<HTMLButtonElement>("[data-flipper=left]")!.classList.toggle("is-held", input.left);
    section.querySelector<HTMLButtonElement>("[data-flipper=right]")!.classList.toggle("is-held", input.right);
  }
  function release(): void { keys.clear(); pointers.clear(); tapped.left = false; tapped.right = false; updateHeld(); }
  function focusTable(): void { canvas.focus({ preventScroll: true }); }
  async function start(): Promise<void> {
    if (runtime.busy) return;
    enableSound(); focusTable();
    if (state.phase === "over") { await runtime.reset(state.seed); release(); }
    runtime.play();
    if (state.phase === "ready") await runtime.dispatch({ type: "launch" });
    focusTable();
  }
  function togglePause(): void {
    release();
    if (runtime.playing) runtime.pause(); else runtime.play();
    focusTable();
  }
  function keyDown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target instanceof HTMLElement && event.target.matches("input, textarea, select, [contenteditable=true]")) return;
    if (event.target instanceof HTMLElement && event.target.closest("button") && (event.key === "Enter" || event.key === " " || event.code === "Space")) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const flipper = starfallFlipperForKey(key);
    if (flipper) {
      event.preventDefault(); enableSound(); keys.add(key); tapped[flipper] = true; updateHeld();
    } else if (event.code === "Space" || key === " ") { event.preventDefault(); if (!event.repeat) void start(); }
    else if (key === "p" || key === "Escape") { event.preventDefault(); if (!event.repeat) togglePause(); }
  }
  function keyUp(event: KeyboardEvent): void { const key = event.key.length === 1 ? event.key.toLowerCase() : event.key; if (keys.delete(key)) { event.preventDefault(); updateHeld(); } }
  function pointerRelease(event: PointerEvent): void { pointers.delete(event.pointerId); updateHeld(); }
  function blur(): void { release(); if (runtime.playing && runtime.control === "human") runtime.pause(); }
  function visibility(): void { if (document.hidden) blur(); }
  // Keys work after any interaction inside the cabinet, including its buttons.
  section.addEventListener("keydown", keyDown); window.addEventListener("keyup", keyUp);
  window.addEventListener("blur", blur); document.addEventListener("visibilitychange", visibility);
  window.addEventListener("pointerup", pointerRelease); window.addEventListener("pointercancel", pointerRelease);
  canvas.addEventListener("pointerdown", focusTable);
  section.querySelectorAll<HTMLButtonElement>("[data-flipper]").forEach(button => {
    button.addEventListener("pointerdown", event => {
      event.preventDefault(); enableSound(); button.setPointerCapture(event.pointerId);
      const side = button.dataset.flipper as "left" | "right";
      pointers.set(event.pointerId, side); tapped[side] = true; updateHeld();
    });
    button.addEventListener("click", event => {
      if (event.detail !== 0) return;
      enableSound(); tapped[button.dataset.flipper as StarfallFlipper] = true; updateHeld(); focusTable();
    });
    button.addEventListener("lostpointercapture", pointerRelease);
    button.addEventListener("contextmenu", event => event.preventDefault());
  });
  launch.addEventListener("click", () => void start()); pause.addEventListener("click", togglePause);
  section.querySelector<HTMLButtonElement>("[data-control=restart]")!.addEventListener("click", () => { release(); void runtime.reset(state.seed).then(focusTable); });
  soundButton.addEventListener("click", () => { muted = !muted; if (!muted) enableSound(); soundButton.textContent = muted ? "Sound off" : "Sound on"; soundButton.setAttribute("aria-pressed", String(muted)); soundButton.setAttribute("aria-label", muted ? "Enable game sound" : "Mute game sound"); });
  const timer = window.setInterval(() => {
    if (runtime.playing && !runtime.busy && state.phase === "playing") {
      const input = held(), left = input.left || tapped.left, right = input.right || tapped.right;
      tapped.left = false; tapped.right = false;
      void runtime.dispatch({ type: "advance", frames: 4, left, right }).then(accepted => {
        if (!accepted && state.phase === "playing") { tapped.left ||= left; tapped.right ||= right; }
      });
    }
  }, 1000 / 30);
  const off = runtime.subscribe((next, events, kind) => {
    previous = state; state = next;
    if (kind === "reset" || kind === "restore" || state.phase !== previous.phase || state.tick < lastTick) { trail = []; previous = state; release(); }
    if (state.tick !== lastTick) { received = performance.now(); lastTick = state.tick; }
    if (score.textContent !== number(state.score)) score.textContent = number(state.score);
    if (state.score > bestScore) { bestScore = state.score; best.textContent = number(bestScore); try { localStorage.setItem("starfall.best.v1", String(bestScore)); } catch { /* Best remains available for this mount. */ } }
    balls.innerHTML = `${state.phase === "over" ? 3 : 4 - state.ballsRemaining} <small>/ 3</small>`;
    multiplier.innerHTML = `${state.multiplier}<small>×</small>`;
    lightElements.forEach((element, i) => element.classList.toggle("is-lit", state.bumperLights[i]));
    const savedBall = state.phase === "ready" && !state.ballSaver.pendingNewBall;
    const saverState = savedBall ? "saved" : state.ballSaver.available ? "active" : state.phase === "playing" ? "spent" : state.phase === "over" ? "off" : "ready";
    const saverText = saverState === "active" ? `${(state.ballSaver.framesRemaining / 120).toFixed(2)}s` : saverState === "saved" ? "SAVED" : saverState === "ready" ? "READY" : "SPENT";
    saver.dataset.state = saverState; saverOutput.textContent = saverText;
    saver.setAttribute("aria-label", saverState === "active" ? `Ball saver ${saverText} remaining` : `Ball saver ${saverText.toLowerCase()}`);
    mode.hidden = runtime.control !== "agent";
    pause.textContent = runtime.playing ? "Pause" : "Resume";
    pause.disabled = state.phase !== "playing";
    launch.disabled = state.phase === "playing" && runtime.playing;
    launch.innerHTML = state.phase === "over" ? "Play again <kbd>SPACE</kbd>" : state.phase === "playing" ? "Resume orbit <kbd>SPACE</kbd>" : `${savedBall ? "Relaunch saved ball" : state.stats.launches ? "Launch next ball" : "Launch ball"} <kbd>SPACE</kbd>`;
    const paused = !runtime.playing && runtime.control === "human" && state.phase === "playing";
    message.textContent = paused ? "Paused. Your orbit is waiting." : state.phase === "over" ? `Final score ${number(state.score)}. One more orbit?` : state.phase === "ready" ? (savedBall ? state.lastEvent : state.stats.launches ? `${state.ballsRemaining} ${state.ballsRemaining === 1 ? "ball" : "balls"} left. Send the next one skyward.` : "Press Space. Chase a new high score.") : state.lastEvent;
    message.classList.toggle("is-save", savedBall);
    lamp.textContent = runtime.control === "agent" ? "EXPERIMENT IN PROGRESS" : state.phase === "over" ? "ORBIT COMPLETE" : savedBall ? "BALL SAVED" : state.phase === "ready" ? "READY TO LAUNCH" : paused ? "PAUSED" : "BALL IN PLAY";
    section.classList.toggle("sf-paused", paused);
    for (const event of events) {
      if (["bumper", "sling", "multiplier", "save", "drain"].includes(event.type)) flashes.push({ x: event.x, y: event.y, born: performance.now(), type: event.type, value: event.value });
      if (event.type === "bumper") tone(660 + state.bumperLights.filter(Boolean).length * 110, 0.15, 0.08, "triangle");
      if (event.type === "sling") tone(210, 0.1, 0.06, "triangle");
      if (event.type === "flipper") tone(100, 0.055, 0.04, "triangle");
      if (event.type === "launch") { tone(100, 0.2, 0.1, "triangle"); tone(450, 0.2, 0.04, "sine", 0.08); }
      if (event.type === "save") { tone(330, 0.18, 0.06, "triangle"); tone(660, 0.28, 0.06, "sine", 0.12); }
      if (event.type === "drain") tone(140, 0.5, 0.06, "sine");
      if (event.type === "multiplier") [523, 659, 784, 1046].forEach((pitch, i) => tone(pitch, 0.25, 0.065, "sine", i * 0.09));
    }
    flashes = flashes.slice(-24);
  });

  function line(x1: number, y1: number, x2: number, y2: number, color: string, width: number): void { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(); }
  function circle(x: number, y: number, radius: number, fill: string): void { ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }
  function label(text: string, x: number, y: number, size: number, color: string, weight = "500"): void { ctx.fillStyle = color; ctx.font = `${weight} ${size}px 'Trebuchet MS', sans-serif`; ctx.textAlign = "center"; ctx.fillText(text, x, y); }
  function polygon(points: number[][], fill: string, stroke?: string): void { ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); } }

  function render(time: number): void {
    if (!alive) return;
    const interpolation = runtime.playing && state.phase === "playing" ? Math.min(1, (time - received) / (1000 / 30)) : 1;
    const ballX = mix(previous.ball.x, state.ball.x, interpolation), ballY = mix(previous.ball.y, state.ball.y, interpolation);
    const gradient = ctx.createLinearGradient(0, 0, 560, 780); gradient.addColorStop(0, "#142337"); gradient.addColorStop(0.48, "#0b192a"); gradient.addColorStop(1, "#07121f");
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 560, 780); ctx.lineCap = "round"; ctx.lineJoin = "round";
    const nebula = ctx.createRadialGradient(268, 285, 20, 268, 285, 330); nebula.addColorStop(0, "#23455b42"); nebula.addColorStop(0.5, "#16345021"); nebula.addColorStop(1, "#07121f00"); ctx.fillStyle = nebula; ctx.fillRect(0, 0, 560, 780);
    // Engraved playfield grid, star charts and orbit lines are original vector art.
    ctx.strokeStyle = "#8cd5da09"; ctx.lineWidth = 1;
    for (let x = 30; x < 560; x += 28) line(x, 40, x, 749, "#8cd5da07", 1);
    for (let y = 52; y < 750; y += 28) line(32, y, 533, y, "#8cd5da07", 1);
    for (let i = 0; i < 75; i++) { const x = 61 + (i * 137) % 411, y = 64 + (i * 181) % 568; circle(x, y, i % 8 ? 0.7 : 1.3, i % 8 ? "#dfebf33c" : "#d9edf483"); }
    ctx.save(); ctx.setLineDash([3, 8]); ctx.strokeStyle = "#91afb229"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(264, 278, 181, 208, 0, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.ellipse(264, 278, 149, 177, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    polygon([[194, 231], [334, 231], [264, 337]], "#51bed208", "#84a7ba30");
    line(194, 231, 156, 166, "#84a7ba35", 1); line(334, 231, 372, 166, "#84a7ba35", 1); line(264, 337, 264, 399, "#84a7ba35", 1);
    // Recessed metallic launch channel and spring plunger.
    const lane = ctx.createLinearGradient(491, 0, 531, 0); lane.addColorStop(0, "#000a"); lane.addColorStop(0.48, "#a0b7c217"); lane.addColorStop(1, "#0007"); ctx.fillStyle = lane; ctx.fillRect(490, 175, 40, 565);
    ctx.save(); ctx.translate(511, 450); ctx.rotate(-Math.PI / 2); label("L A U N C H   C H A N N E L", 0, 0, 9, "#8eabb380"); ctx.restore();
    for (let y = 745; y < 773; y += 5) line(502, y, 519, y + 3, "#9caaad", 2);
    line(511, 728, 511, 776, "#b9c6c7", 5); line(499, 729, 522, 729, "#e7d9ba", 6);
    if (state.phase === "ready") {
      const alpha = 0.4 + 0.3 * Math.sin(time / 260);
      for (let y = 603; y <= 651; y += 24) { line(503, y + 8, 511, y, `rgba(102,234,230,${alpha})`, 2); line(511, y, 519, y + 8, `rgba(102,234,230,${alpha})`, 2); }
    }
    // Underlay first; each visible rubber or rail corresponds to a collider.
    for (const left of [true, false]) {
      const mirror = (x: number) => left ? x : 528 - x;
      polygon([[mirror(125), 505], [mirror(204), 602], [mirror(139), 579]], "#292239", "#ef83ba4a");
      polygon([[mirror(137), 533], [mirror(184), 588], [mirror(152), 572]], "#e880b822", "#eb91c678");
      line(mirror(145), 548, mirror(175), 578, "#ef94c1", 2);
      label("25×", mirror(156), 565, 9, "#f6b9d6", "700");
    }
    for (const rail of RAILS) {
      const sling = rail.kind === "sling", gate = rail.kind === "gate", flash = sling && state.slingCooldowns[rail.id!] > 12;
      line(rail.x1 + 2, rail.y1 + 5, rail.x2 + 2, rail.y2 + 5, "#0009", rail.radius * 2 + 7);
      line(rail.x1, rail.y1, rail.x2, rail.y2, gate ? "#607379" : "#685e4d", rail.radius * 2 + (gate ? 0 : 2));
      line(rail.x1, rail.y1 - 1, rail.x2, rail.y2 - 1, sling ? (flash ? "#ffe5f3" : "#d7bbcf") : gate ? "#cbd1c8" : "#c7b894", rail.radius * 1.3);
      if (!gate) line(rail.x1, rail.y1 - 2, rail.x2, rail.y2 - 2, sling ? "#f5dcea" : "#fff0cb", Math.max(1, rail.radius * 0.3));
    }
    // Backlit title insert and three constellation indicator lamps.
    ctx.fillStyle = "#06121ad9"; ctx.fillRect(147, 61, 235, 50); line(155, 63, 374, 63, "#b9aa7966", 1); line(155, 110, 374, 110, "#b9aa7944", 1);
    label("S T A R F A L L", 264, 85, 20, "#ecdfbc", "700"); label("L I G H T   T H E   C O N S T E L L A T I O N", 264, 102, 7, "#83a6b4");
    for (let i = 0; i < 3; i++) { const x = 234 + i * 30, lit = state.bumperLights[i] || state.tick - state.lastBankTick < 90; circle(x, 140, 7, "#040c11"); circle(x, 140, 4.5, lit ? BUMPERS[i].color : "#355362"); if (lit) { ctx.save(); ctx.shadowBlur = 12; ctx.shadowColor = BUMPERS[i].color; circle(x, 140, 3, "#e8ffff"); ctx.restore(); } }
    for (let i = 0; i < BUMPERS.length; i++) {
      const bumper = BUMPERS[i], flash = state.bumperCooldowns[i] > 9, lit = state.bumperLights[i], pulse = 0.14 + 0.03 * Math.sin(time / 520 + i);
      const glow = ctx.createRadialGradient(bumper.x, bumper.y, 23, bumper.x, bumper.y, flash ? 76 : 58); glow.addColorStop(0, `${bumper.color}${flash ? "99" : lit ? "48" : "25"}`); glow.addColorStop(1, `${bumper.color}00`); circle(bumper.x, bumper.y, flash ? 76 : 58, "#0000"); ctx.fillStyle = glow; ctx.fill();
      circle(bumper.x + 3, bumper.y + 7, 35, "#0008"); circle(bumper.x, bumper.y, 35, "#182329"); circle(bumper.x, bumper.y, 32, "#e2cf9c"); circle(bumper.x, bumper.y, 28, "#122432");
      ctx.save(); ctx.translate(bumper.x, bumper.y); for (let spoke = 0; spoke < 12; spoke++) { ctx.rotate(Math.PI / 6); line(0, -25, 0, -29, "#ffffff75", 1); } ctx.restore();
      const cap = ctx.createRadialGradient(bumper.x - 8, bumper.y - 11, 1, bumper.x, bumper.y, 25); cap.addColorStop(0, flash ? "#fff" : "#e3ffff"); cap.addColorStop(0.17, bumper.color); cap.addColorStop(1, i === 1 ? "#803a76" : "#176279"); circle(bumper.x, bumper.y, 23, "#000"); ctx.fillStyle = cap; ctx.fill();
      circle(bumper.x, bumper.y, 15, flash ? "#fffffff0" : `rgba(7,30,42,${0.65 - pulse})`);
      polygon([[bumper.x, bumper.y - 10], [bumper.x + 3, bumper.y - 3], [bumper.x + 10, bumper.y], [bumper.x + 3, bumper.y + 3], [bumper.x, bumper.y + 10], [bumper.x - 3, bumper.y + 3], [bumper.x - 10, bumper.y], [bumper.x - 3, bumper.y - 3]], flash ? "#ffffff" : "#c8faff");
      label(bumper.name, bumper.x, bumper.y + 50, 8, "#8ba7b9", "700");
    }
    // Large lower playfield print stays subdued so the ball is always legible.
    ctx.save(); ctx.translate(264, 451); ctx.rotate(-0.08); label("DEEP SPACE", 0, 0, 12, "#a8c5d584", "700"); label("ORBIT", 0, 35, 44, "#49768950", "700"); line(-69, 46, 68, 46, "#9ac7d253", 1); label("EVERY SHOT COMES HOME", 0, 63, 7, "#a0c0cd75"); ctx.restore();
    const bankFlash = state.tick - state.lastBankTick < 160 && state.lastBankTick >= 0;
    if (bankFlash) { ctx.save(); ctx.shadowBlur = 15; ctx.shadowColor = "#85ede7"; label(`${state.multiplier}× CONSTELLATION`, 264, 408, 15, "#d9fff6", "700"); ctx.restore(); }
    label("DRAIN", 264, 752, 8, "#77899480");
    for (const side of ["left", "right"] as const) {
      const angle = side === "left" ? mix(previous.flippers.leftAngle, state.flippers.leftAngle, interpolation) : mix(previous.flippers.rightAngle, state.flippers.rightAngle, interpolation);
      const f = flipperSegment(side, angle), isHeld = side === "left" ? state.flippers.leftHeld : state.flippers.rightHeld;
      line(f.x1 + 3, f.y1 + 7, f.x2 + 3, f.y2 + 7, "#000a", 24);
      line(f.x1, f.y1, f.x2, f.y2, "#594d4b", 24);
      line(f.x1, f.y1 - 1, f.x2, f.y2 - 1, isHeld ? "#f4d7dc" : "#dca9b8", 20);
      line(f.x1, f.y1 - 2, f.x2, f.y2 - 2, "#f6e4d0", 13);
      line(f.x1 + Math.cos(angle) * 14, f.y1 + Math.sin(angle) * 14 - 3, f.x2 - Math.cos(angle) * 8, f.y2 - Math.sin(angle) * 8 - 3, "#e2b762", 3);
      circle(f.x1, f.y1, 10, "#071521"); circle(f.x1, f.y1, 6, "#b5bfc1"); line(f.x1 - 3, f.y1, f.x1 + 3, f.y1, "#536370", 1.4);
    }
    // Chase bulbs run outside the playable rail; no decorative obstacles.
    for (let i = 0; i < 27; i++) { const y = 116 + i * 21, chase = Math.floor(time / 150) % 9 === i % 9; circle(21, y, 2.7, chase ? "#ffe3a0" : "#8d795340"); circle(549, y, 2.7, chase ? "#80d9e2" : "#52778350"); }
    for (const [x, y] of [[21, 22], [540, 22], [21, 758], [540, 758]]) { circle(x, y, 6, "#5c6060"); circle(x - 0.8, y - 1, 4.6, "#b4b5a9"); line(x - 2.8, y - 1.8, x + 2.8, y + 1.8, "#4b5255", 1.4); }
    if (state.phase === "playing") {
      if (runtime.playing || runtime.control === "agent") { trail.push({ x: ballX, y: ballY }); if (trail.length > 11) trail.shift(); }
      trail.forEach((point, i) => circle(point.x, point.y, 2 + i / 2.2, `rgba(139,224,241,${(i / trail.length) * 0.11})`));
    }
    if (state.phase !== "over") {
      circle(ballX + 3, ballY + 5, 10, "#0009");
      ctx.save(); ctx.shadowColor = "#8fdbe870"; ctx.shadowBlur = 10;
      const metal = ctx.createRadialGradient(ballX - 3.6, ballY - 4.2, 0, ballX + 1, ballY + 1, 11); metal.addColorStop(0, "#fff"); metal.addColorStop(0.23, "#f7ffff"); metal.addColorStop(0.46, "#a8c4d4"); metal.addColorStop(0.72, "#3c556b"); metal.addColorStop(0.9, "#e9ffff"); metal.addColorStop(1, "#7d9caa");
      ctx.beginPath(); ctx.arc(ballX, ballY, TABLE.ballRadius, 0, Math.PI * 2); ctx.fillStyle = metal; ctx.fill(); ctx.restore(); circle(ballX - 3.5, ballY - 4.5, 2, "#fff");
    }
    flashes = flashes.filter(flash => time - flash.born < (flash.type === "save" ? 1400 : 600));
    for (const flash of flashes) {
      const duration = flash.type === "save" ? 1400 : 600, progress = (time - flash.born) / duration;
      if (flash.type === "save") {
        ctx.save(); ctx.globalAlpha = Math.max(0, 1 - progress); ctx.fillStyle = "#07141fdd"; ctx.fillRect(164, 675, 200, 46);
        line(175, 711, 353, 711, "#78e5df", 1); label("BALL SAVED", 264, 703, 17, "#e7fff8", "700"); ctx.restore();
      } else if (flash.type !== "drain" && flash.type !== "multiplier") { ctx.save(); ctx.globalAlpha = 1 - progress; label(`+${number(flash.value)}`, flash.x, flash.y - 26 - progress * 25, 13, "#faffef", "700"); ctx.restore(); }
    }
    // Paused and terminal states never cover the ball or obscure the table.
    if (state.phase === "over") { ctx.fillStyle = "#07141fe8"; ctx.fillRect(162, 421, 205, 73); label("ORBIT COMPLETE", 264, 448, 13, "#ddc894", "700"); label(number(state.score), 264, 480, 28, "#f5efdb", "700"); }
    raf = requestAnimationFrame(render);
  }
  raf = requestAnimationFrame(render);
  launch.focus({ preventScroll: true });
  return () => {
    alive = false; window.clearInterval(timer); cancelAnimationFrame(raf); off(); release();
    section.removeEventListener("keydown", keyDown); window.removeEventListener("keyup", keyUp); window.removeEventListener("blur", blur);
    document.removeEventListener("visibilitychange", visibility); window.removeEventListener("pointerup", pointerRelease); window.removeEventListener("pointercancel", pointerRelease);
    if (audio) void audio.close().catch(() => {});
    root.innerHTML = "";
  };
}
