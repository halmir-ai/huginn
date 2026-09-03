import type { GameDefinition, LegalAction } from "../../play/core";

export const GRID_WIDTH = 28;
export const GRID_HEIGHT = 22;
export const BONUS_STEPS = 52;
export const SHIELD_STEPS = 10;
export type Direction = "n" | "e" | "s" | "w";
export type Cell = { x: number; y: number };
export type CoilAction = { type: "turn"; direction: Direction } | { type: "advance"; steps: 1 | 5 | 10 } | { type: "shield" };
export type CoilState = {
  version: 1;
  seed: number;
  rng: number;
  phase: "playing" | "dead";
  snake: Cell[];
  direction: Direction;
  pendingDirection: Direction | null;
  food: Cell | null;
  bonus: (Cell & { remaining: number }) | null;
  foodsEaten: number;
  bonusesEaten: number;
  score: number;
  tick: number;
  death: "wall" | "self" | null;
  shieldCharges: 0 | 1;
  shieldStepsLeft: number;
};
export type CoilEvent =
  | { type: "food" | "bonus"; x: number; y: number; points: number }
  | { type: "bonus-spawn"; x: number; y: number }
  | { type: "bonus-expired" }
  | { type: "speed-up"; level: number }
  | { type: "shield-armed" | "shield-expired" }
  | { type: "shield-blocked"; cause: "wall" | "self"; x: number; y: number }
  | { type: "death"; cause: "wall" | "self"; x: number; y: number };

