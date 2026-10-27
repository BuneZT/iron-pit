# Procedural Arena Layout & Fog Spawning Implementation Plan

> **Goal:** Randomize the 100m × 100m arena layout every match run (obstacles, braziers, and dynamic fog enemy spawns) with strict guardrails (center safe radius, perimeter circuit, minimum clearances) and enemies emerging from deep fog without floor sigils.

---

### Task 1: Core Logic — `ArenaLayoutGenerator.ts` & Unit Tests
- **Files:**
  - Create `src/core/ArenaLayoutGenerator.ts`
  - Create `tests/ArenaLayoutGenerator.test.ts`
- **Steps:**
  1. Write unit tests in `tests/ArenaLayoutGenerator.test.ts` verifying:
     - Center safe radius ($R \ge 12m$) has 0 obstacles or braziers.
     - All obstacles and braziers reside within `[-44, 44]` on X and Z.
     - Clearance between any two obstacle centers/bounds is maintained ($> 7m$).
     - Each of the 4 quadrants has at least 1 megalith, 1 barricade, and 1 brazier.
     - `findFogSpawnPoint()` returns a coordinate within bounds and at an obscured fog distance ($> 28m$ from player).
  2. Implement `ArenaLayoutGenerator.ts` in `src/core/` with zero Babylon/DOM dependencies.
  3. Run `npm test` and verify tests pass.

---

### Task 2: Scene Integration — Update `ArenaBuilder.ts` for Dynamic Layouts & Disposal
- **Files:**
  - Modify `src/scene/ArenaBuilder.ts`
  - Modify `tests/ArenaBuilder.test.ts`
- **Steps:**
  1. Separate static arena construction (floor, perimeter parapet, perimeter spikes, invisible boundary, directional sun) from dynamic obstacle construction.
  2. Implement `buildDynamicLayout(layout: ArenaLayout)`:
     - Remove old dynamic meshes, dispose their physics aggregates, and dispose old brazier lights.
     - Instantiate megaliths (with irregular top caps, rubble, iron bands), crypt barricades (with iron trim, fallen stepping stone fragments), and braziers (pedestal, tripod legs, bowl, embers, point light) according to the layout definition.
     - Remove static summoning sigil meshes (`spawnSigil_*`).
  3. Update `tests/ArenaBuilder.test.ts` to test dynamic layout rebuilding and brazier collision.
  4. Run `npm test` and verify all tests pass.

---

### Task 3: Scene Integration — Update `EnemyController.ts` for Dynamic Fog Emergence
- **Files:**
  - Modify `src/scene/EnemyController.ts`
- **Steps:**
  1. Allow `EnemyController` to accept or query an `ArenaLayout` and player position when spawning enemies.
  2. Use `findFogSpawnPoint()` to spawn enemies at mist distance ($32m–42m$ from player) rather than cycling fixed corner sigils.
  3. Ensure enemy rotation initially orients toward the player so they stalk out of the fog toward the player immediately.
  4. Run `npm test` to verify enemy tests pass.

---

### Task 4: Match Lifecycle Integration — Update `GameApp.ts`
- **Files:**
  - Modify `src/GameApp.ts`
- **Steps:**
  1. On `init()`, generate initial `ArenaLayout` and build the dynamic arena.
  2. In `startNewMatch()`, generate a fresh `ArenaLayout`, call `rebuildDynamicLayout()`, and update `enemyController`.
  3. In `update()`, pass player position to `enemyController.spawnEnemy()`.
  4. Update brazier flicker loop with active brazier lights.

---

### Task 5: Verification & Quality Assurance
- **Steps:**
  1. Run `npm test` to ensure all 8+ test suites pass cleanly.
  2. Run `npm run build` to verify clean TypeScript compilation and Vite bundling.
  3. Test build artifacts and ensure no regressions.
