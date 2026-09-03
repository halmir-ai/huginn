type Source = "UI" | "WebMCP";
type Event = { source: Source; name: string; phase: "started" | "completed" | "failed"; actions?: number; cached?: boolean };

export function webMcpEnabled(search: string): boolean {
  return new URLSearchParams(search).get("webmcp") !== "off";
}

/** Page-command telemetry, deliberately not a model-token or browser-call meter. */
export class InteractionLedger {
  private counts = { uiCommands: 0, webmcpCalls: 0, committedActions: 0, rejectedCommands: 0, cachedResponses: 0 };
  private bytes = { request: 0, response: 0 };
  private events: Event[] = [];
  private omittedEvents = 0;

  constructor(private game: string, private enabled: boolean) {}

  private record(event: Event): void {
    this.events.push(event);
    if (this.events.length > 500) { this.events.shift(); this.omittedEvents += 1; }
  }

  private jsonBytes(value: unknown): number {
    return new TextEncoder().encode(JSON.stringify(value) ?? "").byteLength;
  }

  start(source: Source, name: string, input?: unknown): void {
    if (source === "UI") this.counts.uiCommands += 1;
    else {
      this.counts.webmcpCalls += 1;
      this.bytes.request += this.jsonBytes(input);
    }
    this.record({ source, name, phase: "started" });
  }

  complete(source: Source, name: string, result: unknown): void {
    const value = result && typeof result === "object" ? result as Record<string, unknown> : {};
    const cached = value.cached === true;
    const actions = !cached && typeof value.appliedSteps === "number" ? value.appliedSteps : 0;
    this.counts.committedActions += actions;
    if (cached) this.counts.cachedResponses += 1;
    if (value.status === "error") this.counts.rejectedCommands += 1;
    if (source === "WebMCP") this.bytes.response += this.jsonBytes(result);
    this.record({ source, name, phase: "completed", actions, cached });
  }

  fail(source: Source, name: string): void {
    this.counts.rejectedCommands += 1;
    this.record({ source, name, phase: "failed" });
  }

  report() {
    return structuredClone({
      format: "huginn/page-interactions-v1",
      game: this.game,
      webmcpEnabled: this.enabled,
      scope: "Commands received by this page since load. Excludes browser discovery, observations, assistant reasoning, code edits, and transport envelopes. Not a token-cost benchmark.",
      counts: this.counts,
      webmcpJsonBytes: this.bytes,
      agentTokenUsage: null,
      agentToolCallEnvelopes: null,
      editTestIterations: null,
      events: this.events,
      omittedEvents: this.omittedEvents,
    });
  }
}
