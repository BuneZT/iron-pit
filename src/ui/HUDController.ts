import { MatchStatus } from '../core/GameState';

export interface AudioCallbacks {
  onMasterVolumeChange?: (val01: number) => void;
  onMusicVolumeChange?: (val01: number) => void;
  onSfxVolumeChange?: (val01: number) => void;
  onToggleMute?: () => boolean;
}

export interface HUDSnapshot {
  status: MatchStatus;
  wave: number;
  remainingEnemies: number;
  isInBreather: boolean;
  kills: number;
  score: number;
  hp: number;
  maxHp: number;
  ammo: number;
  magazineSize: number;
  isReloading: boolean;
}

export class HUDController {
  private readonly waveValue = document.getElementById('waveValue')!;
  private readonly enemiesLabel = document.getElementById('enemiesLabel')!;
  private readonly enemiesValue = document.getElementById('enemiesValue')!;
  private readonly killsValue = document.getElementById('killsValue')!;
  private readonly healthText = document.getElementById('healthText')!;
  private readonly healthBarFill = document.getElementById('healthBarFill')!;
  private readonly ammoValue = document.getElementById('ammoValue')!;
  private readonly reloadHint = document.getElementById('reloadHint')!;
  private readonly crosshair = document.getElementById('crosshair')!;
  private readonly damageVignette = document.getElementById('damageVignette')!;
  private readonly modalOverlay = document.getElementById('modalOverlay')!;
  private readonly modalTitle = document.getElementById('modalTitle')!;
  private readonly modalSubtitle = document.getElementById('modalSubtitle')!;
  private readonly actionButton = document.getElementById(
    'actionButton'
  ) as HTMLButtonElement;

  private readonly masterVolSlider = document.getElementById(
    'masterVolSlider'
  ) as HTMLInputElement | null;
  private readonly masterVolValue = document.getElementById('masterVolValue');
  private readonly musicVolSlider = document.getElementById(
    'musicVolSlider'
  ) as HTMLInputElement | null;
  private readonly musicVolValue = document.getElementById('musicVolValue');
  private readonly sfxVolSlider = document.getElementById(
    'sfxVolSlider'
  ) as HTMLInputElement | null;
  private readonly sfxVolValue = document.getElementById('sfxVolValue');
  private readonly muteButton = document.getElementById(
    'muteButton'
  ) as HTMLButtonElement | null;

  private crosshairExpandTimeout: number | null = null;
  private crosshairHitTimeout: number | null = null;
  private vignetteTimeout: number | null = null;

  constructor(
    onActionButtonClick: () => void,
    audioCallbacks?: AudioCallbacks
  ) {
    this.actionButton.addEventListener('click', () => {
      this.actionButton.blur();
      onActionButtonClick();
    });

    this.masterVolSlider?.addEventListener('input', (e) => {
      const val = Number((e.target as HTMLInputElement).value);
      if (this.masterVolValue) this.masterVolValue.textContent = `${val}%`;
      audioCallbacks?.onMasterVolumeChange?.(val / 100);
    });

    this.musicVolSlider?.addEventListener('input', (e) => {
      const val = Number((e.target as HTMLInputElement).value);
      if (this.musicVolValue) this.musicVolValue.textContent = `${val}%`;
      audioCallbacks?.onMusicVolumeChange?.(val / 100);
    });

    this.sfxVolSlider?.addEventListener('input', (e) => {
      const val = Number((e.target as HTMLInputElement).value);
      if (this.sfxVolValue) this.sfxVolValue.textContent = `${val}%`;
      audioCallbacks?.onSfxVolumeChange?.(val / 100);
    });

    this.muteButton?.addEventListener('click', () => {
      this.muteButton?.blur();
      const isMuted = audioCallbacks?.onToggleMute?.() ?? false;
      this.updateMuteButtonLabel(isMuted);
    });
  }

