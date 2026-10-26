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

    // Dark rusted iron armor & rotting flesh material (Nearest point sampled)
    const bodyMat = new StandardMaterial(`enemyBodyMat_${id}`, this.scene);
    const ironTex = new Texture(
      '/assets/textures/rusted_iron.png',
      this.scene,
      false,
      true,
      Texture.NEAREST_SAMPLINGMODE
    );
    ironTex.uScale = 1;
    ironTex.vScale = 1;
    bodyMat.diffuseTexture = ironTex;
    bodyMat.diffuseColor = new Color3(0.55, 0.48, 0.45);
    bodyMat.specularColor = new Color3(0.1, 0.09, 0.08);

    // Weathered bone / horn material
    const hornMat = new StandardMaterial(`enemyHornMat_${id}`, this.scene);
    hornMat.diffuseColor = new Color3(0.38, 0.35, 0.28);
    hornMat.specularColor = new Color3(0.04, 0.04, 0.04);

    // Glowing demonic amber/crimson eye visor
    const visorMat = new StandardMaterial(`enemyVisorMat_${id}`, this.scene);
    visorMat.diffuseColor = new Color3(1.0, 0.18, 0.02);
    visorMat.emissiveColor = new Color3(1.0, 0.24, 0.04);

    const parts: Mesh[] = [];

    // 1. Root Capsule Body (Physics anchor)
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

    // 2. Heavy Hunched Spine & Shoulders (Forward pitched Quake Fiend posture)
    const hunchSpine = MeshBuilder.CreateBox(
      `enemyHunch_${id}`,
      { width: 0.76, height: 0.65, depth: 0.68 },
      this.scene
    );
    hunchSpine.parent = root;
    hunchSpine.position.set(0, 0.32, 0.08);
    hunchSpine.rotation.x = 0.26;
    hunchSpine.material = bodyMat;
    hunchSpine.isPickable = true;
    hunchSpine.metadata = { enemyId: id };
    parts.push(hunchSpine);

    // 3. Crooked, Battered Iron Breastplate
    const chestPlate = MeshBuilder.CreateBox(
      `enemyChest_${id}`,
      { width: 0.82, height: 0.54, depth: 0.58 },
      this.scene
    );
    chestPlate.parent = root;
    chestPlate.position.set(0, 0.18, 0.12);
    chestPlate.rotation.set(0.12, 0, -0.04);
    chestPlate.material = bodyMat;
    chestPlate.isPickable = true;
    chestPlate.metadata = { enemyId: id };
    parts.push(chestPlate);

    // 4. Forward-Thrusting Sunken Skull Helm
    const skullHelm = MeshBuilder.CreateBox(
      `enemySkull_${id}`,
      { width: 0.38, height: 0.4, depth: 0.46 },
      this.scene
    );
    skullHelm.parent = root;
    skullHelm.position.set(0, 0.68, 0.36);
    skullHelm.rotation.x = 0.2;
    skullHelm.material = bodyMat;
    skullHelm.isPickable = true;
    skullHelm.metadata = { enemyId: id };
    parts.push(skullHelm);

    // 5. Asymmetrical Horns: Long curved left horn + broken shattered right stump
    const hornLeft = MeshBuilder.CreateCylinder(
      `enemyHornL_${id}`,
      { diameterTop: 0.02, diameterBottom: 0.12, height: 0.55, tessellation: 5 },
      this.scene
    );
    hornLeft.parent = skullHelm;
    hornLeft.position.set(-0.16, 0.26, 0.02);
    hornLeft.rotation.set(-0.45, 0.15, -0.38);
    hornLeft.material = hornMat;
    hornLeft.isPickable = true;
    hornLeft.metadata = { enemyId: id };
    parts.push(hornLeft);

    const hornRight = MeshBuilder.CreateCylinder(
      `enemyHornR_${id}`,
      { diameterTop: 0.08, diameterBottom: 0.12, height: 0.18, tessellation: 5 },
      this.scene
    );
    hornRight.parent = skullHelm;
    hornRight.position.set(0.16, 0.16, 0.02);
    hornRight.rotation.set(-0.2, -0.1, 0.32);
    hornRight.material = hornMat;
    hornRight.isPickable = true;
    hornRight.metadata = { enemyId: id };
    parts.push(hornRight);

    // 6. Glowing Demonic Eye Slits (Deep-set under skull brow)
    const eyeVisor = MeshBuilder.CreateBox(
      `enemyEyes_${id}`,
      { width: 0.32, height: 0.08, depth: 0.16 },
      this.scene
    );
    eyeVisor.parent = skullHelm;
    eyeVisor.position.set(0, 0.02, 0.22);
    eyeVisor.material = visorMat;
    eyeVisor.isPickable = true;
    eyeVisor.metadata = { enemyId: id };
    parts.push(eyeVisor);

    // 7. Asymmetrical Shoulders: Massive spiked left pauldron + dented right plate
    const pauldronLeft = MeshBuilder.CreateBox(
      `enemyPauldronL_${id}`,
      { width: 0.38, height: 0.34, depth: 0.44 },
      this.scene
    );
    pauldronLeft.parent = root;
    pauldronLeft.position.set(-0.48, 0.44, 0.06);
    pauldronLeft.rotation.set(0.15, 0.05, -0.32);
    pauldronLeft.material = bodyMat;
    pauldronLeft.isPickable = true;
    pauldronLeft.metadata = { enemyId: id };
    parts.push(pauldronLeft);

    const spikeL1 = MeshBuilder.CreateCylinder(
      `enemySpikeL1_${id}`,
      { diameterTop: 0.02, diameterBottom: 0.1, height: 0.38, tessellation: 5 },
      this.scene
    );
    spikeL1.parent = pauldronLeft;
    spikeL1.position.set(-0.08, 0.22, 0.06);
    spikeL1.rotation.set(0.1, 0, -0.35);
    spikeL1.material = hornMat;
    spikeL1.isPickable = true;
    spikeL1.metadata = { enemyId: id };
    parts.push(spikeL1);

    const pauldronRight = MeshBuilder.CreateBox(
      `enemyPauldronR_${id}`,
      { width: 0.32, height: 0.28, depth: 0.38 },
      this.scene
    );
    pauldronRight.parent = root;
    pauldronRight.position.set(0.46, 0.4, 0.04);
    pauldronRight.rotation.set(0.1, -0.05, 0.24);
    pauldronRight.material = bodyMat;
    pauldronRight.isPickable = true;
    pauldronRight.metadata = { enemyId: id };
    parts.push(pauldronRight);

    // 8. Reaching Clawed Forearms (bent forward aggressively)
    const armLeft = MeshBuilder.CreateBox(
      `enemyArmL_${id}`,
      { width: 0.18, height: 0.18, depth: 0.54 },
      this.scene
    );
    armLeft.parent = root;
    armLeft.position.set(-0.48, 0.16, 0.28);
    armLeft.rotation.set(-0.42, 0.15, -0.05);
    armLeft.material = bodyMat;
    armLeft.isPickable = true;
    armLeft.metadata = { enemyId: id };
    parts.push(armLeft);

    const clawsLeft = MeshBuilder.CreateCylinder(
      `enemyClawsL_${id}`,
      { diameterTop: 0.01, diameterBottom: 0.08, height: 0.24, tessellation: 4 },
      this.scene
    );
    clawsLeft.parent = armLeft;
    clawsLeft.position.set(0, 0, 0.32);
    clawsLeft.rotation.x = Math.PI / 2;
    clawsLeft.material = hornMat;
    clawsLeft.isPickable = true;
    clawsLeft.metadata = { enemyId: id };
    parts.push(clawsLeft);

    const armRight = MeshBuilder.CreateBox(
      `enemyArmR_${id}`,
      { width: 0.18, height: 0.18, depth: 0.54 },
      this.scene
    );
    armRight.parent = root;
    armRight.position.set(0.48, 0.12, 0.24);
    armRight.rotation.set(-0.35, -0.12, 0.05);
    armRight.material = bodyMat;
    armRight.isPickable = true;
    armRight.metadata = { enemyId: id };
    parts.push(armRight);

    const clawsRight = MeshBuilder.CreateCylinder(
      `enemyClawsR_${id}`,
      { diameterTop: 0.01, diameterBottom: 0.08, height: 0.24, tessellation: 4 },
      this.scene
    );
    clawsRight.parent = armRight;
    clawsRight.position.set(0, 0, 0.32);
    clawsRight.rotation.x = Math.PI / 2;
    clawsRight.material = hornMat;
    clawsRight.isPickable = true;
    clawsRight.metadata = { enemyId: id };
    parts.push(clawsRight);

    // 9. Ragged Iron Loin/Waist Tassets
    const waistPlate = MeshBuilder.CreateBox(
      `enemyWaist_${id}`,
      { width: 0.58, height: 0.44, depth: 0.14 },
      this.scene
    );
    waistPlate.parent = root;
    waistPlate.position.set(0, -0.24, 0.22);
    waistPlate.rotation.x = -0.14;
    waistPlate.material = bodyMat;
    waistPlate.isPickable = true;
    waistPlate.metadata = { enemyId: id };
    parts.push(waistPlate);

    // Shadows
    this.shadowGenerator.addShadowCaster(root);
    this.shadowGenerator.addShadowCaster(hunchSpine);
    this.shadowGenerator.addShadowCaster(chestPlate);
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
    enemy.bodyMat.diffuseColor = new Color3(0.24, 0.22, 0.2);
    enemy.bodyMat.emissiveColor = new Color3(0.12, 0.03, 0.02);
    enemy.visorMat.emissiveColor = new Color3(0.04, 0.04, 0.04);
    enemy.visorMat.diffuseColor = new Color3(0.15, 0.15, 0.15);

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
