# Iron Pit — PS1/PS2 Retro Gothic Vibe & Graphics Rework Design Specification

**Date:** 2026-10-26  
**Status:** Approved by User  
**Target Architecture:** Babylon.js 7+, Havok Physics V2, Pure TypeScript Core, HTML/CSS HUD  

---

## 1. Overview & Aesthetic Pillars

The goal is to rework the visual atmosphere and aesthetics of **Iron Pit** from a clean modern sci-fi look into a gritty, atmospheric 90s retro FPS reminiscent of **Quake 1** and **Dark Forces**, running with crisp resolution and pure direct rendering (no heavy post-processing shaders).

### Core Pillars
1. **Gloomy Overcast Daylight & Heavy Fog:** An open-air arena set under an oppressive, overcast ash-grey sky. Deep exponential fog (`FOGMODE_EXP2`) seamlessly matches the clear color, creating an infinite void where distant ruins and enemies loom out of the murky mist.
2. **Open Gothic Ruins Architecture:** Low crumbling stone parapets, rusted iron-spiked perimeter railings, weathered stone monoliths, fractured pillars with iron bands, and smoking iron fire-braziers replace generic flat-shaded boxes.
3. **High-Contrast Direct Lighting:** Overcast diffused daylight provides soft ambient visibility, contrasted against 4 localized, flickering warm amber fire-braziers that cut through the cold grey gloom.
4. **Brutalist Gothic Weapon & Demonic Armored Enemies:**
   - Blackened hammered iron firearm with riveted shroud and bright fiery muzzle flash.
   - Armored demonic chasers in dark rusted iron plating with glowing amber/crimson eye slits piercing through the fog.
5. **90s Industrial/Gothic HUD:** Chiseled stone and dark iron beveled frames, blood-red and brass/gold counters, angular retro typography, and a vintage Quake-style crosshair.
6. **Zero Performance Overhead:** Pure direct rendering with no post-processing passes, preserving maximum 60–144+ FPS performance and zero GC churn.

---

## 2. Atmosphere, Fog & Lighting Specification

### 2.1 Fog & Clear Color (Seamless Infinity Horizon)
- **Fog Mode:** `scene.fogMode = Scene.FOGMODE_EXP2` with density calibrated at `0.038` (or `FOGMODE_LINEAR` with `start: 12m`, `end: 36m`).
- **Fog & Background Tone:** `scene.fogColor = new Color3(0.24, 0.25, 0.27)` and `scene.clearColor = new Color4(0.24, 0.25, 0.27, 1.0)`.
- **Result:** Objects beyond 36 meters are completely occluded by the murky ash-grey mist. There are no skybox seams, horizon lines, or visible ceiling enclosures.

### 2.2 Diffuse Daylight & Dynamic Torch Braziers
- **`HemisphericLight` ('ambientDaylight'):**
  - Direction: `Vector3(0, 1, 0)`
  - Sky Color: `Color3(0.42, 0.44, 0.46)` (cool diffused overcast daylight)
  - Ground Color: `Color3(0.20, 0.19, 0.18)` (damp mud / weathered stone)
  - Intensity: `0.65`
- **`DirectionalLight` ('diffusedSun'):**
  - Direction: `Vector3(-0.4, -1, -0.3).normalize()`
  - Color: `Color3(0.75, 0.76, 0.78)`
  - Intensity: `0.45`
  - Casts soft exponential blur shadows (`ShadowGenerator` 1024) across the stone ground.
- **`PointLight` Braziers ('brazierLight_0'..'3'):**
  - Positioned at the 4 smoking iron braziers near key cover clusters.
  - Color: Warm flame amber `Color3(1.0, 0.62, 0.22)`.
  - Range: `9.0m`.
  - Subtle organic flicker updated in the render loop via smooth sine modulation (`intensity = 0.72 + 0.14 * Math.sin(time * 8.5) + 0.06 * Math.cos(time * 19.3)`).

---

## 3. Arena Geometry & Textures

### 3.1 Static Tileable Textures (`public/assets/textures/`)
All textures are static PNG files (CC0 / retro-styled), avoiding runtime procedural canvas generation per AGENTS.md rule 3.6:
- `stone_floor.png`: Weathered, cracked dark stone flagstones with subtle moss in crevices.
- `dungeon_wall.png`: Ancient ash-grey masonry blocks with iron bracket detailing.
- `rusted_iron.png`: Dark, corroded, pitted iron with rust streaks for braziers, bands, and spikes.
- `crypt_stone.png`: Heavy weathered carved granite for monoliths and cover slabs.

