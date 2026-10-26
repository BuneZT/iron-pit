# Iron Pit — Babylon.js Arena Survival FPS Design Specification

**Date:** 2026-10-26  
**Project Directory:** `C:\Users\marci\Documents\game_dev\iron-pit`  
**Tech Stack:** TypeScript 5, Vite 5, Vitest, `@babylonjs/core`, `@babylonjs/havok` (Physics V2), HTML/CSS HUD, Real Free Audio Assets (`.wav`/`.ogg`)

---

## 1. Overview & Core Loop

**Iron Pit** is a fast-paced, single-player 3D First-Person Shooter (FPS) built in Babylon.js. The player fights inside an enclosed industrial arena (`40m × 40m`) against escalating waves of melee chaser enemies.

- **Core Feel:** Heavy hitscan gunplay paired with Havok rigid-body physics so shots visibly stagger enemies back on non-lethal hits and physically knock them down (unlocking rotational inertia and launching/tumbling them across the floor and into obstacles) on lethal hits.
- **Win/Loss Loop:** Survive as many waves as possible and rack up kills. If player HP reaches `0`, the game transitions to the Game Over screen with final Wave and Kill stats and a `"Play Again"` button.

---

## 2. Architecture & Module Responsibilities

The project separates pure game rules (`src/core/`) from 3D Babylon.js + Havok scene controllers (`src/scene/`) and DOM UI (`src/ui/`).

```text
iron-pit/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/
│   └── assets/audio/
│       ├── gunshot.wav
│       ├── dryfire.wav
│       ├── reload.wav
│       ├── hit.wav
│       ├── knockdown.wav
│       └── hurt.wav
├── src/
│   ├── main.ts
│   ├── GameApp.ts
│   ├── core/
│   │   ├── GameState.ts
│   │   ├── HealthState.ts
│   │   ├── WeaponState.ts
│   │   └── WaveManager.ts
│   ├── scene/
│   │   ├── PhysicsSetup.ts
│   │   ├── ArenaBuilder.ts
│   │   ├── PlayerController.ts
│   │   ├── WeaponController.ts
│   │   ├── EnemyController.ts
│   │   └── AudioManager.ts
│   └── ui/
│       └── HUDController.ts
└── tests/
    ├── GameState.test.ts
    ├── HealthState.test.ts
    ├── WeaponState.test.ts
    └── WaveManager.test.ts
```

### 2.1 Core Logic Layer (`src/core/`)
Zero WebGL, DOM, or Babylon imports. Deterministic and 100% unit-tested in Vitest:
- **`GameState`**: Manages match status (`'MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'`), kill count, score, and match reset.
- **`HealthState`**: Tracks current/max HP (`100`), applies damage (`15` per enemy contact), enforces a `0.8s` post-hit invulnerability window, and exposes `isAlive` / `isInvulnerable`.
- **`WeaponState`**: Tracks magazine ammo (`12 / 12`), fire cooldown (`0.25s`), reload duration (`1.2s`), and damage (`35`). Exposes `tryFire()`, `startReload()`, and `update(dt)`.
- **`WaveManager`**: Computes enemy count per wave using $3 + 2N$ (Wave 1 = 5, Wave 2 = 7, etc.), staggers individual spawns by `0.8s`, tracks active living enemies, and enforces a `3.0s` breather timer before starting the next wave.

### 2.2 Babylon Scene & Havok Physics Layer (`src/scene/`)
- **`PhysicsSetup`**: Initializes `@babylonjs/havok` WASM plugin and enables Babylon Physics V2 on the `Scene` with gravity `(0, -18, 0)`.
- **`ArenaBuilder`**: Constructs the `40m × 40m` floor, `4m`-tall perimeter walls, `8` symmetrical interior cover pillars/crates (all with static `PhysicsAggregate` box colliders), lighting, shadows, and `4` corner spawn coordinates.
- **`PlayerController`**: Manages the first-person `UniversalCamera` and player physics capsule/ellipsoid movement (`WASD` walk at `6 m/s`, `Shift` sprint at `9.5 m/s`, `Space` jump when grounded, Pointer Lock mouse look with pitch clamped to `±85°`).
- **`WeaponController`**: Attaches a 3D view-model heavy pistol/carbine mesh to the camera, animates recoil kickback and muzzle flash on shot, casts a center-screen ray (`scene.pickWithRay`), renders a brief tracer line to the impact point, and invokes hit callbacks.
- **`EnemyController`**:
  - Spawns compound geometric enemy meshes (armored capsule body + head + glowing visor) at perimeter spawn points.
  - Attaches a dynamic `PhysicsAggregate` capsule body with locked X/Z angular inertia (`setMassProperties({ inertia: Vector3.Zero() })`) while alive so enemies remain upright while navigating toward the player at `4.5 m/s`.
  - **Hit Stagger (Alive):** Applies a horizontal impulse (`J = 6 N·s`) along the shot direction and flashes the enemy material white for `100ms`.
  - **Fatal Knockdown (`HP <= 0`):** Unlocks rotational inertia (`setMassProperties({ mass: 1.2, inertia: new Vector3(1, 1, 1) })`), lowers angular damping, and applies a heavy impulse (`J = 18 N·s` horizontally + `6 N·s` upward) at the exact world-space raycast hit point so the enemy physically flips/topples backward across the floor and collides with cover pillars before disposal after `2.5s`.
- **`AudioManager`**: Loads and plays real free CC0 audio files from `public/assets/audio/` (`gunshot.wav`, `dryfire.wav`, `reload.wav`, `hit.wav`, `knockdown.wav`, `hurt.wav`) using HTML5 `Audio` clones for overlapping polyphonic playback without Web Audio oscillator synthesis.

### 2.3 UI Layer (`src/ui/`)
- **`HUDController`**: Controls the crisp HTML/CSS overlay:
  - Dynamic crosshair (expands on shot, flashes red on enemy hit).
  - Bottom-left Health Bar (`100 / 100`) and full-screen red vignette flash on taking damage.
  - Bottom-right Ammo Display (`12 / ∞`) and `"RELOADING..."` status pill.
  - Top-center Wave badge (`WAVE 1`), Enemies Remaining counter, and Kills/Score counter.
  - Center modal screens for `MENU` (`"IRON PIT — Click to Enter"`), `PAUSED` (`"PAUSED — Click to Resume"`), and `GAME_OVER` (final stats + `"Play Again"` button).

---

## 3. Error Handling & Edge Cases

- **Delta Time Clamping:** Frame delta `dt` is clamped to `Math.min(rawDt, 0.1)` so tab switching never causes physics tunneling or timer skips.
- **Pointer Lock Lifecycle:** Clicking the start/resume button requests `canvas.requestPointerLock()`. Exiting pointer lock (`ESC`) while `PLAYING` automatically transitions `GameState` to `PAUSED`.
- **Audio Resilience:** `AudioManager` catches load/playback errors gracefully so missing or browser-restricted audio never interrupts gameplay.

---

## 4. Verification & Testing Criteria

1. **Unit Tests (`vitest run`):** 100% passing unit suites for `GameState`, `HealthState`, `WeaponState`, and `WaveManager`.
2. **Typecheck & Production Build (`npm run build`):** Clean `tsc && vite build` with zero TypeScript or bundler errors.
3. **Runtime Verification:** Verify game boots in browser, Havok physics initializes, shooting applies physical stagger and knockdown topple to enemies, HUD updates accurately, and real audio files play on actions.
