import { canonicalEqual, canonicalJson, checksum } from "./canonical";
import type {
  GameAdapter,
  LegalAction,
  Metrics,
  SequenceInput,
  SequenceResult,
  SnapshotRecord,
  StopCondition,
} from "./types";

const MAX_ACTIONS = 50;
const MAX_SNAPSHOTS = 12;
const MAX_REQUEST_CACHE = 20;

type Scheduler = (delayMs: number) => Promise<void>;

const browserScheduler: Scheduler = (delayMs) =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      window.setTimeout(resolve, delayMs);
    });
  });

export class HuginnKernel<State, Action, Event, GameMetrics extends Metrics> {
  private state: State;
  private seed: number;
  private snapshots = new Map<string, SnapshotRecord>();
  private retainedSnapshotId: string | null = null;
  private requestCache = new Map<string, { fingerprint: string; result: SequenceResult<Action, Event, GameMetrics> }>();
  private snapshotCounter = 0;
  private runningRequestId: string | null = null;

  constructor(
    private readonly adapter: GameAdapter<State, Action, Event, GameMetrics>,
    initialSeed = 12,
    private readonly schedule: Scheduler = browserScheduler,
  ) {
    this.seed = initialSeed;
    this.state = adapter.initialState(initialSeed);
  }

  async initialize(): Promise<void> {
    await this.adapter.render(this.state, { kind: "reset", events: [] });
  }

  async describeGame() {
    return {
      protocolVersion: "huginn/experiment-v1",
      game: this.adapter.description,
      capabilities: {
        visibleExecution: true,
        seededReplay: true,
        snapshots: true,
        cancellation: true,
        sequenceSemantics: "committed-prefix",
        maxActionsPerSequence: MAX_ACTIONS,
        snapshotLimit: MAX_SNAPSHOTS,
        snapshotRetention: "latest-explicit-checkpoint",
      },
      current: {
        seed: this.seed,
        checksum: await this.currentChecksum(),
        metrics: this.adapter.metrics(this.state),
        legalActionCount: this.adapter.listLegalActions(this.state).length,
      },
    };
  }

  async getState() {
    return {
      checksum: await this.currentChecksum(),
      state: this.adapter.serialize(this.state),
    };
  }

  async getMetrics() {
    return {
      checksum: await this.currentChecksum(),
      metrics: this.adapter.metrics(this.state),
    };
  }

  async listLegalActions(): Promise<{
    checksum: string;
    actions: LegalAction<Action>[];
  }> {
    return {
      checksum: await this.currentChecksum(),
      actions: this.adapter.listLegalActions(this.state),
    };
  }

  async createSnapshot(): Promise<SnapshotRecord> {
    return this.captureSnapshot(true);
  }

  private async captureSnapshot(retain: boolean, sequenceBaseId?: string): Promise<SnapshotRecord> {
    const value = this.adapter.serialize(this.state);
    const stateChecksum = await checksum(value);
    const id = `snapshot-${++this.snapshotCounter}-${stateChecksum.slice(0, 10)}`;
    const snapshot: SnapshotRecord = {
      id,
      checksum: stateChecksum,
      format: "huginn/canonical-state-v1",
      seed: this.seed,
      value,
    };

    this.snapshots.set(id, snapshot);
    if (retain) this.retainedSnapshotId = id;
    while (this.snapshots.size > MAX_SNAPSHOTS) {
      // Automatic rollback receipts must not evict the user's latest saved
      // checkpoint, or the named base this sequence is about to restore.
      const oldestId = [...this.snapshots.keys()].find(
        (candidate) => candidate !== this.retainedSnapshotId && candidate !== sequenceBaseId,
      );
      if (oldestId) this.snapshots.delete(oldestId);
    }

    return structuredClone(snapshot);
  }

  async restoreSnapshot(id: string, expectedChecksum?: string): Promise<{
    id: string;
    checksum: string;
    metrics: GameMetrics;
  }> {
    if (this.runningRequestId) {
      throw new Error(`A sequence is already running: ${this.runningRequestId}`);
    }

    const snapshot = this.snapshots.get(id);
    if (!snapshot) throw new Error(`Unknown snapshot: ${id}`);

    const actualChecksum = await checksum(snapshot.value);
    if (actualChecksum !== snapshot.checksum) {
      throw new Error(`Snapshot checksum mismatch: ${id}`);
    }
    if (expectedChecksum && expectedChecksum !== actualChecksum) {
      throw new Error("The supplied snapshot checksum is stale or incorrect.");
    }

    await this.restoreCanonicalSnapshot(snapshot, actualChecksum);
    await this.adapter.render(this.state, { kind: "restore", events: [] });
    return { id, checksum: actualChecksum, metrics: this.adapter.metrics(this.state) };
  }

