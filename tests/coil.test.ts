import { describe, expect, it } from "vitest";
import { GameRuntime } from "../src/play/core";
import { BONUS_STEPS, GRID_HEIGHT, GRID_WIDTH, coilGame, levelFor, opposite, stepDurationMs, vectors } from "../src/games/coil/game";
import type { Cell, CoilAction, CoilState, Direction } from "../src/games/coil/game";

const step = (state: CoilState, action: CoilAction): CoilState => coilGame.reduce(state, action).state;
const cellKey = (cell: Cell) => `${cell.x},${cell.y}`;

/** Actual seed-12 food at (8,19), ten cells from the starting head (10,11). */
const firstFruitPlan: CoilAction[] = [
  { type: "turn", direction: "s" }, { type: "advance", steps: 5 },
  { type: "advance", steps: 1 }, { type: "advance", steps: 1 }, { type: "advance", steps: 1 },
  { type: "turn", direction: "w" }, { type: "advance", steps: 1 }, { type: "advance", steps: 1 },
];

function routeToFood(state: CoilState): Direction[] {
  const occupied = new Set(state.snake.map(cellKey));
  const queue: { cell: Cell; path: Direction[] }[] = [{ cell: state.snake[0], path: [] }];
  const visited = new Set<string>([cellKey(state.snake[0])]);
  for (let index = 0; index < queue.length; index++) {
    const item = queue[index];
    if (state.food && cellKey(item.cell) === cellKey(state.food)) return item.path;
    for (const direction of Object.keys(vectors) as Direction[]) {
      if (!item.path.length && direction === opposite[state.direction]) continue;
      const vector = vectors[direction], cell = { x: item.cell.x + vector.x, y: item.cell.y + vector.y }, key = cellKey(cell);
      if (cell.x < 0 || cell.x >= GRID_WIDTH || cell.y < 0 || cell.y >= GRID_HEIGHT || occupied.has(key) || visited.has(key)) continue;
      visited.add(key); queue.push({ cell, path: [...item.path, direction] });
    }
  }
  throw new Error("No simple route to food.");
}

function eatNextFood(state: CoilState): CoilState {
  for (const direction of routeToFood(state)) {
    if (direction !== state.direction) state = step(state, { type: "turn", direction });
    state = step(state, { type: "advance", steps: 1 });
    expect(state.phase).toBe("playing");
  }
  return state;
}

function checkOccupancy(state: CoilState) {
  expect(new Set(state.snake.map(cellKey)).size).toBe(state.snake.length);
  if (state.food) {
    expect(state.snake.some(cell => cellKey(cell) === cellKey(state.food!))).toBe(false);
    expect(state.food.x).toBeGreaterThanOrEqual(0); expect(state.food.x).toBeLessThan(GRID_WIDTH);
    expect(state.food.y).toBeGreaterThanOrEqual(0); expect(state.food.y).toBeLessThan(GRID_HEIGHT);
  }
  if (state.bonus) {
    expect(state.snake.some(cell => cellKey(cell) === cellKey(state.bonus!))).toBe(false);
    expect(cellKey(state.bonus)).not.toBe(state.food && cellKey(state.food));
    expect(state.bonus.x).toBeGreaterThanOrEqual(0); expect(state.bonus.x).toBeLessThan(GRID_WIDTH);
    expect(state.bonus.y).toBeGreaterThanOrEqual(0); expect(state.bonus.y).toBeLessThan(GRID_HEIGHT);
  }
}

function almostFifth(): CoilState {
  const state = coilGame.initialState(12);
  return { ...state, snake: Array.from({ length: 9 }, (_, i) => ({ x: 14 - i, y: 11 })), food: { x: 15, y: 11 }, foodsEaten: 4, score: 40, tick: 30 };
}

