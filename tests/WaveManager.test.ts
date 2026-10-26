import { describe, it, expect, beforeEach } from 'vitest';
import { WaveManager } from '../src/core/WaveManager';

describe('WaveManager', () => {
  let waves: WaveManager;

  beforeEach(() => {
    waves = new WaveManager({
      spawnInterval: 0.8,
      waveBreatherDuration: 3.0,
    });
  });

  it('starts wave 1 with 5 enemies queued (3 + 2 * 1)', () => {
    waves.startFirstWave();
    expect(waves.currentWave).toBe(1);
    expect(waves.totalForWave).toBe(5);
    expect(waves.remainingEnemies).toBe(5);
    expect(waves.isInBreather).toBe(false);
  });

  it('spawns enemies at the configured interval until queue is empty', () => {
    waves.startFirstWave();

    // First enemy spawns immediately on first update tick
    expect(waves.update(0.016)).toBe(1);
    expect(waves.update(0.4)).toBe(0);
    expect(waves.update(0.4)).toBe(1);
    expect(waves.update(0.8)).toBe(1);
    expect(waves.update(0.8)).toBe(1);
    expect(waves.update(0.8)).toBe(1);
    // All 5 spawned
    expect(waves.update(0.8)).toBe(0);
  });

  it('transitions to breather when all enemies in wave are killed, then starts wave 2 with 7 enemies', () => {
    waves.startFirstWave();
    for (let i = 0; i < 5; i++) {
      waves.onEnemyKilled();
    }
    expect(waves.remainingEnemies).toBe(0);
    expect(waves.isInBreather).toBe(true);

    waves.update(1.5);
    expect(waves.currentWave).toBe(1);
    expect(waves.isInBreather).toBe(true);

    waves.update(1.6);
    expect(waves.isInBreather).toBe(false);
    expect(waves.currentWave).toBe(2);
    expect(waves.totalForWave).toBe(7);
    expect(waves.remainingEnemies).toBe(7);
  });

  it('resets back to initial state on reset()', () => {
    waves.startFirstWave();
    waves.onEnemyKilled();
    waves.reset();
    expect(waves.currentWave).toBe(0);
    expect(waves.remainingEnemies).toBe(0);
  });
});
