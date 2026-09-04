/**
 * Protocol-independent Huginn experiment library.
 *
 * This entry point deliberately does not import WebMCP, the optional debugger,
 * or any example game. A host can use the deterministic kernel in tests, a
 * worker, or another transport without touching browser registration APIs.
 */
export { canonicalEqual, canonicalJson, checksum } from "./canonical";
export { HuginnKernel, type HuginnScheduler } from "./kernel";
export {
  createRegressionScenario,
  sequenceInputFromScenario,
  type RegressionScenario,
} from "./scenario";
export type {
  ActionDefinition,
  ExpectationCheck,
  GameAdapter,
  GameDescription,
  LegalAction,
  MetricDefinition,
  MetricExpectation,
  Metrics,
  MetricValue,
  RenderContext,
  SequenceInput,
  SequenceResult,
  SequenceStatus,
  SequenceVerdict,
  SnapshotRecord,
  StepRecord,
  StopCondition,
  StopOperator,
  ToolExecutionOptions,
  Transition,
} from "./types";
