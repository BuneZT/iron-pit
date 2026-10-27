# Game Lore and Narrative Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the grim gothic lore of Mor'gath the Ash Sovereign into *Iron Pit* via pure TypeScript lore catalogs, an optional non-intrusive Chronicle modal, ambient wave breather whispers, lore-infused defeat messages, and a Wave 10 "Seal Shattered" victory choice, ensuring zero gameplay interruption and instantaneous retries.

**Architecture:** Pure TypeScript game logic and static text tables in `src/core/LoreCatalog.ts` (zero Babylon/DOM dependencies), cleanly consumed by `src/ui/HUDController.ts` and rendered via HTML/CSS overlays, with subtle brazier flame scaling in `src/scene/ArenaBuilder.ts`.

**Tech Stack:** TypeScript 7 (`strict: true`), `@babylonjs/core`, HTML5/CSS3 DOM HUD, Vitest 5.

## Global Constraints

- Rule 3.1: Strict separation of `src/core/` and `src/scene/`. `src/core/LoreCatalog.ts` must have ZERO imports from `@babylonjs/*` or the DOM.
- Rule 3.2: Zero runtime Garbage Collection (GC) churn. Static strings and cached DOM updates; guard against redundant DOM writes in `HUDController.ts`.
- Rule 3.7: HTML/CSS HUD overlay with GPU-composited transitions; no `@babylonjs/gui` dependencies.
- Rule 3.11: Gothic narrative tone over arcade jargon ("RETURN TO PIT", "OVERRUN", "ENTER THE PIT", "SEAL SHATTERED").
- User mandate: Lore must NEVER interrupt gameplay, freeze controls, or delay retrying. `[ENTER THE PIT]` and `[RETURN TO PIT]` must remain instantaneous single-click actions.

---

### Task 1: Create Pure Core `LoreCatalog` and Unit Tests

**Files:**
- Create: `src/core/LoreCatalog.ts`
- Test: `tests/LoreCatalog.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface ChronicleChapter {
    title: string;
    body: string;
  }

  export class LoreCatalog {
    static readonly INTRO_SUBTITLE: string;
    static readonly CHRONICLE_CHAPTERS: readonly ChronicleChapter[];
    static getWaveWhisper(wave: number): string;
    static getGameOverMessage(wave: number, kills: number, score: number): string;
    static getVictoryTitle(): string;
    static getVictorySubtitle(): string;
  }
  ```

- [ ] **Step 1: Write the failing test**

Create `tests/LoreCatalog.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/LoreCatalog.test.ts`
Expected: FAIL with "Cannot find module '../src/core/LoreCatalog'"

- [ ] **Step 3: Implement `LoreCatalog.ts`**

