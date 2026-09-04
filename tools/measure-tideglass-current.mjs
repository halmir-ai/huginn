import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { createServer } from "vite";

// Re-measure current source; never relabel a historical browser receipt.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const server = await createServer({ root, server: { middlewareMode: true }, appType: "custom" });
try {
  const { HuginnKernel } = await server.ssrLoadModule("/src/huginn/kernel.ts");
  const { checksum } = await server.ssrLoadModule("/src/huginn/canonical.ts");
  const { createTideglassAdapter, signalRoute, unassistedRoute, TIDEGLASS_VERSION } = await server.ssrLoadModule("/src/demo/tideglass.ts");
  const paths = { adapter: "src/demo/tideglass.ts", kernel: "src/huginn/kernel.ts", webmcp: "src/webmcp/index.ts", canonical: "src/huginn/canonical.ts" };
  const sources = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, path]) => [key, await readFile(resolve(root, path), "utf8")])));
  const fresh = (seed = 12) => new HuginnKernel(createTideglassAdapter(), seed, async () => {});
  const kernel = fresh();
  const snapshot = await kernel.createSnapshot();
  const results = [];
  for (const [name, actions] of [["signal", signalRoute], ["unassisted", unassistedRoute]]) {
    const run = await kernel.applyActionSequence({ request_id: `atomic-read-${name}`, base_snapshot_id: snapshot.id, expected_base_checksum: snapshot.checksum, actions });
    const replay = await fresh(77).applyActionSequence({ request_id: `atomic-read-fresh-${name}`, seed: 12, actions });
    assert.equal(run.status, "completed");
    assert.equal(replay.status, "completed");
    assert.deepEqual(replay.steps, run.steps);
    assert.equal(replay.finalChecksum, run.finalChecksum);
    results.push({ name, run, replay });
  }
  const receipt = {
    format: "huginn/current-kernel-node-replay-v1",
    sourceDigest: await checksum(sources), sourcePaths: paths, rulesVersion: TIDEGLASS_VERSION,
    originalRefinementSourceDigest: "94adf84f610ce8a1c8f45445d91734985413dda1ef445474c4e6f240a989300c",
    environment: "Node via Vite SSR; no browser or agent interaction measurement",
    command: "node tools/measure-tideglass-current.mjs", snapshot, results,
    note: "Fresh current-source executions. Preserved refinement browser receipts belong to their original source digest; no old counts are attributed to this build.",
  };
  const output = resolve(root, "tests/fixtures/tideglass/current-kernel-node.json");
  await writeFile(output, JSON.stringify(receipt, null, 2) + "\n");
  console.log(JSON.stringify({ output, sourceDigest: receipt.sourceDigest, plans: results.map(({ name, run }) => ({ name, steps: run.appliedSteps, finalChecksum: run.finalChecksum })), freshReplaysMatch: true }));
} finally { await server.close(); }
