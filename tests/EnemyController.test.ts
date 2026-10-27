import { describe, expect, it } from 'vitest';
import {
  DirectionalLight,
  NullEngine,
  Scene,
  ShadowGenerator,
  Vector3,
} from '@babylonjs/core';
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin';
import '@babylonjs/core/Physics/joinedPhysicsEngineComponent';
import HavokPhysics from '@babylonjs/havok';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { EnemyController } from '../src/scene/EnemyController';
import { ArenaLayoutGenerator } from '../src/core/ArenaLayoutGenerator';

describe('EnemyController Jump & Vault Mechanics', () => {
  async function createTestEnv() {
    const wasmPath = resolve(__dirname, '../public/wasm/HavokPhysics.wasm');
    const wasmBuffer = readFileSync(wasmPath);
    const wasmBinary = wasmBuffer.buffer.slice(
      wasmBuffer.byteOffset,
      wasmBuffer.byteOffset + wasmBuffer.byteLength
    );
    const havokInstance = await HavokPhysics({ wasmBinary });
    const havokPlugin = new HavokPlugin(true, havokInstance);

    const engine = new NullEngine();
    const scene = new Scene(engine);
    scene.enablePhysics(new Vector3(0, -18, 0), havokPlugin);

    const dirLight = new DirectionalLight('dir', new Vector3(0, -1, 0), scene);
    const shadowGen = new ShadowGenerator(512, dirLight);

    const spawnPoint = new Vector3(0, 0.9, 0);
    const controller = new EnemyController(scene, [spawnPoint], shadowGen);
    const enemy = controller.spawnEnemy(1);

    return { scene, controller, enemy };
  }

  it('validates 3D contact damage: grounded enemy cannot hit perched player 2m above', async () => {
    const { controller, enemy } = await createTestEnv();
    enemy.root.position.set(0, 0.9, 0);

    // Player is directly above on a 2m high barricade (y = 2.9, horizontal dist = 0)
    const perchedPlayerPos = new Vector3(0, 2.9, 0);
    const damagePerched = controller.update(0.016, perchedPlayerPos, 1);
    expect(damagePerched).toBe(0);

    // Player at same elevation within contact distance (y = 0.9, x = 0.5)
    const groundedPlayerPos = new Vector3(0.5, 0.9, 0);
    const damageGrounded = controller.update(0.016, groundedPlayerPos, 1);
    expect(damageGrounded).toBe(15);
  });

  it('triggers vertical pursuit leap when player is perched and enemy is grounded', async () => {
    const { controller, enemy } = await createTestEnv();
    enemy.root.position.set(0, 0.9, 0);
    enemy.jumpCooldown = 0;
    enemy.aggregate.body.setLinearVelocity(Vector3.Zero());

    let appliedImpulse: Vector3 | null = null;
    const origApplyImpulse = enemy.aggregate.body.applyImpulse.bind(enemy.aggregate.body);
    enemy.aggregate.body.applyImpulse = (impulse: Vector3, location: Vector3) => {
      appliedImpulse = impulse.clone();
      origApplyImpulse(impulse, location);
    };

    // Player is perched at y = 2.2, distance = 3m
    const elevatedPlayerPos = new Vector3(0, 2.2, 3.0);
    controller.update(0.016, elevatedPlayerPos, 1);

    expect(appliedImpulse).not.toBeNull();
    // Upward impulse should be positive and substantial
    expect(appliedImpulse!.y).toBeGreaterThan(10);
    // Forward impulse toward z should be positive
    expect(appliedImpulse!.z).toBeGreaterThan(5);
    expect(enemy.jumpCooldown).toBeGreaterThan(1.0);
  });

  it('triggers obstacle vault leap when movement is stalled against an obstacle', async () => {
    const { controller, enemy } = await createTestEnv();
    enemy.root.position.set(0, 0.9, 0);
    enemy.prevPosition.copyFrom(enemy.root.position);
    enemy.jumpCooldown = 0;
    enemy.stuckTimer = 0.28; // Accumulated stall threshold
    enemy.aggregate.body.setLinearVelocity(Vector3.Zero());

    let appliedImpulse: Vector3 | null = null;
    const origApplyImpulse = enemy.aggregate.body.applyImpulse.bind(enemy.aggregate.body);
    enemy.aggregate.body.applyImpulse = (impulse: Vector3, location: Vector3) => {
      appliedImpulse = impulse.clone();
      origApplyImpulse(impulse, location);
    };

    // Player is horizontally 3m away at same elevation
    const playerPos = new Vector3(0, 0.9, 3.0);
    controller.update(0.016, playerPos, 1);

    expect(appliedImpulse).not.toBeNull();
    expect(appliedImpulse!.y).toBeGreaterThan(8);
    expect(appliedImpulse!.z).toBeGreaterThan(5);
    expect(enemy.stuckTimer).toBe(0);
    expect(enemy.jumpCooldown).toBeGreaterThan(1.0);
  });

  it('clamps enemy within 100m arena boundary (±49.2m)', async () => {
    const { controller, enemy } = await createTestEnv();
    enemy.root.position.set(-60, 0.9, 60);
    controller.update(0.016, new Vector3(0, 0.9, 0), 1);
    expect(enemy.root.position.x).toBe(-49.2);
    expect(enemy.root.position.z).toBe(49.2);
  });

  it('spawns enemies in distance fog away from player when initialized with ArenaLayout', async () => {
    const wasmPath = resolve(__dirname, '../public/wasm/HavokPhysics.wasm');
    const wasmBuffer = readFileSync(wasmPath);
    const wasmBinary = wasmBuffer.buffer.slice(
      wasmBuffer.byteOffset,
      wasmBuffer.byteOffset + wasmBuffer.byteLength
    );
    const havokInstance = await HavokPhysics({ wasmBinary });
    const havokPlugin = new HavokPlugin(true, havokInstance);

    const engine = new NullEngine();
    const scene = new Scene(engine);
    scene.enablePhysics(new Vector3(0, -18, 0), havokPlugin);

    const dirLight = new DirectionalLight('dir', new Vector3(0, -1, 0), scene);
    const shadowGen = new ShadowGenerator(512, dirLight);

    const layout = ArenaLayoutGenerator.generate(42);
    const controller = new EnemyController(scene, layout, shadowGen);

    const playerPos = new Vector3(0, 0.9, 0);
    const enemy = controller.spawnEnemy(1, playerPos);

    const dist = Math.hypot(
      enemy.root.position.x - playerPos.x,
      enemy.root.position.z - playerPos.z
    );
    expect(dist).toBeGreaterThanOrEqual(28.0);
    expect(Math.abs(enemy.root.position.x)).toBeLessThanOrEqual(layout.arenaBounds);
    expect(Math.abs(enemy.root.position.z)).toBeLessThanOrEqual(layout.arenaBounds);
  });
});
