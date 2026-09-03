import { cp, mkdir, readFile, readdir, writeFile, symlink, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [game, treatment, output] = process.argv.slice(2);
if (!["coil", "starfall"].includes(game) || !["plain", "huginn"].includes(treatment) || !output) {
  throw new Error("Usage: node tools/export-feature-trial.mjs coil|starfall plain|huginn /absolute/new/directory");
}
const destination = resolve(output);
if (!output.startsWith("/") || destination === repo || destination.length < 30) throw new Error("Use an explicit new trial directory.");
try { await access(destination); throw new Error("Destination already exists; refusing to overwrite a trial."); }
catch (error) { if (error.code !== "ENOENT") throw error; }
const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).trim();
const frozenPaths = [`src/games/${game}`, `tests/${game}.test.ts`, "src/play/core.ts", "src/vite-env.d.ts", "LICENSE", "package.json", "package-lock.json", "tsconfig.json", "docs/demo/ARCADE_FEATURE_PROTOCOL.md", ...(treatment === "huginn" ? ["src/play/bridge.ts", "src/play/dock.css", "src/huginn"] : [])];
if (execFileSync("git", ["status", "--porcelain", "--", ...frozenPaths], { cwd: repo, encoding: "utf8" }).trim()) {
  throw new Error("Freeze the game and integration source before exporting a trial.");
}
const title = game === "coil" ? "COIL" : "STARFALL";
const mount = game === "coil" ? "mountCoil" : "mountStarfall";
const files = [];
async function copyPath(path) {
  const target = join(destination, path);
  await mkdir(dirname(target), { recursive: true });
  await cp(join(repo, path), target, { recursive: true, errorOnExist: true, force: false });
}
await mkdir(destination, { recursive: true });
for (const path of [`src/games/${game}`, "src/play/core.ts", "src/vite-env.d.ts", `tests/${game}.test.ts`, "LICENSE"]) await copyPath(path);
try { await access(join(repo, `public/assets/${game}`)); await copyPath(`public/assets/${game}`); }
catch (error) { if (error.code !== "ENOENT") throw error; }
if (treatment === "huginn") for (const path of ["src/huginn", "src/play/bridge.ts", "src/play/dock.css"]) await copyPath(path);
const main = `import { ${game}Game } from './games/${game}/game';\nimport { ${mount} } from './games/${game}/view';\nimport { GameRuntime } from './play/core';\n${treatment === "huginn" ? "import { attachHuginn } from './play/bridge';\n" : ""}const runtime = new GameRuntime(${game}Game, 12);\n${mount}(document.querySelector('#app')!, runtime, { assets: './assets/${game}' });\n${treatment === "huginn" ? "await attachHuginn(runtime, document.querySelector('#experiment')!);\n" : ""}`;
await writeFile(join(destination, "src/main.ts"), main);
await writeFile(join(destination, "index.html"), `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;background:#080e18"><main id="app"></main>${treatment === "huginn" ? '<aside id="experiment"></aside>' : ""}<script type="module" src="/src/main.ts"></script></body></html>\n`);
const originalPackage = JSON.parse(await readFile(join(repo, "package.json"), "utf8"));
const pkg = { name: `${game}-standalone`, version: "1.0.0", private: true, type: "module", license: "MIT", scripts: { dev: "vite --host 127.0.0.1", build: "tsc --noEmit && vite build", test: "vitest run", check: "tsc --noEmit && vitest run" }, devDependencies: originalPackage.devDependencies };
await writeFile(join(destination, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
const lock = JSON.parse(await readFile(join(repo, "package-lock.json"), "utf8"));
lock.name = pkg.name; lock.version = pkg.version;
lock.packages[""].name = pkg.name; lock.packages[""].version = pkg.version;
await writeFile(join(destination, "package-lock.json"), JSON.stringify(lock, null, 2) + "\n");
await copyPath("tsconfig.json");
await writeFile(join(destination, "vite.config.ts"), 'import { defineConfig } from "vite";\nexport default defineConfig({ base: "./" });\n');
await writeFile(join(destination, ".gitignore"), "node_modules/\ndist/\nartifacts/\n.DS_Store\n");
await symlink(join(repo, "node_modules"), join(destination, "node_modules"), "dir");
const protocol = await readFile(join(repo, "docs/demo/ARCADE_FEATURE_PROTOCOL.md"), "utf8");
const start = protocol.indexOf(`## ${title} feature:`);
const end = protocol.indexOf("\n## ", start + 3);
const brief = protocol.slice(start, end).replace(/^## /, "# ");
await writeFile(join(destination, "TASK.md"), brief + "\n");
await writeFile(join(destination, "AGENTS.md"), `# ${title} feature task\n\nWork only in this directory. Read TASK.md. Do not read another trial, another task's history, or a reference feature implementation. Do not delegate or create new tasks. Preserve the baseline game and implement only the requested feature.\n\nUse the existing dependencies. Source inspection, unit tests, normal browser controls and new diagnostic code are permitted. Run the game and actually use its ordinary controls before and after the feature. Use only permitted browser-control APIs for browser interaction. ${treatment === "huginn" ? "This project also exposes seven native browser tools when opened in the Codex in-app browser; you may use them to inspect and exercise live game state. Read the integration in src/play/bridge.ts if helpful." : "This is an ordinary game project with no agent protocol integration. Do not add or import Huginn. You may build your own focused tests or diagnostic code; count that work."}\n\nWrite a failing regression test for the requested behavior before implementing it. Run npm run check and npm run build after implementation. Retain all failed commands and retries in TASK_REPORT.md; report actual evidence, not inferred token savings. Save screenshots/receipts under ignored artifacts/. Finish with one commit (no push; parent handles publication), exact source changes, test results, browser evidence and unmet requirements. Do not invent usage numbers.\n`);
await writeFile(join(destination, "README.md"), `# ${title}\n\nA standalone arcade game. Run npm run dev -- --port PORT --strictPort, then open the printed local URL. The user-facing feature request is in TASK.md. All game source and normal controls are present. Baseline seed is 12.\n`);
async function inventory(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await inventory(path);
    else files.push({ path: relative(destination, path), sha256: createHash("sha256").update(await readFile(path)).digest("hex") });
  }
}
await inventory(join(destination, `src/games/${game}`));
files.sort((a, b) => a.path.localeCompare(b.path));
const manifest = { format: "huginn/feature-baseline-v1", game, treatment, sourceCommit, seed: 12, gameFiles: files, gameSourceDigest: createHash("sha256").update(JSON.stringify(files)).digest("hex"), sharedRuntimeSha256: createHash("sha256").update(await readFile(join(destination, "src/play/core.ts"))).digest("hex"), tokens: null, status: "exported-not-started" };
await writeFile(join(destination, "BASELINE.json"), JSON.stringify(manifest, null, 2) + "\n");
execFileSync("git", ["init", "-b", "main"], { cwd: destination, stdio: "pipe" });
execFileSync("git", ["add", "."], { cwd: destination, stdio: "pipe" });
execFileSync("git", ["commit", "-m", `chore: freeze ${game} feature baseline`], { cwd: destination, stdio: "pipe" });
console.log(JSON.stringify({ destination, ...manifest, baselineCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: destination, encoding: "utf8" }).trim() }, null, 2));
