import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../src/core/GameState';

describe('GameState', () => {
  let state: GameState;

  beforeEach(() => {
    state = new GameState();
  });

  it('starts in MENU status with 0 kills and 0 score', () => {
    expect(state.status).toBe('MENU');
    expect(state.kills).toBe(0);
    expect(state.score).toBe(0);
  });

  it('transitions through start, pause, resume, and gameOver properly', () => {
    state.startMatch();
    expect(state.status).toBe('PLAYING');

    state.pauseMatch();
    expect(state.status).toBe('PAUSED');

    state.resumeMatch();
    expect(state.status).toBe('PLAYING');

    state.triggerGameOver();
    expect(state.status).toBe('GAME_OVER');
  });

  it('ignores pauseMatch when not PLAYING', () => {
    state.pauseMatch();
    expect(state.status).toBe('MENU');
  });

  it('records enemy kills and increments score', () => {
    state.startMatch();
    state.recordKill(100);
    state.recordKill(150);
    expect(state.kills).toBe(2);
    expect(state.score).toBe(250);
  });

  it('resets kills and score when starting a new match after game over', () => {
    state.startMatch();
    state.recordKill(100);
    state.triggerGameOver();
    state.startMatch();

    expect(state.status).toBe('PLAYING');
    expect(state.kills).toBe(0);
    expect(state.score).toBe(0);
  });
});
