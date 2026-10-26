# AGENTS.md — Context, Visual Identity & Babylon.js Best Practices Guide for AI Coding Agents

This document defines the architecture, visual art direction, technical standards, and **Babylon.js + Havok Physics V2 best practices** that all AI agents and contributors must follow when expanding `iron-pit`.

---

## 1. Project Overview

* **Title:** Iron Pit (`iron-pit`)
* **Genre:** 90s Gothic Retro Arena Survival First-Person Shooter (FPS) with heavy kinetic physics knockdowns.
* **Aesthetic Identity & Setting:** Dark, grimy, tactile gothic aesthetic inspired by **Quake 1** and **Dark Forces**. Open-air crumbling stone ruins under an oppressive, overcast ash-grey sky, surrounded by dense distance fog with no visible skybox seams or ceiling enclosures.
* **Tech Stack:** TypeScript 5 (`strict: true`, `noEmit: true`), Vite 5, `@babylonjs/core` (v7+), `@babylonjs/havok` (Physics V2 WASM), Vitest, HTML/CSS DOM HUD.
* **Arena Scale:** `40m × 40m` flagstone ruins pit (`1 unit = 1 meter`), low crumbling stone parapets with crooked iron spikes, `1.8m` player/enemy height, gravity `(0, -18, 0)`.

---

## 2. Directory Structure & Key Modules

```text
iron-pit/
├── public/
│   ├── assets/
│   │   ├── audio/                # Preloaded real CC0 .ogg/.wav sound effects (NO procedural Web Audio)
│   │   └── textures/             # Pre-generated 128x128 Bayer-dithered retro PNG textures
│   └── wasm/
│       └── HavokPhysics.wasm     # Static Havok WASM binary served directly by Vite/production
├── src/
│   ├── main.ts                   # Entry point bootstrapping canvas and GameApp
│   ├── GameApp.ts                # Top-level orchestrator: Engine, Scene, render loop, input binding
│   ├── core/                     # Pure TypeScript game logic (Zero Babylon/DOM/WASM imports)
│   │   ├── GameState.ts          # Match lifecycle (MENU, PLAYING, PAUSED, GAME_OVER), kills, score
│   │   ├── HealthState.ts        # HP math, contact damage, post-hit invulnerability timer
│   │   ├── WeaponState.ts        # Magazine ammo, fire rate cooldown, reload timer, damage stats
│   │   └── WaveManager.ts        # Wave formula (3 + 2N), spawn queue interval, breather timer
│   ├── scene/                    # Babylon.js 3D & Havok Physics V2 controllers
│   │   ├── PhysicsSetup.ts       # Initializes HavokPlugin and enables scene physics
│   │   ├── ArenaBuilder.ts       # Constructs foggy ruins, parapets, monoliths, braziers, lighting
│   │   ├── PlayerController.ts   # UniversalCamera, ellipsoid collision movement (WASD/Sprint/Jump/Look)
│   │   ├── WeaponController.ts   # Blackened-iron viewmodel gun, recoil kick, muzzle light, raycasting
│   │   ├── EnemyController.ts    # Segmented Gothic Fiend meshes, Havok stagger & ragdoll knockdown
│   │   └── AudioManager.ts       # Preloads and plays static audio files from public/assets/audio/
│   └── ui/
│       └── HUDController.ts      # 90s chiseled iron & stone HTML/CSS HUD overlay & modal screens
├── tests/                        # Headless Vitest unit test suites for src/core/
└── docs/
    └── superpowers/
        ├── specs/                # Design specifications
        └── plans/                # Implementation plans
```

---

## 3. Core Architectural Rules & Babylon.js Best Practices

