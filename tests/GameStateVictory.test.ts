import { describe, it, expect } from 'vitest';
import { GameState } from '../src/core/GameState';

describe('GameState Curse & Victory Logic', () => {
  it('tracks whether curse has been broken when reaching or passing wave 10', () => {
    const gs = new GameState();
    gs.startMatch();
    expect(gs.isCurseBroken).toBe(false);
    expect(gs.hasEscaped).toBe(false);

    gs.checkWaveMilestone(9);
    expect(gs.isCurseBroken).toBe(false);

    gs.checkWaveMilestone(10);
    expect(gs.isCurseBroken).toBe(true);

    gs.checkWaveMilestone(11);
    expect(gs.isCurseBroken).toBe(true);
  });

  it('allows player to escape the pit once curse is broken', () => {
    const gs = new GameState();
    gs.startMatch();
    gs.checkWaveMilestone(10);
    expect(gs.isCurseBroken).toBe(true);

    gs.escapePit();
    expect(gs.hasEscaped).toBe(true);
    expect(gs.status).toBe('MENU');
  });

  it('resets curse broken and escape status upon startMatch', () => {
    const gs = new GameState();
    gs.startMatch();
    gs.checkWaveMilestone(10);
    gs.escapePit();
    expect(gs.hasEscaped).toBe(true);

    gs.startMatch();
    expect(gs.isCurseBroken).toBe(false);
    expect(gs.hasEscaped).toBe(false);
  });
});
