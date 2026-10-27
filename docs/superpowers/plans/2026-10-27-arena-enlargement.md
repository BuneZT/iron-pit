# 100m Arena Enlargement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the arena from 40m × 40m to a 100m × 100m Open Grand Pit, recalibrate atmospheric fog & lighting, scale all landmarks & cover, and tune player sprint and enemy chase dynamics.

**Architecture:** Update `ArenaBuilder.ts` with 100m dimensions, scaled props, repositioned braziers/sigils, and 0.018 EXP2 fog; update `PlayerController.ts` and `EnemyController.ts` with updated movement speeds and `±49.2` boundary clamping; verify all unit tests and production build.

**Tech Stack:** TypeScript 7, Vite 8, `@babylonjs/core`, `@babylonjs/havok`, Vitest 5.

## Global Constraints
- Strictly adhere to AGENTS.md: nearest-neighbor point sampling on retro textures, invisible physics colliders, no GC in render loops, and full physics disposal.
- Arena bounds clamp: `[-49.2, 49.2]`.
- All tests in `tests/` must pass via `npm test`.
- Build must succeed via `npm run build`.

---

### Task 1: ArenaBuilder 100m Architecture & Atmosphere

**Files:**
- Modify: `src/scene/ArenaBuilder.ts`

**Interfaces:**
- Consumes: `@babylonjs/core` (MeshBuilder, PhysicsAggregate, etc.)
- Produces: `ArenaBuilder.build(scene: Scene): ArenaData` with updated `spawnPoints` at `(±42, 1.1, ±42)` and `brazierLights`.

- [ ] **Step 1: Update atmosphere and lighting in `ArenaBuilder.ts`**
  - Set `scene.fogDensity = 0.018`.
  * Set `dirLight.position = new Vector3(35, 45, 30)`.

- [ ] **Step 2: Update floor mesh & texturing**
  - Set `arenaSize = 100`.
  - Set `floorTexture.uScale = 40` and `floorTexture.vScale = 40`.
  - Floor box width: 100, depth: 100.

- [ ] **Step 3: Update perimeter walls & spikes**
  - Update `wallConfigs`:
    - `parapetNorth`: `w: 101.6, d: 0.8, x: 0, z: 50.4`
    - `parapetSouth`: `w: 101.6, d: 0.8, x: 0, z: -50.4`
    - `parapetEast`: `w: 0.8, d: 100, x: 50.4, z: 0`
    - `parapetWest`: `w: 0.8, d: 100, x: -50.4, z: 0`
  - Update invisible collision bounds to match wall spans (6m tall, `y: 4.5`, thickness 0.8).
  - Increase `spikeCount = 36` per wall face (step = `100 / 36`).

- [ ] **Step 4: Scale and reposition Megaliths & Rubble**
  - Positions: `(±22.5, ±22.5)`. Body dimensions: `w: 3.6, h: 4.8, d: 3.6`.
  - Jagged caps: `diameterTop: 2.8, diameterBottom: 3.8, height: 0.8` at `y: 5.1`.
  - Rubble blocks: `w: 1.2, h: 0.55, d: 1.0` at `y: 0.28`.
  - Skewed reinforcement iron bands at `y: 1.68` and `y: 3.6`.

- [ ] **Step 5: Scale and reposition Crypt Barricades**
  - Positions: `(0, ±32)` with `w: 6.4, h: 1.9, d: 1.4` and `(±32, 0)` with `w: 1.4, h: 1.9, d: 6.4`.
  - Iron cap: `w: obs.w + 0.08, h: 0.14, d: obs.d + 0.08`.
  - Fallen stone fragments: `0.8m × 0.4m × 0.7m`.

- [ ] **Step 6: Reposition Braziers & Demonic Sigils**
  - Braziers at `(±12, 0)` and `(0, ±12)`.
  * PointLight range: `18.0`, intensity: `0.85`.
  - Spawn points at `(±42, 1.1, ±42)`.
  - Sigil mesh diameter: `3.2`.

- [ ] **Step 7: Commit Task 1**
  ```bash
  git add src/scene/ArenaBuilder.ts
  git commit -m "feat(scene): enlarge arena to 100m grand pit with scaled landmarks and fog"
  ```

---

### Task 2: Player & Enemy Movement & Clamping Updates

**Files:**
- Modify: `src/scene/PlayerController.ts`
- Modify: `src/scene/EnemyController.ts`

- [ ] **Step 1: Update PlayerController movement speeds and clamping**
  - `walkSpeed = 7.2` (from 6.5)
  - `sprintSpeed = 12.0` (from 10.0)
  - Clamp position in `update(dt)`:
    ```ts
    this.collider.position.x = Math.max(-49.2, Math.min(49.2, this.collider.position.x));
    this.collider.position.z = Math.max(-49.2, Math.min(49.2, this.collider.position.z));
    ```

- [ ] **Step 2: Update EnemyController chase speed and clamping**
  - `baseMoveSpeed = 5.5` (from 4.6)
  - Clamp position in `update(dt, playerPosition)`:
    ```ts
    if (Math.abs(enemy.root.position.x) > 49.2 || Math.abs(enemy.root.position.z) > 49.2) {
      enemy.root.position.x = Math.max(-49.2, Math.min(49.2, enemy.root.position.x));
      enemy.root.position.z = Math.max(-49.2, Math.min(49.2, enemy.root.position.z));
    }
    ```

- [ ] **Step 3: Commit Task 2**
  ```bash
  git add src/scene/PlayerController.ts src/scene/EnemyController.ts
  git commit -m "feat(scene): update player and enemy movement speeds and 100m boundary clamps"
  ```

---

### Task 3: Unit Tests & Bounds Verification

**Files:**
- Modify/Create: `tests/PlayerController.test.ts`
- Modify/Create: `tests/EnemyController.test.ts`

- [ ] **Step 1: Check existing tests for hardcoded arena bounds or speeds**
  - Verify if any tests assert boundary clamps or speeds.
  - Add tests verifying the player and enemy boundary clamping at `±49.2`.

- [ ] **Step 2: Run all unit tests**
  - Run `npm test` and ensure all suites pass.

- [ ] **Step 3: Commit Task 3**
  ```bash
  git add tests/
  git commit -m "test: verify 100m arena boundary clamping and physics in unit tests"
  ```

---

### Task 4: Production Build & AGENTS.md Verification

**Files:**
- Modify: `AGENTS.md` (update arena scale documentation to 100m × 100m)

- [ ] **Step 1: Update AGENTS.md documentation**
  - Update Arena Scale in `AGENTS.md` Section 1 to: `100m × 100m flagstone ruins pit (1 unit = 1 meter)...`.

- [ ] **Step 2: Verify production build**
  - Run `npm run build`.

- [ ] **Step 3: Commit Task 4**
  ```bash
  git add AGENTS.md
  git commit -m "docs: update AGENTS.md arena dimensions to 100m x 100m"
  ```
