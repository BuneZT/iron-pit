import { MatchStatus } from '../core/GameState';

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

  private crosshairExpandTimeout: number | null = null;
  private crosshairHitTimeout: number | null = null;
  private vignetteTimeout: number | null = null;

  constructor(onActionButtonClick: () => void) {
    this.actionButton.addEventListener('click', () => {
      this.actionButton.blur();
      onActionButtonClick();
    });
  }

  update(snapshot: HUDSnapshot): void {
    this.waveValue.textContent = String(Math.max(1, snapshot.wave));
    if (snapshot.isInBreather) {
      this.enemiesLabel.textContent = 'Status';
      this.enemiesValue.textContent = 'CLEAR';
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
          'Survive escalating waves of arena chasers. Heavy kinetic rounds stagger and physically knock down targets.';
        this.actionButton.textContent = 'ENTER THE PIT';
      } else if (snapshot.status === 'PAUSED') {
        this.modalTitle.textContent = 'PAUSED';
        this.modalSubtitle.textContent = `Wave ${snapshot.wave} in progress — ${snapshot.kills} hostiles eliminated.`;
        this.actionButton.textContent = 'RESUME COMBAT';
      } else if (snapshot.status === 'GAME_OVER') {
        this.modalTitle.textContent = 'OVERRUN';
        this.modalSubtitle.textContent = `You reached Wave ${snapshot.wave} and eliminated ${snapshot.kills} hostiles (Score: ${snapshot.score}).`;
        this.actionButton.textContent = 'PLAY AGAIN';
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
