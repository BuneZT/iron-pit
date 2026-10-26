# IRON PIT — 90s Gothic Arena Survival FPS

> **🎮 [Play Live in Browser: https://bunezt.github.io/iron-pit/](https://bunezt.github.io/iron-pit/)**

A dark, atmospheric wave-based 3D arena survival First-Person Shooter inspired by **Quake 1** and **Dark Forces**, built with **Babylon.js 7+**, **Havok Physics V2 (`@babylonjs/havok`)**, **TypeScript**, and **Vite**.

---

## Aesthetic & Visual Features

- **Bleak Overcast Daylight & Heavy Fog**:
  - Open-air desolate ruins shrouded under an oppressive ash-grey overcast sky.
  - Deep exponential distance fog (`FOGMODE_EXP2`) calibrated to seamlessly match the clear color, creating an infinite void where gothic ruins and approaching enemies loom out of the murky mist.
- **Gritty 90s Retro Textures & Point Sampling**:
  - Static 128×128 pixel textures crafted with a **4×4 Bayer matrix dither** and discrete palette quantization (pitch-black mortar trenches, chipped stone bevels, water runoff streaks, and oxidized pitted rust).
  - Enforces `Texture.NEAREST_SAMPLINGMODE` point sampling across all geometry to eliminate modern bilinear blur and deliver authentic crunchy retro pixel grit.
- **Weathered Low-Poly Architecture with Imperfections**:
  - `40m × 40m` open flagstone arena enclosed by low crumbling stone parapets topped with crooked, multi-axis bent rusted iron spikes.
  - Fractured basalt megaliths with slanted chipped stone caps, crooked iron reinforcement bands, and fallen rubble blocks.
  - `4` smoking gothic iron fire-braziers with dynamic, organic flame-flickering `PointLight`s cutting through the cold grey gloom.
- **Quake 1 Gothic Fiends (Grotesque Low-Poly Anatomy)**:
  - Replaced generic capsule shapes with fully articulated, segmented humanoid anatomy (angled greaves, pointed iron boots, armored vertebrae midsection, and forward-pitched hunched ribcage).
  - Sunken skull helm with asymmetrical horns: a long curved left horn and a shattered stump on the right.
  - Forward-reaching clawed arms with iron talons aggressively chasing the player.
- **Blackened-Iron Blunderbuss / Nailgun Carbine**:
  - Chunky hammered-iron receiver with welded side plates, brass heat shroud, cocking lever, and crooked front sight.
  - Dynamic muzzle flash mesh and a 50ms dynamic `PointLight` that illuminates nearby stone pillars and ground in fiery amber light with every shot.
- **90s Beveled Iron & Stone HUD**:
  - Chiseled dark iron borders with 3D metallic bevels, retro monospaced typography, and a classic Quake chunky dot-and-brackets crosshair.
  - Segmented blood-red health bar and brass/amber ammo counter.

---

## Gameplay & Kinetic Physics

- **Heavy Kinetic Gunplay & Havok Physics V2**:
  - Center-screen hitscan raycasts with visual recoil kickback, dynamic tracer lines, and shot impact lighting.
  - **Non-Lethal Hit Stagger**: Non-fatal shots apply a physical Havok impulse (`J = 11.5 N·s`) that knocks living enemies backward and flashes their armor white.
  - **Fatal Knockdown Ragdolls**: Lethal hits unlock rotational inertia, lower damping, and apply an off-center impulse (`J = 21 N·s` horizontal + `6.5 N·s` vertical) at the exact hit point with spin torque, causing the fiend to physically flip and tumble violently across the flagstones and collide with obstacles.
- **Escalating Wave Survival**:
  - Formulas scale enemy counts ($3 + 2N$) with staggered perimeter spawns, speed scaling, and inter-wave breather countdowns.
- **Real CC0 Audio Assets**:
  - Preloaded sound effects in `public/assets/audio/` (`gunshot.ogg`, `dryfire.ogg`, `reload.ogg`, `hit.ogg`, `knockdown.ogg`, `hurt.ogg`).

---

## Controls

| Input | Action |
| :--- | :--- |
| `W / A / S / D` | Move |
| `Shift` | Sprint |
| `Space` | Jump |
| `Mouse` (Pointer Lock) | Aim / Look |
| `Left Mouse Button` | Fire Weapon |
| `R` | Reload (`12` rounds) |
| `ESC` | Pause / Unlock Cursor |

---

## Getting Started

```bash
# Install dependencies
npm install

# Start interactive development server
npm run dev

# Run Vitest unit test suite (core game logic)
npm test

# Production build and typecheck
npm run build
```
