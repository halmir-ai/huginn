import { canonicalEqual } from "../huginn/canonical";
import type { HuginnKernel } from "../huginn/kernel";
import type { GameAdapter, GameDescription, LegalAction, RenderContext } from "../huginn/types";
import { registerWebMcpTools, type ToolActivity } from "../huginn/webmcp";

export const TIDEGLASS_VERSION = "0.1.0-baseline";
export const HUGINN_BASE = "63b6c41053ec99b8088f285442a30991d7ee20a8";
export const HORIZON = 8;
export const BATTERY_CAPACITY = 10;
export const STATIONS = ["haven", "relay_isle", "saltmill", "lantern", "breakwater"] as const;
export type Station = (typeof STATIONS)[number];
export const DESTINATIONS = ["saltmill", "lantern", "breakwater"] as const;
export type Destination = (typeof DESTINATIONS)[number];
export const STATION_NAMES: Record<Station, string> = {
  haven: "Haven", relay_isle: "Relay Isle", saltmill: "Saltmill", lantern: "Lantern", breakwater: "Breakwater",
};
export const LANES: readonly (readonly [Station, Station])[] = [
  ["haven", "relay_isle"], ["relay_isle", "saltmill"], ["relay_isle", "lantern"],
  ["relay_isle", "breakwater"], ["saltmill", "lantern"], ["lantern", "breakwater"],
];

export interface TideglassState {
  format: "tideglass/state-v1";
  version: typeof TIDEGLASS_VERSION;
  seed: number;
  rng: number;
  watch: number;
  battery: number;
  station: Station;
  relay: boolean;
  delivered: Record<Destination, boolean>;
}
export type TideglassAction =
  | { type: "sail"; to: Station }
  | { type: "deploy_relay" }
  | { type: "deliver" }
  | { type: "recharge" }
  | { type: "wait" };
export interface TideglassEvent { type: "watch_resolved"; message: string; watch: number; batteryDelta: number }
export interface TideglassMetrics {
  [key: string]: number | string | boolean;
  watch: number;
  watches_left: number;
  delivered: number;
  battery: number;
  relay_online: boolean;
  sea: "calm" | "rough";
  station: Station;
  target_met: boolean;
  storm_closed: boolean;
}

const emptyAction = (type: TideglassAction["type"], description: string) => ({
  type, description,
  inputSchema: { type: "object", properties: { type: { const: type } }, required: ["type"], additionalProperties: false },
});

export const tideglassDescription: GameDescription = {
  id: "huginn-tideglass-relay",
  title: "Tideglass Relay",
  version: TIDEGLASS_VERSION,
  summary: "Carry three messages across five coastal stations before the eighth watch closes the sea lanes.",
  rules: [
    "Start at Haven with 10 battery and messages for Saltmill, Lantern, and Breakwater. Every action consumes one watch; no actions are legal after watch 8.",
    "Sail only along charted lanes. Sailing costs 2 battery in calm seas or 3 in rough seas. The current forecast applies to the next action.",
    "At Relay Isle, deploy one relay for 1 battery and 1 watch. Its navigation signal reduces every later sailing action to 1 battery, in either forecast.",
    "Deliver the undelivered message at your current destination for 1 watch and no battery. Messages are carried from the start.",
    "Recharge at Haven or Relay Isle: gain up to 3 battery, capped at 10, for 1 watch. Wait costs 1 watch and no battery.",
    "Every action advances the xorshift32 RNG once. The sea is rough when the current RNG value is divisible by 4; otherwise calm. Seed 0 uses a nonzero fallback. RNG is saved in snapshots.",
    "All three deliveries win the courier objective. The predeclared design target also requires at least 2 battery by watch 8. Compare fixed plans at the same ending watch, including waits after delivery.",
    "Reference: Signal route, seed 12. Contrast: Unassisted route, seed 12; replace relay deployment with waiting. Both use the same sailing path and eight actions. This is a designed baseline, not a discovered defect or evidence of general balance.",
  ],
  victoryConditions: ["Deliver all three messages by watch 8."],
  failureConditions: ["Reach watch 8 with fewer than three messages delivered."],
  metrics: [
    { key: "watch", label: "Watch", description: "Completed actions, 0–8. Compare plans at equal watch." },
    { key: "watches_left", label: "Watches left", description: "8 minus completed actions." },
    { key: "delivered", label: "Delivered", description: "Distinct messages delivered, 0–3." },
    { key: "battery", label: "Battery", description: "Remaining charge, 0–10. The design target requires at least 2 after all deliveries.", badWhen: "Below 2 at the comparison horizon." },
    { key: "relay_online", label: "Relay online", description: "Whether the navigation relay was deployed at Relay Isle." },
    { key: "sea", label: "Sea forecast", description: "Forecast for the next action, derived from saved RNG; affects unassisted sailing cost." },
    { key: "station", label: "Courier station", description: "Current station identifier." },
    { key: "target_met", label: "Design target met", description: "Three messages delivered, watch at most 8, battery at least 2. Does not measure fun or balance." },
    { key: "storm_closed", label: "Storm closed", description: "True at watch 8, when no further action is legal." },
  ],
  actions: [
    { type: "sail", description: "Sail to an adjacent station if current charge covers the forecast cost.", inputSchema: {
      type: "object", properties: { type: { const: "sail" }, to: { enum: [...STATIONS] } },
      required: ["type", "to"], additionalProperties: false,
    } },
    emptyAction("deploy_relay", "At Relay Isle, spend 1 battery to reduce future sailing costs."),
    emptyAction("deliver", "Deliver the current station's message once."),
    emptyAction("recharge", "At a charging station, recover up to 3 battery."),
    emptyAction("wait", "Spend a watch without spending battery."),
  ],
};

