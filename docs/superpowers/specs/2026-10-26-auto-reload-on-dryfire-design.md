# Auto-Reload on Dryfire Design Specification

## 1. Goal
When the weapon magazine is empty (`ammo === 0`) and the player clicks to fire (<kbd>LMB</kbd>), automatically initiate a weapon reload so the player doesn't have to manually press <kbd>R</kbd> to reload after emptying their magazine.

## 2. Core Architecture
In accordance with Rule 3.1 (Strict Separation of Core Logic vs. 3D Scene):
* All ammo, reload, and state transition logic lives in `src/core/WeaponState.ts`.
* `WeaponConfig` adds `autoReloadOnEmpty?: boolean` (defaults to `true`).
* When `tryFire()` is invoked with `_ammo <= 0`:
  * If `autoReloadOnEmpty` is enabled, `this.startReload()` is called automatically.
  * `tryFire()` returns `'EMPTY'`.
  * Subsequent fire attempts while reloading return `'RELOADING'`.
* In `src/GameApp.ts`:
  * When `fireOutcome === 'EMPTY'`:
    * Audio plays `'dryfire'` (hammer click) followed by `'reload'`.
    * HUD is synced immediately so the reload status indicator (`RELOADING...`) appears without delay.

## 3. Verification Plan
* **Unit Tests (`tests/WeaponState.test.ts`):**
  * Verify `tryFire()` on empty magazine automatically starts reload when `autoReloadOnEmpty: true`.
  * Verify subsequent `tryFire()` calls return `'RELOADING'`.
  * Verify weapon reloads to full after `reloadDuration`.
  * Verify `autoReloadOnEmpty: false` preserves manual reload behavior without auto-reloading.
* **Build Check:** `npm test` and `npm run build` succeed with zero errors.
