# Game Lore & Narrative Integration Design: The Curse of Mor'gath

## 1. Overview & Vision

*Iron Pit* is a 90s gothic retro arena FPS inspired by *Quake 1* and *Dark Forces*, featuring kinetic shotgun/carbine knockdowns and crumbling ash-soaked ruins. 

This document defines the official game lore, the protagonist's narrative framing, the demon's curse and fatal vulnerability, and the unobtrusive, gameplay-first integration of narrative elements.

### Core Philosophy: Zero Gameplay Friction
* **Gameplay Always Comes First:** Lore is completely optional and non-intrusive.
* **Instant Action & Retry:** There are no forced unskippable cutscenes, text crawls, or dialogue boxes blocking the player.
* **Instant Death & Retry:** When the player falls, the `[RETURN TO PIT]` button is immediately active and restarts combat with a single click or keypress.

---

## 2. Narrative Foundation: The Curse of Mor'gath

### 2.1 The Accidental Intrusion (The Traveler's Fate)
The protagonist is not an evil warmonger or heretic, but a weary borderland traveler caught in a lethal, freezing ash gale. Scrambling into a collapsed subterranean ruin for shelter, the traveler gathered deadwood and struck a campfire upon a cracked, blackened stone slab.

It was no hearthstone. It was the keystone binding seal keeping **Mor’gath, the Ash Sovereign**—an ancient demonic entity—imprisoned deep beneath the stone. The heat and flame shattered the ancient runes, violently waking the horror from centuries of sleep.

### 2.2 The Arrogant Blood-Oath
Enraged at having its centuries of slumber disturbed by a shivering mortal, Mor’gath dragged the traveler down into the subterranean abyss: **The Iron Pit**. Flooding the sunken ruins with thick ash-fog, the demon cast an agonizing curse: the traveler is condemned to be hunted and ripped apart by demonic fiends across an eternal cycle of death and resurrection.

In its supreme hubris, the demon bound the curse with an ancient demonic law:
> *"No mortal shall ever witness the tenth bell toll. Withstand ten onslaughts of my brood, and my seal shall yield. But until then, your flesh belongs to the stones."*

Believing no human could endure even five minutes of butchery, the demon assumed its torment was eternal.

### 2.3 The Fatal Weakness: Starving the Sovereign
Because Mor’gath was awoken prematurely from its slumber, it lacks the spiritual power to manifest its true physical avatar in the arena. Consequently, **every demonic fiend sent into the Pit is literally forged from a fragment of Mor’gath's own slumbering soul and flesh**.

Equipped with a discarded heavy blackened-iron carbine, the traveler discovers the demon's fatal vulnerability:
* Every fiend blasted apart with heavy kinetic lead permanently destroys a fraction of Mor'gath’s soul.
* What was intended as an engine of eternal human torment becomes an engine of **demonic starvation**.
* With every wave purged, Mor'gath is bled drier, weaker, and more desperate.

### 2.4 The Re-Sanctified Altar (The Escape Condition)
The demonic ichor spilled across the stones does not feed the curse; instead, it is absorbed by the ancient monolithic ruins. As waves are cleared:
* The 4 perimeter iron braziers absorb the purged energy and burn brighter with cleansed flame.
* When **Wave 10** is conquered, Mor'gath's soul-tether breaks, the binding seal fractures, and the ceiling shatters open, offering the traveler a path back to the sunlit world.

---

## 3. In-Game Delivery & UI Touchpoints

### 3.1 Main Menu & Optional Chronicle
* **Instant Play:** The primary button remains `[ENTER THE PIT]`. Clicking it (or pressing `Space`/`Enter`) starts the match immediately without delay.
* **Subtitle Hook:** The start card subtitle receives a concise 2-sentence atmospheric synopsis:
  > *"Trapped beneath the ash by Mor'gath's curse. Every fiend you crush with cold iron starves the demon of its power. Endure ten onslaughts to break the seal."*
