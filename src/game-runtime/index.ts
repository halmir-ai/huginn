import type { GameDescription, LegalAction, Metrics } from "../huginn/types";

/** Ordinary reference game runtime. This module has no agent/protocol dependencies. */
export type GameMetrics = Metrics;
export type { GameDescription, LegalAction };
export interface GameDefinition<S, A, E> {
  description: GameDescription;
  initialState(seed: number): S;
  legalActions(state: S): LegalAction<A>[];
  reduce(state: S, action: A): { state: S; events: E[] };
  metrics(state: S): GameMetrics;
  deserialize(value: unknown): S;
}
export type UpdateKind = "reset" | "action" | "restore" | "mode";
type Listener<S, E> = (state: S, events: E[], kind: UpdateKind) => void;
export interface GameDriver<A> {
  dispatch(action: A): Promise<void>;
  reset(seed: number): Promise<void>;
}
export interface GameMountOptions { assets: string }

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`).join(",")}}`;
}

/** Fixed simulation steps are inputs; animation clocks never enter game rules. */
export class GameRuntime<S, A, E> {
  private current: S;
  private listeners = new Set<Listener<S, E>>();
  private driver?: GameDriver<A>;
  private pending = false;
  private external = false;
  private idleWaiters: (() => void)[] = [];
  private active = false;
  private owner: "human" | "agent" = "human";
  lastError = "";
  constructor(readonly game: GameDefinition<S, A, E>, readonly initialSeed = 12) {
    this.current = game.initialState(initialSeed);
  }
  get state(): S { return this.current; }
  get busy(): boolean { return this.pending || this.external; }
  get playing(): boolean { return this.active; }
  get control(): "human" | "agent" { return this.owner; }
  subscribe(listener: Listener<S, E>): () => void {
    this.listeners.add(listener);
    listener(this.current, [], "reset");
    return () => this.listeners.delete(listener);
  }
  publish(state: S, events: E[], kind: UpdateKind = "action"): void {
    this.current = state;
    for (const listener of this.listeners) listener(state, events, kind);
  }
  play(): void { this.owner = "human"; this.active = true; this.publish(this.current, [], "mode"); }
  pause(owner: "human" | "agent" = "human"): void {
    this.active = false; this.owner = owner; this.publish(this.current, [], "mode");
  }
  installDriver(driver: GameDriver<A>): void { this.driver = driver; }
  async runExclusive<T>(operation: () => Promise<T>): Promise<T> {
    if (this.external) throw new Error("An external operation is already running.");
    this.external = true;
    this.pause("agent");
    if (this.pending) await new Promise<void>(resolve => this.idleWaiters.push(resolve));
    try { return await operation(); }
    finally { this.external = false; this.publish(this.current, [], "mode"); }
  }
  async dispatch(action: A): Promise<boolean> {
    if (this.busy) return false;
    if (!this.game.legalActions(this.current).some(candidate => stable(candidate.action) === stable(action))) return false;
    this.pending = true;
    this.lastError = "";
    try {
      if (this.driver) await this.driver.dispatch(action);
      else {
        const result = this.game.reduce(this.current, action);
        this.publish(result.state, result.events);
      }
      return true;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      return false;
    } finally {
      this.pending = false;
      for (const resolve of this.idleWaiters.splice(0)) resolve();
    }
  }
  async reset(seed = this.initialSeed): Promise<void> {
    if (this.busy) return;
    this.pause();
    this.lastError = "";
    if (this.driver) await this.driver.reset(seed);
    else this.publish(this.game.initialState(seed), [], "reset");
  }
}