### 3.1 Strict Separation of Core Logic vs. 3D Scene (`src/core/` vs. `src/scene/`)
* **Rule:** All gameplay rules, state machines, timers, ammo/damage math, wave scaling, and AI decision logic **must** live in `src/core/` as pure TypeScript classes or functions with **zero imports from `@babylonjs/*` or the DOM**.
* **Why:** Initializing a WebGL2 context and Havok WASM inside unit tests is slow and brittle. Keeping `src/core/` pure guarantees Vitest suites run in milliseconds (`npm test`).
* If a `src/core/` module needs 3D coordinates, pass plain `{ x: number; y: number; z: number }` interfaces or keep spatial math decoupled from Babylon scene nodes.

### 3.2 Zero Runtime Garbage Collection (GC) Churn in the Render Loop
In a 60–144 FPS 3D shooter, allocating short-lived objects inside `scene.onBeforeRenderObservable` causes GC pauses and frame stutters:
* **Avoid `new Vector3()` / `new Quaternion()` / `new Color3()` in hot per-frame loops:**
  * Allocate reusable scratch vectors as private class fields (e.g., `private readonly tmpVec = Vector3.Zero()`) and use Babylon's `*ToRef` methods (`addToRef`, `subtractToRef`, `scaleToRef`, `normalizeToRef`, `Vector3.CrossToRef`, `Quaternion.FromEulerAnglesToRef`).
* **Pool Frequently Spawned Entities & VFX:**
  * Projectiles, impact sparks, bullet decals, tracer lines, and enemy meshes should be recycled via object pools (`setEnabled(false)`) rather than calling `MeshBuilder.Create*` and `dispose()` mid-firefight as enemy counts scale up.
* **Share Materials & Geometries:**
  * Never create a new `StandardMaterial` or `PBRMaterial` per frame. Share static materials across identical arena props, and use `mesh.createInstance()` or Thin Instances (`thinInstanceAdd`) for repeated static environment geometry.

### 3.3 Explicit Babylon.js & Havok Disposal Lifecycle (Preventing GPU/WASM Leaks)
Calling `mesh.dispose()` in Babylon.js **does not** automatically dispose its attached `PhysicsAggregate`, `Material`, or `Texture`s:
* When destroying or resetting dynamic entities (like enemies or destructible props):
  1. Dispose the physics aggregate first: `enemy.aggregate.dispose()`.
  2. Dispose the mesh hierarchy: `enemy.root.dispose(false, true)`.
  3. Dispose any unique per-entity materials (`bodyMat.dispose()`), **or** keep shared materials cached at the controller level and never dispose them per enemy.
  4. Remove any registered scene observers (`scene.onBeforeRenderObservable.remove(observer)`).

### 3.4 Havok Physics V2 (`@babylonjs/havok`) Rules
* **WASM Loading & Vite Config:**
  * `vite.config.ts` must keep `optimizeDeps: { exclude: ['@babylonjs/havok'] }`.
  * `PhysicsSetup.ts` must load `/wasm/HavokPhysics.wasm` from `public/wasm/HavokPhysics.wasm` via `locateFile: () => '/wasm/HavokPhysics.wasm'` so dev and production builds resolve the WASM binary identically.
* **Drive Dynamic Bodies via Velocities & Impulses, Not `mesh.position`:**
  * Once a `PhysicsAggregate` with `mass > 0` is attached to a mesh, Havok owns its transform. Move active enemies using `body.setLinearVelocity(...)` or `body.applyImpulse(impulse, worldPoint)`.
  * If you ever need to teleport a dynamic physics body (e.g., respawning a pooled enemy), set `body.disablePreStep = false` for one frame (or re-initialize the body) and zero out both linear and angular velocities (`setLinearVelocity(Vector3.Zero())`, `setAngularVelocity(Vector3.Zero())`).
* **Upright Chasers vs. Physical Knockdown:**
  * Keep living humanoid enemies upright by locking their rotational inertia tensor:
    ```ts
    aggregate.body.setMassProperties({ mass: 1.5, inertia: Vector3.Zero() });
    ```
  * On a fatal hit (or heavy knockdown effect), unlock rotational inertia before applying the off-center impulse at the raycast hit point:
    ```ts
    aggregate.body.setMassProperties({ mass: 1.2, inertia: new Vector3(0.35, 0.35, 0.35) });
    aggregate.body.applyImpulse(knockdownImpulse, hitPoint);
    ```