describe("COIL mechanics", () => {
  it("starts as recognizable unobstructed Snake and has no artificial win quota", () => {
    const state = coilGame.initialState(12);
    expect(state.snake).toHaveLength(5); expect(state.direction).toBe("e");
    expect(state.food).toEqual({ x: 8, y: 19 }); expect(state.phase).toBe("playing");
    expect(coilGame.description.victoryConditions).toEqual([]);
    expect(stepDurationMs(state)).toBe(148);
  });

  it("executes a real seed-12 route to its original food", () => {
    let state = coilGame.initialState(12);
    for (const action of firstFruitPlan) {
      expect(coilGame.legalActions(state).map(item => item.action)).toContainEqual(action);
      state = step(state, action);
    }
    expect(state.snake[0]).toEqual({ x: 8, y: 19 }); expect(state.tick).toBe(10);
    expect(state.foodsEaten).toBe(1); expect(state.score).toBe(10); expect(state.snake).toHaveLength(6);
    checkOccupancy(state);
  });

  it("replays the same seeded actions byte-for-byte without mutating earlier state", () => {
    const initial = coilGame.initialState(12), original = structuredClone(initial);
    const a = firstFruitPlan.reduce(step, initial), b = firstFruitPlan.reduce(step, coilGame.initialState(12));
    expect(a).toEqual(b); expect(initial).toEqual(original);
    expect(coilGame.initialState(13).food).not.toEqual(initial.food);
    expect(a.rng).not.toBe(initial.rng);
  });

  it("places food and bonuses only in unoccupied board cells across seeds and repeated meals", () => {
    for (const seed of [0, 1, 12, 42, 2147483647, -2147483648, 4294967295]) {
      let state = coilGame.initialState(seed); checkOccupancy(state);
      for (let i = 0; i < 12; i++) {
        state = eatNextFood(state); checkOccupancy(state);
        expect(coilGame.deserialize(state)).toEqual(state);
      }
      expect(state.foodsEaten).toBe(12);
    }
  });

  it("rejects reverse, redundant, multiple-before-moving, malformed, and unbounded inputs", () => {
    const initial = coilGame.initialState(12);
    expect(() => step(initial, { type: "turn", direction: "w" })).toThrow("Illegal");
    expect(() => step(initial, { type: "turn", direction: "e" })).toThrow("Illegal");
    const turned = step(initial, { type: "turn", direction: "n" });
    expect(turned.tick).toBe(0); expect(turned.direction).toBe("e"); expect(turned.pendingDirection).toBe("n");
    expect(() => step(turned, { type: "turn", direction: "w" })).toThrow("Illegal");
    expect(coilGame.legalActions(turned).every(item => item.action.type === "advance")).toBe(true);
    const moved = step(turned, { type: "advance", steps: 1 });
    expect(moved.direction).toBe("n"); expect(moved.pendingDirection).toBeNull();
    expect(step(moved, { type: "turn", direction: "w" }).pendingDirection).toBe("w");
    for (const action of [null, {}, { type: "advance", steps: 2 }, { type: "advance", steps: Infinity }, { type: "advance", steps: 1, extra: true }, { type: "turn", direction: "__proto__" }]) expect(() => step(initial, action as CoilAction)).toThrow("Illegal");
  });

  it("grows, awards points, speeds up every fifth fruit, and spawns a timed golden fruit", () => {
    const before = almostFifth(); expect(coilGame.deserialize(before)).toEqual(before);
    const result = coilGame.reduce(before, { type: "advance", steps: 1 });
    expect(result.state.snake).toHaveLength(10); expect(result.state.foodsEaten).toBe(5); expect(result.state.score).toBe(50);
    expect(levelFor(result.state)).toBe(2); expect(stepDurationMs(result.state)).toBe(140);
    expect(result.state.bonus?.remaining).toBe(BONUS_STEPS);
    expect(result.events.map(event => event.type)).toEqual(["food", "speed-up", "bonus-spawn"]);
    checkOccupancy(result.state);
    expect(stepDurationMs({ foodsEaten: 100 })).toBe(64);
  });

  it("awards 50 bonus points without growth, including on its last available step", () => {
    const state = step(almostFifth(), { type: "advance", steps: 1 });
    state.bonus = { x: 16, y: 11, remaining: 1 }; state.food = { x: 20, y: 5 };
    const result = coilGame.reduce(coilGame.deserialize(state), { type: "advance", steps: 1 });
    expect(result.state.score).toBe(100); expect(result.state.bonusesEaten).toBe(1);
    expect(result.state.snake).toHaveLength(10); expect(result.state.bonus).toBeNull();
    expect(result.events).toContainEqual({ type: "bonus", x: 16, y: 11, points: 50 });
    expect(coilGame.deserialize(result.state)).toEqual(result.state);
  });

  it("ticks golden fruit only on movement, then expires it without awarding points", () => {
    let state = step(almostFifth(), { type: "advance", steps: 1 });
    state.bonus = { x: 20, y: 20, remaining: 2 }; state.food = { x: 20, y: 5 };
    state = step(state, { type: "turn", direction: "n" }); expect(state.bonus?.remaining).toBe(2);
    state = step(state, { type: "advance", steps: 1 }); expect(state.bonus?.remaining).toBe(1);
    const result = coilGame.reduce(state, { type: "advance", steps: 1 });
    expect(result.state.bonus).toBeNull(); expect(result.state.score).toBe(50);
    expect(result.events).toContainEqual({ type: "bonus-expired" });
  });

  it("stops batched movement exactly on wall collision and has no actions after death", () => {
    let state = coilGame.initialState(12);
    state = step(state, { type: "advance", steps: 10 });
    const result = coilGame.reduce(state, { type: "advance", steps: 10 });
    expect(result.state.phase).toBe("dead"); expect(result.state.death).toBe("wall");
    expect(result.state.tick).toBe(18); expect(result.state.snake[0]).toEqual({ x: 27, y: 11 });
    expect(result.events).toEqual([{ type: "death", cause: "wall", x: 28, y: 11 }]);
    expect(coilGame.legalActions(result.state)).toEqual([]);
    expect(() => step(result.state, { type: "advance", steps: 1 })).toThrow("Illegal");
    expect(coilGame.deserialize(result.state)).toEqual(result.state);
  });

  it("allows the vacating tail cell, but kills a head entering the non-vacating body", () => {
    const fixture: CoilState = { ...coilGame.initialState(12), snake: [{ x: 2, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 1 }], food: { x: 8, y: 8 }, foodsEaten: 1, score: 10, tick: 10 };
    expect(coilGame.deserialize(fixture)).toEqual(fixture);
    const safe = step(fixture, { type: "advance", steps: 1 }); expect(safe.phase).toBe("playing"); expect(safe.snake[0]).toEqual({ x: 3, y: 1 });
    const collision = step(step(fixture, { type: "turn", direction: "s" }), { type: "advance", steps: 1 });
    expect(collision.phase).toBe("dead"); expect(collision.death).toBe("self"); expect(collision.snake).toEqual(fixture.snake);
    expect(coilGame.deserialize(collision)).toEqual(collision);
  });

  it("reports semantic metrics and keeps pause and animation outside saved simulation state", () => {
    const runtime = new GameRuntime(coilGame, 12), before = structuredClone(runtime.state);
    runtime.play(); runtime.pause(); expect(runtime.state).toEqual(before);
    expect(runtime.playing).toBe(false); expect(Object.keys(runtime.state)).not.toContain("paused");
    expect(coilGame.metrics(before)).toEqual({ score: 0, length: 5, foodsEaten: 0, bonusesEaten: 0, level: 1, stepDurationMs: 148, bonusStepsLeft: 0, tick: 0, alive: true });
    for (const schema of coilGame.description.actions) expect(schema.inputSchema.additionalProperties).toBe(false);
  });
});

