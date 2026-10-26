# Enemy Jump & Obstacle Vaulting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable demonic chasers in `EnemyController.ts` to vault obstacles when blocked and leap up at the player when perched on elevated obstacles, while updating contact damage to 3D distance validation.

**Architecture:** Extend `EnemyInstance` with stall and jump cooldown state, evaluate jump triggers in `EnemyController.update()`, apply Havok physical impulses, clamp bounds, and validate 3D contact distance using pooled scratch vectors for zero GC.

**Tech Stack:** TypeScript 5, `@babylonjs/core`, `@babylonjs/havok`, Vitest.

## Global Constraints
- Pure TypeScript rules and zero GC churn (reusable scratch vectors, no `new Vector3()` in `update`).
- Drive Havok bodies via velocities/impulses, not `mesh.position`.
- Clamp delta time to `Math.min(dt, 0.1)`.

---

### Task 1: Extend `EnemyInstance` and Vector Pooling in `EnemyController.ts`

**Files:**
- Modify: `src/scene/EnemyController.ts`

**Interfaces:**
- `EnemyInstance` adds:
  - `jumpCooldown: number`
  - `stuckTimer: number`
  - `prevPosition: Vector3`

- [x] **Step 1: Update `EnemyInstance` interface and add scratch vectors in `EnemyController`**
- [x] **Step 2: Initialize `jumpCooldown`, `stuckTimer`, and `prevPosition` in `spawnEnemy()`**

---

### Task 2: Implement Movement Stall Detection, Jump Logic, and 3D Contact Damage

**Files:**
- Modify: `src/scene/EnemyController.ts`
- Test: `tests/EnemyController.test.ts`

**Interfaces:**
- `update(dt: number, playerPosition: Vector3, waveNumber?: number): number`

- [x] **Step 1: Write unit tests in `tests/EnemyController.test.ts` for 3D contact distance and jump impulse triggering**
- [x] **Step 2: Implement stall detection, vertical pursuit leap, obstacle vault leap, and 3D contact damage in `EnemyController.update()`**
- [x] **Step 3: Run unit tests with `npm test` and verify passes**

---

### Task 3: Build Verification & Regression Check

**Files:**
- All modified files

- [x] **Step 1: Run full Vitest suite (`npm test`)**
- [x] **Step 2: Run TypeScript check and production build (`npm run build`)**
- [x] **Step 3: Git commit clean state**
