# PS1/PS2 & Quake Gothic Retro Vibe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the visual graphics and atmosphere of Iron Pit into an open-air, heavy-fog gothic retro FPS (inspired by Quake 1 and Dark Forces) using pure direct rendering, bleak overcast daylight, static retro textures, gothic props, fire-braziers, blackened iron weapon, demonic armored enemies, and a 90s HUD.

**Architecture:** 
- Maintain strict separation of pure logic (`src/core/`) and scene rendering (`src/scene/`).
- Generate static tileable retro textures in `public/assets/textures/` to eliminate runtime canvas generation per AGENTS.md rule 3.6.
- Overhaul `ArenaBuilder.ts` to construct an open-air ruins arena with exponential fog matching clear color, low stone parapets with iron spikes, invisible tall Havok boundaries, stone monoliths, and dynamic fire-braziers.
- Animate organic fire-brazier flicker in `GameApp.ts`.
- Retheme viewmodel gun in `WeaponController.ts` with blackened iron geometry and dynamic muzzle point light.
- Retheme enemy meshes in `EnemyController.ts` with armored iron cuirass, spiked pauldrons, and glowing demonic visors.
- Re-skin HUD overlay in `index.html` and `HUDController.ts` into a 90s gothic/industrial beveled style.

**Tech Stack:** TypeScript 5, Babylon.js 7+, Havok Physics V2, Vitest, HTML/CSS.

## Global Constraints
- Pure TypeScript core logic in `src/core/` remains 100% decoupled with zero Babylon/DOM imports.
- Zero runtime GC allocations in render loops (`*ToRef` methods, scratch vectors).
- All texture assets must be pre-generated static files in `public/assets/textures/`.
- No post-processing shaders; 100% pure direct rendering for maximum framerate.
- Delta time clamped to `Math.min(dt, 0.1)`.

---

### Task 1: Static Retro Texture Assets Setup

**Files:**
- Create: `public/assets/textures/stone_floor.png`
- Create: `public/assets/textures/dungeon_wall.png`
- Create: `public/assets/textures/rusted_iron.png`
- Create: `public/assets/textures/crypt_stone.png`
- Helper script: `scripts/generate-retro-textures.mjs`

**Interfaces:**
- Produces: 4 static tileable 256x256 PNG textures in `public/assets/textures/` served statically by Vite at `/assets/textures/*.png`.

- [ ] **Step 1: Write Node generator script to create retro pixelated tileable textures**
- [ ] **Step 2: Run script to generate the 4 texture PNG files**
- [ ] **Step 3: Verify the files exist and are valid PNG images**
- [ ] **Step 4: Commit texture assets**

---

### Task 2: Arena Environment, Fog & Open Ruins (`ArenaBuilder.ts`)

**Files:**
- Modify: `src/scene/ArenaBuilder.ts`

**Interfaces:**
- Consumes: Static textures from `/assets/textures/*.png`.
- Produces: `ArenaData { spawnPoints: Vector3[]; shadowGenerator: ShadowGenerator; brazierLights: PointLight[] }`.

- [ ] **Step 1: Update `ArenaData` interface to expose `brazierLights: PointLight[]`**
- [ ] **Step 2: Configure seamless overcast daylight and heavy exponential fog**
  - Set `scene.fogMode = Scene.FOGMODE_EXP2`, `fogDensity = 0.038`, `fogColor = clearColor = Color3(0.24, 0.25, 0.27)`.
  - Set `HemisphericLight` with overcast sky `Color3(0.42, 0.44, 0.46)` and damp ground `Color3(0.20, 0.19, 0.18)`.
  - Set `DirectionalLight` with soft exponential shadows.
- [ ] **Step 3: Build open-air floor with tiled `stone_floor.png`**
- [ ] **Step 4: Build low stone parapets (~1.5m) with iron spikes and tall invisible Havok collision walls (6m)**
- [ ] **Step 5: Build gothic monoliths, iron-banded stone pillars, and cover slabs**
- [ ] **Step 6: Build 4 elevated iron fire-braziers with warm amber `PointLight`s**
- [ ] **Step 7: Build carved stone floor summoning pads with dark-red emissive runes**
- [ ] **Step 8: Typecheck and verify build**
- [ ] **Step 9: Commit changes**

---

### Task 3: Fire Brazier Organic Flicker Animation (`GameApp.ts`)

**Files:**
- Modify: `src/GameApp.ts`

**Interfaces:**
- Consumes: `brazierLights: PointLight[]` from `ArenaBuilder.build()`.
- Produces: Dynamic warm ambient pulse in the render loop.

- [ ] **Step 1: Store `brazierLights` in `GameApp` class fields**
- [ ] **Step 2: Add smooth sinusoidal flicker logic in render loop (`this.update(dt)`)**
- [ ] **Step 3: Verify no object allocations during render loop**
- [ ] **Step 4: Commit changes**

---

### Task 4: Gothic Blunderbuss Viewmodel & Dynamic Muzzle Light (`WeaponController.ts`)

**Files:**
- Modify: `src/scene/WeaponController.ts`

**Interfaces:**
- Produces: Gothic blackened-iron firearm with riveted shroud, aged dark grip, and dynamic 50ms muzzle point light.

- [ ] **Step 1: Retheme viewmodel geometry to blackened iron receiver, flanged barrel, iron rivets, and dark stock**
- [ ] **Step 2: Add dynamic `PointLight` on `muzzleNode` that activates on shot for 50ms and turns off**
- [ ] **Step 3: Update muzzle flash mesh into jagged fire shape**
- [ ] **Step 4: Typecheck and verify build**
- [ ] **Step 5: Commit changes**

---

### Task 5: Armored Demonic Chasers (`EnemyController.ts`)

**Files:**
- Modify: `src/scene/EnemyController.ts`

**Interfaces:**
- Produces: Dark iron-plated demonic chasers with spiked pauldrons and glowing horizontal eye slit.
- Preserves: `PhysicsAggregate` locked upright inertia while alive, unlocked inertia and heavy impulse knockdown on kill.

- [ ] **Step 1: Update enemy materials (dark rusted iron plate with rough specular, glowing crimson/amber visor)**
- [ ] **Step 2: Rebuild enemy mesh structure (armored chest cuirass, spiked angular shoulder pauldrons, demonic horned/spiked helm with eye slit)**
- [ ] **Step 3: Ensure all enemy mesh parts have `isPickable = true` and `metadata = { enemyId }`**
- [ ] **Step 4: Ensure proper disposal of all parts in `destroyEnemy()`**
- [ ] **Step 5: Commit changes**

---

### Task 6: 90s Gothic / Quake-style HUD (`index.html` & `HUDController.ts`)

**Files:**
- Modify: `index.html`
- Modify: `src/ui/HUDController.ts`

**Interfaces:**
- Produces: 90s gothic HUD with beveled iron/stone styling, retro typography, Quake crosshair, and red pulse damage vignette.

- [ ] **Step 1: Update HUD CSS in `index.html` with beveled dark iron frames, retro monospaced fonts, and Quake crosshair**
- [ ] **Step 2: Update modal screens (`MENU`, `PAUSED`, `GAME OVER`) with gothic stone/iron theme**
- [ ] **Step 3: Update `HUDController.ts` if needed for any class or DOM binding adjustments**
- [ ] **Step 4: Commit changes**

---

### Task 7: Full Verification & Polish

**Files:**
- All touched files

- [ ] **Step 1: Run unit test suite: `npm test`**
- [ ] **Step 2: Run typecheck & build: `npm run build`**
- [ ] **Step 3: Final verification and summary**
