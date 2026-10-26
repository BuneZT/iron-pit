import {
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

  private readonly walkSpeed = 6.5;
  private readonly sprintSpeed = 10.0;
  private readonly jumpSpeed = 7.8;
  private readonly gravity = -20.0;
  private readonly mouseSensitivity = 0.0022;
  private readonly maxPitch = (82 * Math.PI) / 180;

  constructor(scene: Scene) {
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
    this.camera.fov = 1.1;
    this.camera.inputs.clear();
    scene.activeCamera = this.camera;

    this.bindEvents();
  }

  private bindEvents(): void {
    window.addEventListener('keydown', (e) => {
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

    const forwardDir = new Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const rightDir = new Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const moveDir = forwardDir
      .scale(forwardInput)
      .add(rightDir.scale(rightInput));
    if (moveDir.lengthSquared() > 0.0001) {
      moveDir.normalize();
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

    const displacement = new Vector3(
      moveDir.x * speed * dt,
      this.verticalVelocity * dt,
      moveDir.z * speed * dt
    );

    const prevY = this.collider.position.y;
    this.collider.moveWithCollisions(displacement);

    // Floor clamp / grounded check
    if (this.collider.position.y <= 0.91) {
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
      -19.2,
      Math.min(19.2, this.collider.position.x)
    );
    this.collider.position.z = Math.max(
      -19.2,
      Math.min(19.2, this.collider.position.z)
    );

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
    this.keys.clear();
    this.camera.position.set(0, 1.58, 0);
    this.camera.rotation.set(0, 0, 0);
  }
}
