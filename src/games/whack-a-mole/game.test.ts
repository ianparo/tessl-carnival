import { describe, expect, it } from 'vitest';
import {
  COLUMNS,
  POINTS_PER_WHACK,
  ROUND_SECONDS,
  ROWS,
  createState,
  popUp,
  spawnInterval,
  step,
  upTime,
  whack,
} from './game';

describe('whack-a-mole', () => {
  it('starts with a full clock, no score and every hole empty', () => {
    const state = createState();
    expect(state.timeLeft).toBe(ROUND_SECONDS);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.holes).toHaveLength(COLUMNS * ROWS);
    expect(state.holes.every((h) => h.up === 0)).toBe(true);
  });

  it('pops a mole up in an empty hole', () => {
    const state = createState();
    expect(popUp(state, () => 0)).toBe(true);
    expect(state.holes[0].up).toBe(upTime(state));
  });

  it('cannot pop up a mole when every hole is busy', () => {
    const state = createState();
    for (const hole of state.holes) hole.up = 1;
    expect(popUp(state)).toBe(false);
  });

  it('scores for whacking a mole that is up, and sends it down', () => {
    const state = createState();
    const hole = state.holes[4];
    hole.up = 1;
    expect(whack(state, hole.x, hole.y)).toBe(true);
    expect(state.score).toBe(POINTS_PER_WHACK);
    expect(hole.up).toBe(0);
  });

  it('scores nothing for whacking an empty hole', () => {
    const state = createState();
    const hole = state.holes[4];
    expect(whack(state, hole.x, hole.y)).toBe(false);
    expect(state.score).toBe(0);
  });

  it('scores nothing for whacking a mole twice', () => {
    const state = createState();
    const hole = state.holes[4];
    hole.up = 1;
    whack(state, hole.x, hole.y);
    expect(whack(state, hole.x, hole.y)).toBe(false);
    expect(state.score).toBe(POINTS_PER_WHACK);
  });

  it('drops a mole back down once its time is up', () => {
    const state = createState();
    state.nextSpawn = 100;
    state.holes[0].up = 0.5;
    step(state, 0.6);
    expect(state.holes[0].up).toBe(0);
  });

  it('pops moles up more often and for less time as the round goes on', () => {
    const state = createState();
    const early = { interval: spawnInterval(state), up: upTime(state) };
    state.timeLeft = ROUND_SECONDS / 4;
    expect(spawnInterval(state)).toBeLessThan(early.interval);
    expect(upTime(state)).toBeLessThan(early.up);
  });

  it('pops a mole up when the spawn timer runs out', () => {
    const state = createState();
    step(state, state.nextSpawn, () => 0);
    expect(state.holes.filter((h) => h.up > 0)).toHaveLength(1);
  });

  it('ends the round when the clock runs out, with every mole down', () => {
    const state = createState();
    state.timeLeft = 0.1;
    state.holes[0].up = 1;
    step(state, 0.2);
    expect(state.phase).toBe('over');
    expect(state.holes[0].up).toBe(0);
  });

  it('ignores whacks once the round is over', () => {
    const state = createState();
    const hole = state.holes[0];
    hole.up = 1;
    state.phase = 'over';
    expect(whack(state, hole.x, hole.y)).toBe(false);
    expect(state.score).toBe(0);
  });
});
