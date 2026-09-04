export type MetricValue = number | string | boolean;
export type Metrics = Record<string, MetricValue>;

export interface MetricDefinition {
  key: string;
  label: string;
  description: string;
  badWhen?: string;
}

export interface ActionDefinition {
  type: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface GameDescription {
  id: string;
  title: string;
  version: string;
  summary: string;
  rules: string[];
  victoryConditions: string[];
  failureConditions: string[];
  metrics: MetricDefinition[];
  actions: ActionDefinition[];
}

export interface LegalAction<Action> {
  action: Action;
  label: string;
  reason: string;
}

export interface Transition<State, Event> {
  state: State;
  events: Event[];
}

/**
 * A curated, game-owned state from which an agent can begin an experiment.
 * Setups are code-defined and validated by the normal save codec; callers can
 * select an id but can never inject arbitrary state.
 */
export interface GameSetup<State> {
  id: string;
  title: string;
  description: string;
  createState(seed: number): State;
}

export type GameSetupDescription = Pick<GameSetup<never>, "id" | "title" | "description">;

export interface RenderContext<Action, Event> {
  kind: "reset" | "action" | "restore";
  action?: Action;
  events: Event[];
  step?: number;
  requestId?: string;
  setupId?: string;
}

export interface GameAdapter<State, Action, Event, GameMetrics extends Metrics> {
  readonly description: GameDescription;
  readonly setups?: readonly GameSetup<State>[];
  initialState(seed: number): State;
  listLegalActions(state: State): LegalAction<Action>[];
  reduce(state: State, action: Action): Transition<State, Event>;
  metrics(state: State): GameMetrics;
  serialize(state: State): unknown;
  deserialize(value: unknown): State;
  render(state: State, context: RenderContext<Action, Event>): void | Promise<void>;
}

export type StopOperator = "eq" | "gte" | "lte";

export interface StopCondition {
  metric: string;
  operator: StopOperator;
  value: number;
}

export interface MetricExpectation {
  metric: string;
  operator: StopOperator;
  value: MetricValue;
}

export interface SequenceInput<Action> {
  request_id: string;
  actions: Action[];
  setup_id?: string;
  seed?: number;
  base_snapshot_id?: string;
  expected_base_checksum?: string;
  stop_when?: StopCondition;
  expect?: MetricExpectation[];
  speed?: "fast" | "watch";
}

export interface StepRecord<Action, Event, GameMetrics extends Metrics> {
  index: number;
  action: Action;
  beforeChecksum: string;
  afterChecksum: string;
  events: Event[];
  metrics: GameMetrics;
}

export type SequenceStatus = "completed" | "stopped" | "cancelled" | "error";
export type SequenceVerdict = "not-requested" | "passed" | "failed" | "inconclusive";

export interface ExpectationCheck {
  metric: string;
  operator: StopOperator;
  expected: MetricValue;
  actual: MetricValue;
  passed: boolean;
}

export interface SequenceResult<Action, Event, GameMetrics extends Metrics> {
  cached?: true;
  requestId: string;
  status: SequenceStatus;
  appliedSteps: number;
  stopReason: string;
  rollbackSnapshotId: string;
  steps: StepRecord<Action, Event, GameMetrics>[];
  finalChecksum: string;
  metrics: GameMetrics;
  verdict: SequenceVerdict;
  checks: ExpectationCheck[];
  errorIndex?: number;
}

export interface SnapshotRecord {
  id: string;
  checksum: string;
  format: "huginn/canonical-state-v1";
  seed: number;
  value: unknown;
}

export interface ToolExecutionOptions {
  signal: AbortSignal;
}
