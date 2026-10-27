import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HUDController, HUDSnapshot } from '../src/ui/HUDController';
import { LoreCatalog } from '../src/core/LoreCatalog';

class MockElement {
  id: string;
  textContent: string | null = '';
  value: string = '';
  style: Record<string, string> = {};
  classes = new Set<string>();
  listeners: Record<string, ((...args: any[]) => void)[]> = {};

  constructor(id: string) {
    this.id = id;
  }

  get classList() {
    return {
      add: (cls: string) => this.classes.add(cls),
      remove: (cls: string) => this.classes.delete(cls),
      contains: (cls: string) => this.classes.has(cls),
      toggle: (cls: string) => {
        if (this.classes.has(cls)) this.classes.delete(cls);
        else this.classes.add(cls);
      }
    };
  }

  addEventListener(event: string, handler: (...args: any[]) => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(handler);
  }

  click() {
    this.listeners['click']?.forEach((fn) => fn({ target: this }));
  }

  blur() {}
}

describe('HUDController Lore Integration', () => {
  let elements: Record<string, MockElement>;
  let windowListeners: Record<string, ((e: any) => void)[]>;
  let actionCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    elements = {};
    windowListeners = {};

    const elementIds = [
      'waveValue',
      'enemiesLabel',
      'enemiesValue',
      'killsValue',
      'healthText',
      'healthBarFill',
      'ammoValue',
      'reloadHint',
      'crosshair',
      'damageVignette',
      'modalOverlay',
      'modalTitle',
      'modalSubtitle',
      'actionButton',
      'chronicleButton',
      'chronicleModal',
      'chronicleCloseButton',
      'waveWhisper',
      'masterVolSlider',
      'masterVolValue',
      'musicVolSlider',
      'musicVolValue',
      'sfxVolSlider',
      'sfxVolValue',
      'muteButton'
    ];

    for (const id of elementIds) {
      elements[id] = new MockElement(id);
    }
    elements['chronicleModal'].classList.add('hidden');

    (globalThis as any).document = {
      getElementById: (id: string) => elements[id] ?? null
    };

    (globalThis as any).window = {
      addEventListener: (event: string, handler: any) => {
        if (!windowListeners[event]) windowListeners[event] = [];
        windowListeners[event].push(handler);
      },
      clearTimeout: vi.fn(),
      setTimeout: vi.fn()
    };

    actionCallback = vi.fn();
  });

  it('updates start menu subtitle with LoreCatalog.INTRO_SUBTITLE', () => {
    const hud = new HUDController(actionCallback);
    const snapshot: HUDSnapshot = {
      status: 'MENU',
      wave: 1,
      remainingEnemies: 5,
      isInBreather: false,
      kills: 0,
      score: 0,
      hp: 100,
      maxHp: 100,
      ammo: 12,
      magazineSize: 12,
      isReloading: false
    };
    hud.update(snapshot);
    expect(elements['modalSubtitle'].textContent).toBe(LoreCatalog.INTRO_SUBTITLE);
  });

  it('updates game over subtitle with LoreCatalog defeat message', () => {
    const hud = new HUDController(actionCallback);
    const snapshot: HUDSnapshot = {
      status: 'GAME_OVER',
      wave: 3,
      remainingEnemies: 0,
      isInBreather: false,
      kills: 14,
      score: 1400,
      hp: 0,
      maxHp: 100,
      ammo: 0,
      magazineSize: 12,
      isReloading: false
    };
    hud.update(snapshot);
    expect(elements['modalSubtitle'].textContent).toBe(LoreCatalog.getGameOverMessage(3, 14, 1400));
  });

  it('displays wave whisper during breather and hides it during active combat', () => {
    const hud = new HUDController(actionCallback);
    const breatherSnapshot: HUDSnapshot = {
      status: 'PLAYING',
      wave: 2,
      remainingEnemies: 0,
      isInBreather: true,
      kills: 5,
      score: 500,
      hp: 100,
      maxHp: 100,
      ammo: 12,
      magazineSize: 12,
      isReloading: false
    };
    hud.update(breatherSnapshot);
    expect(elements['waveWhisper'].textContent).toBe(LoreCatalog.getWaveWhisper(2));
    expect(elements['waveWhisper'].classList.contains('visible')).toBe(true);

    const combatSnapshot: HUDSnapshot = {
      ...breatherSnapshot,
      isInBreather: false,
      remainingEnemies: 7
    };
    hud.update(combatSnapshot);
    expect(elements['waveWhisper'].classList.contains('visible')).toBe(false);
  });

  it('opens and closes Chronicle modal via buttons', () => {
    const hud = new HUDController(actionCallback);
    expect(elements['chronicleModal'].classList.contains('hidden')).toBe(true);

    elements['chronicleButton'].click();
    expect(elements['chronicleModal'].classList.contains('hidden')).toBe(false);

    elements['chronicleCloseButton'].click();
    expect(elements['chronicleModal'].classList.contains('hidden')).toBe(true);
  });

  it('closes Chronicle modal on Escape key', () => {
    const hud = new HUDController(actionCallback);
    elements['chronicleButton'].click();
    expect(elements['chronicleModal'].classList.contains('hidden')).toBe(false);

    windowListeners['keydown']?.forEach((fn) => fn({ key: 'Escape' }));
    expect(elements['chronicleModal'].classList.contains('hidden')).toBe(true);
  });
});
