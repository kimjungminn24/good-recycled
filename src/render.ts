import { BOX, HOLD_Y, POP_MS, VIEW, type Game } from './game';
import { STAGES, LAST, type StageArt } from './stages';
import grMarkUrl from './assets/gr-mark.png';
import wasteTireUrl from './assets/stages/01-waste-tire.png';
import tirePowderUrl from './assets/stages/02-tire-powder.png';
import bollardUrl from './assets/stages/03-bollard.png';
import tactileBlockUrl from './assets/stages/04-tactile-block.png';
import planterUrl from './assets/stages/05-planter.png';
import playgroundFloorUrl from './assets/stages/06-playground-floor.png';
import retreadTireUrl from './assets/stages/07-retread-tire.png';
import roadBarrierUrl from './assets/stages/08-road-barrier.png';

export const FONT = '"Galmuri11", monospace';
export const DISPLAY = '"Galmuri11 Bold", "Galmuri11", monospace';
const PAPER = '#f8f6ee';
const BIN = '#f0f0e5';
const CREAM = '#f8f6ee';
const INK = '#263f34';
const MUTED = '#737b69';
const LINE = '#d1d7c7';
const ORANGE = '#b75b37';
const grImage = new Image();
grImage.src = grMarkUrl;
const stageImages = [
  wasteTireUrl,
  tirePowderUrl,
  bollardUrl,
  tactileBlockUrl,
  planterUrl,
  playgroundFloorUrl,
  roadBarrierUrl,
  retreadTireUrl,
].map((url) => {
  const image = new Image();
  image.decoding = 'async';
  image.src = url;
  return image;
});
const STAGE_IMAGE_SCALES = [1.32, 1, 1, 1, 1, 1, 1, 1];
const TOAST_MS = 2600;
const STRIP_Y = 624;
const STRIP_GAP = 259 / LAST;
const STRIP_X0 = 37;
const TAU = Math.PI * 2;
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');
export const START_BTN = { x: 26, y: 496, w: 308, h: 48 };
export const RESTART_BTN = { x: 44, y: 445, w: 272, h: 46 };
export const LINK_BTN = { x: 44, y: 499, w: 272, h: 36 };

const SPECKS: [number, number, number, boolean][] = [
  [0.05, 0.55, 0.11, false], [0.2, 0.7, 0.08, true],
  [0.33, 0.3, 0.13, false], [0.47, 0.65, 0.09, true],
  [0.58, 0.45, 0.08, false], [0.7, 0.75, 0.1, true],
  [0.82, 0.35, 0.1, false], [0.93, 0.6, 0.08, true],
  [0.15, 0.15, 0.07, true], [0.62, 0.12, 0.08, false],
];
export type Viewport = { x: number; y: number; w: number; h: number };

function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size = 12, weight = 500, color = INK, align: CanvasTextAlign = 'left') {
  const family = size >= 20 || weight >= 700 ? DISPLAY : FONT;
  ctx.font = '400 ' + size + 'px ' + family;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}
function rule(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, color = LINE) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();
}
function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill = PAPER, _radius = 5) {
  ctx.fillStyle = fill;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function draw(ctx: CanvasRenderingContext2D, g: Game, vp: Viewport) {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = PAPER;
  ctx.fillRect(vp.x, vp.y, vp.w, vp.h);
  ctx.fillStyle = '#263f3409';
  for (let x = 0; x < VIEW.w; x += 16) {
    for (let y = 0; y < VIEW.h; y += 16) {
      if (((x + y) / 16) % 2 === 0) ctx.fillRect(x, y, 2, 2);
    }
  }
  if (!g.started) {
    drawIntro(ctx);
    return;
  }
  drawBin(ctx, g.inDanger());
  if (g.canDrop()) {
    const x = g.clampX(g.holdX, g.current);
    ctx.save();
    ctx.strokeStyle = '#a7b49b';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 6]);
    ctx.beginPath();
    ctx.moveTo(x, HOLD_Y + STAGES[g.current].r + 8);
    ctx.lineTo(x, BOX.bottom - 6);
    ctx.stroke();
    ctx.restore();
    drawItem(ctx, g.current, x, HOLD_Y, 0);
  }
  if (!g.over) text(ctx, STAGES[g.current].label + ' ↓', VIEW.w / 2, 139, 10, 550, MUTED, 'center');
  for (const item of g.items) drawItem(ctx, item.stage, item.position.x, item.position.y, item.angle);
  drawPops(ctx, g);
  drawHud(ctx, g);
  drawStrip(ctx, g);
  drawToast(ctx, g);
  if (g.over) drawOver(ctx, g, vp);
}