* **Delta Time (`dt`) Clamping:**
  * Always clamp frame delta time to `Math.min(engine.getDeltaTime() / 1000, 0.1)` before updating movement, timers, or physics logic so backgrounding the browser tab never causes physics tunneling through walls.

### 3.5 Raycasting & Picking Performance (`isPickable`)
* **Default to `mesh.isPickable = false`:**
  * Every decorative mesh, floor trim, spawn pad, skybox, view-model gun part, muzzle flash, and shot tracer **must** set `mesh.isPickable = false`.
* **Only Collidable World Geometry & Hitboxes are Pickable:**
  * Only arena walls/floors/cover (`isPickable = true` so tracers stop on walls) and enemy hitboxes (`isPickable = true` with `mesh.metadata = { enemyId, hitZone }`) should be evaluated by `scene.pickWithRay()`.
  * Always pass an explicit filter predicate to `scene.pickWithRay(ray, (m) => m.isPickable && m.isEnabled())`.

### 3.6 Static Assets Mandatory for Audio & Textures (No Procedural Synthesis)
* **Always use preloaded static files** in `public/assets/audio/` (`.ogg` / `.wav`, CC0 licensed) and `public/assets/textures/` for textures/models.
* **Never synthesize Web Audio oscillators (`createOscillator()`, `createGain()`) or generate procedural canvas textures at runtime.** Real pre-generated static files sound and look markedly better and avoid runtime GC spikes.

### 3.7 HUD & UI Rendering Performance
* Keep the 2D HUD in HTML/CSS (`src/ui/HUDController.ts`) overlaid on top of `#gameCanvas` rather than using a full-screen `@babylonjs/gui` `AdvancedDynamicTexture`.
* Avoid unnecessary DOM reflows: prefer updating `textContent` and GPU-composited properties (`transform`, `opacity`) and guard against redundant DOM writes when values haven't changed.

### 3.8 Retro Textures & Point-Sampling Rules (PS1 / Quake 1 Crunch)
* **Mandatory Nearest-Neighbor Point Sampling:**
  * Whenever loading textures for world surfaces, weapons, or entities, **never** use default bilinear/trilinear filtering. Always enforce nearest-neighbor point sampling:
    ```ts
    const tex = new Texture('/assets/textures/stone_floor.png', scene, false, true, Texture.NEAREST_SAMPLINGMODE);
    ```
  * This preserves the sharp, crunchy 90s pixel grit and prevents blurry modern anti-aliasing.
* **Texture Resolution & Palettes:**
  * Textures must be kept at authentic retro resolutions (`128×128` pixels), generated or authored with Bayer matrix dithering, harsh contrast, deep shadowed crevices, and palette quantization.
* **Matte Surfaces:**
  * Stone, masonry, and rusted iron materials must keep specular reflections very low (`specularColor = new Color3(0.01, 0.01, 0.01)`) to look like weathered, porous, grimy surfaces rather than smooth plastic.

### 3.9 Low-Poly Architectural Imperfections & Atmosphere
* **No "Computer-Perfect" Primitives:**
  * Avoid placing standalone, perfectly aligned cubes or smooth cylinders.
  * Environment props must include purposeful structural imperfections:
    - Rusted iron spikes with slight random multi-axis tilts and height variations (`tiltX`, `tiltZ`, `spikeH`).
    - Megalith pillars topped with slanted chipped stone caps and surrounded by fallen rubble blocks.
    - Weathered stone barricades with slightly askew iron trim and fallen stone fragments.
    - Crooked 3-legged brazier pedestals with faceted, hammered iron bowls.
* **Seamless Infinity Fog:**
  * Maintain `scene.fogMode = Scene.FOGMODE_EXP2` with `scene.fogColor` exactly matching `scene.clearColor` (gloomy ash-grey `Color3(0.24, 0.25, 0.27)`).
  * This ensures no horizon seam or ceiling boundary is visible; ruins and enemies loom dramatically directly out of the mist.

