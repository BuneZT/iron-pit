export interface WeaponConfig {
  magazineSize: number;
  fireCooldown: number;
  reloadDuration: number;
  damage: number;
}

export type FireResult = 'FIRED' | 'COOLDOWN' | 'EMPTY' | 'RELOADING';

export class WeaponState {
  private readonly config: WeaponConfig;
  private _ammo: number;
  private _cooldownTimer = 0;
  private _reloadTimer = 0;
  private _isReloading = false;

  constructor(
    config: WeaponConfig = {
      magazineSize: 12,
      fireCooldown: 0.25,
      reloadDuration: 1.2,
      damage: 35,
    }
  ) {
    this.config = config;
    this._ammo = config.magazineSize;
  }

  get ammo(): number {
    return this._ammo;
  }

  get magazineSize(): number {
    return this.config.magazineSize;
  }

  get damage(): number {
    return this.config.damage;
  }

  get isReloading(): boolean {
    return this._isReloading;
  }

  canFire(): boolean {
    return !this._isReloading && this._cooldownTimer <= 0 && this._ammo > 0;
  }

  tryFire(): FireResult {
    if (this._isReloading) {
      return 'RELOADING';
    }
    if (this._ammo <= 0) {
      return 'EMPTY';
    }
    if (this._cooldownTimer > 0) {
      return 'COOLDOWN';
    }

    this._ammo -= 1;
    this._cooldownTimer = this.config.fireCooldown;
    return 'FIRED';
  }

  startReload(): boolean {
    if (this._isReloading || this._ammo >= this.config.magazineSize) {
      return false;
    }

    this._isReloading = true;
    this._reloadTimer = this.config.reloadDuration;
    return true;
  }

  /**
   * Advances cooldown and reload timers.
   * Returns true if a reload completed on this tick.
   */
  update(dt: number): boolean {
    if (this._cooldownTimer > 0) {
      this._cooldownTimer = Math.max(0, this._cooldownTimer - dt);
    }

    if (this._isReloading) {
      this._reloadTimer -= dt;
      if (this._reloadTimer <= 0) {
        this._reloadTimer = 0;
        this._isReloading = false;
        this._ammo = this.config.magazineSize;
        return true;
      }
    }

    return false;
  }

  reset(): void {
    this._ammo = this.config.magazineSize;
    this._cooldownTimer = 0;
    this._reloadTimer = 0;
    this._isReloading = false;
  }
}