export function stripHit(x: number, y: number): number | undefined {
  if (Math.abs(y - STRIP_Y) > 16) return;
  for (let i = 0; i < STAGES.length; i++) {
    if (Math.abs(x - (STRIP_X0 + i * STRIP_GAP)) <= 17) return i;
  }
}

function drawBin(ctx: CanvasRenderingContext2D, danger: boolean) {
  const { left, right, top, bottom } = BOX;
  panel(ctx, left, top - 14, right - left, bottom - top + 14, BIN, 8);
  ctx.fillStyle = '#dbe0cf';
  for (let x = left + 16; x < right; x += 16) {
    for (let y = top + 18; y < bottom; y += 16) ctx.fillRect(x, y, 1, 1);
  }
  ctx.strokeStyle = '#a5b49a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(left, top - 12);
  ctx.lineTo(left, bottom - 8);
  ctx.quadraticCurveTo(left, bottom, left + 8, bottom);
  ctx.lineTo(right - 8, bottom);
  ctx.quadraticCurveTo(right, bottom, right, bottom - 8);
  ctx.lineTo(right, top - 12);
  ctx.stroke();
  ctx.save();
  ctx.strokeStyle = danger ? ORANGE : '#b9ac8b';
  ctx.lineWidth = danger ? 2 : 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(left + 1, top);
  ctx.lineTo(right - 1, top);
  ctx.stroke();
  ctx.restore();
  if (danger) {
    panel(ctx, 126, top - 10, 108, 20, ORANGE, 3);
    text(ctx, '높이 초과', 180, top, 10, 650, PAPER, 'center');
  }
}

export function drawItem(ctx: CanvasRenderingContext2D, stage: number, x: number, y: number, angle: number, radius?: number) {
  const s = STAGES[stage];
  const r = radius ?? s.r;
  const rim = Math.max(1.5, r * 0.065);

  ctx.save();
  ctx.translate(x, y);

  const image = stageImages[stage];
  if (image?.complete && image.naturalWidth > 0) {
    const imageRadius = r * (STAGE_IMAGE_SCALES[stage] ?? 1);
    ctx.rotate(angle);
    ctx.shadowColor = 'rgba(22, 44, 37, .2)';
    ctx.shadowBlur = Math.max(1, r * .12);
    ctx.shadowOffsetY = Math.max(1, r * .06);
    ctx.drawImage(image, -imageRadius, -imageRadius, imageRadius * 2, imageRadius * 2);
    ctx.restore();
    return;
  }

  ctx.fillStyle = s.fill;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();

  ctx.save();
  ctx.clip();
  if (s.art !== 'bollard') ctx.rotate(angle);
  pattern(ctx, s.art, r);
  ctx.restore();

  ctx.strokeStyle = CREAM;
  ctx.lineWidth = rim;
  ctx.beginPath();
  ctx.arc(0, 0, r - rim / 2, 0, TAU);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, r - rim - 0.5, 0, TAU);
  ctx.stroke();

  ctx.restore();
}

