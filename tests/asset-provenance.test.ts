import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

type SourceManifest = {
  license: string;
  assets: { destination: string; sha256: string }[];
};

describe("selected art provenance", () => {
  for (const collection of ["rts-lab", "thornwatch"]) {
    it(`${collection} files match their published CC BY manifest`, async () => {
      const root = new URL(`../public/assets/${collection}/`, import.meta.url);
      const manifest = JSON.parse(await readFile(new URL("sources.json", root), "utf8")) as SourceManifest;
      expect(manifest.license).toBe("CC-BY-4.0");
      expect(manifest.assets.length).toBeGreaterThan(0);
      for (const asset of manifest.assets) {
        const bytes = await readFile(new URL(asset.destination, root));
        expect(createHash("sha256").update(bytes).digest("hex"), asset.destination).toBe(asset.sha256);
      }
    });
  }
});
