# 100m × 100m Arena Enlargement Design Specification

## 1. Overview
The original arena in `iron-pit` is a 40m × 40m stone ruin pit. This specification defines the expansion of the arena to a **100m × 100m Open Grand Pit** (~6.25× floor area), scaling up the architectural landmarks, recalibrating the distance fog and directional lighting, and tuning player sprint and enemy chase speeds to maintain responsive, high-adrenaline retro FPS combat.

---

## 2. Arena Architecture & Geometry (`src/scene/ArenaBuilder.ts`)

### 2.1 Floor
* **Dimensions:** `100m × 100m` box (width: 100, depth: 100, height: 1.0, position y: -0.5).
* **Texture Tiling:** `stone_floor.png` with `uScale: 40`, `vScale: 40` using `Texture.NEAREST_SAMPLINGMODE`.
* **Physics:** Box `PhysicsAggregate` with `mass: 0`, `friction: 0.7`, `restitution: 0.15`.

### 2.2 Perimeter Parapets & Crooked Iron Spikes
* **Parapet Walls:** Height `1.5m`, thickness `0.8m`.
  * North: `w: 101.6, d: 0.8, x: 0, z: 50.4`
  * South: `w: 101.6, d: 0.8, x: 0, z: -50.4`
  * East: `w: 0.8, d: 100, x: 50.4, z: 0`
  * West: `w: 0.8, d: 100, x: -50.4, z: 0`
* **Invisible Ceiling Safety Boundary:** 6.0m tall box on top of each parapet (`y: 4.5`, thickness `0.8m`) with `mass: 0` physics aggregate preventing entities or ragdolls from being launched outside.
* **Crooked Iron Spikes:** 36 spikes per wall face (144 total). Spaced evenly along the wall (`step = 100 / 36`), with randomized multi-axis tilts (`tiltX`, `tiltZ` up to ±0.18 rad) and heights (`0.65m` to `0.97m`).

### 2.3 Gothic Megaliths (4 Outer Landmarks)
* **Body:** Box at `(±22.5, ±22.5)`, dimensions `w: 3.6m, h: 4.8m, d: 3.6m` with crypt stone texture (`crypt_stone.png`).
* **Jagged Cap:** 5-sided cylinder on top (`diameterTop: 2.8m, diameterBottom: 3.8m, height: 0.8m`) at `y = 5.2m` with slight tilt.
* **Fallen Rubble:** Weathered stone rubble block at base (`w: 1.2m, h: 0.55m, d: 1.0m`) with collision and mass 0 physics.
* **Reinforcement Bands:** Skewed rusted iron bands at heights `y = 1.6m` and `y = 3.6m`.

### 2.4 Crypt Barricades (4 Cardinal Cover Slabs)
* **Positions:** `(0, ±32)` and `(±32, 0)`.
* **Dimensions:** Length `6.4m`, height `1.9m`, depth `1.4m` (along respective axis).
* **Iron Cap:** Slanted iron trim cap on top (`h: 0.14m`).
* **Fallen Fragment:** Fallen stone fragment at one end (`0.8m × 0.4m × 0.7m`) acting as low vaultable stepping stone.

### 2.5 Iron Fire-Braziers (4 Inner Warm Beacons)
* **Positions:** `(±12, 0)` and `(0, ±12)`.
* **Tripod Legs:** Crooked 3-legged tripod with iron pedestal and faceted 7-sided fire bowl at `y: 1.62m`.
* **Light Source:** PointLight at `y: 2.3m`, warm amber color (`1.0, 0.62, 0.22`), `range: 18.0m`, `intensity: 0.85`.

### 2.6 Demonic Summoning Sigils (4 Corner Spawns)
* **Positions:** `(±42, 1.1, ±42)`.
* **Geometry:** Thin circular disk (`diameter: 3.2m, height: 0.05m`) with crimson emissive material (`emissiveColor: (0.65, 0.12, 0.08)`).

---

## 3. Atmosphere, Fog & Lighting

* **Exponential Distance Fog:**
  * `scene.fogMode = Scene.FOGMODE_EXP2`
  * `scene.fogDensity = 0.018`
  * `scene.fogColor = Color3(0.24, 0.25, 0.27)` (exact match to clearColor ash-grey)
  * Provides ~75m–80m sightlines before fading smoothly into infinity mist with zero skybox seams.
* **Directional Sunlight:**
  * `dirLight.position = Vector3(35, 45, 30)` to cover 100m arena footprint with shadow mapping.

---

## 4. Player & Enemy Movement & Physics Clamping

### 4.1 Player Controller (`src/scene/PlayerController.ts`)
* **Walk Speed:** `7.2 m/s` (was 6.5)
* **Sprint Speed:** `12.0 m/s` (was 10.0)
* **Jump Speed:** `7.8 m/s` (unchanged)
* **Boundary Clamp:** Clamped to `[-49.2, 49.2]` on X and Z axes (was `±19.2`).

### 4.2 Enemy Controller (`src/scene/EnemyController.ts`)
* **Base Chase Speed:** `5.5 m/s` (was 4.6)
* **Boundary Clamp:** Clamped to `[-49.2, 49.2]` on X and Z axes (was `±19.2`).
* **Vault & Pursuit Leap:** Maintained for the new 1.9m barricades and megalith rubble blocks.

---

## 5. Testing & Verification Plan

* **Automated Unit Tests:**
  * Run `npm test` verifying all 7 test files pass.
  * Update any tests that verify player/enemy position bounds or movement speeds if hardcoded.
* **TypeScript & Bundle Build:**
  * Run `npm run build` to confirm zero compilation errors.