export const signalRoute: TideglassAction[] = [
  { type: "sail", to: "relay_isle" }, { type: "deploy_relay" },
  { type: "sail", to: "saltmill" }, { type: "deliver" },
  { type: "sail", to: "lantern" }, { type: "deliver" },
  { type: "sail", to: "breakwater" }, { type: "deliver" },
];
export const unassistedRoute: TideglassAction[] = signalRoute.map((action) =>
  action.type === "deploy_relay" ? { type: "wait" } : { ...action },
);

function nextRandom(value: number): number {
  let next = value | 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  return next >>> 0;
}
export const seaForecast = (state: TideglassState): "calm" | "rough" => state.rng % 4 === 0 ? "rough" : "calm";
export const sailingCost = (state: TideglassState): number => state.relay ? 1 : seaForecast(state) === "rough" ? 3 : 2;

function initialState(seed: number): TideglassState {
  integer(seed, "seed", 0, 0x7fffffff);
  return { format: "tideglass/state-v1", version: TIDEGLASS_VERSION, seed, rng: seed || 0x9e3779b9,
    watch: 0, battery: BATTERY_CAPACITY, station: "haven", relay: false,
    delivered: { saltmill: false, lantern: false, breakwater: false } };
}

function legalActions(state: TideglassState): LegalAction<TideglassAction>[] {
  if (state.watch >= HORIZON) return [];
  const actions: LegalAction<TideglassAction>[] = [];
  const cost = sailingCost(state);
  for (const [a, b] of LANES) {
    const to = a === state.station ? b : b === state.station ? a : null;
    if (to && state.battery >= cost) actions.push({ action: { type: "sail", to },
      label: `Sail to ${STATION_NAMES[to]}`, reason: `1 watch · ${cost} battery · ${state.relay ? "relay guided" : seaForecast(state) + " sea"}` });
  }
  if (state.station === "relay_isle" && !state.relay && state.battery >= 1) {
    actions.push({ action: { type: "deploy_relay" }, label: "Deploy relay", reason: "1 watch · 1 battery · future sailing costs 1" });
  }
  if (DESTINATIONS.includes(state.station as Destination) && !state.delivered[state.station as Destination]) {
    actions.push({ action: { type: "deliver" }, label: `Deliver to ${STATION_NAMES[state.station]}`, reason: "1 watch · no battery · message aboard" });
  }
  if ((state.station === "haven" || state.station === "relay_isle") && state.battery < BATTERY_CAPACITY) {
    actions.push({ action: { type: "recharge" }, label: "Recharge battery", reason: `1 watch · +${Math.min(3, BATTERY_CAPACITY - state.battery)} battery` });
  }
  actions.push({ action: { type: "wait" }, label: "Wait one watch", reason: "1 watch · no battery · forecast advances" });
  return actions;
}

function metrics(state: TideglassState): TideglassMetrics {
  const delivered = Object.values(state.delivered).filter(Boolean).length;
  return { watch: state.watch, watches_left: HORIZON - state.watch, delivered, battery: state.battery,
    relay_online: state.relay, sea: seaForecast(state), station: state.station,
    target_met: delivered === 3 && state.battery >= 2 && state.watch <= HORIZON, storm_closed: state.watch === HORIZON };
}

