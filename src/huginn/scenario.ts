import type { GameDescription, MetricExpectation, SequenceInput, StopCondition } from "./types";

export interface RegressionScenario<Action> {
  format: "huginn/regression-v1";
  id: string;
  title: string;
  description?: string;
  game: Pick<GameDescription, "id" | "title" | "version">;
  input: {
    seed: number;
    actions: Action[];
    stop_when?: StopCondition;
    expect: MetricExpectation[];
  };
}

const safeRequestId = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9._-]{1,64}$/.test(value);

export function createRegressionScenario<Action>(
  game: GameDescription,
  input: SequenceInput<Action>,
  title = `Regression: ${game.title}`,
  description?: string,
): RegressionScenario<Action> | null {
  if (!safeRequestId(input.request_id)
    || typeof input.seed !== "number" || !Number.isSafeInteger(input.seed) || input.seed < 0 || input.seed > 0x7fffffff
    || input.base_snapshot_id !== undefined || input.expected_base_checksum !== undefined
    || !Array.isArray(input.expect) || input.expect.length === 0) return null;
  return {
    format: "huginn/regression-v1",
    id: `regression-${game.id}-${input.request_id}`,
    title,
    ...(description === undefined ? {} : { description }),
    game: { id: game.id, title: game.title, version: game.version },
    input: {
      seed: input.seed,
      actions: structuredClone(input.actions),
      ...(input.stop_when === undefined ? {} : { stop_when: structuredClone(input.stop_when) }),
      expect: structuredClone(input.expect),
    },
  };
}

export function sequenceInputFromScenario<Action>(
  scenario: RegressionScenario<Action>,
  requestId: string,
  speed: "fast" | "watch" = "fast",
): SequenceInput<Action> {
  return {
    request_id: requestId,
    speed,
    seed: scenario.input.seed,
    actions: structuredClone(scenario.input.actions),
    ...(scenario.input.stop_when === undefined ? {} : { stop_when: structuredClone(scenario.input.stop_when) }),
    expect: structuredClone(scenario.input.expect),
  };
}
