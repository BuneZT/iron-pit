import {
  Camera,
  Color3,
  LinesMesh,
  Mesh,
  MeshBuilder,
  PointLight,
  Ray,
  Scene,
  StandardMaterial,
  Texture,
  TransformNode,
  Vector3,
} from '@babylonjs/core';

export interface RaycastHitInfo {
  enemyId: number | null;
  hitPoint: Vector3;
  rayDirection: Vector3;
}

export class WeaponController {
  private readonly scene: Scene;
  private readonly camera: Camera;
  private readonly gunRig: TransformNode;
  private readonly muzzleNode: TransformNode;
  private readonly muzzleFlashMesh: Mesh;
  private readonly muzzleLight: PointLight;

  private readonly restPosition = new Vector3(0.32, -0.28, 0.62);
  private recoilOffsetZ = 0;
  private recoilPitch = 0;
  private reloadTilt = 0;
  private muzzleFlashTimer = 0;
  private activeTracer: { mesh: LinesMesh; timer: number } | null = null;

  constructor(scene: Scene, camera: Camera) {
    this.scene = scene;
    this.camera = camera;

    this.gunRig = new TransformNode('weaponRig', scene);
    this.gunRig.parent = camera;
    this.gunRig.position.copyFrom(this.restPosition);

    // Gothic Materials (Nearest point-sampled for authentic retro pixel grit)
    const base = (import.meta.env?.BASE_URL ?? '/').replace(/\/+$/, '');
    const darkIronMat = new StandardMaterial('gunIronMat', scene);
    const ironTex = new Texture(
      `${base}/assets/textures/rusted_iron.png`,
      scene,
      false,
      true,
      Texture.NEAREST_SAMPLINGMODE
    );
    ironTex.uScale = 1;
    ironTex.vScale = 1;
    darkIronMat.diffuseTexture = ironTex;
    darkIronMat.diffuseColor = new Color3(0.7, 0.68, 0.68);
    darkIronMat.specularColor = new Color3(0.2, 0.2, 0.22);

    const agedWoodMat = new StandardMaterial('gunWoodMat', scene);
    agedWoodMat.diffuseColor = new Color3(0.24, 0.16, 0.1);
    agedWoodMat.specularColor = new Color3(0.08, 0.06, 0.04);

    const brassMat = new StandardMaterial('gunBrassMat', scene);
    brassMat.diffuseColor = new Color3(0.68, 0.52, 0.22);
    brassMat.specularColor = new Color3(0.5, 0.4, 0.15);

    // 1. Heavy Blackened Iron Receiver
    const receiver = MeshBuilder.CreateBox(
      'gunReceiver',
      { width: 0.12, height: 0.15, depth: 0.46 },
      scene
    );
    receiver.parent = this.gunRig;
    receiver.material = darkIronMat;
    receiver.isPickable = false;

    // 2. Heavy Octagonal Iron Barrel
    const barrel = MeshBuilder.CreateCylinder(
      'gunBarrel',
      { diameter: 0.088, height: 0.42, tessellation: 8 },
      scene
    );
    barrel.parent = this.gunRig;
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, 0.38);
    barrel.material = darkIronMat;
    barrel.isPickable = false;

    // 3. Flanged Iron Muzzle Ring
    const muzzleRing = MeshBuilder.CreateCylinder(
      'gunMuzzleRing',
      { diameter: 0.115, height: 0.06, tessellation: 8 },
      scene
    );
    muzzleRing.parent = this.gunRig;
    muzzleRing.rotation.x = Math.PI / 2;
    muzzleRing.position.set(0, 0.03, 0.58);
    muzzleRing.material = darkIronMat;
    muzzleRing.isPickable = false;

    // 4. Tarnished Brass Clamping Band & Heat Vent
    const band = MeshBuilder.CreateBox(
      'gunBand',
      { width: 0.13, height: 0.16, depth: 0.06 },
      scene
    );
    band.parent = this.gunRig;
    band.position.set(0, 0.01, 0.14);
    band.material = brassMat;
    band.isPickable = false;

    // Brass heat shroud atop barrel
    const heatShroud = MeshBuilder.CreateBox(
      'gunHeatShroud',
      { width: 0.095, height: 0.04, depth: 0.24 },
      scene
    );
    heatShroud.parent = this.gunRig;
    heatShroud.position.set(0, 0.075, 0.32);
    heatShroud.material = brassMat;
    heatShroud.isPickable = false;

    // Welded side iron plate (asymmetrical battle repair)
    const sidePlate = MeshBuilder.CreateBox(
      'gunSidePlate',
      { width: 0.025, height: 0.11, depth: 0.26 },
      scene
    );
    sidePlate.parent = this.gunRig;
    sidePlate.position.set(-0.068, 0.01, 0.04);
    sidePlate.rotation.z = 0.04;
    sidePlate.material = darkIronMat;
    sidePlate.isPickable = false;

    // Jagged cocking lever on right side
    const cockingLever = MeshBuilder.CreateCylinder(
      'gunCockingLever',
      { diameter: 0.024, height: 0.08, tessellation: 5 },
      scene
    );
    cockingLever.parent = this.gunRig;
    cockingLever.rotation.z = Math.PI / 2;
    cockingLever.position.set(0.08, 0.04, -0.05);
    cockingLever.material = darkIronMat;
    cockingLever.isPickable = false;

