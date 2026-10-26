import { describe, it, expect } from 'vitest';
import { AudioSettings } from '../src/core/AudioSettings';

describe('AudioSettings', () => {
  it('initializes with default volume values and unmuted state', () => {
    const settings = new AudioSettings();
    expect(settings.data.masterVolume).toBeCloseTo(0.8);
    expect(settings.data.musicVolume).toBeCloseTo(0.6);
    expect(settings.data.sfxVolume).toBeCloseTo(0.8);
    expect(settings.data.isMuted).toBe(false);
  });

  it('clamps volume inputs between 0.0 and 1.0', () => {
    const settings = new AudioSettings();
    settings.setMasterVolume(1.5);
    expect(settings.data.masterVolume).toBe(1.0);

    settings.setMasterVolume(-0.2);
    expect(settings.data.masterVolume).toBe(0.0);

    settings.setMusicVolume(2.0);
    expect(settings.data.musicVolume).toBe(1.0);

    settings.setSfxVolume(-1.0);
    expect(settings.data.sfxVolume).toBe(0.0);
  });

  it('computes effective volumes correctly when unmuted and muted', () => {
    const settings = new AudioSettings({
      masterVolume: 0.5,
      musicVolume: 0.8,
      sfxVolume: 0.6,
    });

    // Unmuted
    expect(settings.getEffectiveMusicVolume()).toBeCloseTo(0.4);
    expect(settings.getEffectiveSfxVolume()).toBeCloseTo(0.3);
    expect(settings.getEffectiveSfxVolume(2.0)).toBeCloseTo(0.6);

    // Muted
    settings.toggleMute();
    expect(settings.data.isMuted).toBe(true);
    expect(settings.getEffectiveMusicVolume()).toBe(0);
    expect(settings.getEffectiveSfxVolume()).toBe(0);

    // Unmute toggle
    settings.toggleMute();
    expect(settings.data.isMuted).toBe(false);
    expect(settings.getEffectiveMusicVolume()).toBeCloseTo(0.4);
  });

  it('calculates linear distance attenuation with radius clamping', () => {
    const settings = new AudioSettings({
      masterVolume: 1.0,
      sfxVolume: 1.0,
    });

    const baseVol = 0.8;
    const maxRadius = 20;

    // Zero distance -> full volume
    expect(settings.calculateDistanceVolume(0, maxRadius, baseVol)).toBeCloseTo(0.8);

    // Halfway -> half volume
    expect(settings.calculateDistanceVolume(10, maxRadius, baseVol)).toBeCloseTo(0.4);

    // At or beyond max radius -> 0
    expect(settings.calculateDistanceVolume(20, maxRadius, baseVol)).toBe(0);
    expect(settings.calculateDistanceVolume(25, maxRadius, baseVol)).toBe(0);

    // Negative distance -> clamps to 0 distance
    expect(settings.calculateDistanceVolume(-5, maxRadius, baseVol)).toBeCloseTo(0.8);
  });

  it('serializes and deserializes audio settings cleanly', () => {
    const original = new AudioSettings({
      masterVolume: 0.75,
      musicVolume: 0.35,
      sfxVolume: 0.9,
      isMuted: true,
    });

    const json = original.serialize();
    const restored = AudioSettings.deserialize(json);

    expect(restored.data.masterVolume).toBeCloseTo(0.75);
    expect(restored.data.musicVolume).toBeCloseTo(0.35);
    expect(restored.data.sfxVolume).toBeCloseTo(0.9);
    expect(restored.data.isMuted).toBe(true);
  });
});
