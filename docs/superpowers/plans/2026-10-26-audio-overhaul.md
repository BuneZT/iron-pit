# Audio Overhaul & Retro Gothic Soundscape Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul Iron Pit's audio with an authentic 90s gothic dark ambient looping music track, high-impact crunchy retro SFX, distance-attenuated enemy ambience, player footsteps, wave toll cues, and HUD volume settings.

**Architecture:** Pure TypeScript `AudioSettings` in `src/core/` for headless-tested volume math and persistence; enhanced `AudioManager` with pooled polyphony, distance attenuation, and looping ambient music channel; scene integration in `PlayerController`, `EnemyController`, and `GameApp`; and retro iron volume controls in `HUDController`.

**Tech Stack:** TypeScript, Vite, Vitest, HTML5 Audio, Babylon.js.

## Global Constraints
- Pure TypeScript logic in `src/core/` with zero Babylon.js or DOM dependencies (Rule 3.1).
- Zero GC churn in the render loop — use preallocated audio element pools, no allocations per frame (Rule 3.2).
- Static preloaded CC0 `.ogg`/`.wav` assets in `public/assets/audio/` (Rule 3.6).
- HTML/CSS HUD overlay with 90s chiseled iron & stone aesthetic (Rule 3.7).

---

### Task 1: Core AudioSettings & Unit Tests (TDD)

**Files:**
- Create: `src/core/AudioSettings.ts`
- Test: `tests/AudioSettings.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface AudioSettingsData {
    masterVolume: number;
    musicVolume: number;
    sfxVolume: number;
    isMuted: boolean;
  }
  export class AudioSettings {
    data: AudioSettingsData;
    constructor(initial?: Partial<AudioSettingsData>);
    setMasterVolume(val: number): void;
    setMusicVolume(val: number): void;
    setSfxVolume(val: number): void;
    toggleMute(): boolean;
    getEffectiveMusicVolume(): number;
    getEffectiveSfxVolume(multiplier?: number): number;
    calculateDistanceVolume(dist: number, maxRadius: number, baseVolume?: number): number;
    serialize(): string;
    static deserialize(json: string): AudioSettings;
  }
  ```

- [ ] **Step 1: Write the failing tests in `tests/AudioSettings.test.ts`**
- [ ] **Step 2: Run test to verify it fails (`npm test tests/AudioSettings.test.ts`)**
- [ ] **Step 3: Implement `src/core/AudioSettings.ts`**
- [ ] **Step 4: Run test to verify it passes (`npm test tests/AudioSettings.test.ts`)**
- [ ] **Step 5: Commit `git commit -m "feat(core): add AudioSettings state and distance attenuation math"`**

---

### Task 2: Download & Package High-Impact CC0 Audio Assets

**Files:**
- Create/Overwrite:
  - `public/assets/audio/music_ambient.ogg`
  - `public/assets/audio/gunshot.ogg`
  - `public/assets/audio/reload.ogg`
  - `public/assets/audio/dryfire.ogg`
  - `public/assets/audio/hit.ogg`
  - `public/assets/audio/knockdown.ogg`
  - `public/assets/audio/hurt.ogg`
  - `public/assets/audio/enemy_groan.ogg`
  - `public/assets/audio/footstep.ogg`
  - `public/assets/audio/wave_bell.wav`

- [ ] **Step 1: Execute asset fetch script to pull CC0 audio from OpenGameArt and GitHub CC0 library**
- [ ] **Step 2: Verify all 10 audio files exist in `public/assets/audio/` and have non-zero byte size**
- [ ] **Step 3: Commit `git commit -m "assets(audio): add dark ambient BGM and 90s gothic CC0 sound effects"`**

---

### Task 3: Refactor AudioManager for Dual-Bus, Looping BGM & Pooled SFX

**Files:**
- Modify: `src/scene/AudioManager.ts`

**Interfaces:**
- Consumes: `AudioSettings` from `src/core/AudioSettings.ts`
- Produces:
  ```ts
  export type SoundEffect =
    | 'gunshot'
    | 'dryfire'
    | 'reload'
    | 'hit'
    | 'knockdown'
    | 'hurt'
    | 'enemy_groan'
    | 'footstep'
    | 'wave_bell';

  export class AudioManager {
    readonly settings: AudioSettings;
    preload(): void;
    startMusic(): void;
    pauseMusic(): void;
    resumeMusic(): void;
    duckMusic(ducked: boolean): void;
    play(effect: SoundEffect, volumeMultiplier?: number): void;
    playDistanceAttenuated(effect: SoundEffect, sourcePos: { x: number; y: number; z: number }, listenerPos: { x: number; y: number; z: number }, maxRadius?: number): void;
    applySettings(): void;
  }
  ```

- [ ] **Step 1: Update `AudioManager.ts` with BGM bus, sound pool per effect, and distance attenuation**
- [ ] **Step 2: Ensure headless environment safety (`typeof Audio !== 'undefined'`)**
- [ ] **Step 3: Verify tests pass (`npm test`)**
- [ ] **Step 4: Commit `git commit -m "feat(scene): enhance AudioManager with BGM bus and sound pooling"`**

---

### Task 4: Integrate Gameplay Audio Triggers (Footsteps, Enemy Groans, Wave Bell)

**Files:**
- Modify: `src/scene/PlayerController.ts` (footsteps on grounded WASD movement)
- Modify: `src/scene/EnemyController.ts` (distance-attenuated enemy groans)
- Modify: `src/GameApp.ts` (wave bell, music start on match start, unpause/pause handling)

- [ ] **Step 1: Add footstep step-interval tracking to `PlayerController`**
- [ ] **Step 2: Add distance-attenuated periodic groans to active enemies in `EnemyController`**
- [ ] **Step 3: Hook up `wave_bell` on wave start and BGM lifecycle in `GameApp.ts`**
- [ ] **Step 4: Verify all unit tests pass (`npm test`)**
- [ ] **Step 5: Commit `git commit -m "feat(scene): wire footsteps, enemy groans, and wave bells into gameplay"`**

---

### Task 5: HUD Volume Controls & Audio Settings UI

**Files:**
- Modify: `src/ui/HUDController.ts`
- Modify: `src/GameApp.ts`

- [ ] **Step 1: Add Gothic iron volume sliders (Master, Music, SFX) and Mute toggle to Pause menu in `HUDController`**
- [ ] **Step 2: Add callbacks in `HUDController` to notify `GameApp` on volume slider changes**
- [ ] **Step 3: Connect callbacks in `GameApp` to `audio.settings` and persist to `localStorage`**
- [ ] **Step 4: Verify build succeeds (`npm run build`) and tests pass (`npm test`)**
- [ ] **Step 5: Commit `git commit -m "feat(ui): add 90s gothic audio settings sliders to pause HUD"`**

---

### Task 6: Full Verification & Polish

- [ ] **Step 1: Run complete Vitest suite (`npm test`)**
- [ ] **Step 2: Run production TypeScript build (`npm run build`)**
- [ ] **Step 3: Verify all audio assets load cleanly without 404s**
