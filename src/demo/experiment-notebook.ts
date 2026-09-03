import { canonicalEqual } from "../huginn/canonical";
import type { SequenceResult } from "../huginn/types";
import type { RtsLabAction, RtsLabEvent, RtsLabMetrics } from "./rts-lab";

export type RtsResult = SequenceResult<RtsLabAction, RtsLabEvent, RtsLabMetrics>;

export interface RunReceipt {
  source: "WebMCP" | "Page preset";
  label: string;
  freshExecution: boolean;
  result: RtsResult;
}

export const rushActions: RtsLabAction[] = [
  { type: "build_barracks" },
  { type: "train_vanguard" },
  { type: "launch_attack" },
  { type: "advance_cycle" },
  { type: "advance_cycle" },
  { type: "advance_cycle" },
];

export const economyActions: RtsLabAction[] = [
  { type: "assign_worker", resource: "crown_gold" },
  { type: "advance_cycle" },
  { type: "advance_cycle" },
  { type: "build_barracks" },
  { type: "train_vanguard" },
  { type: "advance_cycle" },
  { type: "train_vanguard" },
  { type: "launch_attack" },
];

export function compareRuns(first: RunReceipt, second: RunReceipt) {
  const a = first.result;
  const b = second.result;
  const baseA = a.steps[0]?.beforeChecksum;
  const baseB = b.steps[0]?.beforeChecksum;
  if (!first.freshExecution || !second.freshExecution || a.requestId === b.requestId) {
    return { kind: "cached", heading: "A cached response is not a replay.", detail: "Use a new request ID to execute every step again before claiming deterministic replay." };
  }
  if (a.status !== "completed" || b.status !== "completed" || !baseA || !baseB) {
    return { kind: "incomplete", heading: "Inspect the committed prefix.", detail: "Both runs must finish non-empty plans before this notebook compares them." };
  }
  if (baseA !== baseB) {
    return { kind: "different-base", heading: "Different starting states.", detail: "Restore the same snapshot before both runs for a controlled comparison." };
  }
  const sameActions = canonicalEqual(a.steps.map((step) => step.action), b.steps.map((step) => step.action));
  if (sameActions) {
    const matches = canonicalEqual(a.steps, b.steps) && a.finalChecksum === b.finalChecksum && canonicalEqual(a.metrics, b.metrics);
    return matches
      ? { kind: "replay", heading: "Replay matches, step for step.", detail: `${b.appliedSteps} actions: matching events, metrics, and checksums. A fresh request ID reran this plan; this is not a cached retry.` }
      : { kind: "diverged", heading: "Replay diverged. Investigate.", detail: "The same starting state and actions produced different evidence. Do not trust the comparison yet." };
  }
  if (a.metrics.cycle !== b.metrics.cycle) {
    return { kind: "different-horizon", heading: "Different experiment horizons.", detail: `A ends at cycle ${a.metrics.cycle}; B ends at cycle ${b.metrics.cycle}. Match the ending cycle before comparing outcomes.` };
  }
  return {
    kind: "comparison",
    heading: `Same start. Both end at cycle ${b.metrics.cycle}.`,
    detail: `A / B: ${a.metrics.enemy_damage} / ${b.metrics.enemy_damage} damage; ${a.metrics.sunforge_base_hp} / ${b.metrics.sunforge_base_hp} base HP. One seeded example, not proof of a dominant strategy. Different actions can consume RNG draws differently.`,
  };
}
