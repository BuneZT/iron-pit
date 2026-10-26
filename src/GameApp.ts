import { Engine, PointLight, Scene } from '@babylonjs/core';
import { AudioSettings } from './core/AudioSettings';
import { GameState } from './core/GameState';
import { HealthState } from './core/HealthState';
import { WaveManager } from './core/WaveManager';
import { WeaponState } from './core/WeaponState';
import { ArenaBuilder } from './scene/ArenaBuilder';
import { AudioManager } from './scene/AudioManager';
import { EnemyController } from './scene/EnemyController';
import { initializeScenePhysics } from './scene/PhysicsSetup';
import { PlayerController } from './scene/PlayerController';
import { WeaponController } from './scene/WeaponController';
import { HUDController } from './ui/HUDController';

export class GameApp {
  private readonly canvas: HTMLCanvasElement;
  private readonly engine: Engine;
  private readonly scene: Scene;

  private readonly gameState = new GameState();
  private readonly healthState = new HealthState(100, 0.8);
  private readonly weaponState = new WeaponState({
    magazineSize: 12,
    fireCooldown: 0.25,
    reloadDuration: 1.2,
    damage: 35,
  });
  private readonly waveManager = new WaveManager({
    spawnInterval: 0.8,
    waveBreatherDuration: 3.0,
  });

