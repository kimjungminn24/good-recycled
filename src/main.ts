import './style.css';
import { Game, VIEW } from './game';
import { draw, DISPLAY, FONT, START_BTN, RESTART_BTN, LINK_BTN, stripHit, type Viewport } from './render';
import { STAGES } from './stages';

const BEST_KEY = 'gr-best';
const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const stage = document.querySelector<HTMLDivElement>('.game-stage')!;
const startButton = document.querySelector<HTMLButtonElement>('#start')!;
const restartButton = document.querySelector<HTMLButtonElement>('#restart')!;
const productsLink = document.querySelector<HTMLAnchorElement>('#products')!;
const status = document.querySelector<HTMLParagraphElement>('#game-status')!;
const celebration = document.querySelector<HTMLDivElement>('#celebration')!;
const ctx = canvas.getContext('2d')!;
const game = new Game();
game.best = loadBest();
let successPrompted = false;

const successDialog = document.querySelector<HTMLDialogElement>('#success-dialog')!;
const successContinueButton = document.querySelector<HTMLButtonElement>('#success-continue')!;
const successProducts = document.querySelector<HTMLUListElement>('#success-products')!;
for (const product of STAGES.slice(1)) {
  const item = document.createElement('li');
  const code = document.createElement('span');
  const name = document.createElement('strong');
  code.textContent = product.code ?? '';
  name.textContent = product.name;
  item.append(code, name);
  successProducts.append(item);
}

function openSuccess() {
  activePointer = undefined;
  game.paused = true;
  celebration.hidden = true;
  successDialog.showModal();
  successDialog.focus({ preventScroll: true });
}

function celebrateSuccess() {
  activePointer = undefined;
  game.paused = true;
  celebration.replaceChildren();
  celebration.hidden = false;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const colors = ['#d45d32', '#f1c94d', '#6b9257', '#f8f6ee', '#74a6a1'];
  const origins = [[20, 39], [50, 27], [80, 41]];
  const particleCount = reducedMotion ? 8 : 20;

  for (const [burstIndex, [x, y]] of origins.entries()) {
    for (let i = 0; i < particleCount; i += 1) {
      const particle = document.createElement('i');
      const angle = (Math.PI * 2 * i) / particleCount + burstIndex * 0.35;
      const distance = 42 + (i % 5) * 9;
      particle.style.setProperty('--x', `${x}%`);
      particle.style.setProperty('--y', `${y}%`);
      particle.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
      particle.style.setProperty('--ty', `${Math.sin(angle) * distance}px`);
      particle.style.setProperty('--delay', `${burstIndex * 180 + (i % 4) * 24}ms`);
      particle.style.setProperty('--color', colors[(i + burstIndex) % colors.length]);
      particle.style.setProperty('--size', `${4 + (i % 3) * 2}px`);
      celebration.append(particle);
    }
  }

  const message = document.createElement('strong');
  message.textContent = '자원순환 성공!';
  celebration.append(message);
  window.setTimeout(openSuccess, reducedMotion ? 900 : 2200);
}

successContinueButton.addEventListener('click', () => successDialog.close());
document.querySelector('#success-close')!.addEventListener('click', () => successDialog.close());
successDialog.addEventListener('close', () => {
  game.paused = false;
  canvas.focus({ preventScroll: true });
  syncControls();
});

const helpDialog = document.querySelector<HTMLDialogElement>('#help-dialog')!;
const helpButton = document.querySelector<HTMLButtonElement>('#help-open')!;
helpButton.addEventListener('click', () => {
  if (successDialog.open || helpDialog.open) return;
  activePointer = undefined;
  game.paused = true;
  helpDialog.showModal();
});
document.querySelector('#help-close')!.addEventListener('click', () => helpDialog.close());
helpDialog.addEventListener('close', () => {
  game.paused = false;
  (game.started ? canvas : helpButton).focus({ preventScroll: true });
});

Promise.all([
  document.fonts.load(`400 16px ${FONT}`, '재활용 고무 타이어'),
  document.fonts.load(`400 64px ${DISPLAY}`, '한 바퀴 0123456789'),
]).catch(() => {});

