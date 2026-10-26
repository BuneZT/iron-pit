# Iron Pit FPS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build **Iron Pit**, a wave-based 3D arena survival FPS in Babylon.js + Havok Physics V2 featuring heavy hitscan gunplay with physical enemy stagger/knockdown, HTML/CSS HUD, and real free CC0 audio files.

**Architecture:** Pure TypeScript game state modules (`src/core/`) handle weapon ammo/reload/cooldowns, player health/invulnerability, wave spawning math, and match state (100% unit-tested with Vitest). Babylon.js + Havok controllers (`src/scene/`) manage the 3D arena, first-person movement, raycast shooting, view-model recoil, and physical enemy stagger/knockdown impulses, paired with a DOM HUD (`src/ui/`) and real `.wav` audio assets (`public/assets/audio/`).

**Tech Stack:** TypeScript 5, Vite 5, Vitest, `@babylonjs/core`, `@babylonjs/havok`, HTML5 Audio (CC0 `.wav` files).

## Global Constraints

- Project path: `C:\Users\marci\Documents\game_dev\iron-pit`
- Real audio files only (`public/assets/audio/*.wav`) — do NOT use procedural Web Audio oscillator synthesis.
- Pure logic in `src/core/` must have zero Babylon/DOM imports and be developed with strict TDD (`vitest run`).
- Havok Physics V2 (`@babylonjs/havok`) must drive enemy stagger on non-lethal hits and unlocked rotational knockdown/topple on fatal hits.

---

### Task 1: Project Scaffolding & Core Game/Health State (TDD)

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore`, `index.html`
- Create: `src/core/GameState.ts`, `src/core/HealthState.ts`
- Test: `tests/GameState.test.ts`, `tests/HealthState.test.ts`

- [ ] **Step 1: Scaffold Vite + TypeScript + Vitest + Babylon/Havok config files and install dependencies**
- [ ] **Step 2: Write failing tests `tests/GameState.test.ts` and `tests/HealthState.test.ts`**
- [ ] **Step 3: Run `npx vitest run` to verify RED state**
- [ ] **Step 4: Implement `src/core/GameState.ts` and `src/core/HealthState.ts`**
- [ ] **Step 5: Run `npx vitest run` to verify GREEN state and commit**

---

### Task 2: WeaponState & WaveManager Core Logic (TDD)

**Files:**
- Create: `src/core/WeaponState.ts`, `src/core/WaveManager.ts`
- Test: `tests/WeaponState.test.ts`, `tests/WaveManager.test.ts`

- [ ] **Step 1: Write failing tests `tests/WeaponState.test.ts` and `tests/WaveManager.test.ts`**
- [ ] **Step 2: Run `npx vitest run` to verify RED state**
- [ ] **Step 3: Implement `src/core/WeaponState.ts` and `src/core/WaveManager.ts`**
- [ ] **Step 4: Run `npx vitest run` to verify GREEN state and commit**

---

### Task 3: Real Audio Assets & AudioManager

**Files:**
- Create: `public/assets/audio/gunshot.wav`, `public/assets/audio/dryfire.wav`, `public/assets/audio/reload.wav`, `public/assets/audio/hit.wav`, `public/assets/audio/knockdown.wav`, `public/assets/audio/hurt.wav`
- Create: `src/scene/AudioManager.ts`

- [ ] **Step 1: Download/install real free CC0 `.wav` sound files into `public/assets/audio/`**
- [ ] **Step 2: Implement `src/scene/AudioManager.ts` using HTML5 `Audio` asset preloading and polyphonic playback**
- [ ] **Step 3: Commit audio assets and `AudioManager`**

---

### Task 4: Havok Physics Setup, ArenaBuilder & PlayerController

**Files:**
- Create: `src/scene/PhysicsSetup.ts`
- Create: `src/scene/ArenaBuilder.ts`
- Create: `src/scene/PlayerController.ts`

- [ ] **Step 1: Implement `PhysicsSetup.ts` to initialize `@babylonjs/havok` WASM plugin on the Babylon scene**
- [ ] **Step 2: Implement `ArenaBuilder.ts` (`40m × 40m` floor, `4m` walls, `8` cover pillars with static `PhysicsAggregate` colliders, lighting, shadows, and `4` corner spawn points)**
- [ ] **Step 3: Implement `PlayerController.ts` (`UniversalCamera`, WASD walk `6 m/s`, Shift sprint `9.5 m/s`, Space jump, Pointer Lock mouse look)**
- [ ] **Step 4: Commit scene physics, arena, and player controller**

---

### Task 5: EnemyController (Havok Stagger & Knockdown) & WeaponController (View-Model Recoil & Raycast)

**Files:**
- Create: `src/scene/EnemyController.ts`
- Create: `src/scene/WeaponController.ts`

- [ ] **Step 1: Implement `EnemyController.ts` with compound geometric enemy meshes, upright `PhysicsAggregate` capsule while alive, chase steering, non-lethal hit impulse stagger + flash, and fatal unlocked-inertia knockdown impulse + `2.5s` cleanup**
- [ ] **Step 2: Implement `WeaponController.ts` with 3D camera-attached heavy gun model, recoil kickback animation, muzzle flash, tracer line, and center-screen raycasting**
- [ ] **Step 3: Commit enemy and weapon controllers**

---

### Task 6: HUDController, GameApp Orchestration & Full Verification

**Files:**
- Create: `src/ui/HUDController.ts`
- Create: `src/GameApp.ts`
- Create: `src/main.ts`

- [ ] **Step 1: Implement `HUDController.ts` and style rules in `index.html` for crosshair, health bar, damage vignette, ammo/reload counter, wave/kills header, and start/pause/game-over modals**
- [ ] **Step 2: Implement `GameApp.ts` and `src/main.ts` connecting all core states, scene controllers, HUD, and audio**
- [ ] **Step 3: Run `npm test` and `npm run build` to verify all tests pass and production bundle builds cleanly, then commit**
