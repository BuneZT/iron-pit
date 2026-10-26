import { describe, it, expect, beforeEach } from 'vitest';
import { WeaponState } from '../src/core/WeaponState';

describe('WeaponState', () => {
  let weapon: WeaponState;

  beforeEach(() => {
    weapon = new WeaponState({
      magazineSize: 12,
      fireCooldown: 0.25,
      reloadDuration: 1.2,
      damage: 35,
    });
  });

  it('starts with a full magazine and ready to fire', () => {
    expect(weapon.ammo).toBe(12);
    expect(weapon.magazineSize).toBe(12);
    expect(weapon.damage).toBe(35);
    expect(weapon.isReloading).toBe(false);
    expect(weapon.canFire()).toBe(true);
  });

  it('decrements ammo and enforces fire cooldown on tryFire()', () => {
    expect(weapon.tryFire()).toBe('FIRED');
    expect(weapon.ammo).toBe(11);
    expect(weapon.canFire()).toBe(false);
    expect(weapon.tryFire()).toBe('COOLDOWN');

    weapon.update(0.25);
    expect(weapon.canFire()).toBe(true);
    expect(weapon.tryFire()).toBe('FIRED');
    expect(weapon.ammo).toBe(10);
  });

  it('returns EMPTY when magazine reaches 0 and does not fire', () => {
    for (let i = 0; i < 12; i++) {
      expect(weapon.tryFire()).toBe('FIRED');
      weapon.update(0.25);
    }
    expect(weapon.ammo).toBe(0);
    expect(weapon.tryFire()).toBe('EMPTY');
  });

  it('reloads magazine after reloadDuration and blocks firing while reloading', () => {
    weapon.tryFire();
    weapon.update(0.25);
    expect(weapon.ammo).toBe(11);

    expect(weapon.startReload()).toBe(true);
    expect(weapon.isReloading).toBe(true);
    expect(weapon.tryFire()).toBe('RELOADING');

    weapon.update(0.6);
    expect(weapon.isReloading).toBe(true);
    expect(weapon.ammo).toBe(11);

    const finished = weapon.update(0.6);
    expect(finished).toBe(true);
    expect(weapon.isReloading).toBe(false);
    expect(weapon.ammo).toBe(12);
  });

  it('does not start reload if magazine is already full or already reloading', () => {
    expect(weapon.startReload()).toBe(false);
    weapon.tryFire();
    expect(weapon.startReload()).toBe(true);
    expect(weapon.startReload()).toBe(false);
  });
});
