import type { GameDefinition, LegalAction } from "../../game-runtime";

export const GRID_WIDTH = 12,
  GRID_HEIGHT = 8;
export type TowerKind = "archer" | "mage" | "ballista";
export type ThornwatchAction =
  | { type: "place_tower"; pad: number; tower: TowerKind }
  | { type: "upgrade_tower"; pad: number }
  | { type: "start_wave" }
  | { type: "advance"; frames: 1 | 5 | 15 | 30 };
export type Tower = { pad: number; kind: TowerKind; level: 1 | 2 };
export type Enemy = { id: number; hp: number; progress: number; slow: number };
export type ThornwatchState = {
  version: 1;
  seed: number;
  setup: string;
  phase: "build" | "battle" | "won" | "lost";
  wave: number;
  frame: number;
  gold: number;
  baseHp: number;
  towers: Tower[];
  enemies: Enemy[];
  spawned: number;
  kills: number;
  leaks: number;
  damage: number;
  nextEnemyId: number;
};
export type ThornwatchEvent = {
  type:
    | "spawn"
    | "shot"
    | "kill"
    | "leak"
    | "wave-cleared"
    | "victory"
    | "defeat";
  id?: number;
  pad?: number;
};

export const levelPaths = {
  "meadow-opening": [
    [0, 3],
    [1, 3],
    [2, 3],
    [3, 3],
    [4, 3],
    [4, 2],
    [4, 1],
    [5, 1],
    [6, 1],
    [7, 1],
    [7, 2],
    [7, 3],
    [8, 3],
    [9, 3],
    [10, 3],
    [11, 3],
  ],
  "split-pass": [
    [0, 5],
    [1, 5],
    [2, 5],
    [3, 5],
    [3, 4],
    [3, 3],
    [4, 3],
    [5, 3],
    [6, 3],
    [6, 4],
    [7, 4],
    [8, 4],
    [9, 4],
    [10, 4],
    [11, 4],
  ],
  "ruined-gate": [
    [0, 2],
    [1, 2],
    [2, 2],
    [3, 2],
    [4, 2],
    [4, 3],
    [5, 3],
    [6, 3],
    [7, 3],
    [7, 4],
    [8, 4],
    [9, 4],
    [10, 4],
    [11, 4],
  ],
} as const satisfies Record<string, readonly [number, number][]>;
export const pathForSetup = (setup: string): readonly [number, number][] =>
  levelPaths[setup as keyof typeof levelPaths] ?? levelPaths["meadow-opening"];
const wavePlans = [
  [
    { at: 0, hp: 30 },
    { at: 24, hp: 30 },
    { at: 48, hp: 34 },
    { at: 72, hp: 34 },
  ],
  [
    { at: 0, hp: 46 },
    { at: 18, hp: 46 },
    { at: 36, hp: 50 },
    { at: 54, hp: 54 },
    { at: 72, hp: 58 },
  ],
  [
    { at: 0, hp: 72 },
    { at: 14, hp: 72 },
    { at: 28, hp: 76 },
    { at: 42, hp: 80 },
    { at: 56, hp: 84 },
    { at: 70, hp: 92 },
  ],
] as const;
const kinds: Record<
  TowerKind,
  { cost: number; damage: number; range: number; cooldown: number }
> = {
  archer: { cost: 25, damage: 8, range: 3, cooldown: 9 },
  mage: { cost: 38, damage: 13, range: 2, cooldown: 13 },
  ballista: { cost: 54, damage: 27, range: 5, cooldown: 23 },
};
const exact = (v: unknown, keys: string[]) =>
  !!v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  Object.keys(v).length === keys.length &&
  keys.every((k) => Object.hasOwn(v, k));
const integer = (
  v: unknown,
  min: number,
  max = Number.MAX_SAFE_INTEGER,
): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= min && v <= max;
const padCell = (pad: number) => ({
  x: pad % GRID_WIDTH,
  y: Math.floor(pad / GRID_WIDTH),
});
const usablePad = (setup: string, pad: number) =>
  integer(pad, 0, GRID_WIDTH * GRID_HEIGHT - 1) &&
  !pathForSetup(setup).some(([x, y]) => y * GRID_WIDTH + x === pad);
const inRange = (setup: string, tower: Tower, enemy: Enemy) => {
  const a = padCell(tower.pad),
    route = pathForSetup(setup),
    b = route[Math.min(enemy.progress, route.length - 1)];
  return Math.abs(a.x - b[0]) + Math.abs(a.y - b[1]) <= kinds[tower.kind].range;
};

