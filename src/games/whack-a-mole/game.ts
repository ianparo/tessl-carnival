import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const ROUND_SECONDS = 30;
export const POINTS_PER_WHACK = 10;
export const COLUMNS = 3;
export const ROWS = 3;
export const HOLE_RADIUS = 48;
/** Seconds between pop-ups at the start and at the end of a round. */
export const SPAWN_INTERVAL = { start: 1.0, end: 0.35 } as const;
/** Seconds a mole stays up at the start and at the end of a round. */
export const UP_TIME = { start: 1.2, end: 0.55 } as const;
const BONK_SECONDS = 0.25;

export interface Hole {
  x: number;
  y: number;
  /** Seconds the mole in this hole has left up, or 0 when the hole is empty. */
  up: number;
  /** Seconds left on the bonk animation after a whack. */
  bonk: number;
}

export interface WhackAMoleState {
  holes: Hole[];
  timeLeft: number;
  /** Seconds until the next mole pops up. */
  nextSpawn: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): WhackAMoleState {
  const top = 110;
  const rowGap = (HEIGHT - top - 70) / (ROWS - 1);
  const colGap = WIDTH / COLUMNS;
  const holes: Hole[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      holes.push({ x: colGap * col + colGap / 2, y: top + rowGap * row, up: 0, bonk: 0 });
    }
  }
  return {
    holes,
    timeLeft: ROUND_SECONDS,
    nextSpawn: SPAWN_INTERVAL.start,
    score: 0,
    phase: 'playing',
  };
}

/** How far through the round we are, from 0 at the start to 1 at the end. */
export function progress(state: WhackAMoleState): number {
  return Math.min(1, Math.max(0, 1 - state.timeLeft / ROUND_SECONDS));
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** Seconds between pop-ups right now: it shrinks as the round goes on. */
export function spawnInterval(state: WhackAMoleState): number {
  return lerp(SPAWN_INTERVAL.start, SPAWN_INTERVAL.end, progress(state));
}

/** Seconds a new mole stays up right now: it shrinks as the round goes on. */
export function upTime(state: WhackAMoleState): number {
  return lerp(UP_TIME.start, UP_TIME.end, progress(state));
}

/** Pops a mole up in a random empty hole. Returns false if every hole is busy. */
export function popUp(state: WhackAMoleState, random: () => number = Math.random): boolean {
  const empty = state.holes.filter((h) => h.up === 0 && h.bonk === 0);
  if (empty.length === 0) return false;
  const hole = empty[Math.min(empty.length - 1, Math.floor(random() * empty.length))];
  hole.up = upTime(state);
  return true;
}

export function isOnMole(hole: Hole, x: number, y: number): boolean {
  return hole.up > 0 && Math.hypot(x - hole.x, y - hole.y) <= HOLE_RADIUS;
}

/** Whacks at a point. Scores and returns true if a mole was up there. */
export function whack(state: WhackAMoleState, x: number, y: number): boolean {
  if (state.phase !== 'playing') return false;
  const hole = state.holes.find((h) => isOnMole(h, x, y));
  if (!hole) return false;
  hole.up = 0;
  hole.bonk = BONK_SECONDS;
  state.score += POINTS_PER_WHACK;
  return true;
}

/** Advances the game by `dt` seconds. */
export function step(state: WhackAMoleState, dt: number, random: () => number = Math.random): void {
  if (state.phase !== 'playing') return;

  for (const hole of state.holes) {
    hole.up = Math.max(0, hole.up - dt);
    hole.bonk = Math.max(0, hole.bonk - dt);
  }

  state.timeLeft = Math.max(0, state.timeLeft - dt);
  if (state.timeLeft === 0) {
    for (const hole of state.holes) hole.up = 0;
    state.phase = 'over';
    return;
  }

  state.nextSpawn -= dt;
  while (state.nextSpawn <= 0) {
    popUp(state, random);
    state.nextSpawn += spawnInterval(state);
  }
}

function draw(ctx: CanvasRenderingContext2D, state: WhackAMoleState) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  for (const hole of state.holes) {
    // The hole.
    ctx.fillStyle = colors.surface;
    ctx.beginPath();
    ctx.ellipse(hole.x, hole.y + 20, HOLE_RADIUS, HOLE_RADIUS * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (hole.up > 0 || hole.bonk > 0) {
      // Clip to above the hole's rim so the mole rises out of it.
      ctx.save();
      ctx.beginPath();
      ctx.rect(
        hole.x - HOLE_RADIUS,
        hole.y - HOLE_RADIUS * 2,
        HOLE_RADIUS * 2,
        HOLE_RADIUS * 2 + 20,
      );
      ctx.clip();
      const rise = hole.bonk > 0 ? hole.bonk / BONK_SECONDS : Math.min(1, hole.up / 0.15);
      const moleY = hole.y + 20 + HOLE_RADIUS * (1 - rise) - 10;
      ctx.fillStyle = colors.wood;
      ctx.beginPath();
      ctx.arc(hole.x, moleY, HOLE_RADIUS * 0.75, Math.PI, 0);
      ctx.lineTo(hole.x + HOLE_RADIUS * 0.75, moleY + HOLE_RADIUS);
      ctx.lineTo(hole.x - HOLE_RADIUS * 0.75, moleY + HOLE_RADIUS);
      ctx.fill();
      // Eyes, crossed out after a whack.
      ctx.fillStyle = hole.bonk > 0 ? colors.danger : colors.text;
      ctx.font = canvasFont('body', 'bold');
      ctx.textAlign = 'center';
      const eye = hole.bonk > 0 ? 'x' : '•';
      ctx.fillText(eye, hole.x - 12, moleY - 8);
      ctx.fillText(eye, hole.x + 12, moleY - 8);
      ctx.restore();
    }

    // The rim in front of the mole.
    ctx.fillStyle = colors.wood;
    ctx.fillRect(hole.x - HOLE_RADIUS - 6, hole.y + 20, HOLE_RADIUS * 2 + 12, 8);
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Time ${Math.ceil(state.timeLeft)}s`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Time's up! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const whackAMole: CarnivalGame = {
  id: 'whack-a-mole',
  name: 'Whack-a-Mole',
  description: 'Whack the moles before they duck back down. They get quicker as time runs out.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;

    const onDown = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
      const y = ((event.clientY - rect.top) / rect.height) * HEIGHT;
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        whack(state, x, y);
      }
    };
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't skip the round.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(whackAMole.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default whackAMole;
