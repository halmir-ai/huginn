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

export interface RenderContext<Action, Event> {
  kind: "reset" | "action" | "restore";
  action?: Action;
  events: Event[];
  step?: number;
  requestId?: string;
}

export interface GameAdapter<State, Action, Event, GameMetrics extends Metrics> {
  readonly description: GameDescription;
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

export interface SequenceInput<Action> {
  request_id: string;
  actions: Action[];
  seed?: number;
  base_snapshot_id?: string;
  expected_base_checksum?: string;
  stop_when?: StopCondition;
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

export interface SequenceResult<Action, Event, GameMetrics extends Metrics> {
  requestId: string;
  status: SequenceStatus;
  appliedSteps: number;
  stopReason: string;
  rollbackSnapshotId: string;
  steps: StepRecord<Action, Event, GameMetrics>[];
  finalChecksum: string;
  metrics: GameMetrics;
  errorIndex?: number;
}

export interface SnapshotRecord {
  id: string;
  checksum: string;
  format: "huginn/canonical-state-v1";
  value: unknown;
}

export interface ToolExecutionOptions {
  signal: AbortSignal;
}
