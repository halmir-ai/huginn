import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};
const stateHash = (value) => createHash("sha256").update(canonical(value)).digest("hex");
const mutations = new Set(["snapshot_game", "restore_game", "apply_action_sequence"]);

/** Check raw collected receipts before deriving any public command-count claim. */
export function verifyPair(ui, mcp) {
  assert.equal(ui.sourceCommit, mcp.sourceCommit, "Both conditions must use the same source commit");
  assert.equal(ui.game, mcp.game, "Both conditions must use the same game");
  assert.equal(ui.mode, "webmcp-off");
  assert.equal(mcp.mode, "webmcp-on");
  assert.equal(ui.seed, mcp.seed);
  assert.deepEqual(ui.errors, [], "UI trial contains a game error");
  assert.deepEqual(mcp.errors, [], "WebMCP trial contains a game error");
  assert.equal(ui.agentTokenUsage, null, "Do not substitute a token estimate");
  assert.equal(mcp.agentTokenUsage, null, "Do not substitute a token estimate");
  assert.equal(ui.initial.checksum, stateHash(ui.initial.state), "UI initial state hash mismatch");
  assert.equal(mcp.initial.checksum, ui.initial.checksum, "Initial states differ");
  assert.deepEqual(mcp.initial.state, ui.initial.state);
  assert.deepEqual(ui.runs.map((run) => run.plan), mcp.runs.map((run) => run.plan));
  assert.equal(ui.runs.length, 3, "The protocol requires two plans and one fresh replay");
  assert.equal(ui.restores.length, 2);
  assert.equal(mcp.restores.length, 2);
  for (const restored of [...ui.restores, ...mcp.restores]) {
    assert.equal(restored.checksum, ui.initial.checksum, "A restore did not recover the experiment base");
  }

  const sequences = mcp.toolCalls.filter((call) => call.name === "apply_action_sequence");
  assert.equal(sequences.length, 3);
  assert.equal(new Set(sequences.map((call) => call.input.request_id)).size, 3, "Replay requires a fresh request ID");
  const expectedSteps = ui.game === "rts-lab" ? [6, 8, 8] : [8, 8, 8];
  let matchedSteps = 0;
  const outcomes = mcp.runs.map((run, index) => {
    const result = run.result;
    const uiSteps = ui.runs[index].steps;
    assert.equal(result.status, "completed");
    assert.notEqual(result.cached, true, "A cached response is not a replay");
    assert.deepEqual(result, sequences[index].response, "Run must be the actual recorded tool response");
    assert.deepEqual(result.steps.map((step) => step.action), sequences[index].input.actions);
    assert.equal(result.appliedSteps, result.steps.length);
    assert.equal(result.appliedSteps, expectedSteps[index], "Fixed plan length changed");
    assert.equal(ui.game === "rts-lab" ? result.metrics.cycle : result.metrics.watch,
      ui.game === "rts-lab" ? 3 : 8, "Fixed comparison horizon changed");
    assert.equal(uiSteps.length, result.appliedSteps);
    for (let stepIndex = 0; stepIndex < uiSteps.length; stepIndex += 1) {
      const uiStep = uiSteps[stepIndex], step = result.steps[stepIndex];
      assert.equal(uiStep.checksum, stateHash(uiStep.state), "UI step state hash mismatch");
      assert.equal(step.beforeChecksum, stepIndex ? uiSteps[stepIndex - 1].checksum : ui.initial.checksum);
      assert.equal(step.afterChecksum, uiStep.checksum, "Per-step parity failed");
      assert.deepEqual(step.metrics, uiStep.metrics, "Per-step metric parity failed");
      matchedSteps += 1;
    }
    assert.equal(result.finalChecksum, uiSteps.at(-1).checksum);
    assert.deepEqual(run.finalState.state, uiSteps.at(-1).state);
    assert.equal(run.finalState.checksum, result.finalChecksum);
    return { plan: run.plan, steps: result.appliedSteps, finalChecksum: result.finalChecksum, metrics: result.metrics };
  });
  assert.deepEqual(mcp.runs[1].result.steps, mcp.runs[2].result.steps, "Fresh replay step records differ");
  assert.equal(mcp.runs[1].result.finalChecksum, mcp.runs[2].result.finalChecksum);
  assert.equal(ui.gameCommands, matchedSteps + 3, "Count every action, snapshot and restore");
  const mutatingCalls = mcp.toolCalls.filter((call) => mutations.has(call.name)).length;
  assert.equal(mutatingCalls, 6);
  const snapshotCalls = mcp.toolCalls.filter((call) => call.name === "snapshot_game");
  assert.equal(snapshotCalls.length, 1);
  assert.equal(snapshotCalls[0].response.checksum, ui.initial.checksum);
  assert.equal(mcp.toolCalls.filter((call) => call.name === "restore_game").length, 2);
  if (ui.pageLedger) {
    assert.equal(ui.pageLedger.counts.uiCommands, ui.gameCommands);
    assert.equal(ui.pageLedger.counts.committedActions, matchedSteps);
    assert.equal(ui.pageLedger.counts.webmcpCalls, 0);
  } else {
    assert.match(ui.pageLedgerText, new RegExp(`UI commands\\s+${ui.gameCommands}(?:\\s|$)`));
    assert.match(ui.pageLedgerText, new RegExp(`Committed actions\\s+${matchedSteps}(?:\\s|$)`));
  }
  if (mcp.pageLedger) {
    assert.equal(mcp.pageLedger.counts.uiCommands, 0);
    assert.equal(mcp.pageLedger.counts.webmcpCalls, mcp.toolCalls.length);
    assert.equal(mcp.pageLedger.counts.committedActions, matchedSteps);
  } else {
    assert.match(mcp.pageLedgerText, new RegExp(`WebMCP calls\\s+${mcp.toolCalls.length}(?:\\s|$)`));
  }
  return {
    game: ui.game, sourceCommit: ui.sourceCommit, seed: ui.seed,
    successParity: true, matchedSteps, replaySteps: mcp.runs[2].result.appliedSteps,
    uiCommands: ui.gameCommands, webmcpMutations: mutatingCalls,
    webmcpReads: mcp.toolCalls.length - mutatingCalls, webmcpTotal: mcp.toolCalls.length,
    gameBearingBrowserEnvelopes: { ui: ui.envelopeCount, webmcp: mcp.actionEnvelopes },
    observations: { uiStateInspectorReads: ui.inspectorReads, uiErrorPanelReads: ui.errorPanelReads ?? 0, uiReadinessWaits: ui.controlWaits },
    agentTokenUsage: null, editTestIterationSavings: null, codeSavings: null,
    outcomes,
  };
}

