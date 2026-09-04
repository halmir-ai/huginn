import { describe, expect, it } from "vitest";
import type { GameAdapter } from "../src/huginn";
import { HuginnKernel } from "../src/huginn";
import type { GameMetrics } from "../src/game-runtime";
import {
  campaignLevelFor,
  coilGame,
  levelWalls,
  type CoilAction,
  type CoilEvent,
  type CoilState,
} from "../src/games/coil/game";

function adapter(): GameAdapter<CoilState, CoilAction, CoilEvent, GameMetrics> {
  return {
    description: coilGame.description,
    setups: coilGame.setups,
    initialState: seed => coilGame.initialState(seed),
    listLegalActions: state => coilGame.legalActions(state),
    reduce: (state, action) => coilGame.reduce(state, action),
    metrics: state => coilGame.metrics(state),
    serialize: state => structuredClone(state),
    deserialize: value => coilGame.deserialize(value),
    render: () => {},
  };
}

describe("COIL campaign setups", () => {
  it("uses three authored boards whose obstacles are canonical game rules", () => {
    expect(levelWalls(1)).toEqual([]);
    expect(levelWalls(2).length).toBeGreaterThan(10);
    expect(levelWalls(3).length).toBeGreaterThan(levelWalls(2).length);
    for (const setup of coilGame.setups ?? []) {
      const state = setup.createState(12);
      expect(coilGame.deserialize(state)).toEqual(state);
      expect(levelWalls(campaignLevelFor(state))).not.toContainEqual(state.snake[0]);
    }
  });

  it("jumps to the Level 2 gate and proves shield recovery without replaying Level 1", async () => {
    const run = await new HuginnKernel(adapter(), 99, async () => {}).applyActionSequence({
      request_id: "level-2-shield",
      setup_id: "level-2-gate",
      seed: 12,
      actions: [{ type: "shield" }, { type: "advance", steps: 1 }],
      expect: [
        { metric: "campaignLevel", operator: "eq", value: 2 },
        { metric: "alive", operator: "eq", value: true },
        { metric: "shieldStepsLeft", operator: "eq", value: 0 },
      ],
    });
    expect(run).toMatchObject({ status: "completed", appliedSteps: 2, verdict: "passed" });
    expect(run.steps.flatMap(step => step.events).map(event => event.type)).toEqual(["shield-armed", "shield-blocked"]);

    const unprotected = await new HuginnKernel(adapter(), 12, async () => {}).applyActionSequence({
      request_id: "level-2-no-shield",
      setup_id: "level-2-gate",
      seed: 12,
      actions: [{ type: "advance", steps: 1 }],
      expect: [{ metric: "alive", operator: "eq", value: false }],
    });
    expect(unprotected).toMatchObject({ verdict: "passed", metrics: { campaignLevel: 2, alive: false } });
  });

  it("replays a Level 3 expiring-gold setup byte-for-byte", async () => {
    const input = {
      setup_id: "level-3-gold-window",
      seed: 42,
      actions: [{ type: "advance", steps: 5 }] as CoilAction[],
      expect: [
        { metric: "campaignLevel", operator: "eq" as const, value: 3 },
        { metric: "bonusesEaten", operator: "eq" as const, value: 1 },
        { metric: "score", operator: "eq" as const, value: 150 },
      ],
    };
    const first = await new HuginnKernel(adapter(), 12, async () => {}).applyActionSequence({ request_id: "gold-a", ...input });
    const second = await new HuginnKernel(adapter(), 77, async () => {}).applyActionSequence({ request_id: "gold-b", ...input });
    expect(first).toMatchObject({ status: "completed", verdict: "passed", metrics: { bonusStepsLeft: 0 } });
    expect(first.steps.flatMap(step => step.events).some(event => event.type === "bonus")).toBe(true);
    expect(second.steps).toEqual(first.steps);
    expect(second.finalChecksum).toBe(first.finalChecksum);
  });
});