### 3.10 Enemy Anatomy & Silhouette Standards (No Visible Cylinders)
* **Invisible Physics Proxy:**
  * Never render the root capsule as a visible body trunk (`root.isVisible = false`, `root.isPickable = false`). The capsule must strictly act as an invisible Havok rigid-body collider.
* **Fully Articulated Low-Poly Anatomy:**
  * Living enemies must be constructed out of distinct, faceted, low-poly anatomical meshes:
    - Forward-pitched hunched ribcage cuirass (`rotation.x = 0.22`) and narrower armored midsection vertebrae.
    - Angular pelvis/hip girdle.
    - Segmented brawny legs: angled thighs, heavy greaves, and pointed iron sabatons (boots) planted at ground level.
    - Segmented reaching arms: upper arm, bent forearm, and sharp iron talons/claws reaching toward the player.
    - Sunken skull helm with asymmetrical horns (long curved left horn, shattered broken stump on right) and glowing horizontal eye slit.
* **Hitbox Propagation:**
  * Every visible anatomical child mesh must set `mesh.isPickable = true` and `mesh.metadata = { enemyId: id }` so raycast hit detection works accurately across the entire humanoid body.

---

## 4. Development & Verification Workflow

Before claiming any task or feature is complete, always run and verify:

1. **Unit Tests (TDD Mandatory for `src/core/`):**
   ```bash
   npm test
   ```
2. **TypeScript Typecheck & Production Bundle Build:**
   ```bash
   npm run build
   ```
3. **Interactive Dev Server:**
   ```bash
   npm run dev
   ```

---

## 5. How to Extend the Game

* **Adding New Weapons (Shotgun, Railgun, Rocket Launcher, etc.):**
  1. Define weapon configuration (`magazineSize`, `fireCooldown`, `reloadDuration`, `damage`, `pelletCount`, `spreadAngle`, `knockbackForce`) in `src/core/WeaponState.ts` (or a `WeaponCatalog.ts` in `src/core/`) and write unit tests in `tests/WeaponState.test.ts`.
  2. Update `WeaponController.ts` to support multi-ray spread (for shotguns) or pooled physical projectiles (for rockets/grenades) and distinct recoil/muzzle visuals with dynamic shot lighting.
  3. Add corresponding real CC0 sound files to `public/assets/audio/` and register them in `AudioManager.ts`.
* **Adding Locational Damage (Headshots / Limb Hits):**
  1. Attach `metadata = { enemyId: id, hitZone: 'HEAD' | 'TORSO' | 'LEGS' }` to each child mesh in `EnemyController.ts`.
  2. Return `hitZone` in `WeaponController.fireRaycast()` and apply a damage multiplier (e.g. `2.0x` for `'HEAD'`) plus stronger angular knockdown torque.
* **Adding New Enemy Archetypes (Heavy Brutes, Fast Swarmers, Ranged Shooters):**
  1. Extract pure enemy stats and AI state transitions into `src/core/EnemyArchetypes.ts` with unit tests in `tests/`.
  2. Parameterize mass, inertia, move speed, HP, and mesh scale/colors in `EnemyController.ts` (e.g., Heavy Brutes with `mass: 4.0` that require heavier weapons or more shots to stagger/knock down).
  3. Always adhere to Rule 3.10: keep the physics capsule invisible and build the visual body out of segmented low-poly anatomy with asymmetrical battle damage.
* **Adding Arena Hazards, Pickups, or New Maps:**
  1. Keep map layout data declarative (arrays of obstacle transforms, spawn points, hazard zones) so `ArenaBuilder.ts` can load different arena configurations cleanly.
  2. Ensure all static obstacles register a `mass: 0` `PhysicsAggregate` and `shadowGenerator.addShadowCaster(mesh)`.
  3. Adhere to Rule 3.8 and Rule 3.9 for all new environment geometry (nearest-neighbor point sampling, 128x128 textures, crooked/weathered imperfections).
