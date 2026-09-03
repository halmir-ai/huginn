import { describe, expect, it } from "vitest";
import { GameRuntime, type GameDefinition } from "../src/play/core";

const game: GameDefinition<{ value: number }, { type: "step" }, string> = {
  description: { id: "test", title: "Test", version: "1", summary: "test", rules: [], victoryConditions: [], failureConditions: [], metrics: [], actions: [] },
  initialState: seed => ({ value: seed }),
  legalActions: () => [{ action: { type: "step" }, label: "Step", reason: "available" }],
  reduce: state => ({ state: { value: state.value + 1 }, events: ["step"] }),
  metrics: state => ({ value: state.value }),
  deserialize: value => value as { value: number },
};

describe("ordinary game runtime", () => {
  it("runs independently and rejects actions outside the current legal set", async () => {
    const runtime = new GameRuntime(game, 12);
    expect(await runtime.dispatch({ type: "step" })).toBe(true);
    expect(runtime.state.value).toBe(13);
    expect(await runtime.dispatch({ type: "wrong" } as never)).toBe(false);
    expect(runtime.state.value).toBe(13);
    await runtime.reset();
    expect(runtime.state.value).toBe(12);
  });
  it("exclusive control pauses the clock and waits for an in-flight human action", async () => {
    const runtime = new GameRuntime(game);
    let release!: () => void;
    runtime.installDriver({ dispatch: () => new Promise<void>(resolve => { release = resolve; }), reset: async () => {} });
    runtime.play();
    const action = runtime.dispatch({ type: "step" });
    let entered = false;
    const external = runtime.runExclusive(async () => { entered = true; expect(runtime.busy).toBe(true); return 42; });
    expect(runtime.playing).toBe(false);
    expect(runtime.control).toBe("agent");
    expect(entered).toBe(false);
    expect(await runtime.dispatch({ type: "step" })).toBe(false);
    release();
    await action;
    expect(await external).toBe(42);
    expect(runtime.busy).toBe(false);
    expect(runtime.playing).toBe(false);
  });
  it("releases exclusive ownership after failures", async () => {
    const runtime = new GameRuntime(game);
    await expect(runtime.runExclusive(async () => { throw new Error("test"); })).rejects.toThrow("test");
    expect(runtime.busy).toBe(false);
    expect(await runtime.dispatch({ type: "step" })).toBe(true);
  });
});
