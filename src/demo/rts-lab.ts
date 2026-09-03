import type { GameAdapter, GameDescription, LegalAction, RenderContext } from "../huginn/types";

export const RTS_LAB_WIDTH = 16;
export const RTS_LAB_HEIGHT = 12;
const TOTAL_WORKERS = 2;

export interface RtsLabState {
  seed: number;
  rng: number;
  cycle: number;
  heartwood: number;
  crownGold: number;
  workersOnHeartwood: number;
  workersOnGold: number;
  barracksBuilt: boolean;
  watchtowerBuilt: boolean;
  vanguards: number;
  raiders: number;
  sunforgeBaseHp: number;
  thornmawBaseHp: number;
  frontline: number;
}

export type RtsLabAction =
  | { type: "assign_worker"; resource: "heartwood" | "crown_gold" }
  | { type: "advance_cycle" }
  | { type: "build_barracks" }
  | { type: "build_watchtower" }
  | { type: "train_vanguard" }
  | { type: "launch_attack" };

export type RtsLabEvent =
  | { type: "worker_reassigned"; resource: "heartwood" | "crown_gold" }
  | { type: "resources_gathered"; heartwood: number; crownGold: number; incomingDamage: number }
  | { type: "structure_built"; structure: "barracks" | "watchtower" }
  | { type: "unit_trained"; unit: "vanguard" }
  | { type: "attack_resolved"; damage: number; losses: number; raidersDefeated: number };

export interface RtsLabMetrics {
  [key: string]: number;
  cycle: number;
  heartwood: number;
  crown_gold: number;
  economy_value: number;
  army_value: number;
  sunforge_base_hp: number;
  thornmaw_base_hp: number;
  enemy_damage: number;
  strategy_score: number;
}

const emptyAction = (type: RtsLabAction["type"], description: string) => ({
  type,
  description,
  inputSchema: {
    type: "object",
    properties: { type: { const: type } },
    required: ["type"],
    additionalProperties: false,
  },
});

export const rtsLabDescription: GameDescription = {
  id: "huginn-rts-lab",
  title: "Ashenbanner RTS Lab",
  version: "0.1.0",
  summary:
    "A deterministic strategy-game slice for comparing build orders from the same live snapshot and seed.",
  rules: [
    "Two workers can be reassigned between Heartwood and Crown Gold.",
    "Advancing a cycle gathers deterministic resources and resolves Thornmaw pressure.",
    "A barracks costs 50 Heartwood; a watchtower costs 35 Heartwood.",
    "A vanguard costs 30 Crown Gold and requires a barracks.",
    "Launching an attack commits all trained vanguards against the Thornmaw stronghold.",
    "This small experiment slice advances time only with advance_cycle. Building, training, and attacks are instantaneous; it is not a full real-time RTS.",
    "Compare build orders at the same ending cycle and inspect damage, economy, and surviving base HP together. One seed does not establish game balance.",
    "Snapshots include RNG state. Repeating the same actions reproduces the same draws; different action lists may consume those draws differently.",
  ],
  victoryConditions: ["Reduce the Thornmaw stronghold to 0 HP while the Sunforge stronghold survives."],
  failureConditions: ["The Sunforge stronghold reaches 0 HP."],
  metrics: [
    { key: "cycle", label: "Cycle", description: "Completed economy and pressure cycles." },
    { key: "heartwood", label: "Heartwood", description: "Construction resource held by Sunforge." },
    { key: "crown_gold", label: "Crown Gold", description: "Training resource held by Sunforge." },
    { key: "economy_value", label: "Economy value", description: "Heartwood plus Crown Gold." },
    { key: "army_value", label: "Army value", description: "Surviving vanguards valued at 30 each." },
    {
      key: "sunforge_base_hp",
      label: "Sunforge HP",
      description: "Health remaining on the player's stronghold.",
      badWhen: "Below 40.",
    },
    {
      key: "thornmaw_base_hp",
      label: "Thornmaw HP",
      description: "Health remaining on the enemy stronghold.",
    },
    { key: "enemy_damage", label: "Enemy damage", description: "Total damage dealt to Thornmaw." },
    {
      key: "strategy_score",
      label: "Strategy score",
      description: "Illustrative heuristic only: round(enemy_damage * 2 + army_value + economy_value * 0.5 + sunforge_base_hp - cycle * 3). Not a victory condition or validated balance measure; compare equal-cycle outcomes and individual metrics.",
    },
  ],
  actions: [
    {
      type: "assign_worker",
      description: "Move one worker to Heartwood or Crown Gold.",
      inputSchema: {
        type: "object",
        properties: {
          type: { const: "assign_worker" },
          resource: { enum: ["heartwood", "crown_gold"] },
        },
        required: ["type", "resource"],
        additionalProperties: false,
      },
    },
    emptyAction("advance_cycle", "Gather resources and resolve enemy pressure."),
    emptyAction("build_barracks", "Spend 50 Heartwood to unlock vanguard training."),
    emptyAction("build_watchtower", "Spend 35 Heartwood to reduce incoming raid damage."),
    emptyAction("train_vanguard", "Spend 30 Crown Gold to train a vanguard."),
    emptyAction("launch_attack", "Send all vanguards against the Thornmaw stronghold."),
  ],
};