function integer(value: unknown, name: string, min: number, max: number): number {
  if (!Number.isSafeInteger(value) || (value as number) < min || (value as number) > max) throw new TypeError(`Invalid Tideglass ${name}.`);
  return value as number;
}
function record(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
    Object.keys(value).length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) {
    throw new TypeError("Invalid Tideglass state fields.");
  }
  return value as Record<string, unknown>;
}
function deserialize(value: unknown): TideglassState {
  const data = record(value, ["format", "version", "seed", "rng", "watch", "battery", "station", "relay", "delivered"]);
  if (data.format !== "tideglass/state-v1" || data.version !== TIDEGLASS_VERSION) throw new TypeError("Incompatible Tideglass version.");
  const seed = integer(data.seed, "seed", 0, 0x7fffffff);
  const rng = integer(data.rng, "rng", 1, 0xffffffff);
  const watch = integer(data.watch, "watch", 0, HORIZON);
  const battery = integer(data.battery, "battery", 0, BATTERY_CAPACITY);
  if (!STATIONS.includes(data.station as Station) || typeof data.relay !== "boolean") throw new TypeError("Invalid Tideglass station or relay.");
  const delivered = record(data.delivered, [...DESTINATIONS]);
  if (Object.values(delivered).some((v) => typeof v !== "boolean")) throw new TypeError("Invalid Tideglass deliveries.");
  let expectedRng = initialState(seed).rng;
  for (let i = 0; i < watch; i++) expectedRng = nextRandom(expectedRng);
  if (rng !== expectedRng) throw new TypeError("Tideglass RNG does not match seed and watch.");
  if (Object.values(delivered).filter(Boolean).length > watch || (data.relay && watch < 2)) throw new TypeError("Impossible Tideglass progress.");
  const state: TideglassState = { format: "tideglass/state-v1", version: TIDEGLASS_VERSION, seed, rng, watch, battery,
    station: data.station as Station, relay: data.relay, delivered: { ...delivered } as Record<Destination, boolean> };
  if (watch === 0 && !canonicalEqual(state, initialState(seed))) throw new TypeError("Invalid Tideglass initial state.");
  return state;
}

export function createTideglassAdapter(
  render: (state: TideglassState, context: RenderContext<TideglassAction, TideglassEvent>) => void | Promise<void> = () => {},
): GameAdapter<TideglassState, TideglassAction, TideglassEvent, TideglassMetrics> {
  return {
    description: tideglassDescription, initialState, listLegalActions: legalActions, metrics,
    serialize: (state) => structuredClone(state), deserialize, render,
    reduce(state, action) {
      if (!legalActions(state).some((candidate) => canonicalEqual(candidate.action, action))) throw new TypeError("Illegal Tideglass action.");
      const next = structuredClone(state);
      let message: string;
      switch (action.type) {
        case "sail":
          next.battery -= sailingCost(state); next.station = action.to;
          message = `Sailed to ${STATION_NAMES[action.to]} for ${sailingCost(state)} battery.`; break;
        case "deploy_relay": next.battery -= 1; next.relay = true; message = "Relay online. All sailing now costs 1 battery."; break;
        case "deliver": next.delivered[state.station as Destination] = true; message = `Message delivered to ${STATION_NAMES[state.station]}.`; break;
        case "recharge": next.battery = Math.min(BATTERY_CAPACITY, next.battery + 3); message = `Recovered ${next.battery - state.battery} battery.`; break;
        case "wait": message = "Held position while the sea forecast changed."; break;
      }
      next.watch += 1; next.rng = nextRandom(state.rng);
      return { state: next, events: [{ type: "watch_resolved", message, watch: next.watch, batteryDelta: next.battery - state.battery }] };
    },
  };
}

// Off mode returns before touching the browser registration API. Both modes
// receive exactly the same adapter, kernel, and ordinary human controls.
export async function connectTideglassWebMcp(
  kernel: HuginnKernel<TideglassState, TideglassAction, TideglassEvent, TideglassMetrics>,
  search: string,
  onActivity?: (activity: ToolActivity) => void,
) {
  if (new URLSearchParams(search).get("webmcp") === "off") {
    return { supported: false, disabled: true, toolNames: [] as string[], dispose: () => {} };
  }
  return { ...await registerWebMcpTools(kernel, tideglassDescription.actions.map((a) => a.inputSchema), onActivity), disabled: false };
}
