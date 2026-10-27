import {
  Collider,
  Mesh,
  MeshBuilder,
  Scene,
  UniversalCamera,
  Vector3,
} from '@babylonjs/core';

export class PlayerController {
  public readonly camera: UniversalCamera;
  private readonly collider: Mesh;
  private readonly keys = new Set<string>();

  private yaw = 0;
  private pitch = 0;
  private recoilPitchOffset = 0;
  private verticalVelocity = 0;
  private isGrounded = true;

  private readonly walkSpeed = 7.2;
  private readonly sprintSpeed = 12.0;
  private readonly jumpSpeed = 7.8;
  private readonly gravity = -20.0;
  private readonly mouseSensitivity = 0.0022;
  private readonly maxPitch = (82 * Math.PI) / 180;

  private readonly moveDir = Vector3.Zero();
  private readonly displacement = Vector3.Zero();
  private footstepTimer = 0;

  public onFootstep?: () => void;

  constructor(scene: Scene) {
    Collider.DoubleSidedCheck = true;

    this.collider = MeshBuilder.CreateCylinder(
      'playerCollider',
      { diameter: 0.9, height: 1.8 },
      scene
    );
    this.collider.position.set(0, 0.9, 0);
    this.collider.isVisible = false;
    this.collider.isPickable = false;
    this.collider.checkCollisions = true;
    this.collider.ellipsoid = new Vector3(0.45, 0.9, 0.45);
    this.collider.ellipsoidOffset = new Vector3(0, 0, 0);

    this.camera = new UniversalCamera(
      'playerCamera',
      new Vector3(0, 1.6, 0),
      scene
    );
    this.camera.minZ = 0.1;
    this.camera.maxZ = 49.2;
    this.camera.fov = 1.1;
    this.camera.inputs.clear();
    scene.activeCamera = this.camera;

    this.bindEvents();
  }

  private bindEvents(): void {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
      }
      this.keys.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    window.addEventListener('mousemove', (e) => {
      if (!document.pointerLockElement) {
        return;
      }
      this.yaw += e.movementX * this.mouseSensitivity;
      this.pitch = Math.max(
        -this.maxPitch,
        Math.min(this.maxPitch, this.pitch + e.movementY * this.mouseSensitivity)
      );
    });
  }

  get position(): Vector3 {
    return this.collider.position;
  }

  addCameraRecoil(pitchKickRadians: number): void {
    this.recoilPitchOffset = Math.min(
      0.14,
      this.recoilPitchOffset + pitchKickRadians
    );
  }

  isPressingReload(): boolean {
    return this.keys.has('KeyR');
  }

  update(dt: number): void {
    // Recover camera recoil smoothly
    if (this.recoilPitchOffset > 0) {
      this.recoilPitchOffset = Math.max(0, this.recoilPitchOffset - dt * 0.45);
    }

    // Input direction in horizontal plane
    let forwardInput = 0;
    let rightInput = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) forwardInput += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) forwardInput -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) rightInput += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) rightInput -= 1;

    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);
    this.moveDir.set(
      sinYaw * forwardInput + cosYaw * rightInput,
      0,
      cosYaw * forwardInput - sinYaw * rightInput
    );
    if (this.moveDir.lengthSquared() > 0.0001) {
      this.moveDir.normalize();
    }

    const isSprinting =
      this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const speed = isSprinting ? this.sprintSpeed : this.walkSpeed;

    // Jump & gravity
    if (this.keys.has('Space') && this.isGrounded) {
      this.verticalVelocity = this.jumpSpeed;
      this.isGrounded = false;
    }

    this.verticalVelocity += this.gravity * dt;

    this.displacement.set(
      this.moveDir.x * speed * dt,
      this.verticalVelocity * dt,
      this.moveDir.z * speed * dt
    );

    const prevY = this.collider.position.y;
    this.collider.moveWithCollisions(this.displacement);

    // Floor clamp / grounded check (only clamp downward/resting velocity)
    if (this.verticalVelocity <= 0 && this.collider.position.y <= 0.91) {
      this.collider.position.y = 0.9;
      this.verticalVelocity = 0;
      this.isGrounded = true;
    } else if (
      this.verticalVelocity < 0 &&
      Math.abs(this.collider.position.y - prevY) < 0.0005
    ) {
      // Landed on top of an obstacle
      this.verticalVelocity = 0;
      this.isGrounded = true;
    }

    // Clamp player within arena bounds
    this.collider.position.x = Math.max(
      -49.2,
      Math.min(49.2, this.collider.position.x)
    );
    this.collider.position.z = Math.max(
      -49.2,
      Math.min(49.2, this.collider.position.z)
    );

    // Footstep cadence when moving and grounded
    if (this.isGrounded && this.moveDir.lengthSquared() > 0.001) {
      this.footstepTimer -= dt;
      if (this.footstepTimer <= 0) {
        this.footstepTimer = isSprinting ? 0.32 : 0.44;
        this.onFootstep?.();
      }
    } else {
      this.footstepTimer = Math.min(this.footstepTimer, 0.1);
    }

    // Sync camera transform
    this.camera.position.set(
      this.collider.position.x,
      this.collider.position.y + 0.68,
      this.collider.position.z
    );
    this.camera.rotation.set(
      this.pitch - this.recoilPitchOffset,
      this.yaw,
      0
    );
  }

  reset(): void {
    this.collider.position.set(0, 0.9, 0);
    this.yaw = 0;
    this.pitch = 0;
    this.recoilPitchOffset = 0;
    this.verticalVelocity = 0;
    this.isGrounded = true;
    this.footstepTimer = 0;
    this.keys.clear();
    this.camera.position.set(0, 1.58, 0);
    this.camera.rotation.set(0, 0, 0);
  }
}
