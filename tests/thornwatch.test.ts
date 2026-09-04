import { describe, expect, it } from "vitest";
import { levelPaths, thornwatchGame } from "../src/games/thornwatch/game";
import type {
  ThornwatchAction,
  ThornwatchState,
} from "../src/games/thornwatch/game";

const step = (s: ThornwatchState, a: ThornwatchAction) =>
  thornwatchGame.reduce(s, a).state;
const run = (s: ThornwatchState, frames = 900) => {
  for (let i = 0; i < frames && s.phase === "battle"; i++)
    s = step(s, { type: "advance", frames: 1 });
  return s;
};

describe("THORNWATCH", () => {
  it("starts as a playable planned defense with bounded actions", () => {
    const s = thornwatchGame.initialState(12);
    expect(s.phase).toBe("build");
    expect(s.gold).toBe(100);
    expect(
      thornwatchGame
        .legalActions(s)
        .some((x) => x.action.type === "start_wave"),
    ).toBe(true);
    for (const a of thornwatchGame.description.actions)
      expect(a.inputSchema.additionalProperties).toBe(false);
  });
  it("roundtrips authored setups with distinct routes and pad legality", () => {
    const routes = new Set<string>();
    for (const setup of thornwatchGame.setups!) {
      const s = setup.createState(12);
      routes.add(
        JSON.stringify(levelPaths[s.setup as keyof typeof levelPaths]),
      );
      expect(s.setup).toBe(setup.id);
      expect(thornwatchGame.deserialize(JSON.parse(JSON.stringify(s)))).toEqual(
        s,
      );
      const [x, y] = levelPaths[s.setup as keyof typeof levelPaths][0];
      expect(() =>
        step(s, { type: "place_tower", pad: y * 12 + x, tower: "archer" }),
      ).toThrow("Illegal");
    }
    expect(routes.size).toBe(3);
  });
  it("allows open pads and rejects road, duplicate, unaffordable, and malformed placement", () => {
    let s = thornwatchGame.initialState(12);
    s = step(s, { type: "place_tower", pad: 29, tower: "archer" });
    expect(s.towers).toEqual([{ pad: 29, kind: "archer", level: 1 }]);
    expect(() =>
      step(s, { type: "place_tower", pad: 29, tower: "archer" }),
    ).toThrow("Illegal");
    expect(() =>
      step(s, { type: "place_tower", pad: 36, tower: "archer" }),
    ).toThrow("Illegal");
    s = step(s, { type: "place_tower", pad: 30, tower: "archer" });
    expect(() =>
      step(s, { type: "place_tower", pad: 42, tower: "ballista" }),
    ).toThrow("Illegal");
    expect(() =>
      step(s, {
        type: "place_tower",
        pad: 42,
        tower: "archer",
        extra: true,
      } as ThornwatchAction),
    ).toThrow("Illegal");
  });
  it("replays identical fixed actions deterministically", () => {
    const actions: ThornwatchAction[] = [
      { type: "place_tower", pad: 29, tower: "archer" },
      { type: "place_tower", pad: 41, tower: "archer" },
      { type: "start_wave" },
      { type: "advance", frames: 30 },
      { type: "advance", frames: 30 },
      { type: "advance", frames: 30 },
    ];
    const replay = () => actions.reduce(step, thornwatchGame.initialState(12));
    expect(replay()).toEqual(replay());
  });
  it("resolves a real combat wave through fixed advances", () => {
    let s = thornwatchGame.initialState(12);
    s = step(s, { type: "place_tower", pad: 29, tower: "archer" });
    s = step(s, { type: "place_tower", pad: 41, tower: "archer" });
    s = step(s, { type: "start_wave" });
    s = run(s);
    expect(s.phase).toBe("build");
    expect(s.wave).toBe(1);
    expect(s.kills + s.leaks).toBe(4);
  });
  it("proves a same-setup 90-frame tower plan changes the actual wave outcome", () => {
    const play = (plan: [number, "archer" | "ballista"][]) => {
      let s = thornwatchGame
        .setups!.find((x) => x.id === "meadow-opening")!
        .createState(12);
      const actions: ThornwatchAction[] = [
        ...plan.map(([pad, tower]) => ({
          type: "place_tower" as const,
          pad,
          tower,
        })),
        { type: "start_wave" as const },
        { type: "advance" as const, frames: 30 },
        { type: "advance" as const, frames: 30 },
        { type: "advance" as const, frames: 30 },
      ];
      for (const action of actions) s = step(s, action);
      return { actions, state: s };
    };
    const strong = play([
        [29, "archer"],
        [30, "ballista"],
      ]),
      weak = play([
        [90, "archer"],
        [91, "ballista"],
      ]);
    expect(thornwatchGame.metrics(strong.state)).toMatchObject({
      baseHp: 18,
      kills: 3,
      leaks: 1,
    });
    expect(thornwatchGame.metrics(weak.state)).toMatchObject({
      baseHp: 12,
      kills: 0,
      leaks: 4,
    });
    expect(strong.actions).toEqual([
      { type: "place_tower", pad: 29, tower: "archer" },
      { type: "place_tower", pad: 30, tower: "ballista" },
      { type: "start_wave" },
      { type: "advance", frames: 30 },
      { type: "advance", frames: 30 },
      { type: "advance", frames: 30 },
    ]);
  });
});
