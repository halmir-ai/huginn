import { describe, expect, it } from "vitest";
import { starfallFlipperForKey } from "../src/games/starfall/view";

describe("STARFALL keyboard controls", () => {
  it("maps both compact and directional layouts to the left flipper", () => {
    for (const key of ["a", "A", "z", "Z", "ArrowLeft"]) expect(starfallFlipperForKey(key)).toBe("left");
  });

  it("maps both compact and directional layouts to the right flipper", () => {
    for (const key of ["d", "D", "x", "X", "ArrowRight"]) expect(starfallFlipperForKey(key)).toBe("right");
    expect(starfallFlipperForKey("q")).toBeUndefined();
  });
});
