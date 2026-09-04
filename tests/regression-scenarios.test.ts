import { describe, expect, it } from "vitest";
import coilFixture from "../public/regressions/coil-shield-recovery.json";
import starfallFixture from "../public/regressions/starfall-ball-saver.json";
import { coilGame, type CoilAction, type CoilEvent, type CoilState } from "../src/games/coil/game";
import { starfallGame, type StarfallAction, type StarfallEvent, type StarfallState } from "../src/games/starfall/game";
import { HuginnKernel } from "../src/huginn/kernel";
import { sequenceInputFromScenario, type RegressionScenario } from "../src/huginn/scenario";
import type { GameAdapter } from "../src/huginn/types";
import type { GameDefinition, GameMetrics } from "../src/play/core";

const noDelay = async () => {};

function adapterFor<State, Action, Event>(
  game: GameDefinition<State, Action, Event>,
): GameAdapter<State, Action, Event, GameMetrics> {
  return {
    description: game.description,
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
