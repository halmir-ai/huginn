import type { GameDefinition, LegalAction } from "../../play/core";

export const TABLE = { width: 560, height: 780, ballRadius: 9, dt: 1 / 120, gravity: 510 } as const;
export const FLIPPER = { leftX: 154, rightX: 374, y: 655, length: 95, radius: 10, rest: 0.4, raised: -0.48, speed: 14 } as const;
export const BALL_SAVER_FRAMES = 960;
export interface Segment { x1: number; y1: number; x2: number; y2: number; radius: number; kind: "rail" | "sling" | "gate"; id?: number }
export const RAILS: readonly Segment[] = [
  { x1: 44, y1: 495, x2: 44, y2: 119, radius: 6, kind: "rail" },
  { x1: 44, y1: 119, x2: 67, y2: 73, radius: 6, kind: "rail" },
  { x1: 67, y1: 73, x2: 116, y2: 40, radius: 6, kind: "rail" },
  { x1: 116, y1: 40, x2: 472, y2: 40, radius: 6, kind: "rail" },
  { x1: 472, y1: 40, x2: 509, y2: 57, radius: 6, kind: "rail" },
  { x1: 509, y1: 57, x2: 534, y2: 97, radius: 6, kind: "rail" },
  { x1: 534, y1: 97, x2: 534, y2: 735, radius: 6, kind: "rail" },
  { x1: 485, y1: 181, x2: 485, y2: 735, radius: 5, kind: "rail" },
  { x1: 485, y1: 735, x2: 534, y2: 735, radius: 5, kind: "rail" },
  { x1: 485, y1: 181, x2: 531, y2: 148, radius: 2, kind: "gate" },
  // Outer outlanes genuinely lead to the drain. The inner guides feed the bats.
  { x1: 44, y1: 495, x2: 54, y2: 563, radius: 6, kind: "rail" },
  { x1: 54, y1: 563, x2: 103, y2: 681, radius: 6, kind: "rail" },
  { x1: 103, y1: 681, x2: 116, y2: 741, radius: 6, kind: "rail" },
  { x1: 475, y1: 495, x2: 470, y2: 563, radius: 5, kind: "rail" },
  { x1: 470, y1: 563, x2: 425, y2: 681, radius: 6, kind: "rail" },
  { x1: 425, y1: 681, x2: 412, y2: 741, radius: 6, kind: "rail" },
  { x1: 90, y1: 503, x2: 95, y2: 565, radius: 5, kind: "rail" },
  { x1: 95, y1: 565, x2: 132, y2: 632, radius: 5, kind: "rail" },
  { x1: 132, y1: 632, x2: 154, y2: 655, radius: 5, kind: "rail" },
  { x1: 438, y1: 503, x2: 433, y2: 565, radius: 5, kind: "rail" },
  { x1: 433, y1: 565, x2: 396, y2: 632, radius: 5, kind: "rail" },
  { x1: 396, y1: 632, x2: 374, y2: 655, radius: 5, kind: "rail" },
  // Triangular slingshots: just the inward-facing rubber fires a kick.
  { x1: 125, y1: 505, x2: 204, y2: 602, radius: 6, kind: "sling", id: 0 },
  { x1: 204, y1: 602, x2: 139, y2: 579, radius: 5, kind: "rail" },
  { x1: 139, y1: 579, x2: 125, y2: 505, radius: 5, kind: "rail" },
  { x1: 403, y1: 505, x2: 324, y2: 602, radius: 6, kind: "sling", id: 1 },
  { x1: 324, y1: 602, x2: 389, y2: 579, radius: 5, kind: "rail" },
  { x1: 389, y1: 579, x2: 403, y2: 505, radius: 5, kind: "rail" },
  // Upper shoulder rails keep returning orbit shots aimed at the playfield.
  { x1: 74, y1: 190, x2: 92, y2: 146, radius: 5, kind: "rail" },
  { x1: 92, y1: 146, x2: 136, y2: 117, radius: 5, kind: "rail" },
  { x1: 454, y1: 190, x2: 436, y2: 146, radius: 5, kind: "rail" },
  { x1: 436, y1: 146, x2: 392, y2: 117, radius: 5, kind: "rail" },
];
export const BUMPERS = [
  { x: 194, y: 231, radius: 29, color: "#58e5eb", name: "NOVA" },
  { x: 334, y: 231, radius: 29, color: "#ed78bd", name: "PULSAR" },
  { x: 264, y: 337, radius: 29, color: "#58e5eb", name: "QUASAR" },
] as const;

