import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { verifyPair } from "../tools/comparison-proof.mjs";

const read = (name) => JSON.parse(readFileSync(new URL(`../public/demo/comparison/${name}`, import.meta.url), "utf8"));

describe("published paired replay evidence", () => {
  for (const game of ["rts", "tideglass"]) {
    it(`${game}: verifies original states, every step, fresh replay and complete counts`, () => {
      const result = verifyPair(read(`${game}-ui-off.json`), read(`${game}-webmcp.json`));
      const published = read("results.json").games.find((entry) => entry.game === result.game);
      expect(result).toEqual(Object.fromEntries(Object.entries(published).filter(([key]) => key !== "rawReceipts")));
    });
  }
  it("rejects an altered state, a missing restore and an invented token value", () => {
    const ui = read("rts-ui-off.json"), mcp = read("rts-webmcp.json");
    const tampered = structuredClone(ui); tampered.runs[0].steps[0].state.cycle += 1;
    expect(() => verifyPair(tampered, mcp)).toThrow("state hash mismatch");
    const skipped = structuredClone(ui); skipped.restores.pop();
    expect(() => verifyPair(skipped, mcp)).toThrow();
    const invented = structuredClone(ui); invented.agentTokenUsage = 123;
    expect(() => verifyPair(invented, mcp)).toThrow("token estimate");
  });
});
