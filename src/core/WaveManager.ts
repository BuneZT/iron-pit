export interface WaveConfig {
  spawnInterval: number;
  waveBreatherDuration: number;
}

export class WaveManager {
  private readonly config: WaveConfig;
  private _currentWave = 0;
  private _totalForWave = 0;
  private _toSpawnCount = 0;
  private _remainingEnemies = 0;
  private _spawnTimer = 0;
  private _breatherTimer = 0;
  private _isInBreather = false;

  constructor(
    config: WaveConfig = {
      spawnInterval: 0.8,
      waveBreatherDuration: 3.0,
    }
  ) {
    this.config = config;
  }

  get currentWave(): number {
    return this._currentWave;
  }

  get totalForWave(): number {
    return this._totalForWave;
  }

  get remainingEnemies(): number {
    return this._remainingEnemies;
  }

  get isInBreather(): boolean {
    return this._isInBreather;
  }

  static computeWaveEnemyCount(waveNumber: number): number {
    return 3 + 2 * waveNumber;
  }

  startFirstWave(): void {
    this.startWave(1);
  }

  private startWave(waveNumber: number): void {
    this._currentWave = waveNumber;
    const count = WaveManager.computeWaveEnemyCount(waveNumber);
    this._totalForWave = count;
    this._toSpawnCount = count;
    this._remainingEnemies = count;
    this._spawnTimer = 0;
    this._breatherTimer = 0;
    this._isInBreather = false;
  }

  onEnemyKilled(): void {
    if (this._remainingEnemies > 0) {
      this._remainingEnemies -= 1;
      if (this._remainingEnemies === 0) {
        this._isInBreather = true;
        this._breatherTimer = this.config.waveBreatherDuration;
      }
    }
  }

  /**
   * Updates wave spawn queue or breather timer.
   * Returns the number of enemies that should be spawned on this tick.
   */
  update(dt: number): number {
    if (this._currentWave === 0) {
      return 0;
    }

    if (this._isInBreather) {
      this._breatherTimer -= dt;
      if (this._breatherTimer <= 0) {
        this.startWave(this._currentWave + 1);
      }
      return 0;
    }

    if (this._toSpawnCount <= 0) {
      return 0;
    }

    this._spawnTimer -= dt;
    let spawnedNow = 0;
    while (this._toSpawnCount > 0 && this._spawnTimer <= 0) {
      this._toSpawnCount -= 1;
      spawnedNow += 1;
      this._spawnTimer += this.config.spawnInterval;
    }

    return spawnedNow;
  }

  reset(): void {
    this._currentWave = 0;
    this._totalForWave = 0;
    this._toSpawnCount = 0;
    this._remainingEnemies = 0;
    this._spawnTimer = 0;
    this._breatherTimer = 0;
    this._isInBreather = false;
  }
}