function nextRandom(value: number): { state: number; value: number } {
  let next = value | 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  const unsigned = next >>> 0;
  return { state: unsigned, value: unsigned / 0x100000000 };
}

function integer(value: unknown, name: string, minimum = 0, maximum = Number.MAX_SAFE_INTEGER): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    throw new TypeError(`Invalid RTS Lab field: ${name}`);
  }
  return value as number;
}

function metrics(state: RtsLabState): RtsLabMetrics {
  const economyValue = state.heartwood + state.crownGold;
  const armyValue = state.vanguards * 30;
  const enemyDamage = 100 - state.thornmawBaseHp;
  const strategyScore = Math.round(
    enemyDamage * 2 + armyValue + economyValue * 0.5 + state.sunforgeBaseHp - state.cycle * 3,
  );
  return {
    cycle: state.cycle,
    heartwood: state.heartwood,
    crown_gold: state.crownGold,
    economy_value: economyValue,
    army_value: armyValue,
    sunforge_base_hp: state.sunforgeBaseHp,
    thornmaw_base_hp: state.thornmawBaseHp,
    enemy_damage: enemyDamage,
    strategy_score: strategyScore,
  };
}

export function createRtsLabAdapter(
  render: (
    state: RtsLabState,
    context: RenderContext<RtsLabAction, RtsLabEvent>,
  ) => void | Promise<void> = () => {},
): GameAdapter<RtsLabState, RtsLabAction, RtsLabEvent, RtsLabMetrics> {
  return {
    description: rtsLabDescription,
    initialState(seed) {
      return {
        seed,
        rng: seed === 0 ? 0x9e3779b9 : seed,
        cycle: 0,
        heartwood: 55,
        crownGold: 37,
        workersOnHeartwood: 2,
        workersOnGold: 0,
        barracksBuilt: false,
        watchtowerBuilt: false,
        vanguards: 0,
        raiders: 1,
        sunforgeBaseHp: 100,
        thornmawBaseHp: 100,
        frontline: 2,
      };
    },
    listLegalActions(state) {
      const actions: LegalAction<RtsLabAction>[] = [
        {
          action: { type: "advance_cycle" },
          label: "Advance cycle",
          reason: "Resolve gathering and enemy pressure.",
        },
      ];
      if (state.workersOnGold > 0) {
        actions.push({
          action: { type: "assign_worker", resource: "heartwood" },
          label: "Reassign to Heartwood",
          reason: "At least one worker is gathering Crown Gold.",
        });
      }
      if (state.workersOnHeartwood > 0) {
        actions.push({
          action: { type: "assign_worker", resource: "crown_gold" },
          label: "Reassign to Crown Gold",
          reason: "At least one worker is gathering Heartwood.",
        });
      }
      if (!state.barracksBuilt && state.heartwood >= 50) {
        actions.push({
          action: { type: "build_barracks" },
          label: "Build barracks",
          reason: "At least 50 Heartwood is available.",
        });
      }
      if (!state.watchtowerBuilt && state.heartwood >= 35) {
        actions.push({
          action: { type: "build_watchtower" },
          label: "Build watchtower",
          reason: "At least 35 Heartwood is available.",
        });
      }
      if (state.barracksBuilt && state.crownGold >= 30 && state.vanguards < 4) {
        actions.push({
          action: { type: "train_vanguard" },
          label: "Train vanguard",
          reason: "The barracks is ready and 30 Crown Gold is available.",
        });
      }
      if (state.vanguards > 0 && state.thornmawBaseHp > 0) {
        actions.push({
          action: { type: "launch_attack" },
          label: "Launch attack",
          reason: "At least one vanguard can pressure the Thornmaw stronghold.",
        });
      }
      return actions;
    },
    reduce(state, action) {
      if (action.type === "assign_worker") {
        if (action.resource === "heartwood") {
          return {
            state: {
              ...state,
              workersOnHeartwood: state.workersOnHeartwood + 1,
              workersOnGold: state.workersOnGold - 1,
            },
            events: [{ type: "worker_reassigned", resource: "heartwood" }],
          };
        }
        return {
          state: {
            ...state,
            workersOnHeartwood: state.workersOnHeartwood - 1,
            workersOnGold: state.workersOnGold + 1,
          },
          events: [{ type: "worker_reassigned", resource: "crown_gold" }],
        };
      }
      if (action.type === "build_barracks") {
        return {
          state: { ...state, heartwood: state.heartwood - 50, barracksBuilt: true },
          events: [{ type: "structure_built", structure: "barracks" }],
        };
      }
      if (action.type === "build_watchtower") {
        return {
          state: { ...state, heartwood: state.heartwood - 35, watchtowerBuilt: true },
          events: [{ type: "structure_built", structure: "watchtower" }],
        };
      }
      if (action.type === "train_vanguard") {
        return {
          state: { ...state, crownGold: state.crownGold - 30, vanguards: state.vanguards + 1 },
          events: [{ type: "unit_trained", unit: "vanguard" }],
        };
      }
      if (action.type === "launch_attack") {
        const roll = nextRandom(state.rng);
        const damage = Math.min(
          state.thornmawBaseHp,
          state.vanguards * (26 + Math.floor(roll.value * 5)) + (state.cycle <= 1 ? 8 : 0),
        );
        const raidersDefeated = Math.min(state.raiders, state.vanguards);
        const losses = state.raiders > state.vanguards ? 1 : 0;
        return {
          state: {
            ...state,
            rng: roll.state,
            vanguards: Math.max(0, state.vanguards - losses),
            raiders: state.raiders - raidersDefeated,
            thornmawBaseHp: state.thornmawBaseHp - damage,
            frontline: Math.min(13, state.frontline + 2 + state.vanguards),
          },
          events: [{ type: "attack_resolved", damage, losses, raidersDefeated }],
        };
      }

      const woodRoll = nextRandom(state.rng);
      const goldRoll = nextRandom(woodRoll.state);
      const gatheredWood =
        state.workersOnHeartwood * (10 + Math.floor(woodRoll.value * 3));
      const gatheredGold = state.workersOnGold * (8 + Math.floor(goldRoll.value * 3));
      const incomingDamage = Math.max(
        0,
        state.raiders * 7 - state.vanguards * 3 - (state.watchtowerBuilt ? 6 : 0),
      );
      const cycle = state.cycle + 1;
      return {
        state: {
          ...state,
          rng: goldRoll.state,
          cycle,
          heartwood: state.heartwood + gatheredWood,
          crownGold: state.crownGold + gatheredGold,
          raiders: state.raiders + (cycle % 2 === 0 ? 1 : 0),
          sunforgeBaseHp: Math.max(0, state.sunforgeBaseHp - incomingDamage),
          frontline: Math.max(2, state.frontline - (incomingDamage > 0 ? 1 : 0)),
        },
        events: [
          {
            type: "resources_gathered",
            heartwood: gatheredWood,
            crownGold: gatheredGold,
            incomingDamage,
          },
        ],
      };
    },
    metrics,
    serialize(state) {
      return structuredClone(state);
    },
    deserialize(value) {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new TypeError("Invalid RTS Lab snapshot.");
      }
      const input = value as Record<string, unknown>;
      const state: RtsLabState = {
        seed: integer(input.seed, "seed", 0, 0x7fffffff),
        rng: integer(input.rng, "rng", 0, 0xffffffff),
        cycle: integer(input.cycle, "cycle", 0, 100),
        heartwood: integer(input.heartwood, "heartwood", 0, 10000),
        crownGold: integer(input.crownGold, "crownGold", 0, 10000),
        workersOnHeartwood: integer(input.workersOnHeartwood, "workersOnHeartwood", 0, TOTAL_WORKERS),
        workersOnGold: integer(input.workersOnGold, "workersOnGold", 0, TOTAL_WORKERS),
        barracksBuilt: input.barracksBuilt === true,
        watchtowerBuilt: input.watchtowerBuilt === true,
        vanguards: integer(input.vanguards, "vanguards", 0, 4),
        raiders: integer(input.raiders, "raiders", 0, 20),
        sunforgeBaseHp: integer(input.sunforgeBaseHp, "sunforgeBaseHp", 0, 100),
        thornmawBaseHp: integer(input.thornmawBaseHp, "thornmawBaseHp", 0, 100),
        frontline: integer(input.frontline, "frontline", 0, 15),
      };
      if (typeof input.barracksBuilt !== "boolean" || typeof input.watchtowerBuilt !== "boolean") {
        throw new TypeError("Invalid RTS Lab structure flags.");
      }
      if (state.workersOnHeartwood + state.workersOnGold !== TOTAL_WORKERS) {
        throw new TypeError("RTS Lab snapshots must assign exactly two workers.");
      }
      return state;
    },
    render,
  };
}