export interface Ball { x: number; y: number; vx: number; vy: number }
export interface StarfallState {
  seed: number; tick: number; phase: "ready" | "playing" | "over";
  ball: Ball; ballsRemaining: number; score: number; multiplier: number;
  ballSaver: { available: boolean; framesRemaining: number; pendingNewBall: boolean };
  bumperLights: [boolean, boolean, boolean]; bumperCooldowns: [number, number, number]; slingCooldowns: [number, number];
  flippers: { leftAngle: number; rightAngle: number; leftHeld: boolean; rightHeld: boolean };
  stats: { launches: number; drains: number; ballSaves: number; bumperHits: number; flipperHits: number; slingHits: number; wallHits: number; maxSpeed: number };
  lastEvent: string; lastScoreTick: number; lastBankTick: number;
}
export type StarfallAction = { type: "launch" } | { type: "advance"; frames: 4 | 15 | 30; left: boolean; right: boolean };
export type StarfallEvent = { type: "launch" | "bumper" | "sling" | "flipper" | "multiplier" | "save" | "drain" | "gameover"; tick: number; x: number; y: number; value: number };

const restingBall = (): Ball => ({ x: 510, y: 712, vx: 0, vy: 0 });
const closed = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({ type: "object", properties, required, additionalProperties: false });
export const STARFALL_ACTION_SCHEMA = {
  oneOf: [closed({ type: { const: "launch" } }), closed({ type: { const: "advance" }, frames: { type: "integer", enum: [4, 15, 30] }, left: { type: "boolean" }, right: { type: "boolean" } })],
};

function clone(s: StarfallState): StarfallState {
  return { ...s, ball: { ...s.ball }, ballSaver: { ...s.ballSaver }, bumperLights: [...s.bumperLights], bumperCooldowns: [...s.bumperCooldowns], slingCooldowns: [...s.slingCooldowns], flippers: { ...s.flippers }, stats: { ...s.stats } };
}
function initialState(seed: number): StarfallState {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error("Seed must be an unsigned 32-bit integer.");
  return { seed, tick: 0, phase: "ready", ball: restingBall(), ballsRemaining: 3, score: 0, multiplier: 1, ballSaver: { available: false, framesRemaining: 0, pendingNewBall: true }, bumperLights: [false, false, false], bumperCooldowns: [0, 0, 0], slingCooldowns: [0, 0], flippers: { leftAngle: FLIPPER.rest, rightAngle: Math.PI - FLIPPER.rest, leftHeld: false, rightHeld: false }, stats: { launches: 0, drains: 0, ballSaves: 0, bumperHits: 0, flipperHits: 0, slingHits: 0, wallHits: 0, maxSpeed: 0 }, lastEvent: "Launch your first ball", lastScoreTick: -120, lastBankTick: -360 };
}
function legalActions(s: StarfallState): LegalAction<StarfallAction>[] {
  if (s.phase === "over") return [];
  if (s.phase === "ready") {
    const saved = !s.ballSaver.pendingNewBall;
    return [{ action: { type: "launch" }, label: saved ? "Relaunch saved ball" : "Launch ball", reason: saved ? "The one-use saver returned this same ball to the shooter lane." : "A fresh ball is resting in the shooter lane." }];
  }
  const result: LegalAction<StarfallAction>[] = [];
  for (const frames of [4, 15, 30] as const) for (const left of [false, true]) for (const right of [false, true]) {
    result.push({ action: { type: "advance", frames, left, right }, label: `${left ? "Left" : ""}${left && right ? " + " : ""}${right ? "Right" : ""}${!left && !right ? "Release flippers" : " flipper"} · ${frames} frames`, reason: `Simulate ${(frames / 120).toFixed(3)} seconds with these held inputs.` });
  }
  return result;
}
function assertAction(s: StarfallState, action: StarfallAction): void {
  const a = action as unknown as Record<string, unknown>;
  if (!a || typeof a !== "object" || Array.isArray(a)) throw new Error("Invalid pinball action.");
  const keys = Object.keys(a).sort().join(",");
  if (a.type === "launch" && keys === "type" && s.phase === "ready") return;
  if (a.type === "advance" && keys === "frames,left,right,type" && s.phase === "playing" && [4, 15, 30].includes(a.frames as number) && typeof a.left === "boolean" && typeof a.right === "boolean") return;
  throw new Error(`Illegal pinball action in ${s.phase} phase.`);
}

