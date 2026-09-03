import { describe, expect, it } from "vitest";
import { BUMPERS, FLIPPER, TABLE, collideCircle, collideSegment, flipperSegment, starfallGame } from "../src/games/starfall/game";
import type { StarfallAction, StarfallState } from "../src/games/starfall/game";

const advance = (s: StarfallState, frames: 4 | 15 | 30 = 30, left = false, right = false) => starfallGame.reduce(s, { type: "advance", frames, left, right }).state;
const launch = (seed = 12) => starfallGame.reduce(starfallGame.initialState(seed), { type: "launch" }).state;
const drain = (s: StarfallState) => {
  s.ball = { x: 264, y: 779, vx: 0, vy: 300 };
  return starfallGame.reduce(s, { type: "advance", frames: 4, left: false, right: false });
};
const advanceSafely = (s: StarfallState, batches: readonly (4 | 15 | 30)[]) => {
  for (const frames of batches) {
    s.ball = { x: 264, y: 400, vx: 0, vy: 0 };
    s = advance(s, frames);
  }
  return s;
};

describe("Starfall physical pinball", () => {
  it("starts with three balls at the plunger, and launching gives velocity without relocation", () => {
    const initial = starfallGame.initialState(12);
    expect(initial.phase).toBe("ready"); expect(initial.ballsRemaining).toBe(3);
    expect(starfallGame.legalActions(initial).map(item => item.action)).toEqual([{ type: "launch" }]);
    const next = starfallGame.reduce(initial, { type: "launch" }).state;
    expect(next.ball.x).toBe(initial.ball.x); expect(next.ball.y).toBe(initial.ball.y);
    expect(next.ball.vy).toBeLessThan(-1000); expect(next.phase).toBe("playing");
    expect(next.ballSaver).toEqual({ available: true, framesRemaining: 960, pendingNewBall: false });
    expect(initial.ball.vy).toBe(0);
    expect(starfallGame.legalActions(next)).toHaveLength(12);
  });

  it("leaves the physical launch lane into the table without teleportation", () => {
    let state = launch(); let entered = false;
    for (let i = 0; i < 80 && state.phase === "playing"; i++) {
      const previous = state.ball; state = advance(state, 4);
      expect(Math.hypot(state.ball.x - previous.x, state.ball.y - previous.y)).toBeLessThan(60);
      if (state.ball.x < 460 && state.ball.y < 250) entered = true;
    }
    expect(entered).toBe(true);
  });

  it("saves one early drain per fresh ball without spending progress or rearming the saved ball", () => {
    let state = launch();
    state.score = 725; state.multiplier = 3; state.bumperLights = [true, false, true];
    state.stats.bumperHits = 2;

    let transition = drain(state);
    state = transition.state;
    expect(state.phase).toBe("ready"); expect(state.ballsRemaining).toBe(3);
    expect(state.score).toBe(725); expect(state.multiplier).toBe(3); expect(state.bumperLights).toEqual([true, false, true]);
    expect(state.ballSaver).toEqual({ available: false, framesRemaining: 0, pendingNewBall: false });
    expect(state.stats.drains).toBe(0);
    expect(transition.events.map(event => event.type)).toContain("save");
    expect((state.stats as StarfallState["stats"] & { ballSaves?: number }).ballSaves).toBe(1);
    expect(starfallGame.deserialize(JSON.parse(JSON.stringify(state)))).toEqual(state);

    state = starfallGame.reduce(state, { type: "launch" }).state;
    expect(state.ballSaver).toEqual({ available: false, framesRemaining: 0, pendingNewBall: false });
    transition = drain(state); state = transition.state;
    expect(state.phase).toBe("ready"); expect(state.ballsRemaining).toBe(2);
    expect(state.stats.drains).toBe(1);
    expect(transition.events.map(event => event.type)).toContain("drain");

    state = starfallGame.reduce(state, { type: "launch" }).state;
    expect(state.ballSaver).toEqual({ available: true, framesRemaining: 960, pendingNewBall: false });
    transition = drain(state); state = transition.state;
    expect(state.phase).toBe("ready"); expect(state.ballsRemaining).toBe(2);
    expect(state.stats.drains).toBe(1);
    expect(transition.events.map(event => event.type)).toContain("save");
    expect((state.stats as StarfallState["stats"] & { ballSaves?: number }).ballSaves).toBe(2);
  });

  it("saves a drain on frame 959 but spends the ball on frame 960", () => {
    let beforeExpiry = advanceSafely(launch(), [...Array(31).fill(30), ...Array(7).fill(4)]);
    expect(beforeExpiry.tick).toBe(958); expect(beforeExpiry.ballSaver.framesRemaining).toBe(2);
    const saved = drain(beforeExpiry);
    expect(saved.state.tick).toBe(959); expect(saved.state.ballsRemaining).toBe(3); expect(saved.state.stats.drains).toBe(0);
    expect(saved.events.map(event => event.type)).toContain("save");

    let atExpiry = advanceSafely(launch(), [...Array(30).fill(30), 15, ...Array(11).fill(4)]);
    expect(atExpiry.tick).toBe(959); expect(atExpiry.ballSaver.framesRemaining).toBe(1);
    atExpiry = starfallGame.deserialize(JSON.parse(JSON.stringify(atExpiry)));
    const spent = drain(atExpiry);
    expect(spent.state.tick).toBe(960); expect(spent.state.ballsRemaining).toBe(2); expect(spent.state.stats.drains).toBe(1);
    expect(spent.events.map(event => event.type)).toContain("drain");
  });

  it("reflects an approaching bumper contact, but never re-kicks a separating overlap", () => {
    const bumper = BUMPERS[0];
    const approaching = { x: bumper.x + bumper.radius + TABLE.ballRadius - 1, y: bumper.y, vx: -200, vy: 0 };
    expect(collideCircle(approaching, bumper.x, bumper.y, bumper.radius, 0.9, 270)).toBe(true);
    expect(approaching.vx).toBeCloseTo(450);
    const separating = { x: bumper.x + bumper.radius + TABLE.ballRadius - 1, y: bumper.y, vx: 200, vy: 0 };
    expect(collideCircle(separating, bumper.x, bumper.y, bumper.radius, 0.9, 270)).toBe(false);
    expect(separating.vx).toBe(200); expect(separating.x).toBeGreaterThan(bumper.x + bumper.radius + TABLE.ballRadius);
  });

  it("corrects a separating wall overlap without reflecting it back into the wall", () => {
    const wall = { x1: 50, y1: 100, x2: 50, y2: 400, radius: 5, kind: "rail" as const };
    const toward = { x: 63, y: 200, vx: -100, vy: 0 };
    expect(collideSegment(toward, wall)).toBe(true); expect(toward.vx).toBeGreaterThan(0);
    const away = { x: 63, y: 200, vx: 100, vy: 0 };
    expect(collideSegment(away, wall)).toBe(false); expect(away.vx).toBe(100);
  });

  it("opens the shooter gate from the lane side but blocks upward diagonal re-entry", () => {
    const gate = { x1: 485, y1: 181, x2: 531, y2: 148, radius: 2, kind: "gate" as const };
    const departing = { x: 510, y: 169, vx: 0, vy: -800 };
    expect(collideSegment(departing, gate)).toBe(false);
    expect(departing.vy).toBe(-800);
    const returning = { x: 505, y: 159, vx: 700, vy: -100 };
    expect(collideSegment(returning, gate)).toBe(true);
    expect(returning.vx).toBeLessThan(700);
    expect(returning.vy).toBeLessThan(-100);
  });

  it("only transfers a flipper impulse at actual contact, and held bats do not invent a rising swing", () => {
    const left = flipperSegment("left", FLIPPER.rest);
    const contactX = left.x1 + (left.x2 - left.x1) * 0.75;
    const contactY = left.y1 + (left.y2 - left.y1) * 0.75;
    const near = { x: contactX + Math.sin(FLIPPER.rest) * 17, y: contactY - Math.cos(FLIPPER.rest) * 17, vx: 0, vy: 100 };
    const stationary = { ...near }, remote = { x: 270, y: 400, vx: 0, vy: 100 };
    expect(collideSegment(near, left, 0.78, 0, -14)).toBe(true);
    expect(near.vy).toBeLessThan(-1000);
    expect(collideSegment(stationary, left, 0.78, 0, 0)).toBe(true);
    expect(stationary.vy).toBeGreaterThan(near.vy + 700);
    expect(collideSegment(remote, left, 0.78, 0, -14)).toBe(false);
    expect(remote).toEqual({ x: 270, y: 400, vx: 0, vy: 100 });
    const a = launch(), b = launch(); a.ball = { x: 264, y: 450, vx: 0, vy: 0 }; b.ball = { ...a.ball };
    expect(advance(a, 4, true, true).ball).toEqual(advance(b, 4, false, false).ball);
  });

  it("scores physical bumper hits and completes the three-light multiplier bank", () => {
    let state = launch();
    for (const bumper of BUMPERS) {
      state.ball = { x: bumper.x, y: bumper.y - bumper.radius - TABLE.ballRadius - 1, vx: 0, vy: 180 };
      state = advance(state, 4);
    }
    expect(state.stats.bumperHits).toBe(3); expect(state.score).toBe(1300);
    expect(state.multiplier).toBe(2); expect(state.bumperLights).toEqual([false, false, false]);
  });

  it("saves then drains three real balls, waits for each relaunch, and then ends with no legal moves", () => {
    let state = starfallGame.initialState(12);
    for (let ball = 0; ball < 3; ball++) {
      state = starfallGame.reduce(state, { type: "launch" }).state;
      state.ball = { x: 264, y: 779, vx: 0, vy: 300 };
      state = advance(state, 4);
      expect(state.phase).toBe("ready"); expect(state.ballsRemaining).toBe(3 - ball); expect(state.stats.ballSaves).toBe(ball + 1);
      state = starfallGame.reduce(state, { type: "launch" }).state;
      state.ball = { x: 264, y: 779, vx: 0, vy: 300 };
      state = advance(state, 4);
      expect(state.stats.drains).toBe(ball + 1); expect(state.ballsRemaining).toBe(2 - ball);
      expect(state.phase).toBe(ball === 2 ? "over" : "ready");
      if (ball < 2) expect(state.ball).toEqual(starfallGame.initialState(12).ball);
      expect(starfallGame.deserialize(JSON.parse(JSON.stringify(state)))).toEqual(state);
    }
    expect(starfallGame.legalActions(state)).toEqual([]);
    expect(() => starfallGame.reduce(state, { type: "launch" })).toThrow(/Illegal/);
    expect(() => advance(state)).toThrow(/Illegal/);
  });

  it("replays deterministic fixed frames across batching, serialization and inputs", () => {
    let whole = launch(22), divided = launch(22);
    for (let i = 0; i < 12 && whole.phase === "playing"; i++) {
      whole = advance(whole, 30, i % 3 === 0, i % 4 === 0);
      for (let j = 0; j < 2 && divided.phase === "playing"; j++) divided = advance(divided, 15, i % 3 === 0, i % 4 === 0);
      expect(divided).toEqual(whole);
      whole = starfallGame.deserialize(JSON.parse(JSON.stringify(whole)));
    }
    const replay = (seed: number) => { let state = launch(seed); for (let i = 0; i < 400 && state.phase === "playing"; i++) state = advance(state, 4, i % 21 < 3, i % 17 < 3); return state; };
    expect(replay(33)).toEqual(replay(33));
  });

  it("rejects malformed snapshots, impossible lifecycle values, and closed-schema violations", () => {
    const state = launch();
    expect(starfallGame.deserialize(JSON.parse(JSON.stringify(state)))).toEqual(state);
    for (const value of [{ ...state, extra: true }, { ...state, tick: -1 }, { ...state, phase: "won" }, { ...state, score: 1.5 }, { ...state, ballsRemaining: 0 }, { ...state, ball: { ...state.ball, vx: NaN } }, { ...state, ballSaver: { ...state.ballSaver, framesRemaining: 961 } }, { ...state, ballSaver: { ...state.ballSaver, pendingNewBall: true } }, { ...state, bumperLights: [true] }, { ...state, stats: { ...state.stats, drains: 1 } }, { ...state, stats: { ...state.stats, ballSaves: 4 } }]) expect(() => starfallGame.deserialize(value)).toThrow();
    for (const action of [{ type: "advance", frames: 12000, left: false, right: false }, { type: "advance", frames: 4, left: false, right: false, remoteKick: true }, { type: "advance", frames: 4, left: 1, right: false }, { type: "launch" }]) expect(() => starfallGame.reduce(state, action as StarfallAction)).toThrow();
    expect(() => starfallGame.reduce(starfallGame.initialState(12), { type: "advance", frames: 4, left: false, right: false })).toThrow();
  });

  it("keeps complete ordinary sessions finite and bounded under varied physical inputs", () => {
    for (const seed of [1, 12, 37, 2048]) {
      let state = starfallGame.initialState(seed);
      for (let step = 0; step < 10000 && state.phase !== "over"; step++) {
        if (state.phase === "ready") state = starfallGame.reduce(state, { type: "launch" }).state;
        else state = advance(state, 30, step % 11 < 2, step % 7 < 2);
        expect(Number.isFinite(state.ball.x + state.ball.y + state.ball.vx + state.ball.vy)).toBe(true);
        expect(Math.hypot(state.ball.vx, state.ball.vy)).toBeLessThanOrEqual(1600.00001);
        expect(starfallGame.deserialize(JSON.parse(JSON.stringify(state)))).toEqual(state);
      }
      expect(state.phase, JSON.stringify({ seed, ball: state.ball, stats: state.stats, tick: state.tick })).toBe("over");
      expect(state.stats.launches).toBe(3 + state.stats.ballSaves); expect(state.stats.launches).toBeLessThanOrEqual(6);
    }
  });

  it("lets a passive ball drain through the flipper gap instead of bridging the bat tips", () => {
    let gap = launch(); gap.ball = { x: 264, y: 669, vx: 0, vy: 100 };
    for (let i = 0; i < 40 && gap.phase === "playing"; i++) gap = advance(gap, 4);
    expect(gap.phase).toBe("ready");
    for (const seed of [1, 4, 6, 12, 29, 37, 48, 72, 96]) {
      let state = starfallGame.initialState(seed);
      for (let i = 0; i < 1500 && state.phase !== "over"; i++) state = state.phase === "ready" ? starfallGame.reduce(state, { type: "launch" }).state : advance(state, 15);
      expect(state.phase, JSON.stringify({ seed, ball: state.ball, stats: state.stats })).toBe("over");
    }
  });
});
