import { describe, it, expect, beforeEach } from 'vitest';
import { HealthState } from '../src/core/HealthState';

describe('HealthState', () => {
  let health: HealthState;

  beforeEach(() => {
    health = new HealthState(100, 0.8);
  });

  it('initializes with full health and not invulnerable', () => {
    expect(health.current).toBe(100);
    expect(health.max).toBe(100);
    expect(health.isAlive).toBe(true);
    expect(health.isInvulnerable).toBe(false);
  });

  it('applies damage and enters invulnerability window', () => {
    const damaged = health.takeDamage(15);
    expect(damaged).toBe(true);
    expect(health.current).toBe(85);
    expect(health.isInvulnerable).toBe(true);
  });

  it('blocks subsequent damage while invulnerable until timer expires', () => {
    health.takeDamage(15);
    expect(health.takeDamage(15)).toBe(false);
    expect(health.current).toBe(85);

    health.update(0.5);
    expect(health.isInvulnerable).toBe(true);
    expect(health.takeDamage(15)).toBe(false);

    health.update(0.35);
    expect(health.isInvulnerable).toBe(false);
    expect(health.takeDamage(15)).toBe(true);
    expect(health.current).toBe(70);
  });

  it('clamps health at 0 and marks isAlive false on lethal damage', () => {
    const fatalHealth = new HealthState(20, 0.8);
    fatalHealth.takeDamage(35);
    expect(fatalHealth.current).toBe(0);
    expect(fatalHealth.isAlive).toBe(false);
    expect(fatalHealth.takeDamage(10)).toBe(false);
  });

  it('resets health and clears invulnerability timer', () => {
    health.takeDamage(40);
    health.reset();
    expect(health.current).toBe(100);
    expect(health.isInvulnerable).toBe(false);
    expect(health.isAlive).toBe(true);
  });
});
