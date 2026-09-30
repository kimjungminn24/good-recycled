import Matter from 'matter-js';
import { STAGES, LAST, collisionSize, rollStage, points } from './stages';

const { Engine, Bodies, Composite, Events } = Matter;

export const VIEW = { w: 360, h: 640 };
export const BOX = { left: 20, right: 340, top: 170, bottom: 598 };
export const HOLD_Y = 96;
export const POP_MS = 450;

const WALL = 60;
const STEP = 1000 / 60;
const DROP_COOLDOWN = 600;
const GRACE = 1000;
const OVER_LIMIT = 2000;
const RESTART_DELAY = 800;

export type Item = Matter.Body & {
  stage: number;
  bornAt: number;
  merging?: boolean;
  overSince?: number;
};

export type Toast =
  | { kind: 'found'; stage: number; at: number }
  | { kind: 'loop'; at: number };

export type Pop = { x: number; y: number; r: number; at: number };

export class Game {
  readonly engine = Engine.create();
  readonly items = new Set<Item>();
  readonly found = new Set<number>();
  pops: Pop[] = [];

  score = 0;
  best = 0;
  loops = 0;
  current = rollStage();
  next = rollStage();
  holdX = VIEW.w / 2;
  started = false;
  over = false;
  paused = false;
  finalReached = false;
  overAt = 0;
  toast?: Toast;
  now = 0;

  private readyAt = 0;
  private acc = 0;
  private pending: [Item, Item][] = [];

  constructor() {
    const { left, right, top, bottom } = BOX;
    const h = bottom - top + 200;
    Composite.add(this.engine.world, [
      Bodies.rectangle(left - WALL / 2, bottom - h / 2, WALL, h, { isStatic: true }),
      Bodies.rectangle(right + WALL / 2, bottom - h / 2, WALL, h, { isStatic: true }),
      Bodies.rectangle((left + right) / 2, bottom + WALL / 2, right - left + WALL * 2, WALL, { isStatic: true }),
    ]);
    Events.on(this.engine, 'collisionStart', (e) => this.onContact(e.pairs));
    Events.on(this.engine, 'collisionActive', (e) => this.onContact(e.pairs));
    this.found.add(0);
  }

  reset() {
    for (const item of this.items) Composite.remove(this.engine.world, item);
    this.items.clear();
    this.found.clear();
    this.found.add(0);
    this.pending = [];
    this.pops = [];
    this.score = 0;
    this.loops = 0;
    this.current = rollStage();
    this.next = rollStage();
    this.over = false;
    this.paused = false;
    this.finalReached = false;
    this.toast = undefined;
    this.readyAt = this.now;
  }

  start() {
    this.started = true;
    this.readyAt = this.now;
  }

  canDrop(): boolean {
    return this.started && !this.over && !this.paused && this.now >= this.readyAt;
  }

  showStage(stage: number) {
    if (this.found.has(stage)) this.toast = { kind: 'found', stage, at: this.now };
  }

  canRestart(): boolean {
    return this.over && performance.now() - this.overAt >= RESTART_DELAY;
  }

  clampX(x: number, stage: number): number {
    const halfWidth = Math.max(STAGES[stage].r, collisionSize(stage).width / 2);
    return Math.min(BOX.right - halfWidth, Math.max(BOX.left + halfWidth, x));
  }

  drop() {
    if (!this.canDrop()) return;
    this.spawn(this.current, this.clampX(this.holdX, this.current), HOLD_Y);
    this.current = this.next;
    this.next = rollStage();
    this.readyAt = this.now + DROP_COOLDOWN;
  }

  update(dt: number) {
    if (this.over || this.paused) return;
    this.acc += Math.min(dt, 250);
    while (this.acc >= STEP) {
      this.step();
      this.acc -= STEP;
      if (this.over || this.paused) break;
    }
  }

  private step() {
    Engine.update(this.engine, STEP);
    this.now += STEP;
    this.merge();
    if (!this.paused) this.checkOver();
    if (this.pops.length) this.pops = this.pops.filter((p) => this.now - p.at < POP_MS);
  }

  private spawn(stage: number, x: number, y: number) {
    const hit = collisionSize(stage);
    const body = Bodies.rectangle(x, y, hit.width, hit.height, {
      label: 'item',
      chamfer: { radius: hit.radius },
      restitution: 0.15,
      friction: 0.25,
      frictionStatic: 0.5,
      frictionAir: 0.005,
    }) as Item;
    body.stage = stage;
    body.bornAt = this.now;
    Composite.add(this.engine.world, body);
    this.items.add(body);

    if (stage === LAST && !this.finalReached) {
      this.finalReached = true;
      this.paused = true;
    }

    if (!this.found.has(stage)) {
      this.found.add(stage);
      this.toast = { kind: 'found', stage, at: this.now };
    }
  }

  private remove(item: Item) {
    Composite.remove(this.engine.world, item);
    this.items.delete(item);
  }

  private onContact(pairs: Matter.Pair[]) {
    for (const { bodyA, bodyB } of pairs) {
      if (bodyA.label !== 'item' || bodyB.label !== 'item') continue;
      const a = bodyA as Item;
      const b = bodyB as Item;
      if (a.stage !== b.stage || a.merging || b.merging) continue;
      a.merging = b.merging = true;
      this.pending.push([a, b]);
    }
  }

  private merge() {
    for (const [a, b] of this.pending) {
      this.remove(a);
      this.remove(b);
      const x = (a.position.x + b.position.x) / 2;
      const y = (a.position.y + b.position.y) / 2;
      if (a.stage === LAST) {
        this.loops++;
        this.score += points(LAST + 1);
        this.toast = { kind: 'loop', at: this.now };
        this.pops.push({ x, y, r: STAGES[LAST].r, at: this.now });
        continue;
      }
      this.spawn(a.stage + 1, x, y);
      this.score += points(a.stage + 1);
      this.pops.push({ x, y, r: STAGES[a.stage + 1].r, at: this.now });
    }
    this.pending = [];
  }

  private checkOver() {
    for (const item of this.items) {
      if (this.now - item.bornAt < GRACE) continue;
      if (item.position.y - STAGES[item.stage].r >= BOX.top) {
        item.overSince = undefined;
        continue;
      }
      item.overSince ??= this.now;
      if (this.now - item.overSince > OVER_LIMIT) {
        this.over = true;
        this.overAt = performance.now();
        this.best = Math.max(this.best, this.score);
        return;
      }
    }
  }

  inDanger(): boolean {
    for (const item of this.items) if (item.overSince !== undefined) return true;
    return false;
  }
}
