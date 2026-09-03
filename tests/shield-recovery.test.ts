import { describe, expect, it, vi } from "vitest";
import { coilGame } from "../src/games/coil/game";
import type { CoilEvent } from "../src/games/coil/game";
import { isNativeButtonActivationKey, pauseHumanAfterShieldBlock } from "../src/games/coil/view";
import { GameRuntime } from "../src/play/core";

const blocked: CoilEvent[] = [{ type: "shield-blocked", cause: "wall", x: 28, y: 11 }];

describe("COIL human shield recovery", () => {
  it("pauses a playing human runtime immediately after a shield block", () => {
    const runtime = new GameRuntime(coilGame, 12);
    runtime.play();
    expect(pauseHumanAfterShieldBlock(runtime, blocked)).toBe(true);
    expect(runtime.playing).toBe(false);
    expect(runtime.control).toBe("human");
  });

  it("does not alter agent-controlled batches or unrelated human events", () => {
    const agentPause = vi.fn();
    expect(pauseHumanAfterShieldBlock({ control: "agent", pause: agentPause }, blocked)).toBe(false);
    expect(agentPause).not.toHaveBeenCalled();

    const humanPause = vi.fn();
    expect(pauseHumanAfterShieldBlock({ control: "human", pause: humanPause }, [{ type: "shield-armed" }])).toBe(false);
    expect(humanPause).not.toHaveBeenCalled();
  });

  it("preserves native Space and Enter activation for focused controls", () => {
    expect(isNativeButtonActivationKey(" ", "Space")).toBe(true);
    expect(isNativeButtonActivationKey("Enter", "Enter")).toBe(true);
    expect(isNativeButtonActivationKey("q", "KeyQ")).toBe(false);
  });
});
