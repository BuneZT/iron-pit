import { describe, expect, it } from 'vitest';
import { NullEngine, Scene, Vector3 } from '@babylonjs/core';
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin';
import '@babylonjs/core/Physics/joinedPhysicsEngineComponent';
import HavokPhysics from '@babylonjs/havok';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Mock window for headless test environment
(globalThis as any).window = {
  addEventListener: () => {},
  removeEventListener: () => {},
};

import { ArenaBuilder } from '../src/scene/ArenaBuilder';
import { PlayerController } from '../src/scene/PlayerController';

describe('ArenaBuilder brazier collision', () => {
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

    ArenaBuilder.build(scene);
    const player = new PlayerController(scene);

    for (let i = 0; i < 3; i++) {
      scene.render();
    }

    return { scene, player };
  }

  it('enables collision on brazier lamp meshes', async () => {
    const { scene } = await createTestEnv();

    for (let i = 0; i < 4; i++) {
      const pedestal = scene.getMeshByName(`brazierPedestal_${i}`);
      const bowl = scene.getMeshByName(`brazierBowl_${i}`);
      expect(pedestal).toBeDefined();
      expect(bowl).toBeDefined();
      expect(pedestal?.checkCollisions).toBe(true);
      expect(bowl?.checkCollisions).toBe(true);
      expect(pedestal?.isPickable).toBe(true);
      expect(bowl?.isPickable).toBe(true);
      expect(pedestal?.physicsBody).toBeDefined();
      expect(bowl?.physicsBody).toBeDefined();
    }
  });

  it('stops player from falling through brazier bowl when standing on it', async () => {
    const { scene, player } = await createTestEnv();

    // Brazier 0 is at (-12, 0, 0). The bowl top is at y ~ 1.86.
    // Drop player directly above the brazier from y = 3.5.
    player.position.set(-12, 3.5, 0);

    for (let i = 0; i < 40; i++) {
      player.update(0.016);
      scene.render();
    }

    // Player should remain supported on top of the brazier bowl (y > 2.5) rather than falling to floor (0.9)
    expect(player.position.y).toBeGreaterThan(2.5);
  });

  it('collides player with brazier lamp when moving into it', async () => {
    const { scene, player } = await createTestEnv();

    // Brazier 0 is at (-12, 0, 0).
    // Start player at (-10, 0.9, 0) facing -X (towards -12).
    player.position.set(-10, 0.9, 0);
    // Face -X: yaw = -PI / 2
    (player as any).yaw = -Math.PI / 2;

    // Press W to move forward towards -12
    (player as any).keys.add('KeyW');

    // Update for multiple frames
    for (let i = 0; i < 30; i++) {
      player.update(0.016);
      scene.render();
    }

    // Player radius is 0.45m.
    // Brazier center is at -12.
    // If brazier does not collide, player walks straight through to past -13.
    // With collision, player must be stopped before the center of the brazier (e.g. x > -11.5).
    expect(player.position.x).toBeGreaterThan(-11.5);
  });
});
