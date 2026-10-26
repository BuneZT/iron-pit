# IRON PIT — Babylon.js Arena Survival FPS

A wave-based 3D arena survival First-Person Shooter built with **Babylon.js**, **Havok Physics V2 (`@babylonjs/havok`)**, **TypeScript**, and **Vite**.

## Features

- **Heavy Kinetic Gunplay & Physics Knockdowns**:
  - Center-screen hitscan raycast carbine with 3D view-model recoil kickback, muzzle flash, and shot tracer.
  - **Non-Lethal Hit Stagger**: Shots apply a horizontal Havok impulse that physically shoves chasing enemies backward and flashes their armor.
  - **Fatal Knockdown**: Killing shots unlock the enemy capsule's rotational inertia and apply an off-center impulse + angular torque at the exact hit point, causing enemies to physically flip and topple across the arena floor and into cover pillars.
- **Wave Survival Arena**:
  - `40m × 40m` industrial pit with `4m` perimeter walls, `8` interior cover pillars/crates, dynamic shadows, and `4` corner spawn pads.
  - Escalating waves ($3 + 2N$ enemies per wave) with staggered spawns and inter-wave breathers.
- **Crisp HTML/CSS HUD**:
  - Dynamic crosshair (expands on shot, flashes red on hit), Armor Integrity health bar, damage vignette flash, ammo/reload counter, wave/hostiles/kills top bar, and Start/Pause/Game Over screens.
- **Real CC0 Audio Assets**:
  - Preloaded `.ogg` sound effects in `public/assets/audio/` (`gunshot.ogg`, `dryfire.ogg`, `reload.ogg`, `hit.ogg`, `knockdown.ogg`, `hurt.ogg`) from Kenney CC0 packs.

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

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run unit tests
npm test

# Build for production
npm run build
```
