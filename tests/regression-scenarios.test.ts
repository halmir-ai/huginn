import { describe, expect, it } from "vitest";
import coilLevelFixture from "../public/regressions/coil-level-2-shield.json";
import coilFixture from "../public/regressions/coil-shield-recovery.json";
import starfallFixture from "../public/regressions/starfall-ball-saver.json";
import thornwatchFixture from "../public/regressions/thornwatch-meadow-defense.json";
import { coilGame, type CoilAction, type CoilEvent, type CoilState } from "../src/games/coil/game";
import { starfallGame, type StarfallAction, type StarfallEvent, type StarfallState } from "../src/games/starfall/game";
import { thornwatchGame, type ThornwatchAction, type ThornwatchEvent, type ThornwatchState } from "../src/games/thornwatch/game";
import { HuginnKernel } from "../src/huginn/kernel";
import { createRegressionScenario, sequenceInputFromScenario, type RegressionScenario } from "../src/huginn/scenario";
import type { GameAdapter } from "../src/huginn/types";
import type { GameDefinition, GameMetrics } from "../src/game-runtime";

const noDelay = async () => {};

function adapterFor<State, Action, Event>(
  game: GameDefinition<State, Action, Event>,
): GameAdapter<State, Action, Event, GameMetrics> {
  return {
    description: game.description,
    setups: game.setups,
    initialState: seed => game.initialState(seed),
    listLegalActions: state => game.legalActions(state),
    reduce: (state, action) => game.reduce(state, action),
    metrics: state => game.metrics(state),
    serialize: state => structuredClone(state),
    deserialize: value => game.deserialize(value),
    render: () => {},
  };
}

describe("curated replayable regressions", () => {
  it("keeps a named setup in a portable deterministic regression", async () => {
    const scenario = createRegressionScenario<CoilAction>(coilGame.description, {
      request_id: "level-3-gold",
      setup_id: "level-3-gold-window",
      seed: 42,
      actions: [{ type: "advance", steps: 5 }],
      expect: [{ metric: "bonusesEaten", operator: "eq", value: 1 }],
    });
    expect(scenario?.input.setup_id).toBe("level-3-gold-window");
    const result = await new HuginnKernel<CoilState, CoilAction, CoilEvent, GameMetrics>(
      adapterFor(coilGame), 12, noDelay,
    ).applyActionSequence(sequenceInputFromScenario(scenario!, "level-3-gold-replay"));
    expect(result).toMatchObject({ status: "completed", verdict: "passed", metrics: { campaignLevel: 3, bonusesEaten: 1 } });
  });

  it("replays COIL shield recovery with a semantic pass and identical receipts", async () => {
    const scenario = coilFixture as unknown as RegressionScenario<CoilAction>;
    expect(scenario.game).toEqual({
      id: coilGame.description.id,
      title: coilGame.description.title,
      version: coilGame.description.version,
    });

    const run = await new HuginnKernel<CoilState, CoilAction, CoilEvent, GameMetrics>(
      adapterFor(coilGame), scenario.input.seed, noDelay,
    ).applyActionSequence(sequenceInputFromScenario(scenario, "fixture-coil-a"));
    expect(run).toMatchObject({
      status: "completed",
      appliedSteps: 6,
      verdict: "passed",
      metrics: { alive: true, tick: 18, score: 0, shieldStepsLeft: 0 },
    });
    expect(run.checks).toHaveLength(4);
    expect(run.checks.every(check => check.passed)).toBe(true);
    expect(run.steps.flatMap(step => step.events).some(event => event.type === "shield-blocked")).toBe(true);

    const replay = await new HuginnKernel<CoilState, CoilAction, CoilEvent, GameMetrics>(
      adapterFor(coilGame), 77, noDelay,
    ).applyActionSequence(sequenceInputFromScenario(scenario, "fixture-coil-b"));
    expect(replay.steps).toEqual(run.steps);
    expect(replay.finalChecksum).toBe(run.finalChecksum);
  });

  it("reaches COIL's Level 2 gate directly and preserves its shield invariant", async () => {
    const scenario = coilLevelFixture as unknown as RegressionScenario<CoilAction>;
    const result = await new HuginnKernel<CoilState, CoilAction, CoilEvent, GameMetrics>(
      adapterFor(coilGame), 99, noDelay,
    ).applyActionSequence(sequenceInputFromScenario(scenario, "fixture-coil-level-2"));

    expect(result).toMatchObject({
      status: "completed",
      verdict: "passed",
      metrics: { campaignLevel: 2, alive: true, shieldStepsLeft: 0 },
    });
    expect(result.checks.every(check => check.passed)).toBe(true);
    expect(result.steps.flatMap(step => step.events).map(event => event.type)).toEqual([
      "shield-armed",
      "shield-blocked",
    ]);
  });

  it("replays THORNWATCH's authored 90-frame defense with exact outcomes", async () => {
    const scenario = thornwatchFixture as unknown as RegressionScenario<ThornwatchAction>;
    const first = await new HuginnKernel<ThornwatchState, ThornwatchAction, ThornwatchEvent, GameMetrics>(
      adapterFor(thornwatchGame), 99, noDelay,
    ).applyActionSequence(sequenceInputFromScenario(scenario, "fixture-thornwatch-a"));
    const second = await new HuginnKernel<ThornwatchState, ThornwatchAction, ThornwatchEvent, GameMetrics>(
      adapterFor(thornwatchGame), 77, noDelay,
    ).applyActionSequence(sequenceInputFromScenario(scenario, "fixture-thornwatch-b"));

    expect(first).toMatchObject({
      status: "completed",
      verdict: "passed",
      metrics: { phase: "build", wave: 1, baseHp: 18, kills: 3, leaks: 1 },
    });
    expect(first.checks).toHaveLength(5);
    expect(second.steps).toEqual(first.steps);
    expect(second.finalChecksum).toBe(first.finalChecksum);
  });

  it("replays STARFALL's saved-ball accounting regression with an early stop", async () => {
    const scenario = starfallFixture as unknown as RegressionScenario<StarfallAction>;
    expect(scenario.game).toEqual({
      id: starfallGame.description.id,
      title: starfallGame.description.title,
      version: starfallGame.description.version,
    });

    const run = await new HuginnKernel<StarfallState, StarfallAction, StarfallEvent, GameMetrics>(
      adapterFor(starfallGame), scenario.input.seed, noDelay,
    ).applyActionSequence(sequenceInputFromScenario(scenario, "fixture-starfall-a"));
    expect(run).toMatchObject({
      status: "stopped",
      appliedSteps: 16,
      verdict: "passed",
      metrics: { ballSaves: 1, drains: 0, ballsRemaining: 3, score: 425, lights: 2 },
    });
    expect(run.checks).toHaveLength(5);
    expect(run.checks.every(check => check.passed)).toBe(true);
    expect(run.steps.flatMap(step => step.events).some(event => event.type === "save")).toBe(true);

    const replay = await new HuginnKernel<StarfallState, StarfallAction, StarfallEvent, GameMetrics>(
      adapterFor(starfallGame), 77, noDelay,
    ).applyActionSequence(sequenceInputFromScenario(scenario, "fixture-starfall-b"));
    expect(replay.steps).toEqual(run.steps);
    expect(replay.finalChecksum).toBe(run.finalChecksum);
  });
});
