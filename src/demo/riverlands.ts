import type { GameAdapter, GameDescription, LegalAction, RenderContext } from "../huginn/types";

export interface RiverlandsState {
  seed: number;
  rng: number;
  turn: number;
  food: number;
  wood: number;
  population: number;
  housing: number;
  wellbeing: number;
}

export type RiverlandsAction =
  | { type: "gather_food" }
  | { type: "gather_wood" }
  | { type: "build_house" }
  | { type: "grow_population" }
  | { type: "end_turn" };

export type RiverlandsEvent =
  | { type: "resource_gained"; resource: "food" | "wood"; amount: number }
  | { type: "house_built" }
  | { type: "population_grew" }
  | { type: "turn_ended"; consumed: number };

export interface RiverlandsMetrics {
  [key: string]: number;
  turn: number;
  food: number;
  wood: number;
  population: number;
  housing: number;
  wellbeing: number;
}

export const riverlandsDescription: GameDescription = {
  id: "huginn-riverlands-fixture",
  title: "Riverlands kernel fixture",
  version: "0.1.0",
  summary: "A deliberately small deterministic economy used to validate Huginn before Dawn integration.",
  rules: [
    "Gathering yields 2–4 resources from the seeded simulation RNG.",
    "A house costs 5 wood and adds room for two people.",
    "Population growth costs 4 food and requires spare housing.",
    "Ending a turn consumes one food per person; shortages reduce wellbeing.",
  ],
  victoryConditions: ["Reach population 6 with wellbeing at least 70."],
  failureConditions: ["Wellbeing reaches 0."],
  metrics: [
    { key: "turn", label: "Turn", description: "Completed economy turns." },
    { key: "food", label: "Food", description: "Stored food available for growth and upkeep.", badWhen: "Below population before end_turn." },
    { key: "wood", label: "Wood", description: "Stored wood available for housing." },
    { key: "population", label: "Population", description: "People supported by the settlement." },
    { key: "housing", label: "Housing", description: "Maximum sustainable population." },
    { key: "wellbeing", label: "Wellbeing", description: "Settlement health from 0–100.", badWhen: "Below 40." },
  ],
  actions: [
    { type: "gather_food", description: "Gather seeded food yield.", inputSchema: { type: "object", properties: { type: { const: "gather_food" } }, required: ["type"], additionalProperties: false } },
    { type: "gather_wood", description: "Gather seeded wood yield.", inputSchema: { type: "object", properties: { type: { const: "gather_wood" } }, required: ["type"], additionalProperties: false } },
    { type: "build_house", description: "Spend 5 wood for 2 housing.", inputSchema: { type: "object", properties: { type: { const: "build_house" } }, required: ["type"], additionalProperties: false } },
    { type: "grow_population", description: "Spend 4 food to add one person.", inputSchema: { type: "object", properties: { type: { const: "grow_population" } }, required: ["type"], additionalProperties: false } },
    { type: "end_turn", description: "Consume upkeep and advance the turn.", inputSchema: { type: "object", properties: { type: { const: "end_turn" } }, required: ["type"], additionalProperties: false } },
  ],
};

function nextRandom(state: number): { state: number; value: number } {
  let next = state | 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  const unsigned = next >>> 0;
  return { state: unsigned, value: unsigned / 0x100000000 };
}

function gather(state: RiverlandsState, resource: "food" | "wood") {
  const roll = nextRandom(state.rng);
  const amount = 2 + Math.floor(roll.value * 3);
  return {
    state: { ...state, rng: roll.state, [resource]: state[resource] + amount },
    events: [{ type: "resource_gained", resource, amount } satisfies RiverlandsEvent],
  };
}

export function createRiverlandsAdapter(
  render: (state: RiverlandsState, context: RenderContext<RiverlandsAction, RiverlandsEvent>) => void | Promise<void> = () => {},
): GameAdapter<RiverlandsState, RiverlandsAction, RiverlandsEvent, RiverlandsMetrics> {
  return {
    description: riverlandsDescription,
    initialState(seed) {
      return {
        seed,
        rng: seed === 0 ? 0x9e3779b9 : seed,
        turn: 0,
        food: 7,
        wood: 2,
        population: 2,
        housing: 3,
        wellbeing: 80,
      };
    },
    listLegalActions(state) {
      const actions: LegalAction<RiverlandsAction>[] = [
        { action: { type: "gather_food" } as const, label: "Gather food", reason: "Foraging is always available." },
        { action: { type: "gather_wood" } as const, label: "Gather wood", reason: "Woodcutting is always available." },
        { action: { type: "end_turn" } as const, label: "End turn", reason: "Resolve upkeep and advance time." },
      ];
      if (state.wood >= 5) actions.push({ action: { type: "build_house" } as const, label: "Build house", reason: "At least 5 wood is available." });
      if (state.food >= 4 && state.population < state.housing) actions.push({ action: { type: "grow_population" } as const, label: "Grow population", reason: "Food and housing are available." });
      return actions;
    },
    reduce(state, action) {
      if (action.type === "gather_food") return gather(state, "food");
      if (action.type === "gather_wood") return gather(state, "wood");
      if (action.type === "build_house") {
        return { state: { ...state, wood: state.wood - 5, housing: state.housing + 2 }, events: [{ type: "house_built" }] };
      }
      if (action.type === "grow_population") {
        return { state: { ...state, food: state.food - 4, population: state.population + 1 }, events: [{ type: "population_grew" }] };
      }
      const consumed = Math.min(state.food, state.population);
      const shortage = state.population - consumed;
      return {
        state: {
          ...state,
          turn: state.turn + 1,
          food: state.food - consumed,
          wellbeing: Math.max(0, Math.min(100, state.wellbeing + (shortage ? -shortage * 12 : 2))),
        },
        events: [{ type: "turn_ended", consumed }],
      };
    },
    metrics(state) {
      const { turn, food, wood, population, housing, wellbeing } = state;
      return { turn, food, wood, population, housing, wellbeing };
    },
    serialize(state) {
      return structuredClone(state);
    },
    deserialize(value) {
      if (!value || typeof value !== "object") throw new TypeError("Invalid Riverlands snapshot.");
      const state = structuredClone(value) as RiverlandsState;
      for (const key of ["seed", "rng", "turn", "food", "wood", "population", "housing", "wellbeing"] as const) {
        if (!Number.isFinite(state[key])) throw new TypeError(`Invalid Riverlands field: ${key}`);
      }
      return state;
    },
    render,
  };
}