  private readonly audio: AudioManager;
  private hud!: HUDController;
  private player!: PlayerController;
  private weaponController!: WeaponController;
  private enemyController!: EnemyController;
  private brazierLights: PointLight[] = [];
  private totalTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    });
    this.scene = new Scene(this.engine);

    const savedAudio =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('iron_pit_audio_settings')
        : null;
    const settings = savedAudio
      ? AudioSettings.deserialize(savedAudio)
      : new AudioSettings();
    this.audio = new AudioManager(settings);
  }

  async init(): Promise<void> {
    this.audio.preload();
    await initializeScenePhysics(this.scene);

    const arena = ArenaBuilder.build(this.scene);
    this.brazierLights = arena.brazierLights;
    this.player = new PlayerController(this.scene);
    this.weaponController = new WeaponController(
      this.scene,
      this.player.camera
    );
    this.enemyController = new EnemyController(
      this.scene,
      arena.spawnPoints,
      arena.shadowGenerator
    );

    this.player.onFootstep = () => {
      this.audio.play('footstep');
    };
    this.enemyController.onEnemyGroan = (pos) => {
      this.audio.playDistanceAttenuated(
        'enemy_groan',
        pos,
        this.player.position
      );
    };

    this.hud = new HUDController(() => {
      this.handleModalAction();
    });

    this.bindInputEvents();
    this.syncHUD();

    this.scene.onBeforeRenderObservable.add(() => {
      const rawDt = this.engine.getDeltaTime() / 1000;
      const dt = Math.min(rawDt, 0.1);
      this.totalTime += dt;
      this.updateBraziers(this.totalTime);
      this.update(dt);
    });

    this.engine.runRenderLoop(() => {
      this.scene.render();
    });

    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }

  private handleModalAction(): void {
    const status = this.gameState.status;
    if (status === 'MENU' || status === 'GAME_OVER') {
      this.startNewMatch();
    } else if (status === 'PAUSED') {
      this.gameState.resumeMatch();
      this.audio.resumeMusic();
      this.audio.duckMusic(false);
      this.syncHUD();
    }
    this.requestPointerLockSafe();
  }

  private startNewMatch(): void {
    this.enemyController.clearAll();
    this.player.reset();
    this.healthState.reset();
    this.weaponState.reset();
    this.waveManager.reset();
    this.waveManager.startFirstWave();
    this.gameState.startMatch();
    this.audio.startMusic();
    this.audio.duckMusic(false);
    this.audio.play('wave_bell');
    this.syncHUD();
  }

  private requestPointerLockSafe(): void {
    if (this.canvas.requestPointerLock) {
      try {
        void this.canvas.requestPointerLock();
      } catch {
        // Ignore pointer lock rejection in automated headless environments
      }
    }
  }

  private bindInputEvents(): void {
    window.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || this.gameState.status !== 'PLAYING') {
        return;
      }

      if (!document.pointerLockElement) {
        this.requestPointerLockSafe();
      }

      this.handlePrimaryFire();
    });

    document.addEventListener('pointerlockchange', () => {
      if (
        !document.pointerLockElement &&
        this.gameState.status === 'PLAYING'
      ) {
        this.gameState.pauseMatch();
        this.audio.duckMusic(true);
        this.syncHUD();
      }
    });
  }

  private handlePrimaryFire(): void {
    const fireOutcome = this.weaponState.tryFire();
    if (fireOutcome === 'EMPTY') {
      this.audio.play('dryfire');
      this.audio.play('reload');
      this.syncHUD();
      return;
    }
    if (fireOutcome !== 'FIRED') {
      return;
    }

    this.audio.play('gunshot');
    this.player.addCameraRecoil(0.032);

    const hitInfo = this.weaponController.fireRaycast();
    let hitEnemy = false;

    if (hitInfo.enemyId !== null) {
      const outcome = this.enemyController.applyHit(
        hitInfo.enemyId,
        this.weaponState.damage,
        hitInfo.hitPoint,
        hitInfo.rayDirection
      );

      if (outcome === 'HIT') {
        hitEnemy = true;
        this.audio.play('hit');
      } else if (outcome === 'KILLED') {
        hitEnemy = true;
        this.audio.play('knockdown');
        this.gameState.recordKill(100);
        this.waveManager.onEnemyKilled();
      }
    }

    this.hud.pulseCrosshair(hitEnemy);
    this.syncHUD();
  }

  private updateBraziers(time: number): void {
    for (let i = 0; i < this.brazierLights.length; i++) {
      const light = this.brazierLights[i];
      const offset = i * 1.7;
      light.intensity =
        0.76 +
        0.14 * Math.sin((time + offset) * 7.5) +
        0.06 * Math.cos((time + offset) * 17.3);
    }
  }

  private update(dt: number): void {
    if (this.gameState.status !== 'PLAYING') {
      return;
    }

    if (this.player.isPressingReload()) {
      if (this.weaponState.startReload()) {
        this.audio.play('reload');
      }
    }

    this.player.update(dt);
    this.healthState.update(dt);
    this.weaponState.update(dt);
    this.weaponController.update(dt, this.weaponState.isReloading);

    const prevWave = this.waveManager.currentWave;
    const toSpawn = this.waveManager.update(dt);
    if (this.waveManager.currentWave > prevWave) {
      this.audio.play('wave_bell');
    }
    for (let i = 0; i < toSpawn; i++) {
      this.enemyController.spawnEnemy(this.waveManager.currentWave);
    }

    const contactDamage = this.enemyController.update(
      dt,
      this.player.position,
      this.waveManager.currentWave
    );

    if (contactDamage > 0 && this.healthState.takeDamage(contactDamage)) {
      this.audio.play('hurt');
      this.hud.flashDamageVignette();

      if (!this.healthState.isAlive) {
        this.gameState.triggerGameOver();
        this.audio.duckMusic(true);
        if (document.pointerLockElement && document.exitPointerLock) {
          document.exitPointerLock();
        }
      }
    }

    this.syncHUD();
  }

  private syncHUD(): void {
    this.hud.update({
      status: this.gameState.status,
      wave: this.waveManager.currentWave,
      remainingEnemies: this.waveManager.remainingEnemies,
      isInBreather: this.waveManager.isInBreather,
      kills: this.gameState.kills,
      score: this.gameState.score,
      hp: this.healthState.current,
      maxHp: this.healthState.max,
      ammo: this.weaponState.ammo,
      magazineSize: this.weaponState.magazineSize,
      isReloading: this.weaponState.isReloading,
    });
  }
}
