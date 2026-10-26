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
  Texture,
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

    // Dark rusted iron armor material
    const bodyMat = new StandardMaterial(`enemyBodyMat_${id}`, this.scene);
    const ironTex = new Texture('/assets/textures/rusted_iron.png', this.scene);
    ironTex.uScale = 1;
    ironTex.vScale = 1;
    bodyMat.diffuseTexture = ironTex;
    bodyMat.diffuseColor = new Color3(0.55, 0.52, 0.52);
    bodyMat.specularColor = new Color3(0.3, 0.28, 0.25);

    // Glowing demonic amber/crimson eye visor
    const visorMat = new StandardMaterial(`enemyVisorMat_${id}`, this.scene);
    visorMat.diffuseColor = new Color3(1.0, 0.22, 0.05);
    visorMat.emissiveColor = new Color3(1.0, 0.28, 0.06);

    const parts: Mesh[] = [];

    // 1. Root Capsule Body
    const root = MeshBuilder.CreateCapsule(
      `enemyRoot_${id}`,
      { height: 1.8, radius: 0.42 },
      this.scene
    );
    root.position.copyFrom(spawnPt);
    root.material = bodyMat;
    root.isPickable = true;
    root.metadata = { enemyId: id };
    parts.push(root);

    // 2. Heavy Angular Iron Cuirass (Breastplate)
    const chest = MeshBuilder.CreateBox(
      `enemyChest_${id}`,
      { width: 0.78, height: 0.62, depth: 0.56 },
      this.scene
    );
    chest.parent = root;
    chest.position.set(0, 0.16, 0.06);
    chest.material = bodyMat;
    chest.isPickable = true;
    chest.metadata = { enemyId: id };
    parts.push(chest);

    // 3. Spiked Left Shoulder Pauldron
    const pauldronLeft = MeshBuilder.CreateBox(
      `enemyPauldronL_${id}`,
      { width: 0.28, height: 0.28, depth: 0.36 },
      this.scene
    );
    pauldronLeft.parent = root;
    pauldronLeft.position.set(-0.46, 0.42, 0);
    pauldronLeft.rotation.z = -0.28;
    pauldronLeft.material = bodyMat;
    pauldronLeft.isPickable = true;
    pauldronLeft.metadata = { enemyId: id };
    parts.push(pauldronLeft);

    const spikeL = MeshBuilder.CreateCylinder(
      `enemySpikeL_${id}`,
      { diameterTop: 0.02, diameterBottom: 0.1, height: 0.32, tessellation: 6 },
      this.scene
    );
    spikeL.parent = pauldronLeft;
    spikeL.position.set(-0.06, 0.2, 0);
    spikeL.rotation.z = -0.25;
    spikeL.material = bodyMat;
    spikeL.isPickable = true;
    spikeL.metadata = { enemyId: id };
    parts.push(spikeL);

    // 4. Spiked Right Shoulder Pauldron
    const pauldronRight = MeshBuilder.CreateBox(
      `enemyPauldronR_${id}`,
      { width: 0.28, height: 0.28, depth: 0.36 },
      this.scene
    );
    pauldronRight.parent = root;
    pauldronRight.position.set(0.46, 0.42, 0);
    pauldronRight.rotation.z = 0.28;
    pauldronRight.material = bodyMat;
    pauldronRight.isPickable = true;
    pauldronRight.metadata = { enemyId: id };
    parts.push(pauldronRight);

    const spikeR = MeshBuilder.CreateCylinder(
      `enemySpikeR_${id}`,
      { diameterTop: 0.02, diameterBottom: 0.1, height: 0.32, tessellation: 6 },
      this.scene
    );
    spikeR.parent = pauldronRight;
    spikeR.position.set(0.06, 0.2, 0);
    spikeR.rotation.z = 0.25;
    spikeR.material = bodyMat;
    spikeR.isPickable = true;
    spikeR.metadata = { enemyId: id };
    parts.push(spikeR);

    // 5. Demonic Helm Ridge / Crest
    const helmRidge = MeshBuilder.CreateBox(
      `enemyHelmRidge_${id}`,
      { width: 0.1, height: 0.2, depth: 0.38 },
      this.scene
    );
    helmRidge.parent = root;
    helmRidge.position.set(0, 0.86, 0);
    helmRidge.material = bodyMat;
    helmRidge.isPickable = true;
    helmRidge.metadata = { enemyId: id };
    parts.push(helmRidge);

    // 6. Glowing Demonic Horizontal Eye Slit
    const visor = MeshBuilder.CreateBox(
      `enemyVisor_${id}`,
      { width: 0.46, height: 0.1, depth: 0.26 },
      this.scene
    );
    visor.parent = root;
    visor.position.set(0, 0.58, 0.34);
    visor.material = visorMat;
    visor.isPickable = true;
    visor.metadata = { enemyId: id };
    parts.push(visor);

    this.shadowGenerator.addShadowCaster(root);
    this.shadowGenerator.addShadowCaster(chest);
    this.shadowGenerator.addShadowCaster(pauldronLeft);
    this.shadowGenerator.addShadowCaster(pauldronRight);

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
      parts,
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