function initialState(seed: number): ThornwatchState {
  if (!integer(seed, 0, 0xffffffff))
    throw new Error("THORNWATCH seed must be an unsigned 32-bit integer.");
  return {
    version: 1,
    seed,
    setup: "meadow-opening",
    phase: "build",
    wave: 0,
    frame: 0,
    gold: 100,
    baseHp: 20,
    towers: [],
    enemies: [],
    spawned: 0,
    kills: 0,
    leaks: 0,
    damage: 0,
    nextEnemyId: 1,
  };
}
function legalActions(s: ThornwatchState): LegalAction<ThornwatchAction>[] {
  if (s.phase === "won" || s.phase === "lost") return [];
  const actions: LegalAction<ThornwatchAction>[] = [];
  if (s.phase === "build") {
    for (let pad = 0; pad < GRID_WIDTH * GRID_HEIGHT; pad++)
      if (usablePad(s.setup, pad) && !s.towers.some((t) => t.pad === pad))
        for (const tower of Object.keys(kinds) as TowerKind[])
          if (s.gold >= kinds[tower].cost)
            actions.push({
              action: { type: "place_tower", pad, tower },
              label: `Build ${tower}`,
              reason: `Place a ${tower} on an open pad.`,
            });
    for (const t of s.towers)
      if (t.level === 1 && s.gold >= 30)
        actions.push({
          action: { type: "upgrade_tower", pad: t.pad },
          label: "Upgrade tower",
          reason: "Increase damage by 50%.",
        });
    actions.push({
      action: { type: "start_wave" },
      label: `Start wave ${s.wave + 1}`,
      reason: "Release the next authored raider schedule.",
    });
  } else
    for (const frames of [1, 5, 15, 30] as const)
      actions.push({
        action: { type: "advance", frames },
        label: `Advance ${frames} frames`,
        reason: "Simulate fixed combat frames.",
      });
  return actions;
}
function validAction(s: ThornwatchState, a: ThornwatchAction): boolean {
  if (s.phase === "won" || s.phase === "lost" || !a || typeof a !== "object")
    return false;
  if (a.type === "start_wave")
    return exact(a, ["type"]) && s.phase === "build" && s.wave < 3;
  if (a.type === "advance")
    return (
      exact(a, ["type", "frames"]) &&
      s.phase === "battle" &&
      [1, 5, 15, 30].includes(a.frames)
    );
  if (a.type === "place_tower")
    return (
      exact(a, ["type", "pad", "tower"]) &&
      s.phase === "build" &&
      usablePad(s.setup, a.pad) &&
      Object.hasOwn(kinds, a.tower) &&
      !s.towers.some((t) => t.pad === a.pad) &&
      s.gold >= kinds[a.tower].cost
    );
  return (
    a.type === "upgrade_tower" &&
    exact(a, ["type", "pad"]) &&
    s.phase === "build" &&
    s.gold >= 30 &&
    s.towers.some((t) => t.pad === a.pad && t.level === 1)
  );
}
function combatFrame(
  state: ThornwatchState,
  events: ThornwatchEvent[],
): ThornwatchState {
  let s: ThornwatchState = {
    ...state,
    frame: state.frame + 1,
    enemies: state.enemies.map((e) => ({
      ...e,
      slow: Math.max(0, e.slow - 1),
    })),
  };
  const plan = wavePlans[s.wave - 1];
  const scheduled = plan[s.spawned];
  if (scheduled && scheduled.at === state.frame) {
    s = {
      ...s,
      spawned: s.spawned + 1,
      nextEnemyId: s.nextEnemyId + 1,
      enemies: [
        ...s.enemies,
        { id: s.nextEnemyId, hp: scheduled.hp, progress: 0, slow: 0 },
      ],
    };
    events.push({ type: "spawn", id: s.nextEnemyId });
  }
  // deterministic cadence replaces per-tower mutable clocks: each pad owns an authored phase.
  for (const tower of s.towers)
    if ((s.frame + tower.pad) % kinds[tower.kind].cooldown === 0) {
      const target = s.enemies
        .filter((e) => inRange(s.setup, tower, e))
        .sort((a, b) => b.progress - a.progress || a.id - b.id)[0];
      if (target) {
        const damage =
          kinds[tower.kind].damage +
          (tower.level === 2 ? Math.floor(kinds[tower.kind].damage / 2) : 0);
        s = {
          ...s,
          damage: s.damage + damage,
          enemies: s.enemies.map((e) =>
            e.id === target.id
              ? {
                  ...e,
                  hp: e.hp - damage,
                  slow: tower.kind === "mage" ? 4 : e.slow,
                }
              : e,
          ),
        };
        events.push({ type: "shot", id: target.id, pad: tower.pad });
      }
    }
  const dead = s.enemies.filter((e) => e.hp <= 0);
  if (dead.length) {
    s = {
      ...s,
      gold: s.gold + dead.length * 8,
      kills: s.kills + dead.length,
      enemies: s.enemies.filter((e) => e.hp > 0),
    };
    for (const e of dead) events.push({ type: "kill", id: e.id });
  }
  const route = pathForSetup(s.setup);
  const moved = s.enemies.map((e) =>
    e.slow ? e : { ...e, progress: e.progress + 1 },
  );
  const leaked = moved.filter((e) => e.progress >= route.length);
  if (leaked.length) {
    s = {
      ...s,
      baseHp: Math.max(0, s.baseHp - leaked.length * 2),
      leaks: s.leaks + leaked.length,
      enemies: moved.filter((e) => e.progress < route.length),
    };
    for (const e of leaked) events.push({ type: "leak", id: e.id });
  } else s = { ...s, enemies: moved };
  if (s.baseHp === 0) {
    events.push({ type: "defeat" });
    return { ...s, phase: "lost" };
  }
  if (s.spawned === plan.length && s.enemies.length === 0) {
    events.push({ type: "wave-cleared" });
    if (s.wave === 3) {
      events.push({ type: "victory" });
      return { ...s, phase: "won" };
    }
    return { ...s, phase: "build", frame: 0, spawned: 0 };
  }
  return s;
}
function reduce(
  state: ThornwatchState,
  action: ThornwatchAction,
): { state: ThornwatchState; events: ThornwatchEvent[] } {
  if (!validAction(state, action))
    throw new Error("Illegal THORNWATCH action.");
  if (action.type === "place_tower")
    return {
      state: {
        ...state,
        gold: state.gold - kinds[action.tower].cost,
        towers: [
          ...state.towers,
          { pad: action.pad, kind: action.tower, level: 1 as const },
        ],
      },
      events: [],
    };
  if (action.type === "upgrade_tower")
    return {
      state: {
        ...state,
        gold: state.gold - 30,
        towers: state.towers.map((t) =>
          t.pad === action.pad ? { ...t, level: 2 as const } : t,
        ),
      },
      events: [],
    };
  if (action.type === "start_wave")
    return {
      state: {
        ...state,
        phase: "battle",
        wave: state.wave + 1,
        frame: 0,
        spawned: 0,
        enemies: [],
      },
      events: [],
    };
  const events: ThornwatchEvent[] = [];
  let s = state;
  for (let i = 0; i < action.frames && s.phase === "battle"; i++)
    s = combatFrame(s, events);
  return { state: s, events };
}
function deserialize(value: unknown): ThornwatchState {
  const bad = (): never => {
    throw new Error("Invalid THORNWATCH snapshot.");
  };
  if (
    !exact(value, [
      "version",
      "seed",
      "setup",
      "phase",
      "wave",
      "frame",
      "gold",
      "baseHp",
      "towers",
      "enemies",
      "spawned",
      "kills",
      "leaks",
      "damage",
      "nextEnemyId",
    ])
  )
    return bad();
  const s = value as ThornwatchState;
  if (
    s.version !== 1 ||
    !integer(s.seed, 0, 0xffffffff) ||
    !["meadow-opening", "split-pass", "ruined-gate"].includes(s.setup) ||
    !["build", "battle", "won", "lost"].includes(s.phase) ||
    !integer(s.wave, 0, 3) ||
    !integer(s.frame, 0) ||
    !integer(s.gold, 0) ||
    !integer(s.baseHp, 0, 20) ||
    !integer(s.spawned, 0, 6) ||
    !integer(s.kills, 0) ||
    !integer(s.leaks, 0) ||
    !integer(s.damage, 0) ||
    !integer(s.nextEnemyId, 1)
  )
    return bad();
  if (
    !Array.isArray(s.towers) ||
    !s.towers.every(
      (t) =>
        exact(t, ["pad", "kind", "level"]) &&
        usablePad(s.setup, t.pad) &&
        Object.hasOwn(kinds, t.kind) &&
        [1, 2].includes(t.level),
    ) ||
    new Set(s.towers.map((t) => t.pad)).size !== s.towers.length
  )
    return bad();
  if (
    !Array.isArray(s.enemies) ||
    !s.enemies.every(
      (e) =>
        exact(e, ["id", "hp", "progress", "slow"]) &&
        integer(e.id, 1) &&
        integer(e.hp, 1, 100) &&
        integer(e.progress, 0, pathForSetup(s.setup).length - 1) &&
        integer(e.slow, 0, 4),
    ) ||
    new Set(s.enemies.map((e) => e.id)).size !== s.enemies.length
  )
    return bad();
  if (
    s.phase === "battle" &&
    (s.wave < 1 || s.wave > 3 || s.spawned > wavePlans[s.wave - 1].length)
  )
    return bad();
  if (s.phase === "won" && s.wave !== 3) return bad();
  if (s.phase === "lost" && s.baseHp !== 0) return bad();
  return structuredClone(s);
}
const setup = (
  id: string,
  title: string,
  description: string,
  patch: Partial<ThornwatchState>,
) => ({
  id,
  title,
  description,
  createState(seed: number) {
    return deserialize({ ...initialState(seed), setup: id, ...patch });
  },
});
export const thornwatchGame: GameDefinition<
  ThornwatchState,
  ThornwatchAction,
  ThornwatchEvent