Create `src/core/LoreCatalog.ts`:
```ts
export interface ChronicleChapter {
  title: string;
  body: string;
}

export class LoreCatalog {
  static readonly INTRO_SUBTITLE =
    "Trapped beneath the ash by Mor'gath's curse. Every fiend you crush with cold iron starves the demon of its power. Endure ten onslaughts to break the seal.";

  static readonly CHRONICLE_CHAPTERS: readonly ChronicleChapter[] = [
    {
      title: 'I. THE DESECRATED SLEEP',
      body: "Seeking refuge from a killing ash storm, a lone traveler struck a fire upon an ancient slab of black stone. It was no hearth, but the binding seal of Mor'gath, the Ash Sovereign. The flame broke the seal, waking the demon from centuries of slumber."
    },
    {
      title: "II. THE SOVEREIGN'S TETHER",
      body: "Enraged by mortal insolence, Mor'gath dragged the intruder into the sunken Iron Pit, cursing them to die and resurrect in an endless cycle. Yet awoken prematurely, the demon cannot walk the earth; each fiend it spawns is a living sliver of its own soul. Every fiend slain permanently starves the demon."
    },
    {
      title: 'III. THE TENTH BELL',
      body: "In supreme arrogance, Mor'gath swore a dark blood-oath: no mortal could survive ten onslaughts. If ten bells toll and the traveler still draws breath, the demon's tether shatters, the re-sanctified altar ignites, and the pit shall grant passage to the light."
    }
  ];

  private static readonly WAVE_WHISPERS: readonly string[] = [
    "A sliver of the Sovereign's essence turns to dust.",
    'The entity snarls from within the deep fog.',
    "Mor'gath's mockery grows hollow in the mist.",
    'Demonic ichor seeps into the ancient runes.',
    'The entity bleeds. The sunken ruins shudder.',
    'Desperation mounts in the demonic brood.',
    'The perimeter braziers flare with cleansed fire.',
    "The Sovereign's soul grows lean and fractured.",
    'One final toll remains. The demon trembles.',
    'The tether shatters! The seal fractures open!'
  ];

  static getWaveWhisper(wave: number): string {
    if (wave <= 0) return this.WAVE_WHISPERS[0];
    if (wave <= this.WAVE_WHISPERS.length) {
      return this.WAVE_WHISPERS[wave - 1];
    }
    return 'The curse is broken, yet the hunt never ends.';
  }

  static getGameOverMessage(wave: number, kills: number, score: number): string {
    return `You fell at Wave ${wave} after slaying ${kills} hostiles (Score: ${score}). Mor'gath's curse knits your broken bones back together upon the stones... The fight continues.`;
  }

  static getVictoryTitle(): string {
    return 'SEAL SHATTERED';
  }

  static getVictorySubtitle(): string {
    return 'Ten bells have tolled. Mor\'gath\'s tether is severed, the ancient altar ignites with cleansed flame, and daylight pierces the broken stone ceiling.';
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/LoreCatalog.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/LoreCatalog.ts tests/LoreCatalog.test.ts
git commit -m "feat(core): add LoreCatalog with Mor'gath lore, wave whispers, and chapters"
```

---

### Task 2: Chronicle Modal Markup, Styling, and Ambient Wave Whisper in HTML/CSS

**Files:**
- Modify: `index.html:10-535`

**Interfaces:**
- Consumes: `LoreCatalog.CHRONICLE_CHAPTERS`
- Produces: DOM elements `#chronicleButton`, `#chronicleModal`, `#chronicleCloseButton`, `#waveWhisper`

- [ ] **Step 1: Add HTML markup for Chronicle modal and ambient wave whisper**

In `index.html`:
1. Inside `#hud`, immediately under `.top-bar`, add:
```html
<div id="waveWhisper" class="wave-whisper"></div>
```
2. Inside `.modal-card`, beside or directly under `#actionButton`, add a secondary button:
```html
<button id="chronicleButton" type="button" class="iron-secondary-btn">THE CHRONICLE</button>
```
3. After `#modalOverlay`, add the `#chronicleModal` overlay:
```html
<div id="chronicleModal" class="chronicle-overlay hidden">
  <div class="chronicle-card">
    <div class="chronicle-header">
      <h2 class="chronicle-title">CHRONICLE OF THE PIT</h2>
      <button id="chronicleCloseButton" type="button" class="chronicle-close-btn">&times;</button>
    </div>
    <div class="chronicle-content">
      <div class="chronicle-chapter">
        <h3 class="chapter-title">I. THE DESECRATED SLEEP</h3>
        <p class="chapter-body">Seeking refuge from a killing ash storm, a lone traveler struck a fire upon an ancient slab of black stone. It was no hearth, but the binding seal of Mor'gath, the Ash Sovereign. The flame broke the seal, waking the demon from centuries of slumber.</p>
      </div>
      <div class="chronicle-chapter">
        <h3 class="chapter-title">II. THE SOVEREIGN'S TETHER</h3>
        <p class="chapter-body">Enraged by mortal insolence, Mor'gath dragged the intruder into the sunken Iron Pit, cursing them to die and resurrect in an endless cycle. Yet awoken prematurely, the demon cannot walk the earth; each fiend it spawns is a living sliver of its own soul. Every fiend slain permanently starves the demon.</p>
      </div>
      <div class="chronicle-chapter">
        <h3 class="chapter-title">III. THE TENTH BELL</h3>
        <p class="chapter-body">In supreme arrogance, Mor'gath swore a dark blood-oath: no mortal could survive ten onslaughts. If ten bells toll and the traveler still draws breath, the demon's tether shatters, the re-sanctified altar ignites, and the pit shall grant passage to the light.</p>
      </div>
    </div>
    <div class="chronicle-footer">
      <span class="chronicle-hint">PRESS [ESC] OR CLICK TO RETURN</span>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Add CSS styles for Chronicle modal and wave whisper**

In `index.html` inside `<style>`:
```css
/* Ambient Wave Whisper (Non-Intrusive Breather Subtitle) */
.wave-whisper {
  position: absolute;
  top: 76px;
  left: 50%;
  transform: translateX(-50%);
  font-family: inherit;
  font-size: 13px;
  font-style: italic;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #fbbf24;
  text-shadow: 0 0 6px rgba(0, 0, 0, 0.9), 1px 1px 0 #000;
  opacity: 0;
  transition: opacity 0.4s ease-in-out;
  pointer-events: none;
  white-space: nowrap;
}
.wave-whisper.visible {
  opacity: 1;
}

