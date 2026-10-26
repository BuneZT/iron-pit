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
  jumpCooldown: number;
  stuckTimer: number;
  groanTimer: number;
  prevPosition: Vector3;
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

  public onEnemyGroan?: (pos: Vector3) => void;

  private readonly tmpToPlayer = Vector3.Zero();
  private readonly tmpHorizontalVec = Vector3.Zero();
  private readonly tmpMoveDir = Vector3.Zero();
  private readonly tmpNewVel = Vector3.Zero();
  private readonly tmpJumpImpulse = Vector3.Zero();
  private readonly tmpTargetRot = Quaternion.Identity();

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
    const base = (import.meta.env?.BASE_URL ?? '/').replace(/\/+$/, '');
    const bodyMat = new StandardMaterial(`enemyBodyMat_${id}`, this.scene);
    const ironTex = new Texture(
      `${base}/assets/textures/rusted_iron.png`,
      this.scene,
      false,
      true,
      Texture.NEAREST_SAMPLINGMODE
    );
    ironTex.uScale = 1;
    ironTex.vScale = 1;
    bodyMat.diffuseTexture = ironTex;
    bodyMat.diffuseColor = new Color3(0.58, 0.52, 0.48);
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

    // 1. INVISIBLE Physics Root Capsule (No cylinder visible to the player!)
    const root = MeshBuilder.CreateCapsule(
      `enemyRoot_${id}`,
      { height: 1.8, radius: 0.42 },
      this.scene
    );
    root.position.copyFrom(spawnPt);
    root.isVisible = false;
    root.isPickable = false;

    // 2. Heavy Angular Torso (Upper Cuirass, Midsection Vertebrae, Pelvis)
    // Upper Ribcage / Cuirass (faceted, aggressive forward hunch)
    const chestPlate = MeshBuilder.CreateBox(
      `enemyChest_${id}`,
      { width: 0.74, height: 0.48, depth: 0.54 },
      this.scene
    );
    chestPlate.parent = root;
    chestPlate.position.set(0, 0.22, 0.1);
    chestPlate.rotation.set(0.22, 0, -0.03);
    chestPlate.material = bodyMat;
    chestPlate.isPickable = true;
    chestPlate.metadata = { enemyId: id };
    parts.push(chestPlate);

    // Narrower armored midsection / spine
    const midSpine = MeshBuilder.CreateBox(
      `enemyMidSpine_${id}`,
      { width: 0.52, height: 0.26, depth: 0.38 },
      this.scene
    );
    midSpine.parent = root;
    midSpine.position.set(0, -0.06, 0.05);
    midSpine.rotation.x = 0.1;
    midSpine.material = bodyMat;
    midSpine.isPickable = true;
    midSpine.metadata = { enemyId: id };
    parts.push(midSpine);

    // Angular Armored Pelvis / Hip Girdle
    const pelvis = MeshBuilder.CreateBox(
      `enemyPelvis_${id}`,
      { width: 0.62, height: 0.22, depth: 0.44 },
      this.scene
    );
    pelvis.parent = root;
    pelvis.position.set(0, -0.24, 0.02);
    pelvis.material = bodyMat;
    pelvis.isPickable = true;
    pelvis.metadata = { enemyId: id };
    parts.push(pelvis);

    // 3. Segmented Brawny Legs with Heavy Iron Greaves & Pointed Sabatons (Boots)
    // Left Leg
    const thighL = MeshBuilder.CreateBox(
      `enemyThighL_${id}`,
      { width: 0.22, height: 0.38, depth: 0.26 },
      this.scene
    );
    thighL.parent = root;
    thighL.position.set(-0.2, -0.48, 0.04);
    thighL.rotation.x = 0.12;
    thighL.material = bodyMat;
    thighL.isPickable = true;
    thighL.metadata = { enemyId: id };
    parts.push(thighL);

    const shinL = MeshBuilder.CreateBox(
      `enemyShinL_${id}`,
      { width: 0.18, height: 0.42, depth: 0.22 },
      this.scene
    );
    shinL.parent = root;
    shinL.position.set(-0.2, -0.78, -0.02);
    shinL.rotation.x = -0.14;
    shinL.material = bodyMat;
    shinL.isPickable = true;
    shinL.metadata = { enemyId: id };
    parts.push(shinL);

    const sabatonL = MeshBuilder.CreateBox(
      `enemySabatonL_${id}`,
      { width: 0.2, height: 0.14, depth: 0.36 },
      this.scene
    );
    sabatonL.parent = root;
    sabatonL.position.set(-0.2, -0.96, 0.08);
    sabatonL.material = bodyMat;
    sabatonL.isPickable = true;
    sabatonL.metadata = { enemyId: id };
    parts.push(sabatonL);

    // Right Leg (slightly offset combat stance)
    const thighR = MeshBuilder.CreateBox(
      `enemyThighR_${id}`,
      { width: 0.22, height: 0.38, depth: 0.26 },
      this.scene
    );
    thighR.parent = root;
    thighR.position.set(0.2, -0.48, -0.02);
    thighR.rotation.x = -0.08;
    thighR.material = bodyMat;
    thighR.isPickable = true;
    thighR.metadata = { enemyId: id };
    parts.push(thighR);

    const shinR = MeshBuilder.CreateBox(
      `enemyShinR_${id}`,
      { width: 0.18, height: 0.42, depth: 0.22 },
      this.scene
    );
    shinR.parent = root;
    shinR.position.set(0.2, -0.78, 0.04);
    shinR.rotation.x = 0.1;
    shinR.material = bodyMat;
    shinR.isPickable = true;
    shinR.metadata = { enemyId: id };
    parts.push(shinR);

    const sabatonR = MeshBuilder.CreateBox(
      `enemySabatonR_${id}`,
      { width: 0.2, height: 0.14, depth: 0.36 },
      this.scene
    );
    sabatonR.parent = root;
    sabatonR.position.set(0.2, -0.96, 0.14);
    sabatonR.material = bodyMat;
    sabatonR.isPickable = true;
    sabatonR.metadata = { enemyId: id };
    parts.push(sabatonR);

    // 4. Hunched Upper Back Mantle & Sunken Skull Helm
    const hunchMantle = MeshBuilder.CreateBox(
      `enemyHunch_${id}`,
      { width: 0.72, height: 0.44, depth: 0.58 },
      this.scene
    );
    hunchMantle.parent = root;
    hunchMantle.position.set(0, 0.46, -0.02);
    hunchMantle.rotation.x = 0.28;
    hunchMantle.material = bodyMat;
    hunchMantle.isPickable = true;
    hunchMantle.metadata = { enemyId: id };
    parts.push(hunchMantle);

    const skullHelm = MeshBuilder.CreateBox(
      `enemySkull_${id}`,
      { width: 0.36, height: 0.38, depth: 0.44 },
      this.scene
    );
    skullHelm.parent = root;
    skullHelm.position.set(0, 0.66, 0.24);
    skullHelm.rotation.x = 0.22;
    skullHelm.material = bodyMat;
    skullHelm.isPickable = true;
    skullHelm.metadata = { enemyId: id };
    parts.push(skullHelm);

    // Asymmetrical Horns: Long curved left horn + broken shattered right stump
    const hornLeft = MeshBuilder.CreateCylinder(
      `enemyHornL_${id}`,
      { diameterTop: 0.02, diameterBottom: 0.11, height: 0.54, tessellation: 5 },
      this.scene
    );
    hornLeft.parent = skullHelm;
    hornLeft.position.set(-0.16, 0.24, 0.02);
    hornLeft.rotation.set(-0.45, 0.15, -0.38);
    hornLeft.material = hornMat;
    hornLeft.isPickable = true;
    hornLeft.metadata = { enemyId: id };
    parts.push(hornLeft);

    const hornRight = MeshBuilder.CreateCylinder(
      `enemyHornR_${id}`,
      { diameterTop: 0.08, diameterBottom: 0.11, height: 0.18, tessellation: 5 },
      this.scene
    );
    hornRight.parent = skullHelm;
    hornRight.position.set(0.16, 0.15, 0.02);
    hornRight.rotation.set(-0.2, -0.1, 0.32);
    hornRight.material = hornMat;
    hornRight.isPickable = true;
    hornRight.metadata = { enemyId: id };
    parts.push(hornRight);

    // Glowing Demonic Eye Slits (Deep-set under skull brow)
    const eyeVisor = MeshBuilder.CreateBox(
      `enemyEyes_${id}`,
      { width: 0.3, height: 0.07, depth: 0.16 },
      this.scene
    );
    eyeVisor.parent = skullHelm;
    eyeVisor.position.set(0, 0.01, 0.2);
    eyeVisor.material = visorMat;
    eyeVisor.isPickable = true;
    eyeVisor.metadata = { enemyId: id };
    parts.push(eyeVisor);

    // 5. Asymmetrical Shoulders: Spiked Left Pauldron + Dented Right Guard
    const pauldronLeft = MeshBuilder.CreateBox(
      `enemyPauldronL_${id}`,
      { width: 0.36, height: 0.32, depth: 0.42 },
      this.scene
    );
    pauldronLeft.parent = root;
    pauldronLeft.position.set(-0.46, 0.42, 0.06);
    pauldronLeft.rotation.set(0.15, 0.05, -0.32);
    pauldronLeft.material = bodyMat;
    pauldronLeft.isPickable = true;
    pauldronLeft.metadata = { enemyId: id };
    parts.push(pauldronLeft);

    const spikeL1 = MeshBuilder.CreateCylinder(
      `enemySpikeL1_${id}`,
      { diameterTop: 0.02, diameterBottom: 0.09, height: 0.36, tessellation: 5 },
      this.scene
    );
    spikeL1.parent = pauldronLeft;
    spikeL1.position.set(-0.08, 0.2, 0.06);
    spikeL1.rotation.set(0.1, 0, -0.35);
    spikeL1.material = hornMat;
    spikeL1.isPickable = true;
    spikeL1.metadata = { enemyId: id };
    parts.push(spikeL1);

    const pauldronRight = MeshBuilder.CreateBox(
      `enemyPauldronR_${id}`,
      { width: 0.3, height: 0.26, depth: 0.36 },
      this.scene
    );
    pauldronRight.parent = root;
    pauldronRight.position.set(0.44, 0.38, 0.04);
    pauldronRight.rotation.set(0.1, -0.05, 0.24);
    pauldronRight.material = bodyMat;
    pauldronRight.isPickable = true;
    pauldronRight.metadata = { enemyId: id };
    parts.push(pauldronRight);

    // 6. Reaching Segmented Arms (Upper Arm + Forearm + Claws)
    // Left Arm
    const bicepL = MeshBuilder.CreateBox(
      `enemyBicepL_${id}`,
      { width: 0.18, height: 0.32, depth: 0.2 },
      this.scene
    );
    bicepL.parent = root;
    bicepL.position.set(-0.45, 0.26, 0.08);
    bicepL.rotation.set(0.24, 0, -0.18);
    bicepL.material = bodyMat;
    bicepL.isPickable = true;
    bicepL.metadata = { enemyId: id };
    parts.push(bicepL);

    const forearmL = MeshBuilder.CreateBox(
      `enemyForearmL_${id}`,
      { width: 0.19, height: 0.18, depth: 0.44 },
      this.scene
    );
    forearmL.parent = root;
    forearmL.position.set(-0.48, 0.08, 0.3);
    forearmL.rotation.set(-0.42, 0.14, -0.05);
    forearmL.material = bodyMat;
    forearmL.isPickable = true;
    forearmL.metadata = { enemyId: id };
    parts.push(forearmL);

    const clawsL = MeshBuilder.CreateCylinder(
      `enemyClawsL_${id}`,
      { diameterTop: 0.01, diameterBottom: 0.08, height: 0.22, tessellation: 4 },
      this.scene
    );
    clawsL.parent = forearmL;
    clawsL.position.set(0, 0, 0.26);
    clawsL.rotation.x = Math.PI / 2;
    clawsL.material = hornMat;
    clawsL.isPickable = true;
    clawsL.metadata = { enemyId: id };
    parts.push(clawsL);

    // Right Arm
    const bicepR = MeshBuilder.CreateBox(
      `enemyBicepR_${id}`,
      { width: 0.18, height: 0.32, depth: 0.2 },
      this.scene
    );
    bicepR.parent = root;
    bicepR.position.set(0.44, 0.24, 0.06);
    bicepR.rotation.set(0.18, 0, 0.16);
    bicepR.material = bodyMat;
    bicepR.isPickable = true;
    bicepR.metadata = { enemyId: id };
    parts.push(bicepR);

    const forearmR = MeshBuilder.CreateBox(
      `enemyForearmR_${id}`,
      { width: 0.19, height: 0.18, depth: 0.44 },
      this.scene
    );
    forearmR.parent = root;
    forearmR.position.set(0.46, 0.06, 0.26);
    forearmR.rotation.set(-0.35, -0.12, 0.05);
    forearmR.material = bodyMat;
    forearmR.isPickable = true;
    forearmR.metadata = { enemyId: id };
    parts.push(forearmR);

    const clawsR = MeshBuilder.CreateCylinder(
      `enemyClawsR_${id}`,
      { diameterTop: 0.01, diameterBottom: 0.08, height: 0.22, tessellation: 4 },
      this.scene
    );
    clawsR.parent = forearmR;
    clawsR.position.set(0, 0, 0.26);
    clawsR.rotation.x = Math.PI / 2;
    clawsR.material = hornMat;
    clawsR.isPickable = true;
    clawsR.metadata = { enemyId: id };
    parts.push(clawsR);

    // 7. Dynamic Shadows
    this.shadowGenerator.addShadowCaster(chestPlate);
    this.shadowGenerator.addShadowCaster(hunchMantle);
    this.shadowGenerator.addShadowCaster(thighL);
    this.shadowGenerator.addShadowCaster(thighR);
    this.shadowGenerator.addShadowCaster(pauldronLeft);
    this.shadowGenerator.addShadowCaster(pauldronRight);

    // Dynamic Physics Capsule (Kept as invisible collision proxy)
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
      jumpCooldown: 0.8 + Math.random() * 0.4,
      stuckTimer: 0,
      groanTimer: 2.0 + Math.random() * 4.5,
      prevPosition: spawnPt.clone(),
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
      enemy.stuckTimer = 0;
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
      enemy.groanTimer -= dt;
      if (enemy.groanTimer <= 0) {
        enemy.groanTimer = 4.5 + Math.random() * 6.0;
        this.onEnemyGroan?.(enemy.root.position);
      }

      if (enemy.staggerTimer > 0) {
        enemy.staggerTimer -= dt;
        continue;
      }

      if (enemy.jumpCooldown > 0) {
        enemy.jumpCooldown -= dt;
      }

      // Calculate actual linear distance traveled since previous frame
      const actualDist = Vector3.Distance(
        enemy.root.position,
        enemy.prevPosition
      );
      enemy.prevPosition.copyFrom(enemy.root.position);

      playerPosition.subtractToRef(enemy.root.position, this.tmpToPlayer);
      const verticalDiff = playerPosition.y - enemy.root.position.y;
      this.tmpHorizontalVec.set(this.tmpToPlayer.x, 0, this.tmpToPlayer.z);
      const horizontalDist = this.tmpHorizontalVec.length();

      // 3D contact damage validation
      if (
        horizontalDist <= this.contactDistance &&
        Math.abs(verticalDiff) <= 1.4
      ) {
        contactDamageTriggered = Math.max(
          contactDamageTriggered,
          this.contactDamage
        );
      }

      if (horizontalDist > 0.0001) {
        this.tmpMoveDir.set(
          this.tmpHorizontalVec.x / horizontalDist,
          0,
          this.tmpHorizontalVec.z / horizontalDist
        );
      } else {
        this.tmpMoveDir.set(0, 0, 1);
      }

      if (horizontalDist > 0.9) {
        const expectedDist = chaseSpeed * dt;
        if (actualDist < expectedDist * 0.45) {
          enemy.stuckTimer += dt;
        } else {
          enemy.stuckTimer = 0;
        }

        const currentVel = enemy.aggregate.body.getLinearVelocity();
        const isGrounded = Math.abs(currentVel.y) < 0.8;
        let didJump = false;

        if (enemy.jumpCooldown <= 0 && isGrounded) {
          if (verticalDiff > 0.6 && horizontalDist <= 5.2) {
            // Case A: Vertical Pursuit Leap (player is perched above)
            const mass = 1.5;
            const jumpSpeedY = 8.2;
            const forwardPush = 6.0;
            this.tmpJumpImpulse.set(
              this.tmpMoveDir.x * forwardPush * mass,
              jumpSpeedY * mass,
              this.tmpMoveDir.z * forwardPush * mass
            );
            enemy.aggregate.body.applyImpulse(
              this.tmpJumpImpulse,
              enemy.root.position
            );
            enemy.jumpCooldown = 1.6;
            enemy.stuckTimer = 0;
            didJump = true;
          } else if (enemy.stuckTimer >= 0.28 && horizontalDist > 1.2) {
            // Case B: Obstacle Vault Leap (enemy is blocked while chasing)
            const mass = 1.5;
            const jumpSpeedY = 6.8;
            const forwardPush = 5.0;
            this.tmpJumpImpulse.set(
              this.tmpMoveDir.x * forwardPush * mass,
              jumpSpeedY * mass,
              this.tmpMoveDir.z * forwardPush * mass
            );
            enemy.aggregate.body.applyImpulse(
              this.tmpJumpImpulse,
              enemy.root.position
            );
            enemy.jumpCooldown = 1.4;
            enemy.stuckTimer = 0;
            didJump = true;
          }
        }

        if (!didJump) {
          this.tmpNewVel.set(
            this.tmpMoveDir.x * chaseSpeed,
            currentVel.y,
            this.tmpMoveDir.z * chaseSpeed
          );
          enemy.aggregate.body.setLinearVelocity(this.tmpNewVel);
        }

        // Face the player smoothly around Y axis
        const targetYaw = Math.atan2(this.tmpMoveDir.x, this.tmpMoveDir.z);
        Quaternion.FromEulerAnglesToRef(0, targetYaw, 0, this.tmpTargetRot);
        enemy.root.rotationQuaternion = this.tmpTargetRot;
      } else {
        enemy.stuckTimer = 0;
      }

      // Clamp within arena bounds to prevent physics tunneling
      if (
        Math.abs(enemy.root.position.x) > 19.2 ||
        Math.abs(enemy.root.position.z) > 19.2
      ) {
        enemy.root.position.x = Math.max(
          -19.2,
          Math.min(19.2, enemy.root.position.x)
        );
        enemy.root.position.z = Math.max(
          -19.2,
          Math.min(19.2, enemy.root.position.z)
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
