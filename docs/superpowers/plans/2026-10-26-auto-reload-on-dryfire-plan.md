# Auto-Reload on Dryfire Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically start weapon reload when clicking to fire with an empty magazine.

**Architecture:** Add `autoReloadOnEmpty` to `WeaponConfig` and `WeaponState.tryFire()`, update `GameApp.handlePrimaryFire()` to trigger audio/HUD on empty fire, and verify with unit tests.

**Tech Stack:** TypeScript 5, Vitest.

## Global Constraints
- Pure logic in `src/core/WeaponState.ts` (zero Babylon/DOM dependencies).
- TDD required: write failing test before modifying implementation.

---

### Task 1: Add Unit Tests in `tests/WeaponState.test.ts`

**Files:**
- Test: `tests/WeaponState.test.ts`

- [x] **Step 1: Write failing unit test for `autoReloadOnEmpty` behavior in `tests/WeaponState.test.ts`**
- [x] **Step 2: Run test with `npm test` and verify failure**

---

### Task 2: Implement `autoReloadOnEmpty` in `WeaponState.ts` and `GameApp.ts`

**Files:**
- Modify: `src/core/WeaponState.ts`
- Modify: `src/GameApp.ts`

- [x] **Step 1: Update `WeaponConfig` and `WeaponState.tryFire()` in `src/core/WeaponState.ts`**
- [x] **Step 2: Update `GameApp.handlePrimaryFire()` in `src/GameApp.ts` to play reload sound and sync HUD**
- [x] **Step 3: Run `npm test` and verify all tests pass**

---

### Task 3: Production Build and Verification

**Files:**
- All modified files

- [x] **Step 1: Run `npm test` and `npm run build`**
- [x] **Step 2: Commit changes**
