import { readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";

export async function auditPlainBundles(directory, entries = [
  "games/coil/plain/index.html",
  "games/starfall/plain/index.html",
  "games/thornwatch/plain/index.html",
]) {
  const manifest = JSON.parse(await readFile(join(directory, ".vite/manifest.json"), "utf8"));
  const reports = [];
  for (const entry of entries) {
    const visited = new Set();
    const files = [];
    async function visit(key) {
      if (visited.has(key)) return;
      visited.add(key);
      const item = manifest[key];
      if (!item) throw new Error(`Missing bundle manifest entry: ${key}`);
      files.push(item.file);
      for (const dependency of [...(item.imports ?? []), ...(item.dynamicImports ?? [])]) await visit(dependency);
    }
    await visit(entry);
    for (const file of files) {
      // Read all executable transitive chunks, not only the tiny entry module.
      const source = await readFile(join(directory, file), "utf8");
      const leaked = source.match(/\bmodelContext\b|huginn\/experiment-v1|\bsnapshot_game\b|\bcapture_game\b|\bapply_action_sequence\b|\brollbackSnapshotId\b/);
      if (leaked) throw new Error(`Protocol runtime leaked into ${entry} through ${file}: ${leaked[0]}`);
    }
    reports.push({ entry, files, protocolRuntimeAbsent: true });
  }
  return reports;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(JSON.stringify(await auditPlainBundles(resolve(process.argv[2] || "dist")), null, 2));
}