/* Secondary Action Button (The Chronicle) */
.iron-secondary-btn {
  pointer-events: auto;
  cursor: pointer;
  background: linear-gradient(180deg, #2a2725 0%, #171514 100%);
  color: #d6d3d1;
  border: 1px solid #574f49;
  outline: 1px solid #0d0c0b;
  font-family: inherit;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  padding: 10px 24px;
  width: 100%;
  margin-top: 10px;
  box-shadow: inset 1px 1px 0 #44403c, 0 4px 12px rgba(0, 0, 0, 0.7);
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.iron-secondary-btn:hover {
  background: #36322e;
  color: #fbbf24;
  border-color: #d97706;
}

/* Chronicle Modal (Weathered Stone Grimoire Overlay) */
.chronicle-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.88);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  transition: opacity 0.2s ease-out;
}
.chronicle-overlay.hidden {
  display: none;
}
.chronicle-card {
  width: 90%;
  max-width: 680px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #1f1d1b 0%, #121110 100%);
  border: 2px solid #574f49;
  outline: 2px solid #0d0c0b;
  box-shadow: inset 1px 1px 0 #78716c, inset -2px -2px 0 #1c1917, 0 12px 32px rgba(0, 0, 0, 0.95);
  border-left: 6px solid #d97706;
  padding: 24px 28px;
}
.chronicle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #3d3835;
  padding-bottom: 12px;
  margin-bottom: 16px;
}
.chronicle-title {
  font-size: 18px;
  font-weight: 900;
  letter-spacing: 3px;
  color: #fbbf24;
}
.chronicle-close-btn {
  background: transparent;
  border: none;
  color: #a8a29e;
  font-size: 24px;
  cursor: pointer;
  line-height: 1;
}
.chronicle-close-btn:hover {
  color: #ef4444;
}
.chronicle-content {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-right: 8px;
}
.chronicle-chapter {
  background: rgba(20, 18, 17, 0.6);
  border: 1px solid #383430;
  padding: 14px 16px;
}
.chapter-title {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 2px;
  color: #d97706;
  margin-bottom: 6px;
}
.chapter-body {
  font-size: 13px;
  line-height: 1.6;
  color: #d6d3d1;
}
.chronicle-footer {
  margin-top: 16px;
  padding-top: 10px;
  border-top: 1px solid #2d2926;
  text-align: center;
}
.chronicle-hint {
  font-size: 11px;
  letter-spacing: 2px;
  color: #78716c;
}
```

- [ ] **Step 3: Verify build / syntax**

Run: `npm run build`
Expected: PASS (HTML and CSS parse cleanly)

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(ui): add Chronicle modal markup and styling and ambient wave whisper"
```

---

### Task 3: Wire `LoreCatalog` into `HUDController` and Match Lifecycle

**Files:**
- Modify: `src/ui/HUDController.ts`
- Modify: `src/GameApp.ts`
- Test: `tests/HUDControllerLore.test.ts`

**Interfaces:**
- Consumes: `LoreCatalog`
- Extends: `HUDSnapshot` with `isCurseBroken?: boolean; isVictoryScreen?: boolean;`
- Produces: Ambient whisper lifecycle during wave breathers, Chronicle modal toggling, victory / escape action callback.

- [ ] **Step 1: Write unit test for HUDController lore integration**

