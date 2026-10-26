import {
  Color3,
  Mesh,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  Quaternion,
  Scene,
  ShadowGenerator,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';

export interface EnemyInstance {
  id: number;
  root: Mesh;
  parts: Mesh[];
  bodyMat: StandardMaterial;
  visorMat: StandardMaterial;
  aggregate: PhysicsAggregate;
  hp: number;
  state: 'ALIVE' | 'KNOCKED_DOWN';
  staggerTimer: number;
  flashTimer: number;
  despawnTimer: number;
}

export type EnemyHitOutcome = 'NONE' | 'HIT' | 'KILLED';

export class EnemyController {
  private readonly scene: Scene;
  private readonly spawnPoints: Vector3[];
  private readonly shadowGenerator: ShadowGenerator;
  private readonly enemies = new Map<number, EnemyInstance>();
  private nextId = 1;
  private spawnIndex = 0;

  private readonly maxHp = 100;
  private readonly baseMoveSpeed = 4.6;
  private readonly contactDistance = 1.45;
  private readonly contactDamage = 15;

  constructor(
    scene: Scene,
    spawnPoints: Vector3[],
    shadowGenerator: ShadowGenerator
  ) {
    this.scene = scene;
    this.spawnPoints = spawnPoints;
    this.shadowGenerator = shadowGenerator;
  }

  spawnEnemy(waveNumber = 1): EnemyInstance {
    const id = this.nextId++;
    const spawnPt =
      this.spawnPoints[this.spawnIndex % this.spawnPoints.length].clone();
    this.spawnIndex += 1;

    // Slight jitter so consecutive spawns don't overlap identically
    spawnPt.x += (Math.random() - 0.5) * 1.2;
    spawnPt.z += (Math.random() - 0.5) * 1.2;

    const bodyMat = new StandardMaterial(`enemyBodyMat_${id}`, this.scene);
    bodyMat.diffuseColor = new Color3(0.75, 0.2, 0.18);
    bodyMat.specularColor = new Color3(0.3, 0.3, 0.3);

    const visorMat = new StandardMaterial(`enemyVisorMat_${id}`, this.scene);
    visorMat.diffuseColor = new Color3(1.0, 0.85, 0.2);
    visorMat.emissiveColor = new Color3(0.9, 0.55, 0.1);

    const root = MeshBuilder.CreateCapsule(
      `enemyRoot_${id}`,
      { height: 1.8, radius: 0.42 },
      this.scene
    );
    root.position.copyFrom(spawnPt);
    root.material = bodyMat;
    root.isPickable = true;
    root.metadata = { enemyId: id };

    // Chest armor block
    const chest = MeshBuilder.CreateBox(
      `enemyChest_${id}`,
      { width: 0.72, height: 0.55, depth: 0.52 },
      this.scene
    );
    chest.parent = root;
    chest.position.set(0, 0.18, 0.06);
    chest.material = bodyMat;
    chest.isPickable = true;
    chest.metadata = { enemyId: id };

    // Glowing Visor on front of head
    const visor = MeshBuilder.CreateBox(
      `enemyVisor_${id}`,
      { width: 0.5, height: 0.18, depth: 0.25 },
      this.scene
    );
    visor.parent = root;
    visor.position.set(0, 0.56, 0.32);
    visor.material = visorMat;
    visor.isPickable = true;
    visor.metadata = { enemyId: id };

    this.shadowGenerator.addShadowCaster(root);
    this.shadowGenerator.addShadowCaster(chest);

    const aggregate = new PhysicsAggregate(
      root,
      PhysicsShapeType.CAPSULE,
      { mass: 1.5, friction: 0.45, restitution: 0.2 },
      this.scene
    );

    // Lock angular inertia while alive so enemy stays upright while chasing
    aggregate.body.setMassProperties({
      mass: 1.5,
      inertia: Vector3.Zero(),
    });
    aggregate.body.setLinearDamping(0.8);

    const instance: EnemyInstance = {
      id,
      root,
      parts: [root, chest, visor],
      bodyMat,
      visorMat,
      aggregate,
      hp: this.maxHp + Math.min(40, (waveNumber - 1) * 10),
      state: 'ALIVE',
      staggerTimer: 0,
      flashTimer: 0,
      despawnTimer: 0,
    };

    this.enemies.set(id, instance);
    return instance;
  }

  applyHit(
    enemyId: number,
    damage: number,
    hitPoint: Vector3,
    rayDirection: Vector3
  ): EnemyHitOutcome {
    const enemy = this.enemies.get(enemyId);
    if (!enemy || enemy.state !== 'ALIVE') {
      return 'NONE';
    }

    enemy.hp -= damage;
    const flatDir = new Vector3(rayDirection.x, 0, rayDirection.z);
    if (flatDir.lengthSquared() > 0.0001) {
      flatDir.normalize();
    } else {
      flatDir.set(0, 0, 1);
    }

    if (enemy.hp > 0) {
      // Non-lethal hit: physical stagger impulse + bright hit flash
      enemy.staggerTimer = 0.26;
      enemy.flashTimer = 0.11;
      enemy.bodyMat.emissiveColor = new Color3(0.85, 0.85, 0.85);

      const staggerImpulse = new Vector3(
        flatDir.x * 11.5,
        2.6,
        flatDir.z * 11.5
      );
      enemy.aggregate.body.setLinearVelocity(Vector3.Zero());
      enemy.aggregate.body.applyImpulse(staggerImpulse, enemy.root.position);
      return 'HIT';
    }

    // Fatal hit: unlock rotational inertia and launch/topple enemy backward
    enemy.state = 'KNOCKED_DOWN';
    enemy.despawnTimer = 2.6;
    enemy.flashTimer = 0;
    enemy.bodyMat.diffuseColor = new Color3(0.28, 0.28, 0.3);
    enemy.bodyMat.emissiveColor = new Color3(0.15, 0.04, 0.02);
    enemy.visorMat.emissiveColor = new Color3(0.05, 0.05, 0.05);
    enemy.visorMat.diffuseColor = new Color3(0.2, 0.2, 0.2);

    enemy.aggregate.body.setMassProperties({
      mass: 1.2,
      inertia: new Vector3(0.35, 0.35, 0.35),
    });
    enemy.aggregate.body.setLinearDamping(0.25);
    enemy.aggregate.body.setAngularDamping(0.25);

    // Apply off-center impulse at upper body/hitPoint so the enemy flips backward
    const impactPoint = hitPoint.clone();
    if (impactPoint.y < enemy.root.position.y + 0.45) {
      impactPoint.y = enemy.root.position.y + 0.65;
    }

    const knockdownImpulse = new Vector3(
      flatDir.x * 21.0,
      6.5,
      flatDir.z * 21.0
    );
    enemy.aggregate.body.applyImpulse(knockdownImpulse, impactPoint);

    // Reinforce topple torque perpendicular to shot vector
    const spinAxis = Vector3.Cross(Vector3.Up(), flatDir);
    enemy.aggregate.body.setAngularVelocity(spinAxis.scale(7.5));

    return 'KILLED';
  }

  /**
   * Updates all enemies and returns total contact damage dealt to the player this frame.
   */
  update(dt: number, playerPosition: Vector3, waveNumber = 1): number {
    let contactDamageTriggered = 0;
    const chaseSpeed =
      this.baseMoveSpeed + Math.min(2.2, (waveNumber - 1) * 0.25);

    for (const [id, enemy] of this.enemies.entries()) {
      if (enemy.flashTimer > 0) {
        enemy.flashTimer -= dt;
        if (enemy.flashTimer <= 0 && enemy.state === 'ALIVE') {
          enemy.bodyMat.emissiveColor = Color3.Black();
        }
      }

      if (enemy.state === 'KNOCKED_DOWN') {
        enemy.despawnTimer -= dt;
        if (enemy.despawnTimer <= 0) {
          this.disposeEnemy(id, enemy);
        }
        continue;
      }

      // Alive enemy logic
      if (enemy.staggerTimer > 0) {
        enemy.staggerTimer -= dt;
        continue;
      }

      const toPlayer = playerPosition.subtract(enemy.root.position);
      const horizontalVec = new Vector3(toPlayer.x, 0, toPlayer.z);
      const dist = horizontalVec.length();

      if (dist <= this.contactDistance) {
        contactDamageTriggered = Math.max(
          contactDamageTriggered,
          this.contactDamage
        );
      }

      if (dist > 0.9) {
        const dir = horizontalVec.scale(1 / dist);
        const currentVel = enemy.aggregate.body.getLinearVelocity();
        enemy.aggregate.body.setLinearVelocity(
          new Vector3(dir.x * chaseSpeed, currentVel.y, dir.z * chaseSpeed)
        );

        // Face the player smoothly around Y axis
        const targetYaw = Math.atan2(dir.x, dir.z);
        enemy.root.rotationQuaternion = Quaternion.FromEulerAngles(
          0,
          targetYaw,
          0
        );
      }
    }

    return contactDamageTriggered;
  }

  private disposeEnemy(id: number, enemy: EnemyInstance): void {
    enemy.aggregate.dispose();
    enemy.root.dispose(false, true);
    enemy.bodyMat.dispose();
    enemy.visorMat.dispose();
    this.enemies.delete(id);
  }

  clearAll(): void {
    for (const [id, enemy] of this.enemies.entries()) {
      this.disposeEnemy(id, enemy);
    }
  }
}