function pattern(ctx: CanvasRenderingContext2D, art: StageArt, r: number) {
  switch (art) {
    case 'wasteTire':
      tire(ctx, r, 8, '#46464b', '#cfc8b6');
      ctx.fillStyle = '#5a5a60';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.2, 0, TAU);
      ctx.fill();
      break;
    case 'powder':
      for (const [a, d, size, light] of SPECKS) {
        ctx.fillStyle = light ? 'rgba(242, 234, 216, 0.3)' : 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(Math.cos(a * TAU) * d * r, Math.sin(a * TAU) * d * r, size * r, 0, TAU);
        ctx.fill();
      }
      break;
    case 'bollard':
      ctx.fillStyle = CREAM;
      ctx.fillRect(-r, -r * 0.5, r * 2, r * 0.2);
      ctx.fillRect(-r, r * 0.1, r * 2, r * 0.2);
      break;
    case 'tactileBlock':
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          ctx.beginPath();
          ctx.arc(i * r * 0.44, j * r * 0.44, r * 0.11, 0, TAU);
          ctx.fill();
        }
      }
      break;
    case 'planter':
      ctx.fillStyle = CREAM;
      ctx.beginPath();
      ctx.moveTo(0, r * 0.58);
      ctx.quadraticCurveTo(r * 0.68, r * 0.1, 0, -r * 0.58);
      ctx.quadraticCurveTo(-r * 0.68, r * 0.1, 0, r * 0.58);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = Math.max(1, r * 0.05);
      ctx.beginPath();
      ctx.moveTo(0, r * 0.52);
      ctx.lineTo(0, -r * 0.42);
      ctx.stroke();
      break;
    case 'playground': {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      const cell = r * 0.5;
      for (let i = -2; i < 2; i++) {
        for (let j = -2; j < 2; j++) {
          if ((i + j) % 2 === 0) ctx.fillRect(i * cell, j * cell, cell, cell);
        }
      }
      break;
    }
    case 'retreadTire':
      tire(ctx, r, 14, '#38383d', '#2a2a2e');
      grMark(ctx, r * 0.56);
      break;
    case 'roadBarrier':
      ctx.fillStyle = CREAM;
      ctx.fillRect(-r * .65, -r * .2, r * 1.3, r * .4);
      break;
    default: {
      const missingArt: never = art;
      throw new Error(`Unknown stage art: ${missingArt}`);
    }
  }
}

function tire(ctx: CanvasRenderingContext2D, r: number, lugs: number, lug: string, hub: string) {
  ctx.fillStyle = lug;
  for (let i = 0; i < lugs; i++) {
    ctx.save();
    ctx.rotate((i / lugs) * TAU);
    ctx.beginPath();
    ctx.roundRect(-r * 0.07, -r * 1.02, r * 0.14, r * 0.26, r * 0.04);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = hub;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.5, 0, TAU);
  ctx.fill();
}

export function grMark(ctx: CanvasRenderingContext2D, r: number) {
  if (grImage.complete && grImage.naturalWidth > 0) {
    const size = r * 1.8;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(grImage, -size / 2, -size / 2, size, size * grImage.naturalHeight / grImage.naturalWidth);
    ctx.restore();
  }
}

