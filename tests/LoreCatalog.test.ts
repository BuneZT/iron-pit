import { describe, it, expect } from 'vitest';
import { LoreCatalog } from '../src/core/LoreCatalog';

describe('LoreCatalog', () => {
  it('provides a compelling non-empty intro subtitle mentioning Mor\'gath and the seal', () => {
    expect(LoreCatalog.INTRO_SUBTITLE).toContain("Mor'gath");
    expect(LoreCatalog.INTRO_SUBTITLE).toContain('ten onslaughts');
  });

  it('contains the three chronicle chapters with titles and bodies', () => {
    expect(LoreCatalog.CHRONICLE_CHAPTERS.length).toBe(3);
    expect(LoreCatalog.CHRONICLE_CHAPTERS[0].title).toBe('I. THE DESECRATED SLEEP');
    expect(LoreCatalog.CHRONICLE_CHAPTERS[1].title).toBe("II. THE SOVEREIGN'S TETHER");
    expect(LoreCatalog.CHRONICLE_CHAPTERS[2].title).toBe('III. THE TENTH BELL');
    for (const chapter of LoreCatalog.CHRONICLE_CHAPTERS) {
      expect(chapter.body.length).toBeGreaterThan(50);
    }
  });

  it('returns appropriate wave whispers for waves 1 through 10 and endless waves', () => {
    expect(LoreCatalog.getWaveWhisper(1)).toContain("Sovereign's essence");
    expect(LoreCatalog.getWaveWhisper(5)).toContain('The entity bleeds');
    expect(LoreCatalog.getWaveWhisper(10)).toContain('tether shatters');
    expect(LoreCatalog.getWaveWhisper(11)).toContain('hunt never ends');
    expect(LoreCatalog.getWaveWhisper(99)).toContain('hunt never ends');
  });

  it('formats game over defeat message with wave, kills, and Mor\'gath curse flavor', () => {
    const msg = LoreCatalog.getGameOverMessage(4, 18, 1800);
    expect(msg).toContain('Wave 4');
    expect(msg).toContain('18 hostiles');
    expect(msg).toContain("Mor'gath's curse knits your broken bones");
  });

  it('provides victory message for breaking the seal', () => {
    expect(LoreCatalog.getVictoryTitle()).toBe('SEAL SHATTERED');
    expect(LoreCatalog.getVictorySubtitle()).toContain('Ten bells have tolled');
  });
});
