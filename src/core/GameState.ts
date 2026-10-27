export type MatchStatus = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export class GameState {
  private _status: MatchStatus = 'MENU';
  private _kills = 0;
  private _score = 0;
  private _isCurseBroken = false;
  private _hasEscaped = false;

  get status(): MatchStatus {
    return this._status;
  }

  get kills(): number {
    return this._kills;
  }

  get score(): number {
    return this._score;
  }

  get isCurseBroken(): boolean {
    return this._isCurseBroken;
  }

  get hasEscaped(): boolean {
    return this._hasEscaped;
  }

  startMatch(): void {
    this._status = 'PLAYING';
    this._kills = 0;
    this._score = 0;
    this._isCurseBroken = false;
    this._hasEscaped = false;
  }

  pauseMatch(): void {
    if (this._status === 'PLAYING') {
      this._status = 'PAUSED';
    }
  }

  resumeMatch(): void {
    if (this._status === 'PAUSED') {
      this._status = 'PLAYING';
    }
  }

  triggerGameOver(): void {
    this._status = 'GAME_OVER';
  }

  recordKill(points = 100): void {
    this._kills += 1;
    this._score += points;
  }

  checkWaveMilestone(wave: number): void {
    if (wave >= 10) {
      this._isCurseBroken = true;
    }
  }

  escapePit(): void {
    if (this._isCurseBroken) {
      this._hasEscaped = true;
      this._status = 'MENU';
    }
  }
}
