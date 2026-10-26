export type MatchStatus = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export class GameState {
  private _status: MatchStatus = 'MENU';
  private _kills = 0;
  private _score = 0;

  get status(): MatchStatus {
    return this._status;
  }

  get kills(): number {
    return this._kills;
  }

  get score(): number {
    return this._score;
  }

  startMatch(): void {
    this._status = 'PLAYING';
    this._kills = 0;
    this._score = 0;
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
}
