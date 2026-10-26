export class HealthState {
  private _current: number;
  private readonly _max: number;
  private readonly _invulnerabilityDuration: number;
  private _invulnerabilityTimer = 0;

  constructor(maxHealth = 100, invulnerabilityDuration = 0.8) {
    this._max = maxHealth;
    this._current = maxHealth;
    this._invulnerabilityDuration = invulnerabilityDuration;
  }

  get current(): number {
    return this._current;
  }

  get max(): number {
    return this._max;
  }

  get isAlive(): boolean {
    return this._current > 0;
  }

  get isInvulnerable(): boolean {
    return this._invulnerabilityTimer > 0;
  }

  takeDamage(amount: number): boolean {
    if (!this.isAlive || this.isInvulnerable || amount <= 0) {
      return false;
    }

    this._current = Math.max(0, this._current - amount);
    if (this._current > 0) {
      this._invulnerabilityTimer = this._invulnerabilityDuration;
    }
    return true;
  }

  update(dt: number): void {
    if (this._invulnerabilityTimer > 0) {
      this._invulnerabilityTimer = Math.max(0, this._invulnerabilityTimer - dt);
    }
  }

  reset(): void {
    this._current = this._max;
    this._invulnerabilityTimer = 0;
  }
}