describe("COIL save boundaries", () => {
  it("roundtrips pending turns and active bonus clocks and replays identically after restore", () => {
    let state = step(almostFifth(), { type: "advance", steps: 1 });
    state = step(state, { type: "turn", direction: "n" });
    const restored = coilGame.deserialize(JSON.parse(JSON.stringify(state)));
    expect(restored).toEqual(state); expect(restored).not.toBe(state); expect(restored.snake).not.toBe(state.snake);
    expect(step(restored, { type: "advance", steps: 5 })).toEqual(step(state, { type: "advance", steps: 5 }));
  });

  it("rejects unknown keys and impossible or non-finite snapshot structure", () => {
    const base = coilGame.initialState(12);
    const corruptions: ((state: CoilState) => unknown)[] = [
      state => ({ ...state, hiddenPower: true }), state => ({ ...state, version: 2 }),
      state => ({ ...state, rng: NaN }), state => ({ ...state, rng: 4294967296 }),
      state => ({ ...state, seed: .5 }), state => ({ ...state, tick: Infinity }),
      state => ({ ...state, food: { ...state.food, extra: true } }),
      state => ({ ...state, food: state.snake[0] }), state => ({ ...state, food: null }),
      state => ({ ...state, food: { x: GRID_WIDTH, y: 0 } }),
      state => ({ ...state, snake: [state.snake[0], ...state.snake.slice(0, -1)] }),
      state => ({ ...state, snake: state.snake.map((cell, i) => i === 4 ? { x: 0, y: 0 } : cell) }),
      state => ({ ...state, snake: state.snake.map((cell, i) => i === 4 ? { ...cell, skin: "x" } : cell) }),
      state => ({ ...state, direction: "w" }), state => ({ ...state, direction: "__proto__" }),
      state => ({ ...state, pendingDirection: "w" }), state => ({ ...state, pendingDirection: "e" }),
      state => ({ ...state, score: 10 }), state => ({ ...state, bonusesEaten: 1, score: 50 }),
      state => ({ ...state, foodsEaten: 1, score: 10 }), state => ({ ...state, bonus: { x: 2, y: 3, remaining: 52 } }),
      state => ({ ...state, phase: "dead" }), state => ({ ...state, death: "wall" }),
    ];
    for (const corrupt of corruptions) expect(() => coilGame.deserialize(corrupt(structuredClone(base)))).toThrow("Invalid COIL snapshot");
    for (const invalid of [null, [], "state", { snake: [] }]) expect(() => coilGame.deserialize(invalid)).toThrow("Invalid COIL snapshot");
    for (const invalid of [NaN, Infinity, 1.1, -2147483649, 4294967296]) expect(() => coilGame.initialState(invalid)).toThrow("32-bit integer");
  });
});
