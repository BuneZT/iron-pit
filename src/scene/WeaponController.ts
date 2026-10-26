import {
  Camera,
  Color3,
  LinesMesh,
  Mesh,
  MeshBuilder,
  Ray,
  Scene,
  StandardMaterial,
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

    const gunMetalMat = new StandardMaterial('gunMetalMat', scene);
    gunMetalMat.diffuseColor = new Color3(0.18, 0.2, 0.24);
    gunMetalMat.specularColor = new Color3(0.45, 0.45, 0.5);

    const gunAccentMat = new StandardMaterial('gunAccentMat', scene);
    gunAccentMat.diffuseColor = new Color3(0.85, 0.42, 0.12);
    gunAccentMat.emissiveColor = new Color3(0.25, 0.1, 0.02);

    // Heavy receiver body
    const receiver = MeshBuilder.CreateBox(
      'gunReceiver',
      { width: 0.11, height: 0.14, depth: 0.48 },
      scene
    );
    receiver.parent = this.gunRig;
    receiver.material = gunMetalMat;
    receiver.isPickable = false;

    // Heavy barrel shroud
    const barrel = MeshBuilder.CreateBox(
      'gunBarrel',
      { width: 0.065, height: 0.08, depth: 0.34 },
      scene
    );
    barrel.parent = this.gunRig;
    barrel.position.set(0, 0.02, 0.32);
    barrel.material = gunMetalMat;
    barrel.isPickable = false;

    // glowing side rail strip
    const rail = MeshBuilder.CreateBox(
      'gunRail',
      { width: 0.12, height: 0.03, depth: 0.36 },
      scene
    );
    rail.parent = this.gunRig;
    rail.position.set(0, 0.055, 0.08);
    rail.material = gunAccentMat;
    rail.isPickable = false;

    this.muzzleNode = new TransformNode('gunMuzzleNode', scene);
    this.muzzleNode.parent = this.gunRig;
    this.muzzleNode.position.set(0, 0.02, 0.52);

    const flashMat = new StandardMaterial('muzzleFlashMat', scene);
    flashMat.diffuseColor = new Color3(1, 0.85, 0.35);
    flashMat.emissiveColor = new Color3(1, 0.72, 0.2);

    this.muzzleFlashMesh = MeshBuilder.CreateSphere(
      'muzzleFlashMesh',
      { diameter: 0.18, segments: 6 },
      scene
    );
    this.muzzleFlashMesh.parent = this.muzzleNode;
    this.muzzleFlashMesh.material = flashMat;
    this.muzzleFlashMesh.isPickable = false;
    this.muzzleFlashMesh.isVisible = false;
  }

  /**
   * Triggers visual recoil, muzzle flash, tracer line, and center-screen raycast.
   */
  fireRaycast(): RaycastHitInfo {
    this.recoilOffsetZ = 0.14;
    this.recoilPitch = -0.18;
    this.muzzleFlashTimer = 0.05;
    this.muzzleFlashMesh.isVisible = true;
    this.muzzleFlashMesh.scaling.setAll(0.85 + Math.random() * 0.4);

    const origin = this.camera.globalPosition.clone();
    const forward = this.camera.getForwardRay(1).direction.normalize();
    const ray = new Ray(origin, forward, 80);

    const pick = this.scene.pickWithRay(
      ray,
      (mesh) => mesh.isPickable && mesh.isEnabled()
    );

    const hitPoint =
      pick && pick.hit && pick.pickedPoint
        ? pick.pickedPoint.clone()
        : origin.add(forward.scale(60));

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
    line.color = new Color3(1.0, 0.85, 0.35);
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