async function assemble(artifactDirectory) {
  const output = resolve("public/demo/comparison");
  await mkdir(output, { recursive: true });
  const games = [];
  for (const game of ["rts", "tideglass"]) {
    const names = [`${game}-ui-off.json`, `${game}-webmcp.json`];
    const receipts = await Promise.all(names.map(async (name) => JSON.parse(await readFile(resolve(artifactDirectory, name), "utf8"))));
    games.push({ ...verifyPair(...receipts), rawReceipts: names });
    for (const name of names) {
      if (resolve(artifactDirectory, name) !== resolve(output, name)) await copyFile(resolve(artifactDirectory, name), resolve(output, name));
    }
  }
  const failureName = "rts-ui-preflight-failure.json";
  if (resolve(artifactDirectory, failureName) !== resolve(output, failureName)) await copyFile(resolve(artifactDirectory, failureName), resolve(output, failureName));
  const report = {
    format: "huginn/comparison-pilot-v1", collectedOn: "2026-09-02", collectionTimeZone: "America/Los_Angeles", caller: "Preplanned replay through Codex in-app browser",
    scope: "One completed paired replay probe per game. The same UI, rules and inspector remain in both modes; only WebMCP registration changes. Not a fresh-agent problem-solving benchmark.",
    games, preflightFailure: failureName,
    limits: ["Page commands are not browser envelopes, assistant turns or model tokens.", "Ordinary browser batching was allowed in both modes.", "Token cost, iteration savings and code savings were not measured.", "No latency, statistical, general balance or fun claim.", "The earlier checkpoint-eviction preflight failure is retained, not counted as a completed trial."],
  };
  await writeFile(resolve(output, "results.json"), JSON.stringify(report, null, 2) + "\n");
  process.stdout.write(JSON.stringify(games.map(({ game, uiCommands, webmcpMutations, webmcpReads, matchedSteps }) => ({ game, uiCommands, webmcpMutations, webmcpReads, matchedSteps })), null, 2) + "\n");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(process.argv[2], "Usage: node tools/comparison-proof.mjs /absolute/artifact-directory");
  await assemble(resolve(process.argv[2]));
}
