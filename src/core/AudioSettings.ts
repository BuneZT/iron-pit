export interface AudioSettingsData {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  isMuted: boolean;
}

const DEFAULT_SETTINGS: AudioSettingsData = {
  masterVolume: 0.8,
  musicVolume: 0.6,
  sfxVolume: 0.8,
  isMuted: false,
};

function clamp01(val: number): number {
  if (val < 0) return 0;
  if (val > 1) return 1;
  return val;
}

export class AudioSettings {
  readonly data: AudioSettingsData;

  constructor(initial?: Partial<AudioSettingsData>) {
    this.data = {
      masterVolume: initial?.masterVolume !== undefined ? clamp01(initial.masterVolume) : DEFAULT_SETTINGS.masterVolume,
      musicVolume: initial?.musicVolume !== undefined ? clamp01(initial.musicVolume) : DEFAULT_SETTINGS.musicVolume,
      sfxVolume: initial?.sfxVolume !== undefined ? clamp01(initial.sfxVolume) : DEFAULT_SETTINGS.sfxVolume,
      isMuted: initial?.isMuted ?? DEFAULT_SETTINGS.isMuted,
    };
  }

  setMasterVolume(val: number): void {
    this.data.masterVolume = clamp01(val);
  }

  setMusicVolume(val: number): void {
    this.data.musicVolume = clamp01(val);
  }

  setSfxVolume(val: number): void {
    this.data.sfxVolume = clamp01(val);
  }

  toggleMute(): boolean {
    this.data.isMuted = !this.data.isMuted;
    return this.data.isMuted;
  }

  getEffectiveMusicVolume(): number {
    if (this.data.isMuted) return 0;
    return this.data.masterVolume * this.data.musicVolume;
  }

  getEffectiveSfxVolume(multiplier = 1.0): number {
    if (this.data.isMuted) return 0;
    return clamp01(this.data.masterVolume * this.data.sfxVolume * multiplier);
  }

  calculateDistanceVolume(dist: number, maxRadius: number, baseVolume = 1.0): number {
    if (this.data.isMuted || maxRadius <= 0) return 0;
    const clampedDist = Math.max(0, dist);
    if (clampedDist >= maxRadius) return 0;
    const factor = 1 - clampedDist / maxRadius;
    return clamp01(this.getEffectiveSfxVolume(baseVolume) * factor);
  }

  serialize(): string {
    return JSON.stringify(this.data);
  }

  static deserialize(json: string): AudioSettings {
    try {
      const parsed = JSON.parse(json) as Partial<AudioSettingsData>;
      return new AudioSettings(parsed);
    } catch {
      return new AudioSettings();
    }
  }
}