    // Crooked front iron sight notch
    const frontSight = MeshBuilder.CreateBox(
      'gunFrontSight',
      { width: 0.016, height: 0.038, depth: 0.04 },
      scene
    );
    frontSight.parent = this.gunRig;
    frontSight.position.set(0, 0.096, 0.54);
    frontSight.rotation.y = -0.05;
    frontSight.material = darkIronMat;
    frontSight.isPickable = false;

    // 5. Aged Oak Stock / Handle
    const grip = MeshBuilder.CreateBox(
      'gunGrip',
      { width: 0.09, height: 0.18, depth: 0.16 },
      scene
    );
    grip.parent = this.gunRig;
    grip.position.set(0, -0.12, -0.14);
    grip.rotation.x = -0.32;
    grip.material = agedWoodMat;
    grip.isPickable = false;

    // Muzzle Node for flash, tracers, and dynamic flash light
    this.muzzleNode = new TransformNode('gunMuzzleNode', scene);
    this.muzzleNode.parent = this.gunRig;
    this.muzzleNode.position.set(0, 0.03, 0.62);

    const flashMat = new StandardMaterial('muzzleFlashMat', scene);
    flashMat.diffuseColor = new Color3(1.0, 0.65, 0.15);
    flashMat.emissiveColor = new Color3(1.0, 0.55, 0.05);

    // Jagged flame muzzle flash cone
    this.muzzleFlashMesh = MeshBuilder.CreateCylinder(
      'muzzleFlashMesh',
      { diameterTop: 0.22, diameterBottom: 0.04, height: 0.3, tessellation: 6 },
      scene
    );
    this.muzzleFlashMesh.parent = this.muzzleNode;
    this.muzzleFlashMesh.rotation.x = Math.PI / 2;
    this.muzzleFlashMesh.position.z = 0.14;
    this.muzzleFlashMesh.material = flashMat;
    this.muzzleFlashMesh.isPickable = false;
    this.muzzleFlashMesh.isVisible = false;

    // Dynamic shot flash point light illuminating surrounding stone/fog
    this.muzzleLight = new PointLight(
      'gunMuzzleLight',
      new Vector3(0, 0, 0),
      scene
    );
    this.muzzleLight.parent = this.muzzleNode;
    this.muzzleLight.diffuse = new Color3(1.0, 0.65, 0.2);
    this.muzzleLight.range = 14.0;
    this.muzzleLight.intensity = 0;
  }

  /**
   * Triggers visual recoil, muzzle flash, dynamic light burst, tracer line, and center-screen raycast.
   */
  fireRaycast(): RaycastHitInfo {
    this.recoilOffsetZ = 0.14;
    this.recoilPitch = -0.18;
    this.muzzleFlashTimer = 0.05;
    this.muzzleFlashMesh.isVisible = true;
    this.muzzleFlashMesh.scaling.setAll(0.85 + Math.random() * 0.4);
    this.muzzleLight.intensity = 1.7;

    const origin = this.camera.globalPosition.clone();
    const forward = this.camera.getForwardRay(1).direction.normalize();
    const ray = new Ray(origin, forward, 49.2);

    const pick = this.scene.pickWithRay(
      ray,
      (mesh) => mesh.isPickable && mesh.isEnabled()
    );

    const hitPoint =
      pick && pick.hit && pick.pickedPoint
        ? pick.pickedPoint.clone()
        : origin.add(forward.scale(40.7));

    const enemyId =
      pick &&
      pick.hit &&
      pick.pickedMesh &&
      pick.pickedMesh.metadata &&
      typeof pick.pickedMesh.metadata.enemyId === 'number'
        ? (pick.pickedMesh.metadata.enemyId as number)
        : null;

    this.spawnTracer(this.muzzleNode.getAbsolutePosition(), hitPoint);

    return {
      enemyId,
      hitPoint,
      rayDirection: forward,
    };
  }

  private spawnTracer(start: Vector3, end: Vector3): void {
    if (this.activeTracer) {
      this.activeTracer.mesh.dispose();
      this.activeTracer = null;
    }

    const line = MeshBuilder.CreateLines(
      'shotTracer',
      { points: [start, end] },
      this.scene
    );
    line.color = new Color3(1.0, 0.72, 0.22);
    line.isPickable = false;
    this.activeTracer = { mesh: line, timer: 0.055 };
  }

  update(dt: number, isReloading: boolean): void {
    // Recover kickback Z and pitch
    this.recoilOffsetZ = Math.max(0, this.recoilOffsetZ - dt * 0.95);
    this.recoilPitch = Math.min(0, this.recoilPitch + dt * 1.2);

    // Tilt gun downward slightly while reloading
    const targetReloadTilt = isReloading ? 0.45 : 0;
    this.reloadTilt +=
      (targetReloadTilt - this.reloadTilt) * Math.min(1, dt * 12);

    this.gunRig.position.set(
      this.restPosition.x,
      this.restPosition.y - this.reloadTilt * 0.18,
      this.restPosition.z - this.recoilOffsetZ
    );
    this.gunRig.rotation.set(
      this.recoilPitch + this.reloadTilt,
      0,
      isReloading ? -0.35 : 0
    );

    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      if (this.muzzleFlashTimer <= 0) {
        this.muzzleFlashMesh.isVisible = false;
        this.muzzleLight.intensity = 0;
      }
    }

    if (this.activeTracer) {
      this.activeTracer.timer -= dt;
      if (this.activeTracer.timer <= 0) {
        this.activeTracer.mesh.dispose();
        this.activeTracer = null;
      }
    }
  }
}