* **The Chronicle Modal (`[THE CHRONICLE]` button):**
  * A secondary button on the start card opens an ancient stone-styled chronicle panel detailing the 3 lore chapters (The Intrusion, The Sovereign's Soul, The Tenth Toll).
  * 100% optional. Pressing `ESC`, clicking `[X CLOSE]`, or clicking outside dismisses it instantly.

### 3.2 Ambient Wave Whispers (Breather Subtitles)
* During the natural 5-second breather between waves, a subtle, italicized line of text appears beneath the top wave counter reflecting Mor’gath’s weakening grip:
  * **Wave 1 Clear:** *"A sliver of the Sovereign's essence turns to dust."*
  * **Wave 2 Clear:** *"The entity snarls from within the deep fog."*
  * **Wave 3 Clear:** *"Mor'gath's mockery grows hollow in the mist."*
  * **Wave 4 Clear:** *"Demonic ichor seeps into the ancient runes."*
  * **Wave 5 Clear:** *"The entity bleeds. The sunken ruins shudder."*
  * **Wave 6 Clear:** *"Desperation mounts in the demonic brood."*
  * **Wave 7 Clear:** *"The perimeter braziers flare with cleansed fire."*
  * **Wave 8 Clear:** *"The Sovereign's soul grows lean and fractured."*
  * **Wave 9 Clear:** *"One final toll remains. The demon trembles."*
  * **Wave 10 Clear:** *"The tether shatters! The seal fractures open!"*
  * **Wave 11+ (Endless):** *"The curse is broken, yet the hunt never ends."*
* **Zero Disruption:** The text smoothly fades in during the breather and fades out before the first enemy of the next wave emerges. It never pauses time, locks camera movement, or captures player inputs.

### 3.3 Defeat & Instant Retry (`OVERRUN`)
* When HP reaches 0, the Game Over modal appears:
  * **Title:** `OVERRUN`
  * **Subtitle:** `"You fell at Wave {X} after slaying {Y} hostiles. Mor'gath's curse knits your broken bones back together upon the stones... The fight continues."`
  * **Primary Action:** `[RETURN TO PIT]`
  * **Behavior:** Immediately clickable or activatable via `Space`/`Enter` to instantly respawn the player with zero lag or unskippable animations.

### 3.4 Wave 10 Victory / Escape Choice (`SEAL SHATTERED`)
* When Wave 10 is conquered, the player has officially satisfied Mor'gath's blood-oath and starved the sovereign:
  * A triumphant modal appears at the end of Wave 10 (or during the Wave 10 breather):
    * **Title:** `SEAL SHATTERED`
    * **Subtitle:** `"Ten bells have tolled. Mor'gath's tether is severed, and daylight pierces the broken stone ceiling."`
    * **Primary Action:** `[ESCAPE TO THE SUN]` (Shows victory credits/stats summary, then returns to menu).
    * **Secondary Action:** `[CONTINUE THE HUNT]` (Keeps fighting into Wave 11+ in endless survival mode).

---

## 4. Technical Architecture

### 4.1 Strict Module Separation
Following project architectural guidelines (**Rule 3.1**):

```text
src/
├── core/
│   └── LoreCatalog.ts         # Pure TypeScript: lore text, wave whisper table, victory evaluation
├── scene/
│   └── ArenaBuilder.ts        # Dynamic brazier flame scaling per wave
└── ui/
    └── HUDController.ts       # HTML/CSS modal updates, chronicle dialog, ambient whisper transitions
```

### 4.2 `src/core/LoreCatalog.ts` (Pure TypeScript)
```ts
export interface LoreWhisper {
  wave: number;
  whisper: string;
}

export class LoreCatalog {
  static readonly INTRO_SUBTITLE = 
    "Trapped beneath the ash by Mor'gath's curse. Every fiend you crush with cold iron starves the demon of its power. Endure ten onslaughts to break the seal.";

  static readonly CHRONICLE_CHAPTERS = [
    {
      title: "I. THE DESECRATED SLEEP",
      body: "Seeking refuge from a killing ash storm, a lone traveler struck a fire upon an ancient slab of black stone. It was no hearth, but the binding seal of Mor'gath, the Ash Sovereign. The flame broke the seal, waking the demon from centuries of slumber."
    },
    {
      title: "II. THE SOVEREIGN'S TETHER",
      body: "Enraged by mortal insolence, Mor'gath dragged the intruder into the sunken Iron Pit, cursing them to die and resurrect in an endless cycle. Yet awoken prematurely, the demon cannot walk the earth; each fiend it spawns is a living sliver of its own soul. Every fiend slain permanently starves the demon."
    },
    {
      title: "III. THE TENTH BELL",
      body: "In supreme arrogance, Mor'gath swore a dark blood-oath: no mortal could survive ten onslaughts. If ten bells toll and the traveler still draws breath, the demon's tether shatters, the re-sanctified altar ignites, and the pit shall grant passage to the light."
    }
  ];

  static getWaveWhisper(wave: number): string { ... }
  static getGameOverMessage(wave: number, kills: number): string { ... }
  static isVictoryWave(wave: number): boolean { return wave === 10; }
}
```

### 4.3 Zero Runtime Garbage Collection
* In-game whispers and text strings are static lookups by wave index.
* Whisper DOM text changes only once per wave during breather transitions (`textContent` write guarded by wave index equality check to eliminate reflows).

---

## 5. Verification & Testing Plan

1. **Vitest Unit Tests (`tests/LoreCatalog.test.ts`):**
   * Validate wave whisper retrieval for waves 1 through 10 and beyond.
   * Verify victory condition flags at Wave 10.
   * Verify Game Over formatting contains wave number, kills, and lore quote.
   * Verify all chronicle chapter texts exist and are non-empty.
2. **Production Typecheck & Build:**
   * `npm run build` must succeed with zero errors.
3. **Interactive UI Verification:**
   * Main menu loads with `[ENTER THE PIT]` and `[THE CHRONICLE]`.
   * Opening Chronicle displays the 3 lore chapters; closes with `ESC` or `[X]`.
   * `[ENTER THE PIT]` immediately starts game without latency.
   * Wave breather displays non-intrusive whisper; fades away when combat begins.
   * Dying shows lore-infused `OVERRUN` text with instant `[RETURN TO PIT]` functioning immediately.
