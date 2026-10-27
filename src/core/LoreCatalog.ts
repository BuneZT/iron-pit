export interface ChronicleChapter {
  title: string;
  body: string;
}

export class LoreCatalog {
  static readonly INTRO_SUBTITLE =
    "Trapped beneath the ash by Mor'gath's curse. Every fiend you crush with cold iron starves the demon of its power. Endure ten onslaughts to break the seal.";

  static readonly CHRONICLE_CHAPTERS: readonly ChronicleChapter[] = [
    {
      title: 'I. THE DESECRATED SLEEP',
      body: "Seeking refuge from a killing ash storm, a lone traveler struck a fire upon an ancient slab of black stone. It was no hearth, but the binding seal of Mor'gath, the Ash Sovereign. The flame broke the seal, waking the demon from centuries of slumber."
    },
    {
      title: "II. THE SOVEREIGN'S TETHER",
      body: "Enraged by mortal insolence, Mor'gath dragged the intruder into the sunken Iron Pit, cursing them to die and resurrect in an endless cycle. Yet awoken prematurely, the demon cannot walk the earth; each fiend it spawns is a living sliver of its own soul. Every fiend slain permanently starves the demon."
    },
    {
      title: 'III. THE TENTH BELL',
      body: "In supreme arrogance, Mor'gath swore a dark blood-oath: no mortal could survive ten onslaughts. If ten bells toll and the traveler still draws breath, the demon's tether shatters, the re-sanctified altar ignites, and the pit shall grant passage to the light."
    }
  ];

  private static readonly WAVE_WHISPERS: readonly string[] = [
    "A sliver of the Sovereign's essence turns to dust.",
    'The entity snarls from within the deep fog.',
    "Mor'gath's mockery grows hollow in the mist.",
    'Demonic ichor seeps into the ancient runes.',
    'The entity bleeds. The sunken ruins shudder.',
    'Desperation mounts in the demonic brood.',
    'The perimeter braziers flare with cleansed fire.',
    "The Sovereign's soul grows lean and fractured.",
    'One final toll remains. The demon trembles.',
    'The tether shatters! The seal fractures open!'
  ];

  static getWaveWhisper(wave: number): string {
    if (wave <= 0) return this.WAVE_WHISPERS[0];
    if (wave <= this.WAVE_WHISPERS.length) {
      return this.WAVE_WHISPERS[wave - 1];
    }
    return 'The curse is broken, yet the hunt never ends.';
  }

  static getGameOverMessage(wave: number, kills: number, score: number): string {
    return `You fell at Wave ${wave} after slaying ${kills} hostiles (Score: ${score}). Mor'gath's curse knits your broken bones back together upon the stones... The fight continues.`;
  }

  static getVictoryTitle(): string {
    return 'SEAL SHATTERED';
  }

  static getVictorySubtitle(): string {
    return "Ten bells have tolled. Mor'gath's tether is severed, the ancient altar ignites with cleansed flame, and daylight pierces the broken stone ceiling.";
  }
}