function drawPops(ctx: CanvasRenderingContext2D, g: Game) {
  for (const p of g.pops) {
    const t = (g.now - p.at) / POP_MS;
    if (t >= 1) continue;
    ctx.save();
    ctx.globalAlpha = .65 * (1 - t);
    ctx.strokeStyle = '#6a845a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * (1 + t * .55), 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

function drawHud(ctx: CanvasRenderingContext2D, g: Game) {
  text(ctx, '점수', 22, 21, 10, 600, MUTED);
  text(ctx, g.score.toLocaleString(), 20, 49, 36, 800);
  text(ctx, '최고 ' + Math.max(g.best, g.score).toLocaleString(), 338, 22, 10, 500, MUTED, 'right');
  panel(ctx, 263, 38, 75, 34, '#e8ecdf', 5);
  text(ctx, '다음', 275, 55, 10, 550, MUTED);
  drawItem(ctx, g.next, 320, 55, 0, 12);
  if (g.loops) text(ctx, '↻ ' + g.loops, 22, 87, 11, 650, ORANGE);
}

function drawStrip(ctx: CanvasRenderingContext2D, g: Game) {
  rule(ctx, STRIP_X0, STRIP_Y, STRIP_GAP * LAST);
  for (let i = 0; i < STAGES.length; i++) {
    const x = STRIP_X0 + i * STRIP_GAP;
    if (g.found.has(i)) drawItem(ctx, i, x, STRIP_Y, 0, 12);
    else {
      ctx.beginPath();
      ctx.arc(x, STRIP_Y, 11, 0, TAU);
      ctx.fillStyle = PAPER;
      ctx.fill();
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1;
      ctx.stroke();
      text(ctx, String(i + 1), x, STRIP_Y + .5, 9, 500, '#89917d', 'center');
    }
  }
  text(ctx, '↻', 326, STRIP_Y, 19, 500, MUTED, 'center');
}

function drawToast(ctx: CanvasRenderingContext2D, g: Game) {
  const t = g.toast;
  if (!t) return;
  const age = g.now - t.at;
  if (age > TOAST_MS) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, (TOAST_MS - age) / 400, age / 150);
  const y = BOX.top + 14;
  panel(ctx, 34, y + 2, 292, 72, '#263f3410');
  panel(ctx, 34, y, 292, 72);
  ctx.fillStyle = '#829b6b';
  ctx.fillRect(34, y + 9, 3, 54);
  if (t.kind === 'found') {
    const s = STAGES[t.stage];
    drawItem(ctx, t.stage, 63, y + 36, 0, 17);
    text(ctx, s.code ?? '1단계', 94, y + 24, 10, 600, MUTED);
    text(ctx, s.label, 94, y + 47, 15, 750);
  } else {
    text(ctx, '↻', 62, y + 36, 31, 500, ORANGE, 'center');
    text(ctx, '순환 ' + g.loops + '회', 92, y + 36, 14, 750);
  }
  ctx.restore();
}

function drawIntro(ctx: CanvasRenderingContext2D) {
  const cx = 180;
  const cy = 277;
  const spin = REDUCED_MOTION.matches ? 0 : performance.now() / 9000;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = '#c9d0bd';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 5]);
  ctx.lineDashOffset = spin * -24;
  ctx.beginPath();
  ctx.arc(0, 0, 140, 0, TAU);
  ctx.stroke();
  ctx.restore();

  const introRadii = [22, 18, 21, 22, 25, 26, 28, 32];
  const orbitCount = STAGES.length - 1;
  for (let i = 1; i < STAGES.length; i++) {
    const angle = spin + ((i - 1) / orbitCount) * TAU - Math.PI / 2;
    const x = cx + Math.cos(angle) * 140;
    const y = cy + Math.sin(angle) * 140;
    const sway = REDUCED_MOTION.matches ? 0 : Math.sin(spin * 2 + i) * .08;
    drawItem(ctx, i, x, y, sway, introRadii[i] ?? 24);
  }
  ctx.save();
  ctx.translate(cx, cy);
  grMark(ctx, 114);
  ctx.restore();
}

function drawOver(ctx: CanvasRenderingContext2D, g: Game, vp: Viewport) {
  ctx.fillStyle = 'rgba(38, 63, 52, .64)';
  ctx.fillRect(vp.x, vp.y, vp.w, vp.h);
  panel(ctx, 26, 104, 308, 445);
  ctx.fillStyle = '#829b6b';
  ctx.fillRect(26, 104, 308, 5);
  text(ctx, '결과', 44, 134, 10, 600, MUTED);
  text(ctx, '↻', 316, 134, 21, 500, INK, 'right');
  rule(ctx, 44, 154, 272);
  text(ctx, '게임 종료', 180, 191, 23, 800, INK, 'center');
  text(ctx, g.score.toLocaleString(), 180, 272, 53, 800, INK, 'center');
  text(ctx, '최고 기록 ' + g.best.toLocaleString(), 180, 314, 11, 550, MUTED, 'center');
  rule(ctx, 44, 338, 272);
  const made = [...g.found].filter((i) => STAGES[i].code).length;
  text(ctx, '도달한 제품', 44, 360, 11, 600);
  text(ctx, made + ' / ' + (STAGES.length - 1), 316, 360, 11, 600, MUTED, 'right');
  const resultGap = 232 / Math.max(1, STAGES.length - 2);
  for (let i = 1; i < STAGES.length; i++) {
    const x = 64 + (i - 1) * resultGap;
    if (g.found.has(i)) drawItem(ctx, i, x, 403, 0, 14);
    else {
      ctx.beginPath();
      ctx.arc(x, 403, 13, 0, TAU);
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1;
      ctx.stroke();
      text(ctx, '·', x, 403, 15, 500, MUTED, 'center');
    }
  }
}