/** Position correction happens for overlap; reflection happens only on approach. */
export function collideCircle(ball: Ball, x: number, y: number, radius: number, restitution = 0.84, kick = 0): boolean {
  const dx = ball.x - x, dy = ball.y - y, distance = Math.hypot(dx, dy), limit = TABLE.ballRadius + radius;
  if (distance >= limit) return false;
  const nx = distance > 1e-9 ? dx / distance : 0, ny = distance > 1e-9 ? dy / distance : -1;
  ball.x = x + nx * (limit + 0.015); ball.y = y + ny * (limit + 0.015);
  const speed = ball.vx * nx + ball.vy * ny;
  if (speed >= 0) return false;
  ball.vx -= ((1 + restitution) * speed - kick) * nx;
  ball.vy -= ((1 + restitution) * speed - kick) * ny;
  return true;
}

export function collideSegment(ball: Ball, segment: Segment, restitution = 0.7, kick = 0, angularVelocity = 0): boolean {
  const dx = segment.x2 - segment.x1, dy = segment.y2 - segment.y1;
  const projection = Math.max(0, Math.min(1, ((ball.x - segment.x1) * dx + (ball.y - segment.y1) * dy) / (dx * dx + dy * dy)));
  const px = segment.x1 + projection * dx, py = segment.y1 + projection * dy;
  const bx = ball.x - px, by = ball.y - py, distance = Math.hypot(bx, by), limit = TABLE.ballRadius + segment.radius;
  if (distance >= limit) return false;
  // The hinged shooter gate opens from the lane side, not for every upward
  // shot. Testing vertical velocity alone lets diagonal orbit shots sneak in.
  if (segment.kind === "gate" && (ball.x - segment.x1) * dy - (ball.y - segment.y1) * dx < 0) return false;
  const nx = distance > 1e-9 ? bx / distance : dy / Math.hypot(dx, dy), ny = distance > 1e-9 ? by / distance : -dx / Math.hypot(dx, dy);
  ball.x = px + nx * (limit + 0.015); ball.y = py + ny * (limit + 0.015);
  const surfaceX = -angularVelocity * (py - segment.y1), surfaceY = angularVelocity * (px - segment.x1);
  const speed = (ball.vx - surfaceX) * nx + (ball.vy - surfaceY) * ny;
  if (speed >= 0) return false;
  ball.vx -= ((1 + restitution) * speed - kick) * nx;
  ball.vy -= ((1 + restitution) * speed - kick) * ny;
  // Tiny contact friction prevents immortal skimming orbits on a flat bat.
  const tangent = (ball.vx - surfaceX) * -ny + (ball.vy - surfaceY) * nx;
  ball.vx += tangent * ny * 0.012; ball.vy -= tangent * nx * 0.012;
  return true;
}

