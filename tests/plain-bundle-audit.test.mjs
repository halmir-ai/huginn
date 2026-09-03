import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { auditPlainBundles } from "../tools/audit-plain-bundles.mjs";

const fixtures = [];
async function fixture(code) {
  const directory = await mkdtemp(join(tmpdir(), "huginn-bundle-guard-"));
  fixtures.push(directory);
  await mkdir(join(directory, ".vite")); await mkdir(join(directory, "assets"));
  await writeFile(join(directory, ".vite/manifest.json"), JSON.stringify({ "plain.html": { file: "assets/plain.js", imports: ["_shared.js"] }, "_shared.js": { file: "assets/shared.js" } }));
  await writeFile(join(directory, "assets/plain.js"), 'import "./shared.js";');
  await writeFile(join(directory, "assets/shared.js"), code);
  return directory;
}
afterEach(async () => { for (const directory of fixtures.splice(0)) await rm(directory, { recursive: true }); });
describe("plain build isolation guard", () => {
  it("accepts an ordinary game including its shared chunks", async () => {
    const directory = await fixture("export const score = 12;");
    expect((await auditPlainBundles(directory, ["plain.html"]))[0].files).toHaveLength(2);
  });
  it("rejects protocol code hidden inside a shared chunk", async () => {
    const directory = await fixture('document.modelContext.registerTool({name:"apply_action_sequence"});');
    await expect(auditPlainBundles(directory, ["plain.html"])).rejects.toThrow("Protocol runtime leaked");
  });
});