  syncAudioSettings(data: {
    masterVolume: number;
    musicVolume: number;
    sfxVolume: number;
    isMuted: boolean;
  }): void {
    const masterPct = Math.round(data.masterVolume * 100);
    const musicPct = Math.round(data.musicVolume * 100);
    const sfxPct = Math.round(data.sfxVolume * 100);

    if (this.masterVolSlider) this.masterVolSlider.value = String(masterPct);
    if (this.masterVolValue) this.masterVolValue.textContent = `${masterPct}%`;

    if (this.musicVolSlider) this.musicVolSlider.value = String(musicPct);
    if (this.musicVolValue) this.musicVolValue.textContent = `${musicPct}%`;

    if (this.sfxVolSlider) this.sfxVolSlider.value = String(sfxPct);
    if (this.sfxVolValue) this.sfxVolValue.textContent = `${sfxPct}%`;

    this.updateMuteButtonLabel(data.isMuted);
  }

  private updateMuteButtonLabel(isMuted: boolean): void {
    if (this.muteButton) {
      this.muteButton.textContent = isMuted ? 'UNMUTE AUDIO' : 'MUTE AUDIO';
      this.muteButton.style.color = isMuted ? '#ef4444' : '#d6d3d1';
    }
  }

  update(snapshot: HUDSnapshot): void {
    this.waveValue.textContent = String(Math.max(1, snapshot.wave));
    if (snapshot.isInBreather) {
      this.enemiesLabel.textContent = 'Status';
      this.enemiesValue.textContent = 'PURGED';
    } else {
      this.enemiesLabel.textContent = 'Hostiles';
      this.enemiesValue.textContent = String(snapshot.remainingEnemies);
    }

    this.killsValue.textContent = String(snapshot.kills);

    const hpPct = Math.max(
      0,
      Math.min(100, (snapshot.hp / snapshot.maxHp) * 100)
    );
    this.healthText.textContent = `${snapshot.hp} / ${snapshot.maxHp}`;
    this.healthBarFill.style.width = `${hpPct}%`;

    this.ammoValue.textContent = String(snapshot.ammo);
    if (snapshot.isReloading) {
      this.reloadHint.textContent = 'RELOADING...';
    } else if (snapshot.ammo === 0) {
      this.reloadHint.textContent = 'PRESS [R] TO RELOAD';
    } else if (snapshot.ammo <= 3) {
      this.reloadHint.textContent = 'LOW AMMO [R]';
    } else {
      this.reloadHint.textContent = 'READY';
    }

    if (snapshot.status === 'PLAYING') {
      this.modalOverlay.classList.add('hidden');
    } else {
      this.modalOverlay.classList.remove('hidden');
      if (snapshot.status === 'MENU') {
        this.modalTitle.textContent = 'IRON PIT';
        this.modalSubtitle.textContent =
          'Survive escalating waves of demonic chasers in the foggy ruins. Heavy kinetic rounds stagger and physically knock down targets.';
        this.actionButton.textContent = 'ENTER THE PIT';
      } else if (snapshot.status === 'PAUSED') {
        this.modalTitle.textContent = 'PAUSED';
        this.modalSubtitle.textContent = `Wave ${snapshot.wave} suspended — ${snapshot.kills} hostiles slain.`;
        this.actionButton.textContent = 'RESUME FIGHT';
      } else if (snapshot.status === 'GAME_OVER') {
        this.modalTitle.textContent = 'OVERRUN';
        this.modalSubtitle.textContent = `You fell at Wave ${snapshot.wave} after slaying ${snapshot.kills} hostiles (Score: ${snapshot.score}).`;
        this.actionButton.textContent = 'RETURN TO PIT';
      }
    }
  }

  pulseCrosshair(hitEnemy: boolean): void {
    this.crosshair.classList.add('expanded');
    if (this.crosshairExpandTimeout !== null) {
      window.clearTimeout(this.crosshairExpandTimeout);
    }
    this.crosshairExpandTimeout = window.setTimeout(() => {
      this.crosshair.classList.remove('expanded');
    }, 90);

    if (hitEnemy) {
      this.crosshair.classList.add('hit');
      if (this.crosshairHitTimeout !== null) {
        window.clearTimeout(this.crosshairHitTimeout);
      }
      this.crosshairHitTimeout = window.setTimeout(() => {
        this.crosshair.classList.remove('hit');
      }, 140);
    }
  }

  flashDamageVignette(): void {
    this.damageVignette.style.opacity = '1';
    if (this.vignetteTimeout !== null) {
      window.clearTimeout(this.vignetteTimeout);
    }
    this.vignetteTimeout = window.setTimeout(() => {
      this.damageVignette.style.opacity = '0';
    }, 220);
  }
}
