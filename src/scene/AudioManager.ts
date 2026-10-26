export type SoundEffect =
  | 'gunshot'
  | 'dryfire'
  | 'reload'
  | 'hit'
  | 'knockdown'
  | 'hurt';

const SOUND_FILES: Record<SoundEffect, { url: string; volume: number }> = {
  gunshot: { url: '/assets/audio/gunshot.ogg', volume: 0.65 },
  dryfire: { url: '/assets/audio/dryfire.ogg', volume: 0.5 },
  reload: { url: '/assets/audio/reload.ogg', volume: 0.6 },
  hit: { url: '/assets/audio/hit.ogg', volume: 0.6 },
  knockdown: { url: '/assets/audio/knockdown.ogg', volume: 0.75 },
  hurt: { url: '/assets/audio/hurt.ogg', volume: 0.7 },
};

export class AudioManager {
  private readonly cache = new Map<SoundEffect, HTMLAudioElement>();

  preload(): void {
    if (typeof Audio === 'undefined') {
      return;
    }

    (Object.keys(SOUND_FILES) as SoundEffect[]).forEach((key) => {
      const cfg = SOUND_FILES[key];
      const audio = new Audio(cfg.url);
      audio.preload = 'auto';
      audio.volume = cfg.volume;
      this.cache.set(key, audio);
    });
  }

  play(effect: SoundEffect): void {
    if (typeof Audio === 'undefined') {
      return;
    }

    const cfg = SOUND_FILES[effect];
    const base = this.cache.get(effect);
    try {
      const node = base
        ? (base.cloneNode(true) as HTMLAudioElement)
        : new Audio(cfg.url);
      node.volume = cfg.volume;
      void node.play().catch(() => {
        // Ignore browser autoplay restrictions or missing file errors gracefully
      });
    } catch {
      // Non-fatal audio playback fallback
    }
  }
}
