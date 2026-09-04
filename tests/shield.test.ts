import { describe, expect, it } from "vitest";
import { GameRuntime } from "../src/game-runtime";
import { coilGame } from "../src/games/coil/game";
import type { CoilAction, CoilState } from "../src/games/coil/game";

const shield = { type: "shield" } as const;
const advance = { type: "advance", steps: 1 } as const;
const step = (state: CoilState, action: CoilAction) => coilGame.reduce(state, action).state;
const atWall = (): CoilState => ({
  ...coilGame.initialState(12),
  snake: Array.from({ length: 5 }, (_, i) => ({ x: 27 - i, y: 11 })),
  tick: 17,
});
const coiled = (): CoilState => ({
  ...coilGame.initialState(12),
  snake: [{ x: 2, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 1 }],
  food: { x: 8, y: 8 }, foodsEaten: 1, score: 10, tick: 10,
});

describe("COIL emergency shield", () => {
  it("spends its only charge on activation, blocks a wall without moving or scoring, then permits a turn", () => {
    const initial = atWall();
    expect(coilGame.legalActions(initial).map(item => item.action)).toContainEqual(shield);
    const armed = step(initial, shield);
    expect(armed).toMatchObject({ shieldCharges: 0, shieldStepsLeft: 10, tick: 17 });
    expect(() => step(armed, shield)).toThrow("Illegal");
    const blocked = step(armed, advance);
    expect(blocked).toMatchObject({ phase: "playing", death: null, tick: 18, shieldCharges: 0, shieldStepsLeft: 0 });
    expect(blocked.snake).toEqual(initial.snake);
    expect(blocked.score).toBe(initial.score);
    expect(blocked.food).toEqual(initial.food);
    expect(blocked.rng).toBe(initial.rng);
    expect(coilGame.deserialize(blocked)).toEqual(blocked);
    const escaped = step(step(blocked, { type: "turn", direction: "n" }), advance);
    expect(escaped.phase).toBe("playing");
    expect(escaped.snake[0]).toEqual({ x: 27, y: 10 });
    const fatal = step(blocked, advance);
    expect(fatal).toMatchObject({ phase: "dead", death: "wall", tick: 19 });
  });

  it("protects exactly ten advances, including a collision on the tenth but not the eleventh", () => {
    let tenth = coilGame.initialState(12);
    for (let i = 0; i < 8; i++) tenth = step(tenth, advance);
    tenth = step(tenth, shield);
    for (let i = 0; i < 9; i++) tenth = step(tenth, advance);
    expect(tenth).toMatchObject({ shieldStepsLeft: 1, phase: "playing" });
    expect(step(tenth, advance)).toMatchObject({ shieldStepsLeft: 0, phase: "playing", tick: 18 });

    let eleventh = coilGame.initialState(12);
    for (let i = 0; i < 7; i++) eleventh = step(eleventh, advance);
    eleventh = step(eleventh, shield);
    eleventh = step(eleventh, { type: "advance", steps: 10 });
    expect(eleventh).toMatchObject({ shieldStepsLeft: 0, shieldCharges: 0, phase: "playing" });
    expect(step(eleventh, advance)).toMatchObject({ phase: "dead", death: "wall" });
  });

  it("freezes shield duration on pause and restores the charge on restart", async () => {
    const runtime = new GameRuntime(coilGame, 12);
    await runtime.dispatch(shield);
    runtime.play(); runtime.pause();
    const before = structuredClone(runtime.state);
    runtime.play(); runtime.pause();
    expect(runtime.state).toEqual(before);
    expect(runtime.state).toMatchObject({ shieldCharges: 0, shieldStepsLeft: 10, tick: 0 });
    await runtime.reset();
    expect(runtime.state).toMatchObject({ shieldCharges: 1, shieldStepsLeft: 0, tick: 0 });
  });

  it("blocks self collision, clears the failed turn, and preserves a valid heading for escape and save", () => {
    const initial = coilGame.deserialize(coiled());
    const armed = step(step(initial, { type: "turn", direction: "s" }), shield);
    const result = coilGame.reduce(armed, advance);
    expect(result.events).toEqual([{ type: "shield-blocked", cause: "self", x: 2, y: 2 }]);
    expect(result.state).toEqual({ ...initial, tick: 11, shieldCharges: 0, shieldStepsLeft: 0 });
    expect(coilGame.deserialize(result.state)).toEqual(result.state);
    const escaped = step(step(result.state, { type: "turn", direction: "n" }), advance);
    expect(escaped).toMatchObject({ phase: "playing", direction: "n", tick: 12 });
    expect(escaped.snake[0]).toEqual({ x: 2, y: 0 });
    const fatal = step(step(result.state, { type: "turn", direction: "s" }), advance);
    expect(fatal).toMatchObject({ phase: "dead", death: "self" });
  });

  it("stops a batch at the protected collision, leaving the next advance to the player", () => {
    const before = step(atWall(), shield);
    const result = coilGame.reduce(before, { type: "advance", steps: 10 });
    expect(result.state).toMatchObject({ tick: 18, phase: "playing", shieldStepsLeft: 0 });
    expect(result.events).toEqual([{ type: "shield-blocked", cause: "wall", x: 28, y: 11 }]);
  });

  it("keeps vacating-tail movement legal and only decrements the duration on a safe advance", () => {
    const before = step(coiled(), shield);
    const result = coilGame.reduce(before, advance);
    expect(result.state).toMatchObject({ phase: "playing", shieldStepsLeft: 9, tick: 11 });
    expect(result.state.snake[0]).toEqual({ x: 3, y: 1 });
    expect(result.events).toEqual([]);
    const turned = step(result.state, { type: "turn", direction: "n" });
    expect(turned.shieldStepsLeft).toBe(9);
  });

  it.each([1, 2])("spends bonus time but awards nothing on a blocked collision with %i bonus steps left", remaining => {
    const before = coilGame.deserialize({
      ...atWall(), snake: Array.from({ length: 10 }, (_, i) => ({ x: 27 - i, y: 11 })),
      foodsEaten: 5, score: 50, bonus: { x: 20, y: 20, remaining },
    });
    const result = coilGame.reduce(step(before, shield), advance);
    expect(result.state.bonus).toEqual(remaining === 1 ? null : { x: 20, y: 20, remaining: 1 });
    for (const key of ["snake", "food", "foodsEaten", "bonusesEaten", "score", "rng", "direction"] as const) expect(result.state[key]).toEqual(before[key]);
    expect(result.state.tick).toBe(before.tick + 1);
    expect(result.events.some(event => event.type === "food" || event.type === "bonus" || event.type === "death")).toBe(false);
    expect(coilGame.deserialize(result.state)).toEqual(result.state);
  });

  it("preserves normal food and bonus rewards during safe shielded movement", () => {
    const before = coilGame.deserialize({
      ...coilGame.initialState(12), snake: Array.from({ length: 10 }, (_, i) => ({ x: 15 - i, y: 11 })),
      foodsEaten: 5, score: 50, tick: 30, bonus: { x: 16, y: 11, remaining: 2 }, food: { x: 17, y: 11 },
    });
    const bonus = step(step(before, shield), advance);
    expect(bonus).toMatchObject({ score: 100, bonusesEaten: 1, shieldStepsLeft: 9 });
    expect(bonus.snake).toHaveLength(10);
    const food = step(bonus, advance);
    expect(food).toMatchObject({ score: 110, foodsEaten: 6, shieldStepsLeft: 8 });
    expect(food.snake).toHaveLength(11);
    expect(coilGame.deserialize(food)).toEqual(food);
  });

  it("replays seeded shield actions and events byte-for-byte, including across every saved state", () => {
    const plan: CoilAction[] = [
      { type: "advance", steps: 10 }, shield, { type: "advance", steps: 10 },
      { type: "turn", direction: "n" }, { type: "advance", steps: 5 },
      { type: "advance", steps: 10 },
    ];
    const initial = coilGame.initialState(12), original = structuredClone(initial);
    let direct = initial, restored = coilGame.deserialize(JSON.parse(JSON.stringify(initial)));
    const run = (start: CoilState) => {
      let state = start;
      return plan.map(action => { const result = coilGame.reduce(state, action); state = result.state; return result; });
    };
    expect(JSON.stringify(run(initial))).toBe(JSON.stringify(run(coilGame.initialState(12))));
    for (const action of plan) {
      direct = step(direct, action);
      restored = coilGame.deserialize(JSON.parse(JSON.stringify(step(restored, action))));
      expect(restored).toEqual(direct);
      expect(restored).not.toBe(direct);
      expect(coilGame.metrics(restored)).toEqual(coilGame.metrics(direct));
    }
    expect(initial).toEqual(original);
    expect(direct).toMatchObject({ phase: "dead", shieldCharges: 0, shieldStepsLeft: 0 });
  });

  it("roundtrips expiry and cannot reactivate after expiry or death", () => {
    const result = coilGame.reduce(step(coilGame.initialState(12), shield), { type: "advance", steps: 10 });
    expect(result.events).toEqual([{ type: "shield-expired" }]);
    const restored = coilGame.deserialize(JSON.parse(JSON.stringify(result.state)));
    expect(restored).toEqual(result.state);
    expect(coilGame.legalActions(restored).map(item => item.action)).not.toContainEqual(shield);
    expect(() => step(restored, shield)).toThrow("Illegal");
    const dead = step(restored, { type: "advance", steps: 10 });
    expect(() => step(dead, shield)).toThrow("Illegal");
  });

  it("rejects malformed shield actions and impossible or missing saved shield fields", () => {
    const before = coilGame.initialState(12);
    for (const action of [{ type: "shield", steps: 1 }, { type: "shield", remaining: 10 }]) expect(() => step(before, action as CoilAction)).toThrow("Illegal");
    for (const state of [
      { ...before, shieldCharges: -1 }, { ...before, shieldCharges: 2 }, { ...before, shieldCharges: true },
      { ...before, shieldCharges: 0, shieldStepsLeft: -1 }, { ...before, shieldCharges: 0, shieldStepsLeft: 11 },
      { ...before, shieldCharges: 0, shieldStepsLeft: 0 }, { ...before, shieldCharges: 0, shieldStepsLeft: 9 },
      { ...before, shieldCharges: 0, shieldStepsLeft: 8, tick: 1 },
      { ...before, shieldCharges: 0, shieldStepsLeft: 0.5 }, { ...before, shieldCharges: 0, shieldStepsLeft: Infinity },
      { ...before, shieldCharges: 0, shieldStepsLeft: "10" }, { ...before, shieldStepsLeft: 10 },
      { ...before, shieldCharges: 0, shieldStepsLeft: 5, phase: "dead", death: "wall", tick: 1 },
      { ...before, shieldCharges: undefined }, { ...before, shieldStepsLeft: undefined },
    ]) expect(() => coilGame.deserialize(state)).toThrow("Invalid COIL snapshot");
    const { shieldCharges: _charge, shieldStepsLeft: _left, ...legacy } = before;
    expect(() => coilGame.deserialize(legacy)).toThrow("Invalid COIL snapshot");
  });
});
