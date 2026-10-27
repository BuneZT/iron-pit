# Procedural Arena Layout & Fog-Emergent Enemy Spawning Design Specification

## 1. Overview
In `iron-pit`, every match currently takes place on a static 100m × 100m arena layout with fixed megaliths, barricades, braziers, and visible red corner summoning sigils. 

This specification introduces:
1. **Procedural Arena Layout Generation with Strict Guardrails**: On every match run (initial start and "RETURN TO PIT" game-over restarts), the placement, dimensions, and orientations of megaliths, crypt barricades, and braziers are dynamically generated across arena quadrants.
2. **Atmospheric Fog-Emergent Enemy Spawning**: Visible summoning sigils on the floor are completely removed. Enemies spawn dynamically shrouded in the thick ash-grey distance fog (32m–42m from the player) so the player never sees them pop into existence—they emerge naturally from the mist as terrifying gothic fiends.
3. **Strict Separation of Core Logic & 3D Scene**: Pure procedural placement math, sector sampling, collision clearances, and fog spawn calculations live in `src/core/ArenaLayoutGenerator.ts` (100% testable in Vitest with zero Babylon/DOM dependencies). `ArenaBuilder.ts` consumes layout descriptors to instantiate and cleanly dispose meshes and Havok Physics bodies.

---

## 2. Architectural Guardrails & Geometry Rules

### 2.1 Center Safe Zone
* **Radius:** A guaranteed clear radius of `12.0m` around the origin `(0, 0)`.
* **Rule:** No megaliths, barricades, braziers, or enemy spawns may be placed inside this circle, ensuring the player spawns with clear initial sightlines and unimpeded maneuverability.

### 2.2 Perimeter Running Circuit
* **Boundary:** All dynamic obstacles are constrained within `[-44.0, 44.0]` on X and Z axes.
* **Rule:** The outer `6.0m` corridor along the perimeter parapet walls is kept open to guarantee unbroken kiting loops and prevent corner dead-ends.

### 2.3 Obstacle Clearance & Pathing
* **Minimum Clearance:** Minimum `7.0m` edge-to-edge separation between any two major obstacles (megaliths and barricades) and `4.0m` separation for braziers.
* **Rule:** Prevents geometry clipping, physics jams, and claustrophobic dead ends.

### 2.4 Balanced Quadrant Density
The 100m × 100m arena is divided into 4 quadrants:
* Quadrant 1 (+X, +Z): `[12, 44] × [12, 44]`
* Quadrant 2 (-X, +Z): `[-44, -12] × [12, 44]`
* Quadrant 3 (-X, -Z): `[-44, -12] × [-44, -12]`
* Quadrant 4 (+X, -Z): `[12, 44] × [-44, -12]`

Each quadrant receives:
* **1 Gothic Megalith**:
  * Position randomized within quadrant interior `[18, 36] × [18, 36]` (with quadrant signs).
  * Variable height: `4.2m – 5.4m`, width/depth: `3.4m – 4.0m`.
  * Randomized rubble block location at base and cap tilt.
* **1–2 Crypt Barricades**:
  * Positioned in mid-corridors or intermediate axes `14m – 38m` from center.
  * Orientation: Randomized horizontal (`w: 5.5m–6.8m, d: 1.4m`) or vertical (`w: 1.4m, d: 5.5m–6.8m`).
  * Attached iron cap and fallen stepping stone fragment.
* **1 Crooked Iron Brazier**:
  * Placed at distance `12m – 22m` from center in each quadrant.
  * PointLight with warm amber emission (`range: 18m, intensity: 0.85`).

### 2.5 Permanent vs. Dynamic Arena Geometry
* **Permanent Geometry (Built Once on Scene Init):**
  * 100m × 100m Stone Floor (`arenaFloor`).
  * 4 Perimeter Parapets (`parapetNorth`, `parapetSouth`, `parapetEast`, `parapetWest`).
  * Crooked perimeter iron spikes (144 total).
  * Invisible tall safety boundary walls (`6m` height).
  * Directional sun and hemispheric ambient lights.
* **Dynamic Geometry (Disposed & Rebuilt on Each Run):**
  * Megaliths and caps/rubble/bands.
  * Barricades and caps/fragments.
  * Braziers, bowls, legs, embers, and brazier point lights.

