import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("engine-agnostic game boundary", () => {
  it("keeps native Canvas and PixiJS renderers behind the same game contract", async () => {
    const [coil, starfall, thornwatch] = await Promise.all([
      readFile(new URL("../src/games/coil/view.ts", import.meta.url), "utf8"),
      readFile(new URL("../src/games/starfall/view.ts", import.meta.url), "utf8"),
      readFile(new URL("../src/games/thornwatch/view.ts", import.meta.url), "utf8"),
    ]);

    expect(coil).toContain('getContext("2d")');
    expect(starfall).toContain('getContext("2d")');
    expect(coil).not.toContain('from "pixi.js"');
    expect(starfall).not.toContain('from "pixi.js"');

    expect(thornwatch).toContain('from "pixi.js"');
    expect(thornwatch).toContain('preference: "webgl"');
    expect(thornwatch).toContain("preserveDrawingBuffer: true");
    expect(thornwatch).not.toContain('getContext("2d")');
  });

  it("validates retained in-app-browser smoke metadata from both renderer families", async () => {
    const receipt = JSON.parse(await readFile(
      new URL("./fixtures/arcade/engine-browser-smoke.json", import.meta.url),
      "utf8",
    )) as {
      evidenceScope: string;
      sharedToolNames: string[];
      games: { id: string; renderer: string; capture: { stateChecksum: string; imageChecksum: string; previewVisible: boolean } }[];
    };

    expect(receipt.evidenceScope).toContain("manually recorded");
    expect(receipt.evidenceScope).toContain("PNG bytes are not retained");
    expect(receipt.sharedToolNames).toContain("capture_game");
    expect(receipt.games.map((game) => game.renderer)).toEqual([
      "native Canvas 2D",
      "PixiJS 8 / WebGL",
    ]);
    for (const game of receipt.games) {
      expect(game.capture.previewVisible).toBe(true);
      expect(game.capture.stateChecksum).toMatch(/^[a-f0-9]{64}$/);
      expect(game.capture.imageChecksum).toMatch(/^[a-f0-9]{64}$/);
    }
  });
});
