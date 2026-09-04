const surfaces = [
  ["@halmir/huginn", ["HuginnKernel", "canonicalJson", "createRegressionScenario"]],
  ["@halmir/huginn/webmcp", ["buildToolDefinitions", "connectHuginnWebMcp", "registerWebMcpTools"]],
  ["@halmir/huginn/game-runtime", ["GameRuntime"]],
  ["@halmir/huginn/debugger", ["attachHuginnDebugger"]],
];

const report = [];
for (const [specifier, expected] of surfaces) {
  const exports = Object.keys(await import(specifier)).sort();
  const missing = expected.filter((name) => !exports.includes(name));
  if (missing.length) throw new Error(`${specifier} is missing exports: ${missing.join(", ")}`);
  report.push({ specifier, expected, importable: true });
}

console.log(JSON.stringify(report, null, 2));