export const vectors: Record<Direction, Cell> = { n: { x: 0, y: -1 }, e: { x: 1, y: 0 }, s: { x: 0, y: 1 }, w: { x: -1, y: 0 } };
export const opposite: Record<Direction, Direction> = { n: "s", e: "w", s: "n", w: "e" };
export const levelFor = (state: Pick<CoilState, "foodsEaten">): number => 1 + Math.floor(state.foodsEaten / 5);
export const stepDurationMs = (state: Pick<CoilState, "foodsEaten">): number => Math.max(64, 148 - (levelFor(state) - 1) * 8);
const same = (a: Cell, b: Cell): boolean => a.x === b.x && a.y === b.y;
const exact = (value: unknown, keys: string[]): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const integer = (value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max;
const isDirection = (value: unknown): value is Direction => typeof value === "string" && Object.hasOwn(vectors, value);
const inBounds = (cell: Cell): boolean => integer(cell.x, 0, GRID_WIDTH - 1) && integer(cell.y, 0, GRID_HEIGHT - 1);
const isCell = (value: unknown): value is Cell => exact(value, ["x", "y"]) && inBounds(value as Cell);

/** One finite PRNG transition per placement; no rejection loop or ambient entropy. */
function place(rng: number, occupied: Cell[]): { rng: number; cell: Cell | null } {
  const next = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
  const taken = new Set(occupied.map(cell => cell.y * GRID_WIDTH + cell.x));
  const free: Cell[] = [];
  for (let y = 0; y < GRID_HEIGHT; y++) for (let x = 0; x < GRID_WIDTH; x++) {
    if (!taken.has(y * GRID_WIDTH + x)) free.push({ x, y });
  }
  return { rng: next, cell: free.length ? free[next % free.length] : null };
}

function initialState(seed: number): CoilState {
  if (!integer(seed, -2147483648, 4294967295)) throw new Error("COIL seed must be a 32-bit integer.");
  const snake = Array.from({ length: 5 }, (_, i) => ({ x: 10 - i, y: 11 }));
  const { rng, cell: food } = place(seed >>> 0, snake);
  return { version: 1, seed, rng, phase: "playing", snake, direction: "e", pendingDirection: null, food, bonus: null, foodsEaten: 0, bonusesEaten: 0, score: 0, tick: 0, death: null, shieldCharges: 1, shieldStepsLeft: 0 };
}

function legalActions(state: CoilState): LegalAction<CoilAction>[] {
  if (state.phase !== "playing") return [];
  const actions: LegalAction<CoilAction>[] = [];
  if (state.pendingDirection === null) {
    for (const direction of Object.keys(vectors) as Direction[]) {
      if (direction !== state.direction && direction !== opposite[state.direction]) actions.push({ action: { type: "turn", direction }, label: `Turn ${ { n: "up", e: "right", s: "down", w: "left" }[direction] }`, reason: "Queue a perpendicular turn for the next cell. A second turn requires advancing first." });
    }
  }
  if (state.shieldCharges === 1) actions.push({ action: { type: "shield" }, label: "Arm emergency shield", reason: "Spend the run's only charge to block one fatal collision within the next 10 cell advances." });
  for (const steps of [1, 5, 10] as const) actions.push({ action: { type: "advance", steps }, label: `Advance ${steps} cell${steps === 1 ? "" : "s"}`, reason: "Move straight by fixed cells; stop immediately on collision, including a shield block." });
  return actions;
}

function validateAction(state: CoilState, action: CoilAction): void {
  const valid = action?.type === "turn"
    ? exact(action, ["type", "direction"]) && isDirection(action.direction) && state.pendingDirection === null && action.direction !== state.direction && action.direction !== opposite[state.direction]
    : action?.type === "shield"
    ? exact(action, ["type"]) && state.shieldCharges === 1
    : action?.type === "advance" && exact(action, ["type", "steps"]) && [1, 5, 10].includes(action.steps);
  if (state.phase !== "playing" || !valid) throw new Error("Illegal COIL action.");
}

function advance(state: CoilState, events: CoilEvent[]): CoilState {
  const direction = state.pendingDirection ?? state.direction;
  const vector = vectors[direction];
  const head = { x: state.snake[0].x + vector.x, y: state.snake[0].y + vector.y };
  const eatsFood = state.food !== null && same(head, state.food);
  // The old tail vacates this step unless regular food grows the snake.
  const body = eatsFood ? state.snake : state.snake.slice(0, -1);
  const cause = !inBounds(head) ? "wall" : body.some(cell => same(head, cell)) ? "self" : null;
  if (cause) {
    if (state.shieldStepsLeft > 0) {
      events.push({ type: "shield-blocked", cause, ...head });
      // The attempted cell spends time, but neither moves the body nor collects fruit.
      // Preserve the physical heading so the next turn obeys the usual no-reversal rule.
      const bonus = state.bonus && state.bonus.remaining > 1 ? { ...state.bonus, remaining: state.bonus.remaining - 1 } : null;
      if (state.bonus && !bonus) events.push({ type: "bonus-expired" });
      return { ...state, bonus, tick: state.tick + 1, pendingDirection: null, shieldStepsLeft: 0 };
    }
    events.push({ type: "death", cause, ...head });
    return { ...state, tick: state.tick + 1, phase: "dead", death: cause, pendingDirection: null };
  }
  let next: CoilState = { ...state, snake: [head, ...body], direction, pendingDirection: null, tick: state.tick + 1, shieldStepsLeft: Math.max(0, state.shieldStepsLeft - 1) };
  if (state.shieldStepsLeft === 1) events.push({ type: "shield-expired" });
  if (next.bonus) {
    if (same(head, next.bonus)) {
      next = { ...next, bonus: null, bonusesEaten: next.bonusesEaten + 1, score: next.score + 50 };
      events.push({ type: "bonus", ...head, points: 50 });
    } else if (next.bonus.remaining === 1) {
      next = { ...next, bonus: null };
      events.push({ type: "bonus-expired" });
    } else next = { ...next, bonus: { ...next.bonus, remaining: next.bonus.remaining - 1 } };
  }
  if (eatsFood) {
    next = { ...next, foodsEaten: next.foodsEaten + 1, score: next.score + 10 };
    events.push({ type: "food", ...head, points: 10 });
    const foodPlacement = place(next.rng, [...next.snake, ...(next.bonus ? [next.bonus] : [])]);
    next = { ...next, rng: foodPlacement.rng, food: foodPlacement.cell };
    if (next.foodsEaten % 5 === 0) {
      // Each fifth regular fruit starts a fresh golden-fruit opportunity.
      const bonusPlacement = place(next.rng, [...next.snake, ...(next.food ? [next.food] : [])]);
      next = { ...next, rng: bonusPlacement.rng, bonus: bonusPlacement.cell ? { ...bonusPlacement.cell, remaining: BONUS_STEPS } : null };
      events.push({ type: "speed-up", level: levelFor(next) });
      if (next.bonus) events.push({ type: "bonus-spawn", x: next.bonus.x, y: next.bonus.y });
    }
  }
  if (next.food === null && next.snake.length < GRID_WIDTH * GRID_HEIGHT) {
    const placement = place(next.rng, [...next.snake, ...(next.bonus ? [next.bonus] : [])]);
    next = { ...next, rng: placement.rng, food: placement.cell };
  }
  return next;
}

function deserialize(value: unknown): CoilState {
  const invalid = (): never => { throw new Error("Invalid COIL snapshot."); };
  if (!exact(value, ["version", "seed", "rng", "phase", "snake", "direction", "pendingDirection", "food", "bonus", "foodsEaten", "bonusesEaten", "score", "tick", "death", "shieldCharges", "shieldStepsLeft"])) return invalid();
  const s = value as unknown as CoilState;
  if (s.version !== 1 || !integer(s.seed, -2147483648, 4294967295) || !integer(s.rng, 0, 4294967295) || !["playing", "dead"].includes(s.phase) || !integer(s.foodsEaten, 0, GRID_WIDTH * GRID_HEIGHT - 5) || !integer(s.bonusesEaten, 0, Math.floor(s.foodsEaten / 5)) || !integer(s.score, 0) || s.score !== s.foodsEaten * 10 + s.bonusesEaten * 50 || !integer(s.tick, s.foodsEaten + s.bonusesEaten) || !isDirection(s.direction)) return invalid();
  if (!integer(s.shieldCharges, 0, 1) || !integer(s.shieldStepsLeft, 0, SHIELD_STEPS) || (s.shieldStepsLeft > 0 && (s.shieldCharges !== 0 || s.phase !== "playing"))) return invalid();
  // Activation itself does not advance time: any reduced active duration needs
  // that many safe advances, while a consumed/expired shield needs at least one.
  if (s.shieldCharges === 0 && (s.shieldStepsLeft === 0 ? s.tick < 1 : s.tick < SHIELD_STEPS - s.shieldStepsLeft)) return invalid();
  if (s.pendingDirection !== null && (!isDirection(s.pendingDirection) || s.pendingDirection === s.direction || s.pendingDirection === opposite[s.direction])) return invalid();
  if ((s.phase === "playing" && s.death !== null) || (s.phase === "dead" && (!["wall", "self"].includes(s.death as string) || s.pendingDirection !== null || s.tick < 1))) return invalid();
  if (!Array.isArray(s.snake) || s.snake.length !== s.foodsEaten + 5 || !s.snake.every(isCell)) return invalid();
  const occupied = new Set(s.snake.map(cell => cell.y * GRID_WIDTH + cell.x));
  if (occupied.size !== s.snake.length) return invalid();
  if (s.snake.some((cell, i) => i > 0 && Math.abs(cell.x - s.snake[i - 1].x) + Math.abs(cell.y - s.snake[i - 1].y) !== 1)) return invalid();
  const heading = vectors[s.direction];
  if (s.snake[0].x - s.snake[1].x !== heading.x || s.snake[0].y - s.snake[1].y !== heading.y) return invalid();
  if (s.food !== null && (!isCell(s.food) || occupied.has(s.food.y * GRID_WIDTH + s.food.x))) return invalid();
  if (s.bonus !== null && (!exact(s.bonus, ["x", "y", "remaining"]) || !inBounds(s.bonus) || !integer(s.bonus.remaining, 1, BONUS_STEPS) || s.foodsEaten < 5 || occupied.has(s.bonus.y * GRID_WIDTH + s.bonus.x) || (s.food !== null && same(s.food, s.bonus)))) return invalid();
  if (s.food === null && s.snake.length + (s.bonus ? 1 : 0) < GRID_WIDTH * GRID_HEIGHT) return invalid();
  return structuredClone(s);
}

export const coilGame: GameDefinition<CoilState, CoilAction, CoilEvent> = {
  description: {
    id: "coil", title: "COIL", version: "1.1.0",
    summary: "After-hours Snake. Stay alive, grow your coil, and risk the shortcut for gold.",
    rules: ["Each advance moves one or more fixed cells. Turns take effect on the next cell; never reverse.", "Coral fruit grows the snake by one cell and earns 10 points.", "Every five coral fruits increases speed and reveals a golden fruit worth 50 points for 52 cell steps.", "Golden fruit does not grow the snake. Touching a wall or your own body ends the run unless the emergency shield blocks it.", "Arm the shield once per run with Q or the shield button. Activation spends its charge; protection lasts 10 cell advances or until one fatal collision is blocked. A block leaves the snake in place, spends one time step, awards nothing, and stops batched movement so you can turn next. Restart restores the charge.", "There is no score quota: chase your personal best. Pausing and animation are outside the simulation and do not spend shield duration."],
    victoryConditions: [], failureConditions: ["Without an armed shield, the head enters a wall or an occupied body cell, except a tail vacating on that same step."],
    metrics: [
      { key: "score", label: "Score", description: "10 points per coral fruit plus 50 per golden fruit." },
      { key: "length", label: "Length", description: "Number of occupied snake cells, including the head." },
      { key: "foodsEaten", label: "Fruit", description: "Coral fruits eaten; each fifth fruit raises speed." },
      { key: "bonusesEaten", label: "Gold", description: "Golden fruits collected before expiry." },
      { key: "level", label: "Speed level", description: "One plus the number of complete sets of five coral fruits eaten." },
      { key: "stepDurationMs", label: "Cell interval", description: "Human play milliseconds per fixed cell, decreasing from 148 to a minimum of 64." },
      { key: "bonusStepsLeft", label: "Gold timer", description: "Fixed movement steps left before golden fruit expires; zero when absent." },
      { key: "shieldCharges", label: "Shield charge", description: "One until activation, then zero until restart." },
      { key: "shieldStepsLeft", label: "Shield timer", description: "Protected cell advances remaining, from 10 down to zero; a blocked collision consumes all protection." },
      { key: "tick", label: "Cells attempted", description: "Total movement steps, including the final collision step." },
      { key: "alive", label: "Alive", description: "Whether the snake can still move.", badWhen: "false" },
    ],
    actions: [
      { type: "turn", description: "Queue one perpendicular direction for the next cell. Advance before turning again.", inputSchema: { type: "object", properties: { type: { const: "turn" }, direction: { type: "string", enum: ["n", "e", "s", "w"] } }, required: ["type", "direction"], additionalProperties: false } },
      { type: "shield", description: "Spend the single charge to arm protection for the next 10 cell advances. Does not advance time.", inputSchema: { type: "object", properties: { type: { const: "shield" } }, required: ["type"], additionalProperties: false } },
      { type: "advance", description: "Advance 1, 5, or 10 fixed cells in the chosen direction, stopping at death or a shield block.", inputSchema: { type: "object", properties: { type: { const: "advance" }, steps: { type: "integer", enum: [1, 5, 10] } }, required: ["type", "steps"], additionalProperties: false } },
    ],
  },
  initialState,
  legalActions,
  reduce(state, action) {
    validateAction(state, action);
    if (action.type === "turn") return { state: { ...state, pendingDirection: action.direction }, events: [] };
    if (action.type === "shield") return { state: { ...state, shieldCharges: 0, shieldStepsLeft: SHIELD_STEPS }, events: [{ type: "shield-armed" }] };
    const events: CoilEvent[] = [];
    let next = state;
    for (let step = 0; step < action.steps && next.phase === "playing"; step++) {
      const before = next;
      next = advance(next, events);
      if (next.snake === before.snake) break;
    }
    return { state: next, events };
  },
  metrics(state) {
    return { score: state.score, length: state.snake.length, foodsEaten: state.foodsEaten, bonusesEaten: state.bonusesEaten, level: levelFor(state), stepDurationMs: stepDurationMs(state), bonusStepsLeft: state.bonus?.remaining ?? 0, shieldCharges: state.shieldCharges, shieldStepsLeft: state.shieldStepsLeft, tick: state.tick, alive: state.phase === "playing" };
  },
  deserialize,
};