  async reset(seed: number): Promise<void> {
    this.assertSeed(seed);
    if (this.runningRequestId) {
      throw new Error(`A sequence is already running: ${this.runningRequestId}`);
    }
    this.seed = seed;
    this.state = this.adapter.initialState(seed);
    await this.adapter.render(this.state, { kind: "reset", events: [] });
  }

  async applyActionSequence(
    input: SequenceInput<Action>,
    signal: AbortSignal = new AbortController().signal,
  ): Promise<SequenceResult<Action, Event, GameMetrics>> {
    this.validateSequenceInput(input);
    const fingerprint = canonicalJson(Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)));
    const cached = this.requestCache.get(input.request_id);
    if (cached) {
      if (cached.fingerprint !== fingerprint) throw new Error("request_id was already used with different input.");
      return { ...structuredClone(cached.result), cached: true };
    }
    if (this.runningRequestId) {
      throw new Error(`A sequence is already running: ${this.runningRequestId}`);
    }

    this.runningRequestId = input.request_id;
    try {
      const currentChecksum = await this.currentChecksum();
      if (input.expected_base_checksum) {
        let actualBaseChecksum = currentChecksum;
        if (input.base_snapshot_id) {
          const baseSnapshot = this.snapshots.get(input.base_snapshot_id);
          if (!baseSnapshot) throw new Error(`Unknown snapshot: ${input.base_snapshot_id}`);
          actualBaseChecksum = await checksum(baseSnapshot.value);
          if (actualBaseChecksum !== baseSnapshot.checksum) {
            throw new Error(`Snapshot checksum mismatch: ${input.base_snapshot_id}`);
          }
        }
        if (input.expected_base_checksum !== actualBaseChecksum) {
          throw new Error("The experiment base changed since the caller inspected it.");
        }
      }

      const rollback = await this.captureSnapshot(false, input.base_snapshot_id);

      if (input.seed !== undefined) {
        this.assertSeed(input.seed);
        this.seed = input.seed;
        this.state = this.adapter.initialState(input.seed);
        await this.adapter.render(this.state, {
          kind: "reset",
          events: [],
          requestId: input.request_id,
        });
      } else if (input.base_snapshot_id) {
        await this.restoreForSequence(input.base_snapshot_id, input.request_id);
      }

      const steps: SequenceResult<Action, Event, GameMetrics>["steps"] = [];
      let status: SequenceResult<Action, Event, GameMetrics>["status"] = "completed";
      let stopReason = "all-actions-applied";
      let errorIndex: number | undefined;

      for (let index = 0; index < input.actions.length; index += 1) {
        if (signal.aborted) {
          status = "cancelled";
          stopReason = "caller-cancelled";
          break;
        }

        const action = input.actions[index];
        const legal = this.adapter
          .listLegalActions(this.state)
          .some((candidate) => canonicalEqual(candidate.action, action));
        if (!legal) {
          status = "error";
          stopReason = "action-not-legal";
          errorIndex = index;
          break;
        }

        const beforeChecksum = await this.currentChecksum();
        let transition: { state: State; events: Event[] };
        let step: SequenceResult<Action, Event, GameMetrics>["steps"][number];
        try {
          transition = this.adapter.reduce(this.state, action);
          const afterChecksum = await checksum(this.adapter.serialize(transition.state));
          step = {
            index,
            action: structuredClone(action),
            beforeChecksum,
            afterChecksum,
            events: structuredClone(transition.events),
            metrics: structuredClone(this.adapter.metrics(transition.state)),
          };
        } catch {
          status = "error";
          stopReason = "transition-failed";
          errorIndex = index;
          break;
        }
        this.state = transition.state;
        // Record the commit before rendering: display/scheduler failure must
        // still return an accurate prefix and a usable rollback receipt.
        steps.push(step);
        try {
          await this.adapter.render(this.state, {
            kind: "action", action, events: transition.events,
            step: index, requestId: input.request_id,
          });
          await this.schedule(input.speed === "watch" ? 250 : 80);
        } catch {
          status = "error";
          stopReason = "render-or-schedule-failed";
          errorIndex = index;
          break;
        }

        if (input.stop_when && this.matchesStop(step.metrics, input.stop_when)) {
          status = "stopped";
          stopReason = "stop-condition-met";
          break;
        }
      }

      const result: SequenceResult<Action, Event, GameMetrics> = {
        requestId: input.request_id,
        status,
        appliedSteps: steps.length,
        stopReason,
        rollbackSnapshotId: rollback.id,
        steps,
        finalChecksum: await this.currentChecksum(),
        metrics: this.adapter.metrics(this.state),
        ...(errorIndex === undefined ? {} : { errorIndex }),
      };

      this.cacheResult(input.request_id, fingerprint, result);
      return structuredClone(result);
    } finally {
      this.runningRequestId = null;
    }
  }

  private async currentChecksum(): Promise<string> {
    return checksum(this.adapter.serialize(this.state));
  }

  private async restoreForSequence(id: string, requestId: string): Promise<void> {
    const snapshot = this.snapshots.get(id);
    if (!snapshot) throw new Error(`Unknown snapshot: ${id}`);
    const actualChecksum = await checksum(snapshot.value);
    if (actualChecksum !== snapshot.checksum) throw new Error(`Snapshot checksum mismatch: ${id}`);
    await this.restoreCanonicalSnapshot(snapshot, actualChecksum);
    await this.adapter.render(this.state, { kind: "restore", events: [], requestId });
  }

  private async restoreCanonicalSnapshot(snapshot: SnapshotRecord, stateChecksum: string): Promise<void> {
    const restored = this.adapter.deserialize(structuredClone(snapshot.value));
    const restoredChecksum = await checksum(this.adapter.serialize(restored));
    if (restoredChecksum !== stateChecksum) {
      throw new Error("The adapter did not restore the snapshot canonically.");
    }
    this.state = restored;
    this.seed = snapshot.seed;
  }

  private matchesStop(metrics: GameMetrics, condition: StopCondition): boolean {
    const defined = this.adapter.description.metrics.some((metric) => metric.key === condition.metric);
    const value = metrics[condition.metric];
    if (!defined || typeof value !== "number") {
      throw new Error(`Stop metric is not an exposed number: ${condition.metric}`);
    }
    if (condition.operator === "eq") return value === condition.value;
    if (condition.operator === "gte") return value >= condition.value;
    return value <= condition.value;
  }

  private validateSequenceInput(input: SequenceInput<Action>): void {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Sequence input must be an object.");
    const allowed = ["request_id", "seed", "base_snapshot_id", "expected_base_checksum", "actions", "stop_when", "speed"];
    const unknown = Object.keys(input).find((key) => !allowed.includes(key));
    if (unknown) throw new TypeError(`Unknown sequence field: ${unknown}`);
    if (typeof input.request_id !== "string" || !/^[A-Za-z0-9._-]{1,64}$/.test(input.request_id)) {
      throw new TypeError("request_id must be 1–64 safe identifier characters.");
    }
    if (!Array.isArray(input.actions) || input.actions.length > MAX_ACTIONS) {
      throw new RangeError(`actions must contain at most ${MAX_ACTIONS} entries.`);
    }
    if (input.seed !== undefined && input.base_snapshot_id !== undefined) {
      throw new TypeError("Provide seed or base_snapshot_id, not both.");
    }
    if (input.seed !== undefined) this.assertSeed(input.seed);
    if (input.base_snapshot_id !== undefined && (typeof input.base_snapshot_id !== "string" || input.base_snapshot_id.length < 1 || input.base_snapshot_id.length > 128)) {
      throw new TypeError("base_snapshot_id must contain 1–128 characters.");
    }
    if (input.expected_base_checksum !== undefined && (typeof input.expected_base_checksum !== "string" || !/^[a-f0-9]{64}$/.test(input.expected_base_checksum))) {
      throw new TypeError("expected_base_checksum must be a canonical SHA-256 checksum.");
    }
    if (input.speed !== undefined && input.speed !== "watch" && input.speed !== "fast") throw new TypeError("Invalid sequence speed.");
    if (input.stop_when !== undefined) {
      const stop = input.stop_when;
      if (!stop || typeof stop !== "object" || Array.isArray(stop) || Object.keys(stop).some((key) => !["metric", "operator", "value"].includes(key))) {
        throw new TypeError("Invalid stop condition fields.");
      }
      if (typeof stop.metric !== "string" || !this.adapter.description.metrics.some((metric) => metric.key === stop.metric) || typeof this.adapter.metrics(this.state)[stop.metric] !== "number") {
        throw new TypeError("Stop metric must be an exposed number.");
      }
      if (!["eq", "gte", "lte"].includes(stop.operator) || !Number.isFinite(stop.value)) throw new TypeError("Invalid stop operator or value.");
    }
  }

  private assertSeed(seed: number): void {
    if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0x7fffffff) {
      throw new RangeError("seed must be an integer from 0 through 2147483647.");
    }
  }

  private cacheResult(
    requestId: string,
    fingerprint: string,
    result: SequenceResult<Action, Event, GameMetrics>,
  ): void {
    this.requestCache.set(requestId, { fingerprint, result: structuredClone(result) });
    while (this.requestCache.size > MAX_REQUEST_CACHE) {
      const oldestId = this.requestCache.keys().next().value as string | undefined;
      if (oldestId) this.requestCache.delete(oldestId);
    }
  }
}