Create `tests/HUDControllerLore.test.ts`:
```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HUDController, HUDSnapshot } from '../src/ui/HUDController';
import { LoreCatalog } from '../src/core/LoreCatalog';

describe('HUDController Lore Integration', () => {
  let container: HTMLElement;
  let actionCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement('div');
    container.innerHTML = `
      <span id="waveValue">1</span>
      <span id="enemiesLabel">Hostiles</span>
      <span id="enemiesValue">5</span>
      <span id="killsValue">0</span>
      <span id="healthText">100 / 100</span>
      <div id="healthBarFill"></div>
      <span id="ammoValue">12</span>
      <span id="reloadHint">READY</span>
      <div id="crosshair"></div>
      <div id="damageVignette"></div>
      <div id="modalOverlay"></div>
      <h1 id="modalTitle">IRON PIT</h1>
      <p id="modalSubtitle"></p>
      <button id="actionButton"></button>
      <button id="chronicleButton"></button>
      <div id="chronicleModal" class="hidden"></div>
      <button id="chronicleCloseButton"></button>
      <div id="waveWhisper"></div>
    `;
    document.body.innerHTML = '';
    document.body.appendChild(container);
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
    const subtitle = document.getElementById('modalSubtitle')!;
    expect(subtitle.textContent).toBe(LoreCatalog.INTRO_SUBTITLE);
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
    const subtitle = document.getElementById('modalSubtitle')!;
    expect(subtitle.textContent).toBe(LoreCatalog.getGameOverMessage(3, 14, 1400));
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
    const whisper = document.getElementById('waveWhisper')!;
    expect(whisper.textContent).toBe(LoreCatalog.getWaveWhisper(2));
    expect(whisper.classList.contains('visible')).toBe(true);

    const combatSnapshot: HUDSnapshot = {
      ...breatherSnapshot,
      isInBreather: false,
      remainingEnemies: 7
    };
    hud.update(combatSnapshot);
    expect(whisper.classList.contains('visible')).toBe(false);
  });

  it('opens and closes Chronicle modal without interfering with action button', () => {
    const hud = new HUDController(actionCallback);
    const chronicleBtn = document.getElementById('chronicleButton') as HTMLButtonElement;
    const chronicleModal = document.getElementById('chronicleModal')!;
    const closeBtn = document.getElementById('chronicleCloseButton') as HTMLButtonElement;

    expect(chronicleModal.classList.contains('hidden')).toBe(true);

    chronicleBtn.click();
    expect(chronicleModal.classList.contains('hidden')).toBe(false);

    closeBtn.click();
    expect(chronicleModal.classList.contains('hidden')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/HUDControllerLore.test.ts`
Expected: FAIL

- [ ] **Step 3: Update `HUDController.ts` to implement lore bindings**

In `src/ui/HUDController.ts`:
- Import `LoreCatalog`.
- Bind DOM elements: `chronicleButton`, `chronicleModal`, `chronicleCloseButton`, `waveWhisper`.
- Add event listeners for `chronicleButton.click` (remove `hidden`), `chronicleCloseButton.click` (add `hidden`), `chronicleModal.click` (backdrop click), and `keydown` for `Escape` key.
- In `update(snapshot: HUDSnapshot)`:
  - If `snapshot.isInBreather`:
    - Set `waveWhisper.textContent = LoreCatalog.getWaveWhisper(snapshot.wave);`
    - Add `visible` class to `waveWhisper`.
  - Else:
    - Remove `visible` class from `waveWhisper`.
  - In `MENU`:
    - `this.modalSubtitle.textContent = LoreCatalog.INTRO_SUBTITLE;`
  - In `GAME_OVER`:
    - `this.modalSubtitle.textContent = LoreCatalog.getGameOverMessage(snapshot.wave, snapshot.kills, snapshot.score);`
    - `this.actionButton.textContent = 'RETURN TO PIT';`
  - Add victory state support when `snapshot.isVictoryScreen`:
    - `this.modalTitle.textContent = LoreCatalog.getVictoryTitle();`
    - `this.modalSubtitle.textContent = LoreCatalog.getVictorySubtitle();`
    - `this.actionButton.textContent = 'ESCAPE TO THE SUN';`

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/HUDControllerLore.test.ts`
Expected: PASS

- [ ] **Step 5: Run full test suite to check for regressions**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/ui/HUDController.ts tests/HUDControllerLore.test.ts
git commit -m "feat(ui): integrate LoreCatalog into HUDController with ambient whispers and chronicle modal"
```

