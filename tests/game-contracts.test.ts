import { describe, expect, it } from "vitest";
import { coilGame } from "../src/games/coil/game";
import { starfallGame } from "../src/games/starfall/game";
import { thornwatchGame } from "../src/games/thornwatch/game";

describe("cold-agent metric contract", () => {
  for (const game of [coilGame, starfallGame, thornwatchGame]) {
    it(`${game.description.title} explains every exposed metric`, () => {
      const state = game.initialState(12);
      const actual = Object.keys((game.metrics as (value: unknown) => object)(state)).sort();
      const documented = game.description.metrics.map(metric => metric.key).sort();
      expect(documented).toEqual(actual);
      expect(new Set(documented).size).toBe(documented.length);
      expect(game.description.metrics.every(metric => metric.description.trim().length > 10)).toBe(true);
    });
  }
});