> = {
  description: {
    id: "thornwatch",
    title: "THORNWATCH",
    version: "1.0.0",
    summary:
      "A compact fixed-frame tower defense: defend the gate through three authored raids.",
    rules: [
      "Build only during the planning phase; towers fire automatically during a wave.",
      "Archers are cheap and quick, mages slow raiders, and ballistae hit hard at long range.",
      "Space starts or pauses human play. Click/tap an open pad to build the selected tower; click a built tower to upgrade.",
    ],
    victoryConditions: [
      "Clear all three authored waves while the gate remains standing.",
    ],
    failureConditions: [
      "The gate reaches zero health from raiders that complete the road.",
    ],
    metrics: [
      {
        key: "phase",
        label: "Phase",
        description: "Build, active battle, victory, or defeat.",
      },
      {
        key: "wave",
        label: "Wave",
        description: "Current cleared/active authored wave.",
      },
      {
        key: "gold",
        label: "Gold",
        description: "Resources available for new towers and upgrades.",
      },
      {
        key: "baseHp",
        label: "Gate HP",
        description: "Gate integrity; zero loses the defense.",
        badWhen: "zero",
      },
      { key: "kills", label: "Kills", description: "Raiders destroyed." },
      {
        key: "leaks",
        label: "Leaks",
        description: "Raiders that reached the gate.",
        badWhen: "high",
      },
      {
        key: "damage",
        label: "Damage",
        description: "Total tower damage dealt; supports branch comparison.",
      },
      {
        key: "towers",
        label: "Towers",
        description: "Placed defensive towers.",
      },
    ],
    actions: [
      {
        type: "place_tower",
        description: "Place a selected tower on an unoccupied non-road pad.",
        inputSchema: {
          type: "object",
          properties: {
            type: { const: "place_tower" },
            pad: { type: "integer", minimum: 0, maximum: 95 },
            tower: { type: "string", enum: ["archer", "mage", "ballista"] },
          },
          required: ["type", "pad", "tower"],
          additionalProperties: false,
        },
      },
      {
        type: "upgrade_tower",
        description: "Upgrade a level-one tower.",
        inputSchema: {
          type: "object",
          properties: {
            type: { const: "upgrade_tower" },
            pad: { type: "integer", minimum: 0, maximum: 95 },
          },
          required: ["type", "pad"],
          additionalProperties: false,
        },
      },
      {
        type: "start_wave",
        description: "Start the next authored wave.",
        inputSchema: {
          type: "object",
          properties: { type: { const: "start_wave" } },
          required: ["type"],
          additionalProperties: false,
        },
      },
      {
        type: "advance",
        description: "Advance exactly 1, 5, 15, or 30 combat frames.",
        inputSchema: {
          type: "object",
          properties: {
            type: { const: "advance" },
            frames: { type: "integer", enum: [1, 5, 15, 30] },
          },
          required: ["type", "frames"],
          additionalProperties: false,
        },
      },
    ],
  },
  setups: [
    setup(
      "meadow-opening",
      "Meadow Opening",
      "Balanced fresh defense with 100 gold.",
      {},
    ),
    setup(
      "split-pass",
      "Split Pass",
      "Extra gold for testing a mixed first line.",
      { gold: 125 },
    ),
    setup(
      "ruined-gate",
      "Ruined Gate",
      "A battered gate already facing wave two with an archer.",
      {
        wave: 1,
        gold: 70,
        baseHp: 12,
        towers: [{ pad: 29, kind: "archer", level: 1 }],
      },
    ),
  ],
  initialState,
  legalActions,
  reduce,
  deserialize,
  metrics: (s) => ({
    phase: s.phase,
    wave: s.wave,
    gold: s.gold,
    baseHp: s.baseHp,
    kills: s.kills,
    leaks: s.leaks,
    damage: s.damage,
    towers: s.towers.length,
  }),
};