---

### Task 4: Wave 10 "Seal Shattered" Victory Support in GameState & GameApp

**Files:**
- Modify: `src/core/GameState.ts`
- Modify: `src/GameApp.ts`
- Test: `tests/GameStateVictory.test.ts`

**Interfaces:**
- `GameState.isCurseBroken(wave: number): boolean`
- `MatchStatus`: support optional victory resolution or milestone tracking without blocking endless play.

- [ ] **Step 1: Write test for GameState curse breaking logic**

Create `tests/GameStateVictory.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { GameState } from '../src/core/GameState';

describe('GameState Curse & Victory Logic', () => {
  it('tracks whether curse has been broken when reaching or passing wave 10', () => {
    const gs = new GameState();
    gs.start();
    expect(gs.isCurseBroken).toBe(false);

    gs.setWave(9);
    expect(gs.isCurseBroken).toBe(false);

    gs.setWave(10);
    expect(gs.isCurseBroken).toBe(true);

    gs.setWave(11);
    expect(gs.isCurseBroken).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/GameStateVictory.test.ts`
Expected: FAIL

- [ ] **Step 3: Update `src/core/GameState.ts`**

In `src/core/GameState.ts`:
Add `private _isCurseBroken = false;`:
```ts
get isCurseBroken(): boolean {
  return this._isCurseBroken;
}

setWave(wave: number): void {
  this.wave = wave;
  if (this.wave >= 10) {
    this._isCurseBroken = true;
  }
}

reset(): void {
  // reset state
  this._isCurseBroken = false;
  // ...
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/GameStateVictory.test.ts`
Expected: PASS

- [ ] **Step 5: Connect in `GameApp.ts`**

In `src/GameApp.ts`:
Ensure `hud.update()` receives `isCurseBroken: this.gameState.isCurseBroken` in `HUDSnapshot`.
Ensure that when the player clicks `actionButton` at Game Over or Menu, it immediately resumes / starts the fight.

- [ ] **Step 6: Commit**

```bash
git add src/core/GameState.ts src/GameApp.ts tests/GameStateVictory.test.ts
git commit -m "feat(core): track curse broken milestone at wave 10 in GameState"
```

---

### Task 5: Dynamic Brazier Flame Visual Scaling Across Waves

**Files:**
- Modify: `src/scene/ArenaBuilder.ts:250-320`

**Interfaces:**
- Consumes: `wave: number`
- Produces: Dynamic light intensity and point light color shift for braziers as waves advance (re-sanctification of the arena without GC allocations).

- [ ] **Step 1: Check existing brazier implementation in `ArenaBuilder.ts`**

Read `ArenaBuilder.ts` to locate brazier light instances and flame materials.
Add a method `updateBrazierResanctification(wave: number): void` to `ArenaBuilder`:
- Waves 1-3: Standard dim ember glow (intensity 1.2, deep amber `Color3(1.0, 0.45, 0.05)`).
- Waves 4-7: Rising intensity (intensity 1.6, brighter orange-gold `Color3(1.0, 0.6, 0.15)`).
- Waves 8-10+: Cleansed radiant flame (intensity 2.2, brilliant gold-white `Color3(1.0, 0.85, 0.4)`).
- Use cached colors or in-place component sets to guarantee zero runtime GC churn (Rule 3.2).

- [ ] **Step 2: Update `GameApp.ts` to pass current wave during wave transitions**

In `GameApp.ts`: call `this.arenaBuilder.updateBrazierResanctification(this.waveManager.currentWave)` when wave changes.

- [ ] **Step 3: Verify TypeScript build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/scene/ArenaBuilder.ts src/GameApp.ts
git commit -m "feat(scene): add subtle brazier flame intensity scaling per wave"
```

---

### Task 6: Full Verification & End-to-End Test Suite

- [ ] **Step 1: Run all unit tests**

Run: `npm test`
Expected: All test suites PASS (0 failures)

- [ ] **Step 2: Run production bundle build and typecheck**

Run: `npm run build`
Expected: Clean build with zero TypeScript or Vite errors.

- [ ] **Step 3: Verify Git log and diff**

Run: `git status`
Expected: Clean working tree.
