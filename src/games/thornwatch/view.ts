import {
  Application,
  Assets,
  Container,
  Graphics,
  Sprite,
  Texture,
} from "pixi.js";
import type { GameMountOptions, GameRuntime } from "../../game-runtime";
import { GRID_HEIGHT, GRID_WIDTH, pathForSetup } from "./game";
import type {
  ThornwatchAction,
  ThornwatchEvent,
  ThornwatchState,
  TowerKind,
} from "./game";
import "./view.css";

const CELL = 48;
const WIDTH = GRID_WIDTH * CELL;
const HEIGHT = GRID_HEIGHT * CELL;
const STEP_MS = 100;
const titles: Record<string, string> = {
  "meadow-opening": "MEADOW OPENING",
  "split-pass": "SPLIT PASS",
  "ruined-gate": "RUINED GATE",
};

type Fx = { view: Graphics | Sprite; until: number };

/** Pixi projects authoritative state; its ticker only supplies presentational motion. */
export async function mountThornwatch(
  root: HTMLElement,
  runtime: GameRuntime<ThornwatchState, ThornwatchAction, ThornwatchEvent>,
  options: GameMountOptions,
): Promise<() => void> {
  let state = runtime.state,
    selected: TowerKind = "archer",
    hover = -1,
    lastStep = 0;
  root.innerHTML = `<section class="thornwatch"><aside><p class="tw-kicker">GATEWARDEN'S LOG · <span class="tw-level"></span></p><h1>THORN<span>WATCH</span></h1><p class="tw-copy">Three raids. One road. Keep the old gate standing.</p><div class="tw-stats"><b>GOLD <output class="tw-gold"></output></b><b>GATE <output class="tw-hp"></output></b><b>WAVE <output class="tw-wave"></output></b></div><div class="tw-towers">${(["archer", "mage", "ballista"] as TowerKind[]).map((kind) => `<button type="button" data-tower="${kind}" aria-label="Select ${kind} tower">${kind}<small>${{ archer: 25, mage: 38, ballista: 54 }[kind]}g</small></button>`).join("")}</div><button type="button" class="tw-start" aria-label="Game action"></button><button type="button" class="tw-restart" aria-label="Restart THORNWATCH">RESTART <kbd>R</kbd></button><p class="tw-help"><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> select · tap pads to build · tap tower to upgrade · <kbd>Space</kbd> start/pause</p><p class="tw-message" aria-live="polite"></p></aside><div class="tw-board-wrap"><div class="tw-pixi" aria-label="PixiJS game renderer"></div><span class="tw-engine">PIXIJS · WEBGL</span><div class="tw-overlay" hidden></div></div></section>`;
  const host = root.querySelector<HTMLElement>(".tw-pixi")!,
    gold = root.querySelector(".tw-gold")!,
    hp = root.querySelector(".tw-hp")!,
    wave = root.querySelector(".tw-wave")!,
    level = root.querySelector(".tw-level")!,
    message = root.querySelector(".tw-message")!,
    primary = root.querySelector<HTMLButtonElement>(".tw-start")!,
    restart = root.querySelector<HTMLButtonElement>(".tw-restart")!,
    overlay = root.querySelector<HTMLElement>(".tw-overlay")!;
  const app = new Application();
  await app.init({
    width: WIDTH,
    height: HEIGHT,
    background: "#172b20",
    antialias: true,
    preference: "webgl",
    preserveDrawingBuffer: true,
    autoDensity: true,
    resolution: Math.min(devicePixelRatio, 2),
  });
  const canvas = app.canvas;
  canvas.tabIndex = 0;
  canvas.setAttribute(
    "aria-label",
    "THORNWATCH defense board. Click an open pad to build a selected tower.",
  );
  host.append(canvas);
  const assets = await Promise.all(
    [
      "terrain",
      "archer",
      "mage",
      "ballista",
      "goblin",
      "raider",
      "troll",
      "gate",
      "impact",
      "arrow",
      "fireball",
    ].map((name) =>
      Assets.load<Texture>(`${options.assets}/${name}.png`).catch(
        () => Texture.EMPTY,
      ),
    ),
  );
  const [
    terrain,
    archer,
    mage,
    ballista,
    goblin,
    raider,
    troll,
    gateTexture,
    impact,
    arrow,
    fireball,
  ] = assets;
  const scene = new Container(),
    board = new Container(),
    units = new Container(),
    effects = new Container();
  app.stage.addChild(scene);
  scene.addChild(board, units, effects);
  const fx: Fx[] = [];
  const human = () => runtime.control === "human" && !runtime.busy;
  const point = (pad: number) => ({
    x: (pad % GRID_WIDTH) * CELL + 24,
    y: Math.floor(pad / GRID_WIDTH) * CELL + 24,
  });
  const padAt = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    return (
      Math.floor(((event.clientY - rect.top) * HEIGHT) / rect.height / CELL) *
        GRID_WIDTH +
      Math.floor(((event.clientX - rect.left) * WIDTH) / rect.width / CELL)
    );
  };
  const box = (color: number, x: number, y: number, w: number, h: number) =>
    new Graphics().rect(x, y, w, h).fill(color);
  function sprite(texture: Texture, x: number, y: number, size: number) {
    const view = new Sprite(texture);
    view.anchor.set(0.5);
    view.position.set(x, y);
    view.width = view.height = size;
    return view;
  }
  const clearProjection = (container: Container) => {
    for (const child of container.removeChildren()) child.destroy({ children: true });
  };
  function renderBoard() {
    clearProjection(board);
    clearProjection(units);
    const route = pathForSetup(state.setup),
      road = new Set(route.map(([x, y]) => y * GRID_WIDTH + x));
    board.addChild(box(0x254634, 0, 0, WIDTH, HEIGHT));
    if (terrain !== Texture.EMPTY) {
      const layer = sprite(terrain, WIDTH / 2, HEIGHT / 2, WIDTH);
      layer.height = HEIGHT;
      layer.alpha = 0.48;
      board.addChild(layer);
    }
    // Decorative, deterministic grass clumps make the clearing read as a place,
    // not a simulation grid. They are unrelated to state and input mapping.
    for (let y = 0; y < GRID_HEIGHT; y++)
      for (let x = 0; x < GRID_WIDTH; x++) {
        const pad = y * GRID_WIDTH + x;
        if (road.has(pad)) continue;
        const hash = (x * 17 + y * 31 + 7) % 19;
        if (hash < 3)
          board.addChild(
            new Graphics()
              .circle(
                x * CELL + 13 + hash * 7,
                y * CELL + 15 + hash * 5,
                2 + hash,
              )
              .fill(hash === 0 ? 0x6f8e54 : 0x3d623d),
          );
        if (hash === 7)
          board.addChild(
            new Graphics()
              .circle(x * CELL + 31, y * CELL + 28, 3)
              .fill(0x9b8c54),
          );
      }
    if (hover >= 0 && !road.has(hover)) {
      const x = hover % GRID_WIDTH,
        y = Math.floor(hover / GRID_WIDTH);
      board.addChild(
        new Graphics()
          .roundRect(x * CELL + 6, y * CELL + 6, CELL - 12, CELL - 12, 10)
          .fill({ color: 0xf1ce76, alpha: 0.15 })
          .stroke({ color: 0xf7d37a, alpha: 0.95, width: 2 }),
      );
    }
    const roadLayer = (color: number, width: number) => {
      const line = new Graphics();
      const points = route.map(([x, y]) => ({ x: x * CELL + 24, y: y * CELL + 24 }));
      line.moveTo(points[0].x, points[0].y);
      for (let index = 1; index < points.length - 1; index++) {
        const current = points[index], next = points[index + 1];
        line.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
      }
      line.lineTo(points.at(-1)!.x, points.at(-1)!.y);
      return line.stroke({ color, width, join: "round", cap: "round" });
    };
    board.addChild(
      roadLayer(0x1b3020, 44),
      roadLayer(0x57462f, 37),
      roadLayer(0x9b7448, 29),
    );
    const spawn = route[0],
      gate = route.at(-1)!;
    const portal = new Graphics()
      .circle(spawn[0] * CELL + 24, spawn[1] * CELL + 24, 19)
      .fill(0x24153f)
      .circle(spawn[0] * CELL + 24, spawn[1] * CELL + 24, 14)
      .stroke({ color: 0xb26ee2, width: 3 })
      .circle(spawn[0] * CELL + 24, spawn[1] * CELL + 24, 7)
      .fill(0x663b9b);
    board.addChild(portal);
    if (gateTexture !== Texture.EMPTY)
      board.addChild(
        sprite(
          gateTexture,
          Math.min(gate[0] * CELL + 24, WIDTH - 42),
          gate[1] * CELL + 24,
          70,
        ),
      );
    else
      board.addChild(
        box(0x5d3d2a, gate[0] * CELL + 2, gate[1] * CELL + 2, 44, 44),
      );
    for (const tower of state.towers) {
      const p = point(tower.pad),
        color =
          tower.kind === "archer"
            ? 0xe7ca75
            : tower.kind === "mage"
              ? 0xb994e8
              : 0xdc7853;
      const towerTexture =
        tower.kind === "archer"
          ? archer
          : tower.kind === "mage"
            ? mage
            : ballista;
      const towerView =
        towerTexture !== Texture.EMPTY
          ? sprite(
              towerTexture,
              p.x,
              p.y - 5,
              tower.kind === "ballista" ? 60 : 54,
            )
          : new Graphics()
              .circle(p.x, p.y, tower.level === 2 ? 15 : 12)
              .fill(color)
              .rect(p.x - 3, p.y - 23, 6, 23)
              .fill(0x1c2020);
      if (tower.kind === "archer" && towerView instanceof Graphics)
        towerView
          .arc(p.x, p.y - 8, 9, Math.PI, 0)
          .stroke({ color: 0x332218, width: 2 });
      if (tower.level === 2 && towerView instanceof Graphics)
        towerView.circle(p.x, p.y, 18).stroke({ color: 0xffe89a, width: 2 });
      units.addChild(towerView);
    }
    for (const enemy of state.enemies) {
      const [x, y] = route[Math.min(enemy.progress, route.length - 1)],
        p = { x: x * CELL + 24, y: y * CELL + 24 };
      const enemyTexture =
        enemy.id % 3 === 0 ? troll : enemy.id % 3 === 1 ? goblin : raider;
      units.addChild(
        enemyTexture !== Texture.EMPTY
          ? sprite(enemyTexture, p.x, p.y, enemy.id % 3 === 0 ? 48 : 40)
          : new Graphics().circle(p.x, p.y, 12).fill(0x8d2932),
      );
      units.addChild(
        box(0x25191a, p.x - 14, p.y - 20, 28, 5),
        box(0xdf675e, p.x - 13, p.y - 19, Math.min(26, enemy.hp / 4), 3),
      );
    }
    const vignette = new Graphics()
      .rect(0, 0, WIDTH, HEIGHT)
      .stroke({ color: 0x09120c, width: 12, alpha: 0.75 });
    board.addChild(vignette);
  }
  function render() {
    const agentBusy = runtime.control === "agent" && runtime.busy,
      agentIdle = runtime.control === "agent" && !runtime.busy;
    primary.textContent = agentBusy
      ? "AGENT RUNNING"
      : agentIdle
        ? "TAKE CONTROL"
        : state.phase === "build"
          ? "START WAVE"
          : runtime.playing
            ? "PAUSE"
            : "RESUME";
    primary.disabled =
      agentBusy || state.phase === "won" || state.phase === "lost";
    restart.disabled = !human();
    root
      .querySelectorAll<HTMLButtonElement>("[data-tower]")
      .forEach((button) => {
        const active = button.dataset.tower === selected;
        button.classList.toggle("selected", active);
        button.setAttribute("aria-pressed", String(active));
      });
    gold.textContent = String(state.gold);
    hp.textContent = `${state.baseHp}/20`;
    wave.textContent =
      state.phase === "battle"
        ? `${state.wave}/3`
        : `${Math.min(state.wave + 1, 3)}/3`;
    level.textContent = titles[state.setup];
    message.textContent = agentBusy
      ? "Agent is executing the simulation."
      : agentIdle
        ? "Agent run paused. Take control to continue."
        : state.phase === "battle"
          ? `${state.enemies.length} raiders on the road · ${state.kills} down`
          : `${titles[state.setup]} · plan the defense.`;
    overlay.hidden = state.phase !== "won" && state.phase !== "lost";
    overlay.textContent =
      state.phase === "won" ? "THE GATE HOLDS" : "THE GATE FALLS";
    renderBoard();
  }
  const unsubscribe = runtime.subscribe((next, events) => {
    state = next;
    for (const event of events)
      if (event.type === "shot" || event.type === "kill") {
        const target = state.enemies.find((enemy) => enemy.id === event.id);
        const route = pathForSetup(state.setup);
        const routePoint =
          target && route[Math.min(target.progress, route.length - 1)];
        const p =
            event.pad !== undefined
              ? point(event.pad)
              : routePoint
                ? { x: routePoint[0] * CELL + 24, y: routePoint[1] * CELL + 24 }
                : { x: WIDTH / 2, y: HEIGHT / 2 },
          view =
            event.type === "shot" &&
            event.pad !== undefined &&
            state.towers.find((tower) => tower.pad === event.pad)?.kind ===
              "archer" &&
            arrow !== Texture.EMPTY
              ? sprite(arrow, p.x, p.y, 26)
              : event.type === "shot" &&
                  event.pad !== undefined &&
                  state.towers.find((tower) => tower.pad === event.pad)
                    ?.kind === "mage" &&
                  fireball !== Texture.EMPTY
                ? sprite(fireball, p.x, p.y, 30)
                : impact !== Texture.EMPTY
                  ? sprite(impact, p.x, p.y, event.type === "kill" ? 38 : 28)
                  : new Graphics()
                      .circle(p.x, p.y, event.type === "kill" ? 10 : 6)
                      .fill(0xffe89a);
        effects.addChild(view);
        fx.push({ view, until: performance.now() + 180 });
      }
    render();
  });
  app.ticker.add(() => {
    const now = performance.now();
    for (let i = fx.length - 1; i >= 0; i--)
      if (fx[i].until < now) {
        effects.removeChild(fx[i].view);
        fx[i].view.destroy();
        fx.splice(i, 1);
      }
    if (
      human() &&
      runtime.playing &&
      state.phase === "battle" &&
      now - lastStep >= STEP_MS
    ) {
      lastStep = now;
      void runtime.dispatch({ type: "advance", frames: 1 });
    }
  });
  root.querySelector(".tw-towers")!.addEventListener("click", (event) => {
    if (!human()) return;
    const kind = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-tower]",
    )?.dataset.tower as TowerKind | undefined;
    if (kind) {
      selected = kind;
      render();
    }
  });
  canvas.addEventListener("pointermove", (event) => {
    const next = padAt(event);
    if (next === hover) return;
    hover = next;
    renderBoard();
  });
  canvas.addEventListener("pointerleave", () => {
    if (hover === -1) return;
    hover = -1;
    renderBoard();
  });
  canvas.addEventListener("pointerdown", async (event) => {
    if (!human() || state.phase !== "build") return;
    const pad = padAt(event);
    if (state.towers.some((tower) => tower.pad === pad))
      await runtime.dispatch({ type: "upgrade_tower", pad });
    else await runtime.dispatch({ type: "place_tower", pad, tower: selected });
    canvas.focus();
  });
  primary.onclick = async () => {
    if (runtime.control === "agent") {
      if (!runtime.busy) runtime.pause("human");
      return;
    }
    if (!human()) return;
    if (state.phase === "build") {
      await runtime.dispatch({ type: "start_wave" });
      lastStep = performance.now();
      runtime.play();
    } else if (state.phase === "battle")
      runtime.playing ? runtime.pause() : runtime.play();
  };
  restart.onclick = () => {
    if (human()) void runtime.reset();
  };
  const key = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (
      target?.matches("button,input,textarea,select,[contenteditable=true]") ||
      !human()
    )
      return;
    if (event.key === "1") selected = "archer";
    else if (event.key === "2") selected = "mage";
    else if (event.key === "3") selected = "ballista";
    else if (event.key.toLowerCase() === "r") void runtime.reset();
    else if (event.code === "Space") {
      event.preventDefault();
      void primary.click();
    }
    render();
  };
  window.addEventListener("keydown", key);
  render();
  return () => {
    unsubscribe();
    window.removeEventListener("keydown", key);
    app.destroy(true, { children: true, texture: false });
  };
}
