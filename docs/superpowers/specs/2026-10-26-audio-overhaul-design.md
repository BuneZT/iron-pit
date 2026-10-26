# Iron Pit: Background Music & Retro Gothic Audio Overhaul Design

## 1. Overview & Aesthetic Goals
* **Atmosphere:** Dark, oppressive 90s gothic industrial arena inspired by *Quake 1* and *Dark Forces*.
* **Background Music:** Seamless, looping dark ambient industrial drone (subterranean bass rumbles, whistling ruins wind, distant metallic resonance).
* **Combat Sound Effects:** Punchy, mechanical, crunchy blackened-iron retro SFX (cannon-like gunshot, chunky reload, sharp dryfire, bone-crushing hits, heavy Havok knockdown thud, visceral player hurt).
* **Atmospheric Sound Cues:**
  * Demonic Fiend groans with distance attenuation (getting louder as monsters emerge from distance fog).
  * Flagstone footsteps timed to player movement.
  * Ominous death knell / iron tolling bell signaling wave spawns.
* **Player Controls:** Master, Music, and SFX volume sliders in the Pause menu with `localStorage` persistence.

---

## 2. Audio Assets & File Catalog
All audio files are CC0-licensed retro `.ogg` audio files placed in `public/assets/audio/`:
* `music_ambient.ogg`: Looping dark ambient industrial drone (~60–90s seamless loop).
* `gunshot.ogg`: Heavy mechanical iron blast with punchy low-end and stone ruin reverberation.
* `reload.ogg`: Chunky iron lever cocking and cartridge seating.
* `dryfire.ogg`: Sharp hollow metallic strike on an empty chamber.
* `hit.ogg`: Visceral bone-splintering impact / flesh-armor crunch.
* `knockdown.ogg`: Heavy body slam / Havok ragdoll stone impact.
* `hurt.ogg`: Player blunt impact / visceral damage grunt.
* `enemy_groan.ogg`: Guttural demonic fiend snarl / rasp.
* `footstep.ogg`: Heavy iron-soled boot landing on weathered flagstones.
* `wave_bell.ogg`: Resonant gothic funeral bell / tolling iron chime.

---

## 3. Architecture & Data Flow

### 3.1 `src/core/AudioSettings.ts` (Pure TypeScript Core Logic)
Separated into `src/core/` to adhere to Rule 3.1 and allow 100% headless unit testing in Vitest:
* State:
  * `masterVolume: number` (0.0 to 1.0, default 0.8)
  * `musicVolume: number` (0.0 to 1.0, default 0.6)
  * `sfxVolume: number` (0.0 to 1.0, default 0.8)
  * `isMuted: boolean` (default false)
* Pure calculations:
  * `getEffectiveMusicVolume(): number` -> `isMuted ? 0 : masterVolume * musicVolume`
  * `getEffectiveSfxVolume(): number` -> `isMuted ? 0 : masterVolume * sfxVolume`
  * `calculateDistanceVolume(distance: number, maxRadius: number, baseVolume: number): number` -> linear falloff clamped between 0 and 1.
* Persistence helpers:
  * `serialize(): string` / `deserialize(json: string): AudioSettings`

### 3.2 `src/scene/AudioManager.ts` (Babylon & HTML5 Audio Engine)
* **BGM Bus:**
  * Single dedicated `HTMLAudioElement` for `music_ambient.ogg` configured with `loop = true`.
  * Starts upon first user gesture (e.g. clicking "START MATCH" on HUD or canvas).
  * Automatically ducks or pauses during Pause menu and Game Over, resumes during gameplay.
* **SFX Bus with Object Pooling:**
  * Preloads pools of `HTMLAudioElement` per sound effect (3-4 instances for rapid sounds like `gunshot`, 2 for others) to prevent runtime garbage collection churn (Rule 3.2).
  * Method `play(effect: SoundEffect, volumeMultiplier?: number): void`.
  * Method `playDistanceAttenuated(effect: SoundEffect, sourcePos: {x,y,z}, listenerPos: {x,y,z}, maxRadius?: number): void`.
* **Dynamic Triggers in Scene:**
  * **Footsteps:** In `PlayerController.ts` / `GameApp.ts`, when player is grounded and horizontal velocity > 0.5, step timer ticks every 0.42s (sprint: 0.30s) and plays `footstep`.
  * **Enemy Groans:** In `EnemyController.ts`, living active enemies roll a periodic check (every 4–8s) to trigger `enemy_groan` with distance attenuation relative to player position.
  * **Wave Bell:** Triggered when `WaveManager.ts` advances a wave in `GameApp.ts`.

### 3.3 `src/ui/HUDController.ts` (Chiseled Iron Audio Controls)
* Add an Audio Settings block to the Pause overlay:
  * Master Volume slider `[ 0% ──●── 100% ]`
  * Music Volume slider `[ 0% ──●── 100% ]`
  * SFX Volume slider `[ 0% ──●── 100% ]`
  * Mute Toggle button
* Styled with 90s gothic borders, iron bevels, and crimson accent tracks.

---

## 4. Error Handling & Edge Cases
* **Autoplay Restrictions:** Browsers block audio before user interaction; handle promise rejections silently and trigger playback on canvas click or menu button click.
* **Headless / Node.js Environments:** All DOM audio calls protected by `typeof Audio !== 'undefined'` so tests run cleanly in Vitest without mocking browser primitives.
* **Delta-time & GC Protection:** Scratch variables used for distance checks; pooled audio elements reset `.currentTime = 0` rather than instantiating `new Audio()`.

---

## 5. Verification Plan
1. **Unit Tests:** `npm test` covering `AudioSettings.ts` (defaults, clamping, volume math, distance attenuation, serialization).
2. **Typecheck & Build:** `npm run build` with zero TypeScript errors.
3. **Audio Quality & Playback Verification:** Verify audio files are loaded, BGM loops cleanly, combat SFX are tactile and punchy, footstep cadence matches movement, and volume controls work in the UI.
