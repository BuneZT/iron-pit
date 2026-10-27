import { describe, expect, it } from 'vitest';
import { ArenaLayoutGenerator } from '../src/core/ArenaLayoutGenerator';

describe('ArenaLayoutGenerator', () => {
  it('enforces center safe zone (minimum 12m from player spawn at 0,0)', () => {
    for (let run = 0; run < 10; run++) {
      const layout = ArenaLayoutGenerator.generate(run * 100);
      const allObstacles = [
        ...layout.megaliths,
        ...layout.barricades,
        ...layout.braziers,
      ];

      for (const item of allObstacles) {
        const distFromCenter = Math.hypot(item.x, item.z);
        expect(distFromCenter).toBeGreaterThanOrEqual(layout.safeRadius);
      }
    }
  });

  it('keeps all elements inside arena perimeter bounds (<= 44m on X and Z)', () => {
    for (let run = 0; run < 10; run++) {
      const layout = ArenaLayoutGenerator.generate(run * 100);
      const allObstacles = [
        ...layout.megaliths,
        ...layout.barricades,
        ...layout.braziers,
      ];

      for (const item of allObstacles) {
        expect(Math.abs(item.x)).toBeLessThanOrEqual(layout.arenaBounds);
        expect(Math.abs(item.z)).toBeLessThanOrEqual(layout.arenaBounds);
      }
    }
  });

  it('enforces minimum separation between major obstacles', () => {
    for (let run = 0; run < 10; run++) {
      const layout = ArenaLayoutGenerator.generate(run * 100);
      const obstacles = [...layout.megaliths, ...layout.barricades];

      for (let i = 0; i < obstacles.length; i++) {
        for (let j = i + 1; j < obstacles.length; j++) {
          const dist = Math.hypot(
            obstacles[i].x - obstacles[j].x,
            obstacles[i].z - obstacles[j].z
          );
          // Centers must be separated by at least 6.5m
          expect(dist).toBeGreaterThanOrEqual(6.5);
        }
      }
    }
  });

  it('distributes obstacles and braziers across all four quadrants', () => {
    const layout = ArenaLayoutGenerator.generate(42);

    const quadrants = [
      { name: 'Q1', test: (x: number, z: number) => x > 0 && z > 0 },
      { name: 'Q2', test: (x: number, z: number) => x < 0 && z > 0 },
      { name: 'Q3', test: (x: number, z: number) => x < 0 && z < 0 },
      { name: 'Q4', test: (x: number, z: number) => x > 0 && z < 0 },
    ];

    for (const q of quadrants) {
      const megaInQ = layout.megaliths.filter((m) => q.test(m.x, m.z));
      const barricadeInQ = layout.barricades.filter((b) => q.test(b.x, b.z));
      const brazierInQ = layout.braziers.filter((br) => q.test(br.x, br.z));

      expect(megaInQ.length).toBeGreaterThanOrEqual(1);
      expect(barricadeInQ.length).toBeGreaterThanOrEqual(1);
      expect(brazierInQ.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('generates different layouts with different seeds / runs', () => {
    const layoutA = ArenaLayoutGenerator.generate(1);
    const layoutB = ArenaLayoutGenerator.generate(999);

    // Positions should not be identical
    expect(layoutA.megaliths[0].x).not.toBe(layoutB.megaliths[0].x);
  });

  describe('findFogSpawnPoint', () => {
    it('generates a spawn point in the distance fog (>= 28m from player)', () => {
      const layout = ArenaLayoutGenerator.generate(123);
      const playerPos = { x: 0, z: 0 };

      for (let i = 0; i < 20; i++) {
        const spawn = ArenaLayoutGenerator.findFogSpawnPoint(playerPos, layout);
        const dist = Math.hypot(spawn.x - playerPos.x, spawn.z - playerPos.z);
        expect(dist).toBeGreaterThanOrEqual(28.0);
        expect(Math.abs(spawn.x)).toBeLessThanOrEqual(layout.arenaBounds);
        expect(Math.abs(spawn.z)).toBeLessThanOrEqual(layout.arenaBounds);
      }
    });

    it('generates valid spawn points even when player is near arena border', () => {
      const layout = ArenaLayoutGenerator.generate(123);
      const cornerPlayer = { x: 38, z: 38 };

      for (let i = 0; i < 20; i++) {
        const spawn = ArenaLayoutGenerator.findFogSpawnPoint(
          cornerPlayer,
          layout
        );
        const dist = Math.hypot(spawn.x - cornerPlayer.x, spawn.z - cornerPlayer.z);
        expect(dist).toBeGreaterThanOrEqual(25.0);
        expect(Math.abs(spawn.x)).toBeLessThanOrEqual(layout.arenaBounds);
        expect(Math.abs(spawn.z)).toBeLessThanOrEqual(layout.arenaBounds);
      }
    });

    it('ensures spawn point does not land inside major obstacles', () => {
      const layout = ArenaLayoutGenerator.generate(123);
      const playerPos = { x: 0, z: 0 };

      for (let i = 0; i < 30; i++) {
        const spawn = ArenaLayoutGenerator.findFogSpawnPoint(playerPos, layout);
        for (const obs of [...layout.megaliths, ...layout.barricades]) {
          const dist = Math.hypot(spawn.x - obs.x, spawn.z - obs.z);
          expect(dist).toBeGreaterThanOrEqual(2.0);
        }
      }
    });
  });
});