export function flipperSegment(side: "left" | "right", angle: number): Segment {
  const x = side === "left" ? FLIPPER.leftX : FLIPPER.rightX;
  return { x1: x, y1: FLIPPER.y, x2: x + Math.cos(angle) * FLIPPER.length, y2: FLIPPER.y + Math.sin(angle) * FLIPPER.length, radius: FLIPPER.radius, kind: "rail" };
}
const approach = (value: number, target: number, step: number) => value + Math.max(-step, Math.min(step, target - value));
function physicsFrame(s: StarfallState, events: StarfallEvent[]): void {
  s.tick++;
  if (s.ballSaver.available) {
    s.ballSaver.framesRemaining = Math.max(0, s.ballSaver.framesRemaining - 1);
    if (s.ballSaver.framesRemaining === 0) s.ballSaver.available = false;
  }
  s.bumperCooldowns = s.bumperCooldowns.map(v => Math.max(0, v - 1)) as StarfallState["bumperCooldowns"];
  s.slingCooldowns = s.slingCooldowns.map(v => Math.max(0, v - 1)) as StarfallState["slingCooldowns"];
  const emit = (type: StarfallEvent["type"], value = 0) => events.push({ type, tick: s.tick, x: s.ball.x, y: s.ball.y, value });
  // Two 1/240 s collision steps keep even a fast flipper shot below one radius.
  for (let substep = 0; substep < 2 && s.phase === "playing"; substep++) {
    const dt = TABLE.dt / 2, f = s.flippers;
    const leftPrevious = f.leftAngle, rightPrevious = f.rightAngle;
    f.leftAngle = approach(f.leftAngle, f.leftHeld ? FLIPPER.raised : FLIPPER.rest, FLIPPER.speed * dt);
    f.rightAngle = approach(f.rightAngle, Math.PI - (f.rightHeld ? FLIPPER.raised : FLIPPER.rest), FLIPPER.speed * dt);
    const b = s.ball;
    b.vy += TABLE.gravity * dt; b.vx *= 0.99996; b.vy *= 0.99996;
    b.x += b.vx * dt; b.y += b.vy * dt;
    for (const rail of RAILS) {
      const sling = rail.kind === "sling", ready = sling && s.slingCooldowns[rail.id!] === 0;
      if (collideSegment(b, rail, sling ? 0.86 : 0.74, ready ? 205 : 0)) {
        if (ready) { s.slingCooldowns[rail.id!] = 18; s.stats.slingHits++; s.score += 25 * s.multiplier; s.lastScoreTick = s.tick; s.lastEvent = "Slingshot"; emit("sling", 25 * s.multiplier); }
        else s.stats.wallHits++;
      }
    }
    for (let i = 0; i < BUMPERS.length; i++) {
      const bumper = BUMPERS[i], ready = s.bumperCooldowns[i] === 0;
      if (collideCircle(b, bumper.x, bumper.y, bumper.radius, 0.92, ready ? 270 : 0) && ready) {
        const points = 100 * s.multiplier;
        s.score += points; s.stats.bumperHits++; s.bumperLights[i] = true; s.bumperCooldowns[i] = 16;
        s.lastScoreTick = s.tick; s.lastEvent = `${bumper.name} +${points}`; emit("bumper", points);
        if (s.bumperLights.every(Boolean)) {
          s.multiplier = Math.min(5, s.multiplier + 1); s.bumperLights = [false, false, false];
          s.score += 500 * s.multiplier; s.lastBankTick = s.tick; s.lastEvent = `${s.multiplier}× constellation bonus`; emit("multiplier", s.multiplier);
        }
      }
    }
    for (const side of ["left", "right"] as const) {
      const beforeX = b.vx, beforeY = b.vy;
      const angle = side === "left" ? f.leftAngle : f.rightAngle, previous = side === "left" ? leftPrevious : rightPrevious;
      const contact = collideSegment(b, flipperSegment(side, angle), 0.78, 0, (angle - previous) / dt);
      // Resting cradle corrections are physical contacts, not hundreds of
      // audible/reportable hits. Count only a meaningful collision impulse.
      if (contact && Math.hypot(b.vx - beforeX, b.vy - beforeY) >= 40) { s.stats.flipperHits++; emit("flipper"); }
    }
    const speed = Math.hypot(b.vx, b.vy), limit = 1600;
    if (speed > limit) { b.vx *= limit / speed; b.vy *= limit / speed; }
    s.stats.maxSpeed = Math.max(s.stats.maxSpeed, Math.min(speed, limit));
    if (b.y > 780) {
      const saved = s.ballSaver.available;
      emit(saved ? "save" : "drain", saved ? s.ballSaver.framesRemaining : 0);
      s.flippers = { leftAngle: FLIPPER.rest, rightAngle: Math.PI - FLIPPER.rest, leftHeld: false, rightHeld: false };
      s.ballSaver.available = false; s.ballSaver.framesRemaining = 0;
      if (saved) {
        s.stats.ballSaves++; s.phase = "ready"; s.ballSaver.pendingNewBall = false;
        s.lastEvent = "Ball saved · relaunch the same ball"; s.ball = restingBall();
      } else {
        s.stats.drains++; s.ballsRemaining--; s.phase = s.ballsRemaining === 0 ? "over" : "ready";
        s.ballSaver.pendingNewBall = s.phase === "ready";
        s.lastEvent = s.phase === "over" ? "Three balls. One more game?" : `Ball drained · ${s.ballsRemaining} ${s.ballsRemaining === 1 ? "ball" : "balls"} left`;
        if (s.phase === "over") emit("gameover", s.score);
        else s.ball = restingBall();
      }
    }
  }
}
function reduce(state: StarfallState, action: StarfallAction): { state: StarfallState; events: StarfallEvent[] } {
  assertAction(state, action);
  const s = clone(state), events: StarfallEvent[] = [];
  if (action.type === "launch") {
    s.phase = "playing"; s.stats.launches++;
    if (s.ballSaver.pendingNewBall) {
      s.ballSaver = { available: true, framesRemaining: BALL_SAVER_FRAMES, pendingNewBall: false };
    }
    // Small, seeded spring variation; never moves the ball off the plunger.
    const spring = ((Math.imul(s.seed ^ s.stats.launches, 1664525) + 1013904223) >>> 0) % 23;
    s.ball.vy = -1080 - spring; s.ball.vx = 0;
    s.lastEvent = s.ballSaver.available ? "Ball saver active · light all three bumpers" : "Ball saver spent · light all three bumpers";
    events.push({ type: "launch", tick: s.tick, x: s.ball.x, y: s.ball.y, value: s.stats.launches });
  } else {
    s.flippers.leftHeld = action.left; s.flippers.rightHeld = action.right;
    for (let i = 0; i < action.frames && s.phase === "playing"; i++) physicsFrame(s, events);
  }
  return { state: s, events };
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
function deserialize(value: unknown): StarfallState {
  const template = initialState(0);
  function shape(actual: unknown, expected: unknown, path: string): void {
    if (Array.isArray(expected)) {
      if (!Array.isArray(actual) || actual.length !== expected.length) throw new Error(`Invalid ${path}.`);
      expected.forEach((item, i) => shape(actual[i], item, `${path}.${i}`)); return;
    }
    if (isRecord(expected)) {
      if (!isRecord(actual) || Object.keys(actual).sort().join("|") !== Object.keys(expected).sort().join("|")) throw new Error(`Invalid ${path} fields.`);
      for (const key of Object.keys(expected)) shape(actual[key], expected[key], `${path}.${key}`); return;
    }
    if (typeof actual !== typeof expected || (typeof actual === "number" && !Number.isFinite(actual))) throw new Error(`Invalid ${path}.`);
  }
  shape(value, template, "state");
  const s = value as StarfallState;
  const integer = (v: number, min: number, max: number) => Number.isSafeInteger(v) && v >= min && v <= max;
  const f = s.flippers;
  if (!integer(s.seed, 0, 0xffffffff) || !integer(s.tick, 0, Number.MAX_SAFE_INTEGER) || !["ready", "playing", "over"].includes(s.phase)
    || !integer(s.ballsRemaining, 0, 3) || (s.phase === "over") !== (s.ballsRemaining === 0)
    || !integer(s.score, 0, Number.MAX_SAFE_INTEGER) || !integer(s.multiplier, 1, 5)
    || !s.bumperCooldowns.every(v => integer(v, 0, 16)) || !s.slingCooldowns.every(v => integer(v, 0, 18))
    || !Object.entries(s.stats).every(([k, v]) => k === "maxSpeed" ? v >= 0 && v <= 1600 : integer(v, 0, Number.MAX_SAFE_INTEGER))
    || !integer(s.ballSaver.framesRemaining, 0, BALL_SAVER_FRAMES)
    || s.ballSaver.available !== (s.phase === "playing" && s.ballSaver.framesRemaining > 0)
    || (s.ballSaver.pendingNewBall && s.phase !== "ready") || (s.phase !== "playing" && s.ballSaver.framesRemaining !== 0)
    || s.stats.ballSaves > 3 || s.stats.drains !== 3 - s.ballsRemaining
    || s.stats.launches !== s.stats.drains + s.stats.ballSaves + (s.phase === "playing" ? 1 : 0)
    || s.stats.bumperHits < s.bumperLights.filter(Boolean).length
    || f.leftAngle < FLIPPER.raised - 1e-9 || f.leftAngle > FLIPPER.rest + 1e-9 || f.rightAngle < Math.PI - FLIPPER.rest - 1e-9 || f.rightAngle > Math.PI - FLIPPER.raised + 1e-9
    || Math.abs(s.ball.vx) > 1600 || Math.abs(s.ball.vy) > 1600 || Math.hypot(s.ball.vx, s.ball.vy) > 1600.00001
    || s.ball.x < 0 || s.ball.x > 560 || s.ball.y < 0 || s.ball.y > 790
    || !integer(s.lastScoreTick, -120, s.tick) || !integer(s.lastBankTick, -360, s.tick) || s.lastEvent.length > 120) throw new Error("Invalid pinball snapshot values.");
  if (s.phase === "ready" && (s.ball.x !== 510 || s.ball.y !== 712 || s.ball.vx !== 0 || s.ball.vy !== 0 || f.leftHeld || f.rightHeld || f.leftAngle !== FLIPPER.rest || f.rightAngle !== Math.PI - FLIPPER.rest)) throw new Error("A ready ball must be resting in the shooter lane.");
  return clone(s);
}

export const starfallGame: GameDefinition<StarfallState, StarfallAction, StarfallEvent> = {
  description: {
    id: "starfall", title: "STARFALL", version: "1.1.0", summary: "A three-ball space-age pinball table. Physical flippers, live bumpers, a launch ball saver, and one more high-score chase.",
    rules: ["Launch from the shooter lane. Time the left and right flippers to keep the ball in play.", "Each fresh ball has one saver until physics frame 960. A drain before frame 960 returns that same ball for relaunch without spending it; the relaunch does not refresh the saver.", "Each bumper scores 100 times the multiplier. Light all three to raise it, up to 5×, and collect a constellation bonus.", "Slingshots score 25 times the multiplier. Scores and multiplier carry across three balls.", "An unsaved ball passing below the table drains. Launch the next ball manually. The game ends after the third spent ball."],
    victoryConditions: ["There is no fixed win quota. Finish a three-ball session and try to beat your best score."],
    failureConditions: ["The third ball drains and the session ends."],
    metrics: [
      { key: "score", label: "Score", description: "Points earned from physical bumper and slingshot contacts and completed light banks." },
      { key: "ballsRemaining", label: "Balls left", description: "Includes the current ball; starts at three and decreases at each drain.", badWhen: "zero: the three-ball session is over" },
      { key: "multiplier", label: "Multiplier", description: "Current scoring multiplier, raised by lighting all three bumpers." },
      { key: "bumperHits", label: "Bumper hits", description: "Approaching, cooldown-ready physical bumper contacts." },
      { key: "flipperHits", label: "Flipper impacts", description: "Physical bat contacts changing ball velocity by at least 40 table units/s. Button presses and tiny resting corrections do not count." },
      { key: "slingHits", label: "Slingshot hits", description: "Scoring contacts with the two triangular slingshots; each earns 25 times the multiplier." },
      { key: "drains", label: "Drains", description: "Unsaved drain crossings that spent a ball." },
      { key: "ballSaves", label: "Ball saves", description: "Drain crossings returned by the one-use saver without spending a ball." },
      { key: "ballSaverSeconds", label: "Ball saver time", description: "Simulated seconds remaining in the current ball's saver window, rounded to hundredths." },
      { key: "ballSaverAvailable", label: "Ball saver available", description: "Whether the current launched ball can still be saved once." },
      { key: "simulationSeconds", label: "Play time", description: "Fixed physics time rounded to 0.1 seconds; excludes waiting at the plunger and pause time. State tick counts exact 1/120-second frames." },
      { key: "maxSpeed", label: "Peak speed", description: "Highest simulated ball speed in table units per second, capped at 1600 for collision stability." },
      { key: "phase", label: "Phase", description: "ready awaits a launch, playing means a ball is on the table, and over ends the three-ball session." },
      { key: "lights", label: "Constellation lights", description: "Bumpers lit in the current bank, from zero to two; lighting all three awards the bank and clears its lights." },
    ],
    actions: [
      { type: "launch", description: "Release the spring plunger when a ball is waiting in the shooter lane.", inputSchema: closed({ type: { const: "launch" } }) },
      { type: "advance", description: "Advance 4, 15, or 30 fixed 1/120-second physics frames with the chosen flippers held. Input only moves the physical bats.", inputSchema: closed({ type: { const: "advance" }, frames: { type: "integer", enum: [4, 15, 30] }, left: { type: "boolean" }, right: { type: "boolean" } }) },
    ],
  }, initialState, legalActions, reduce, deserialize,
  metrics: s => ({ score: s.score, ballsRemaining: s.ballsRemaining, multiplier: s.multiplier, bumperHits: s.stats.bumperHits, flipperHits: s.stats.flipperHits, slingHits: s.stats.slingHits, drains: s.stats.drains, ballSaves: s.stats.ballSaves, ballSaverSeconds: Math.round(s.ballSaver.framesRemaining / 1.2) / 100, ballSaverAvailable: s.ballSaver.available, simulationSeconds: Math.round(s.tick / 12) / 10, maxSpeed: Math.round(s.stats.maxSpeed), phase: s.phase, lights: s.bumperLights.filter(Boolean).length }),
};
