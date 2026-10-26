import { AudioSettings } from '../core/AudioSettings';

export type SoundEffect =
  | 'gunshot'
  | 'dryfire'
  | 'reload'
  | 'hit'
  | 'knockdown'
  | 'hurt'
  | 'enemy_groan'
  | 'footstep'
  | 'wave_bell';

interface SoundConfig {
  url: string;
  volume: number;
  poolSize: number;
}

const BASE = (import.meta.env?.BASE_URL ?? '/').replace(/\/+$/, '');

const SOUND_FILES: Record<SoundEffect, SoundConfig> = {
  gunshot: { url: `${BASE}/assets/audio/gunshot.ogg`, volume: 0.85, poolSize: 4 },
  dryfire: { url: `${BASE}/assets/audio/dryfire.ogg`, volume: 0.65, poolSize: 2 },
  reload: { url: `${BASE}/assets/audio/reload.ogg`, volume: 0.75, poolSize: 2 },
  hit: { url: `${BASE}/assets/audio/hit.ogg`, volume: 0.70, poolSize: 4 },
  knockdown: { url: `${BASE}/assets/audio/knockdown.ogg`, volume: 0.90, poolSize: 3 },
  hurt: { url: `${BASE}/assets/audio/hurt.ogg`, volume: 0.85, poolSize: 2 },
  enemy_groan: { url: `${BASE}/assets/audio/enemy_groan.ogg`, volume: 0.75, poolSize: 3 },
  footstep: { url: `${BASE}/assets/audio/footstep.ogg`, volume: 0.45, poolSize: 3 },
  wave_bell: { url: `${BASE}/assets/audio/wave_bell.wav`, volume: 0.85, poolSize: 2 },
};

const MUSIC_FILE = {
  url: `${BASE}/assets/audio/music_ambient.ogg`,
  baseVolume: 0.45,
};

export class AudioManager {
  readonly settings: AudioSettings;
  private readonly pools = new Map<SoundEffect, HTMLAudioElement[]>();
  private readonly poolIndices = new Map<SoundEffect, number>();
  private musicAudio: HTMLAudioElement | null = null;
  private isMusicDucked = false;
  private musicWanted = false;

  constructor(settings?: AudioSettings) {
    this.settings = settings ?? new AudioSettings();
  }

  preload(): void {
    if (typeof Audio === 'undefined') {
      return;
    }

    // Preload looping ambient BGM
    try {
      this.musicAudio = new Audio(MUSIC_FILE.url);
      this.musicAudio.loop = true;
      this.musicAudio.preload = 'auto';
      this.musicAudio.volume = this.getCalculatedMusicVolume();
    } catch {
      this.musicAudio = null;
    }

    // Preload pools for each SFX
    (Object.keys(SOUND_FILES) as SoundEffect[]).forEach((key) => {
      const cfg = SOUND_FILES[key];
      const pool: HTMLAudioElement[] = [];
      for (let i = 0; i < cfg.poolSize; i++) {
        try {
          const audio = new Audio(cfg.url);
          audio.preload = 'auto';
          audio.volume = this.settings.getEffectiveSfxVolume(cfg.volume);
          pool.push(audio);
        } catch {
          // Fallback if browser audio creation fails
        }
      }
      this.pools.set(key, pool);
      this.poolIndices.set(key, 0);
    });
  }

  startMusic(): void {
    this.musicWanted = true;
    if (!this.musicAudio) return;

    this.musicAudio.volume = this.getCalculatedMusicVolume();
    void this.musicAudio.play().catch(() => {
      // Handled silently if waiting for user interaction gesture
    });
  }

  pauseMusic(): void {
    if (!this.musicAudio) return;
    this.musicAudio.pause();
  }

  resumeMusic(): void {
    if (!this.musicWanted || !this.musicAudio) return;
    this.musicAudio.volume = this.getCalculatedMusicVolume();
    void this.musicAudio.play().catch(() => {});
  }

  duckMusic(ducked: boolean): void {
    this.isMusicDucked = ducked;
    if (this.musicAudio) {
      this.musicAudio.volume = this.getCalculatedMusicVolume();
    }
  }

  private getCalculatedMusicVolume(): number {
    const effective = this.settings.getEffectiveMusicVolume() * MUSIC_FILE.baseVolume;
    return this.isMusicDucked ? effective * 0.4 : effective;
  }

  play(effect: SoundEffect, volumeMultiplier = 1.0): void {
    if (typeof Audio === 'undefined' || this.settings.data.isMuted) {
      return;
    }

    const cfg = SOUND_FILES[effect];
    if (!cfg) return;

    const pool = this.pools.get(effect);
    if (!pool || pool.length === 0) return;

    const idx = this.poolIndices.get(effect) ?? 0;
    const node = pool[idx];
    this.poolIndices.set(effect, (idx + 1) % pool.length);

    try {
      node.currentTime = 0;
      node.volume = this.settings.getEffectiveSfxVolume(cfg.volume * volumeMultiplier);
      void node.play().catch(() => {});
    } catch {
      // Non-fatal playback failure
    }
  }

  playDistanceAttenuated(
    effect: SoundEffect,
    sourcePos: { x: number; y: number; z: number },
    listenerPos: { x: number; y: number; z: number },
    maxRadius = 24.0
  ): void {
    if (typeof Audio === 'undefined' || this.settings.data.isMuted) {
      return;
    }

    const dx = sourcePos.x - listenerPos.x;
    const dy = sourcePos.y - listenerPos.y;
    const dz = sourcePos.z - listenerPos.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist >= maxRadius) {
      return;
    }

    const cfg = SOUND_FILES[effect];
    if (!cfg) return;

    const factor = 1 - dist / maxRadius;
    const effectiveVol = this.settings.calculateDistanceVolume(dist, maxRadius, cfg.volume);

    if (effectiveVol <= 0.01) {
      return;
    }

    // Trigger pooled play with distance multiplier
    this.play(effect, factor);
  }

  applySettings(): void {
    if (this.musicAudio) {
      this.musicAudio.volume = this.getCalculatedMusicVolume();
      if (this.musicWanted && this.musicAudio.paused && !this.settings.data.isMuted) {
        void this.musicAudio.play().catch(() => {});
      }
    }
  }
}
