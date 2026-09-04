import { describe, expect, it, vi } from "vitest";
import coreSource from "../src/huginn/index.ts?raw";
import { HuginnKernel, canonicalJson, createRegressionScenario } from "../src/huginn";
import { GameRuntime } from "../src/game-runtime";
import { attachHuginnDebugger } from "../src/debugger";
import { connectHuginnWebMcp } from "../src/webmcp";
import { createRiverlandsAdapter } from "../src/demo/riverlands";

describe("public library boundaries", () => {
  it("exports four distinct source entry points", () => {
    expect(HuginnKernel).toBeTypeOf("function");
    expect(canonicalJson).toBeTypeOf("function");
    expect(createRegressionScenario).toBeTypeOf("function");
    expect(connectHuginnWebMcp).toBeTypeOf("function");
    expect(GameRuntime).toBeTypeOf("function");
    expect(attachHuginnDebugger).toBeTypeOf("function");
  });

  it("keeps the core barrel transport and debugger independent", () => {
    expect(coreSource).not.toMatch(/from\s+["'][^"']*(?:webmcp|debugger)[^"']*["']/i);
    expect(coreSource).not.toMatch(/\bdocument\.modelContext\b|\bregisterTool\s*\(/);
  });

  it("offers a one-call adapter connection with an unsupported-browser fallback", async () => {
    vi.stubGlobal("document", undefined);
    try {
      const connection = await connectHuginnWebMcp(createRiverlandsAdapter(), {
        initialSeed: 42,
        schedule: async () => {},
      });
      expect(connection.supported).toBe(false);
      expect(await connection.kernel.describeGame()).toMatchObject({ current: { seed: 42 } });
      connection.dispose();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