---

## 3. Dynamic Fog-Emergence Enemy Spawner

### 3.1 Removal of Floor Sigils
* The 4 static circular red summoning pads (`spawnSigil_*`) are removed from the arena floor. The ruins appear desolate and ancient.

### 3.2 Fog Emergence Algorithm
* When `EnemyController.spawnEnemy()` is invoked during wave progression:
  1. Read the player's current position `(px, pz)`.
  2. Generate a candidate spawn point at a random angle $\theta \in [0, 2\pi)$ and distance $R \in [32.0m, 42.0m]$:
     $$x = px + R \cos\theta, \quad z = pz + R \sin\theta$$
  3. Clamp within arena bounds `[-44.0, 44.0]`. If clamped distance to player $< 26.0m$ (e.g. if player is near a wall and spawn falls too close), retry with opposite angle or along wall flank.
  4. Test clearance against all active obstacle footprints ($> 2.5m$ from any obstacle center/bounds).
  5. If valid, spawn enemy at `(x, 1.1, z)`.
* **Atmospheric Result:** At $32m–42m$, exponential distance fog density ($0.054$) renders objects $> 95\%$ shrouded in mist. Enemies materialize completely obscured in the fog and emerge directly out of the gloom.

---

## 4. Module Specifications

### 4.1 `src/core/ArenaLayoutGenerator.ts`
* Pure TypeScript data structures:
  ```ts
  export interface ObstacleBoxDef {
    id: string;
    type: 'MEGALITH' | 'BARRICADE';
    x: number;
    z: number;
    width: number;
    height: number;
    depth: number;
    rotationY: number;
  }

  export interface BrazierDef {
    id: string;
    x: number;
    z: number;
  }

  export interface ArenaLayout {
    megaliths: ObstacleBoxDef[];
    barricades: ObstacleBoxDef[];
    braziers: BrazierDef[];
    safeRadius: number;
    arenaBounds: number;
  }
  ```
* Functions:
  * `generateArenaLayout(seed?: number): ArenaLayout`: Computes valid, non-overlapping layouts respecting guardrails.
  * `findFogSpawnPoint(playerPos: { x: number; z: number }, layout: ArenaLayout, rng?: () => number): { x: number; z: number }`: Finds a collision-free spawn point in the mist $32m–42m$ from player.

### 4.2 `src/scene/ArenaBuilder.ts`
* Maintains static structures on initial build.
* Exposes `buildDynamicLayout(layout: ArenaLayout)`:
  * Disposes all previous dynamic meshes, physics aggregates, and point lights (avoiding WASM/GPU leaks per AGENTS.md Rule 3.3).
  * Creates new meshes, applies shared retro materials, and configures `mass: 0` Havok physics aggregates and shadow casters.
  * Returns active `PointLight[]` for brazier flicker updates.

### 4.3 `src/scene/EnemyController.ts`
* Updates `spawnEnemy()` to accept the dynamic fog spawn position or layout reference.
* Drops hardcoded `spawnPoints` array in favor of fog emergence sampling.

### 4.4 `src/GameApp.ts`
* During `startNewMatch()`:
  * Invokes `ArenaLayoutGenerator.generateArenaLayout()`.
  * Calls `arenaBuilder.rebuildDynamicLayout(newLayout)`.
  * Passes current layout to `enemyController`.
  * Resets player, weapon, health, wave manager, and HUD.

---

## 5. Testing & Verification Plan

1. **Unit Tests (`tests/ArenaLayoutGenerator.test.ts`):**
   * Enforces center safe zone ($> 12m$ from `(0, 0)`).
   * Enforces perimeter boundaries ($[-44, 44]$).
   * Verifies minimum distance between obstacles ($> 7m$).
   * Verifies fog spawn point calculation ($32m \le \text{dist} \le 42m$ and within arena bounds).
2. **Integration Tests (`tests/ArenaBuilder.test.ts`):**
   * Verifies dynamic layout construction and disposal cycles without dangling meshes or bodies.
   * Brazier collision and player obstacle interaction remain functional.
3. **Build & Typecheck:**
   * `npm test` passing 100%.
   * `npm run build` bundling cleanly without errors.
