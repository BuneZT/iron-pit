import { describe, expect, it } from 'vitest';
import { MeshBuilder, NullEngine, Scene } from '@babylonjs/core';

// Mock window for headless test environment
(globalThis as any).window = {
  addEventListener: () => {},
  removeEventListener: () => {},
};

import { PlayerController } from '../src/scene/PlayerController';

describe('PlayerController Jump Mechanics', () => {
  function createTestScene() {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    scene.collisionsEnabled = true;

    const floor = MeshBuilder.CreateBox('floor', { width: 40, height: 1, depth: 40 }, scene);
    floor.position.y = -0.5;
    floor.checkCollisions = true;

    const player = new PlayerController(scene);

    // Initial render to update world matrices
    for (let i = 0; i < 3; i++) {
      scene.render();
    }

    return { scene, player };
  }

  it('jumps when grounded and Space is pressed', () => {
    const { scene, player } = createTestScene();

    expect(player.position.y).toBe(0.9);

    // Press Space
    (player as any).keys.add('Space');
    player.update(0.016);
    scene.render();

    // Player should have launched upward
    expect(player.position.y).toBeGreaterThan(0.95);
    expect((player as any).verticalVelocity).toBeGreaterThan(6.0);
    expect((player as any).isGrounded).toBe(false);
  });

  it('completes a full jump trajectory and lands cleanly', () => {
    const { scene, player } = createTestScene();

    (player as any).keys.add('Space');
    player.update(0.016);
    scene.render();
    (player as any).keys.delete('Space');

    let maxApex = player.position.y;

    // Simulate jump until landing
    for (let frame = 0; frame < 60; frame++) {
      player.update(0.016);
      scene.render();
      if (player.position.y > maxApex) {
        maxApex = player.position.y;
      }
    }

    // Jump should have reached an apex well above ground (at least 2.0m)
    expect(maxApex).toBeGreaterThan(2.0);

    // After 60 frames (~1.0s), player should have landed safely back at 0.9m and be grounded
    expect(player.position.y).toBeCloseTo(0.9, 2);
    expect((player as any).verticalVelocity).toBe(0);
    expect((player as any).isGrounded).toBe(true);
  });

  it('does not allow double jumping in mid-air', () => {
    const { scene, player } = createTestScene();

    // Jump once
    (player as any).keys.add('Space');
    player.update(0.016);
    scene.render();

    const velAfterJump1 = (player as any).verticalVelocity;
    expect((player as any).isGrounded).toBe(false);

    // Advance 5 frames
    for (let i = 0; i < 5; i++) {
      player.update(0.016);
      scene.render();
    }

    const velMidAirBefore = (player as any).verticalVelocity;

    // Press Space again while airborne
    (player as any).keys.add('Space');
    player.update(0.016);
    scene.render();

    const velMidAirAfter = (player as any).verticalVelocity;

    // Velocity should continue decelerating under gravity, not reset to jumpSpeed
    expect(velMidAirAfter).toBeLessThan(velMidAirBefore);
    expect(velMidAirAfter).toBeLessThan(velAfterJump1);
  });
});