### 3.2 Arena Layout & Boundaries
- **Floor (40m × 40m):**
  - Textured flagstone floor with UV tiling (`uScale: 10, vScale: 10`).
  - Static Havok box collider (`mass: 0`).
- **Perimeter Boundaries:**
  - Low crumbling stone parapet (height `1.5m`, thickness `0.8m`) along the perimeter edges.
  - Topped with vertical rusted iron spikes (`height: 0.8m`, spaced every `1.5m`).
  - Tall invisible physics collision plane (`height: 6m`, `mass: 0`, `isPickable: false`, `isVisible: false`) ensuring fast-moving or physics-knocked enemies cannot fly over the perimeter into the void.
  - Beyond the parapet, the ground terminates into the misty fog abyss.
- **Interior Cover & Monoliths:**
  - 4 corner megaliths: Tall carved stone pillars clamped with rusted iron reinforcement bands.
  - 4 inner barrier walls: Thick weathered stone barricades with iron capping.
  - 4 tall gothic iron braziers: Elevated tripods with iron firebowls containing glowing embers and dynamic flickering point lights.
- **Spawn Pads:**
  - Carved ancient stone summoning sigil discs flush with the floor, glowing with subtle dark-red emissive runes.

---

## 4. Weapon & Enemy Redesign

### 4.1 Gothic Blunderbuss / Nailgun Weapon Viewmodel
- **Geometry:**
  - Chunky blackened hammered-iron receiver with hex bolts.
  - Heavy twin-flanged iron barrel with muzzle ring.
  - Dark aged oak grip and brass heat-guard accents.
- **Muzzle Flash:**
  - Angular jagged fire flash mesh (`StandardMaterial` with emissive orange-yellow flame).
  - Dynamic `PointLight` attached to the muzzle node that flashes on for `50ms` upon firing, illuminating nearby stone pillars and ground in fiery light.

### 4.2 Armored Demonic Chasers
- **Geometry:**
  - Heavy angular iron cuirass with jagged spiked shoulder pauldrons.
  - Helm with glowing horizontal eye slit (`Color3(1.0, 0.25, 0.05)` glowing emissive).
- **Material:**
  - Dark rusted iron plating with scratches and blood-tinged dirt.
- **Stagger & Knockdown:**
  - On non-lethal hit: Flashes red/white and staggers back.
  - On fatal hit: Unlocks rotational inertia and violently tumbles backward across the cracked stone floor, kicking up sparks on impact.

---

## 5. HUD & UI Styling (90s Gothic / Industrial)

- **Typography & Framing:**
  - Dark iron / carved stone borders with beveled metallic edges.
  - Angular, retro monospaced/stencil typography (`font-family: 'Courier New', monospace, 'Impact', sans-serif`).
  - Blood-red health counter with segmented iron health bar.
  - Golden brass ammo readout (`12 / ∞`).
  - Gothic wave banner and kill counter with brass/iron trim.
- **Crosshair:**
  - Classic Quake-style chunky dot-and-brackets crosshair with high visibility against the foggy grey background.
- **Damage Vignette:**
  - Deep blood-red vignetting around the screen perimeter that pulses on taking damage.

---

## 6. Implementation & Verification Plan

1. **Verify Asset Pipeline:** Prepare static tileable retro textures in `public/assets/textures/`.
2. **Update ArenaBuilder:**
   - Configure overcast daylight and heavy exponential fog matching `clearColor`.
   - Build open-air low parapet walls, perimeter iron spikes, and invisible tall Havok bounds.
   - Construct gothic stone monoliths, iron-banded pillars, and 4 fire-braziers with dynamic point lights.
3. **Update WeaponController:**
   - Retheme viewmodel to blackened iron and aged wood.
   - Add muzzle light pulse for dynamic shot lighting.
4. **Update EnemyController:**
   - Reconstruct enemy mesh hierarchy with armored cuirass, spiked pauldrons, and glowing demonic visor.
5. **Update HUDController & index.html:**
   - Re-skin HUD CSS with 90s gothic beveled iron styling, retro fonts, and Quake crosshair.
6. **Verification:**
   - Run Vitest unit tests: `npm test`
   - Run typecheck and bundle build: `npm run build`
   - Test in dev server: `npm run dev`