let scale = 1;
let ox = 0;
let oy = 0;
const vp: Viewport = { x: 0, y: 0, w: VIEW.w, h: VIEW.h };
const controls = [[startButton, START_BTN], [restartButton, RESTART_BTN], [productsLink, LINK_BTN]] as const;

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  scale = Math.min(w / VIEW.w, h / VIEW.h);
  ox = (w - VIEW.w * scale) / 2;
  oy = (h - VIEW.h * scale) / 2;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, ox * dpr, oy * dpr);
  vp.x = -ox / scale;
  vp.y = -oy / scale;
  vp.w = w / scale;
  vp.h = h / scale;
  stage.style.setProperty('--game-scale', String(scale));
  for (const [element, rect] of controls) {
    element.style.left = `${ox + rect.x * scale}px`;
    element.style.top = `${oy + rect.y * scale}px`;
    element.style.width = `${rect.w * scale}px`;
    element.style.height = `${rect.h * scale}px`;
  }
}

function toView(e: PointerEvent) {
  const bounds = canvas.getBoundingClientRect();
  return { x: (e.clientX - bounds.left - ox) / scale, y: (e.clientY - bounds.top - oy) / scale };
}

function start() {
  if (game.started) return;
  game.start();
  canvas.focus({ preventScroll: true });
  syncControls();
}
function restart() {
  if (!game.canRestart()) return;
  game.reset();
  successPrompted = false;
  canvas.focus({ preventScroll: true });
  syncControls();
}
startButton.addEventListener('click', start);
restartButton.addEventListener('click', restart);

let activePointer: number | undefined;
canvas.addEventListener('pointerdown', (e) => {
  if (!game.started || game.over || game.paused || !e.isPrimary || e.button !== 0) return;
  const { x, y } = toView(e);
  const hit = stripHit(x, y);
  if (hit !== undefined) {
    game.showStage(hit);
    return;
  }
  if (x < 0 || x > VIEW.w || y < 76 || y > 602) return;
  activePointer = e.pointerId;
  canvas.setPointerCapture(e.pointerId);
  game.holdX = x;
});
canvas.addEventListener('pointermove', (e) => {
  if (e.isPrimary && (activePointer === e.pointerId || e.pointerType === 'mouse')) game.holdX = toView(e).x;
});
canvas.addEventListener('pointerup', (e) => {
  if (activePointer !== e.pointerId) return;
  activePointer = undefined;
  if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  game.holdX = toView(e).x;
  game.drop();
});
canvas.addEventListener('pointercancel', () => { activePointer = undefined; });
canvas.addEventListener('lostpointercapture', () => { activePointer = undefined; });
canvas.addEventListener('keydown', (e) => {
  if (game.paused) return;
  if (!['ArrowLeft', 'ArrowRight', ' ', 'Enter'].includes(e.key)) return;
  e.preventDefault();
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    game.holdX = game.clampX(game.holdX + (e.key === 'ArrowLeft' ? -12 : 12), game.current);
  } else if (!e.repeat) {
    if (!game.started) start();
    else if (game.over) restart();
    else game.drop();
  }
});

let lastState = '';
function syncControls() {
  const state = !game.started ? 'intro' : game.over ? 'over' : 'playing';
  if (state !== lastState) {
    startButton.hidden = state !== 'intro';
    helpButton.hidden = state !== 'intro';
    restartButton.hidden = productsLink.hidden = state !== 'over';
    canvas.style.cursor = state === 'playing' ? 'crosshair' : 'default';
    status.textContent = state === 'over'
      ? `게임 종료. 점수 ${game.score}, 최고 기록 ${game.best}. 한 번 더 하기로 다시 시작할 수 있습니다.`
      : state === 'playing' ? '게임 시작. 같은 조각을 합쳐보세요.' : '';
    lastState = state;
  }
  restartButton.disabled = !game.canRestart();
}
new ResizeObserver(resize).observe(stage);
window.addEventListener('resize', resize);
resize();
let last = performance.now();
function frame(t: number) {
  const wasOver = game.over;
  game.update(t - last);
  last = t;
  if (game.finalReached && !successPrompted) {
    successPrompted = true;
    celebrateSuccess();
  }
  if (!wasOver && game.over) saveBest(game.best);
  syncControls();
  draw(ctx, game, vp);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

function loadBest(): number {
  try {
    const value = Number(localStorage.getItem(BEST_KEY));
    return Number.isFinite(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}
function saveBest(n: number) {
  try { localStorage.setItem(BEST_KEY, String(n)); } catch {}
}
