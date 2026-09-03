import { describe, expect, it } from "vitest";
import { InteractionLedger, webMcpEnabled } from "../src/demo/interaction-ledger";

describe("honest page-level interaction measurements", () => {
  it("disables registration only for the explicit comparison mode", () => {
    expect(webMcpEnabled("")).toBe(true);
    expect(webMcpEnabled("?webmcp=off")).toBe(false);
    expect(webMcpEnabled("?webmcp=on")).toBe(true);
  });

  it("counts page commands and committed actions separately, without inventing tokens", () => {
    const ledger = new InteractionLedger("rts-lab", false);
    ledger.start("UI", "action");
    ledger.complete("UI", "action", { status: "completed", appliedSteps: 1 });
    ledger.start("WebMCP", "apply_action_sequence", { actions: [{ type: "advance_cycle" }] });
    ledger.complete("WebMCP", "apply_action_sequence", { status: "completed", appliedSteps: 6 });
    expect(ledger.report().counts).toMatchObject({ uiCommands: 1, webmcpCalls: 1, committedActions: 7, rejectedCommands: 0 });
    expect(ledger.report().agentTokenUsage).toBeNull();
    expect(ledger.report().agentToolCallEnvelopes).toBeNull();
    expect(ledger.report().webmcpJsonBytes.request).toBeGreaterThan(0);
  });

  it("does not count cached retries as fresh actions, and retains partial failure", () => {
    const ledger = new InteractionLedger("rts-lab", true);
    ledger.start("WebMCP", "apply_action_sequence", {});
    ledger.complete("WebMCP", "apply_action_sequence", { status: "completed", appliedSteps: 8, cached: true });
    ledger.start("UI", "action");
    ledger.complete("UI", "action", { status: "error", appliedSteps: 1 });
    ledger.start("WebMCP", "restore_game", {});
    ledger.fail("WebMCP", "restore_game");
    expect(ledger.report().counts).toMatchObject({ committedActions: 1, cachedResponses: 1, rejectedCommands: 2 });
  });
});
