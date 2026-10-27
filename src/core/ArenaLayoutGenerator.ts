export interface ObstacleBoxDef {
  id: string;
  type: 'MEGALITH' | 'BARRICADE';
  x: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  rotationY: number;
  capAngle?: number;
  rubbleOffset?: { x: number; z: number };
}

export interface BrazierDef {
  id: string;
  x: number;
  z: number;
}

export interface ArenaLayout {
  megaliths: ObstacleBoxDef[];
  barricades: ObstacleBoxDef[];
  braziers: BrazierDef[];
  safeRadius: number;
  arenaBounds: number;
}

export interface Point2D {
  x: number;
  z: number;
}

export class ArenaLayoutGenerator {
  static readonly SAFE_RADIUS = 10.0;
  static readonly ARENA_BOUNDS = 42.0;
  static readonly MIN_OBSTACLE_SPACING = 6.5;

  private static createRng(seed?: number): () => number {
    if (seed === undefined) {
      return () => Math.random();
    }
    // Simple deterministic Mulberry32 PRNG
    let s = (seed | 0) + 0x6d2b79f5;
    return () => {
      s = Math.imul(s ^ (s >>> 15), s | 1);
      s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
      return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
    };
  }

  static generate(seed?: number): ArenaLayout {
    const rng = this.createRng(seed);
    const megaliths: ObstacleBoxDef[] = [];
    const barricades: ObstacleBoxDef[] = [];
    const braziers: BrazierDef[] = [];

    const quadrants = [
      { signX: 1, signZ: 1, baseAngle: Math.PI / 4 },
      { signX: -1, signZ: 1, baseAngle: (3 * Math.PI) / 4 },
      { signX: -1, signZ: -1, baseAngle: (5 * Math.PI) / 4 },
      { signX: 1, signZ: -1, baseAngle: (7 * Math.PI) / 4 },
    ];

    // 1. Generate Gothic Megaliths (4-5 total, staggered across mid-field AND outer wall flanks)
    quadrants.forEach((q, idx) => {
      // Stagger depths: 2 quadrants get mid-field megaliths, 2 get outer wall-flank megaliths
      const isOuter = idx % 2 === 1;
      let mx = 0;
      let mz = 0;
      if (isOuter) {
        // Outer sector near the wall (27m to 35m)
        mx = q.signX * (27 + rng() * 8);
        mz = q.signZ * (27 + rng() * 8);
      } else {
        // Mid-field sector (17m to 24m)
        mx = q.signX * (17 + rng() * 7);
        mz = q.signZ * (17 + rng() * 7);
      }

      const w = 3.5 + rng() * 0.5;
      const d = 3.5 + rng() * 0.5;
      const h = 4.4 + rng() * 0.8;

      megaliths.push({
        id: `megalith_${idx}`,
        type: 'MEGALITH',
        x: mx,
        z: mz,
        width: w,
        height: h,
        depth: d,
        rotationY: (rng() - 0.5) * 0.3,
        capAngle: rng() * Math.PI * 2,
        rubbleOffset: {
          x: (rng() > 0.5 ? 1 : -1) * 2.2,
          z: (rng() > 0.5 ? 1 : -1) * 2.1,
        },
      });
    });

    // Optional 5th outer megalith for asymmetrical gothic ruin silhouette
    const extraQ = quadrants[Math.floor(rng() * 4)];
    const extraMx = extraQ.signX * (28 + rng() * 7);
    const extraMz = extraQ.signZ * (14 + rng() * 10);
    const extraCollides = megaliths.some(
      (m) => Math.hypot(m.x - extraMx, m.z - extraMz) < this.MIN_OBSTACLE_SPACING
    );
    if (!extraCollides) {
      megaliths.push({
        id: `megalith_4`,
        type: 'MEGALITH',
        x: extraMx,
        z: extraMz,
        width: 3.6,
        height: 4.8,
        depth: 3.6,
        rotationY: (rng() - 0.5) * 0.25,
        capAngle: rng() * Math.PI * 2,
        rubbleOffset: { x: 2.2, z: -2.1 },
      });
    }

    // 2. Generate Crypt Barricades: 4 Mid-field + 4 Outer Wall-Flank (8 total)
    quadrants.forEach((q, idx) => {
      // --- Mid-Field Barricade (12m - 24m) ---
      let attempts = 0;
      let midValid = false;
      let bx = 0;
      let bz = 0;
      const bLen = 5.8 + rng() * 1.0;
      const bThick = 1.4;
      const isHoriz = rng() > 0.5;

      while (attempts < 25 && !midValid) {
        attempts++;
        if (attempts % 2 === 0) {
          // Cardinal lane
          if (isHoriz) {
            bx = q.signX * (10 + rng() * 12);
            bz = q.signZ * (18 + rng() * 8);
          } else {
            bx = q.signX * (18 + rng() * 8);
            bz = q.signZ * (10 + rng() * 12);
          }
        } else {
          // Mid diagonal lane
          bx = q.signX * (13 + rng() * 10);
          bz = q.signZ * (13 + rng() * 10);
        }

        const distCenter = Math.hypot(bx, bz);
        if (distCenter < this.SAFE_RADIUS + 0.5) continue;
        if (Math.abs(bx) > this.ARENA_BOUNDS || Math.abs(bz) > this.ARENA_BOUNDS)
          continue;

        const allObs = [...megaliths, ...barricades];
        const tooClose = allObs.some(
          (obs) => Math.hypot(obs.x - bx, obs.z - bz) < this.MIN_OBSTACLE_SPACING
        );
        if (!tooClose) {
          midValid = true;
        }
      }

      if (midValid) {
        barricades.push({
          id: `barricade_${idx}_mid`,
          type: 'BARRICADE',
          x: bx,
          z: bz,
          width: isHoriz ? bLen : bThick,
          height: 1.9,
          depth: isHoriz ? bThick : bLen,
          rotationY: (rng() - 0.5) * 0.15,
        });
      }

      // --- Outer Wall-Flank Barricade (30m - 40m, providing tactical cover near the perimeter) ---
      let outerAttempts = 0;
      let outerValid = false;
      let obx = 0;
      let obz = 0;
      // Along perimeter walls: either parallel to X wall or Z wall
      const isWallAlongX = rng() > 0.5;

      while (outerAttempts < 30 && !outerValid) {
        outerAttempts++;
        if (isWallAlongX) {
          obx = q.signX * (16 + rng() * 20); // 16m to 36m along wall
          obz = q.signZ * (32 + rng() * 8);  // 32m to 40m close to perimeter wall
        } else {
          obx = q.signX * (32 + rng() * 8);  // 32m to 40m close to perimeter wall
          obz = q.signZ * (16 + rng() * 20); // 16m to 36m along wall
        }

        if (
          Math.abs(obx) > this.ARENA_BOUNDS ||
          Math.abs(obz) > this.ARENA_BOUNDS
        )
          continue;

        const allObs = [...megaliths, ...barricades];
        const tooClose = allObs.some(
          (obs) =>
            Math.hypot(obs.x - obx, obs.z - obz) < this.MIN_OBSTACLE_SPACING
        );
        if (!tooClose) {
          outerValid = true;
        }
      }

      if (outerValid) {
        barricades.push({
          id: `barricade_${idx}_outer`,
          type: 'BARRICADE',
          x: obx,
          z: obz,
          width: isWallAlongX ? 6.2 : bThick,
          height: 1.9,
          depth: isWallAlongX ? bThick : 6.2,
          rotationY: (rng() - 0.5) * 0.12,
        });
      }
    });

    // 3. Generate Braziers / Lamps (6 total: 2 Inner, 2 Mid, 2 Outer Wall-Flank)
    // Distributed across varied depths so lamps are NOT always clustered in the middle!
    const brazierConfigs = [
      // 2 Inner / Near-Center Lamps (12m - 18m)
      { q: quadrants[0], minD: 12, maxD: 17 },
      { q: quadrants[2], minD: 12, maxD: 17 },
      // 2 Mid-Field Lamps (21m - 28m)
      { q: quadrants[1], minD: 21, maxD: 28 },
      { q: quadrants[3], minD: 21, maxD: 28 },
      // 2 Outer Wall-Flank Lamps (32m - 39m, illuminating the dark perimeter ruins)
      { q: quadrants[0], minD: 32, maxD: 39 },
      { q: quadrants[2], minD: 32, maxD: 39 },
    ];

    brazierConfigs.forEach((cfg, idx) => {
      let bX = 0;
      let bZ = 0;
      let valid = false;
      let attempts = 0;

      while (attempts < 35 && !valid) {
        attempts++;
        const angle = cfg.q.baseAngle + (rng() - 0.5) * 0.7;
        const dist = cfg.minD + rng() * (cfg.maxD - cfg.minD);
        bX = Math.cos(angle) * dist;
        bZ = Math.sin(angle) * dist;

        if (
          Math.abs(bX) > this.ARENA_BOUNDS ||
          Math.abs(bZ) > this.ARENA_BOUNDS
        )
          continue;

        const allItems = [...megaliths, ...barricades, ...braziers];
        const tooClose = allItems.some(
          (obs) => Math.hypot(obs.x - bX, obs.z - bZ) < 4.5
        );
        if (!tooClose) {
          valid = true;
        }
      }

      if (!valid) {
        bX = cfg.q.signX * ((cfg.minD + cfg.maxD) / 2);
        bZ = cfg.q.signZ * ((cfg.minD + cfg.maxD) / 2);
      }

      braziers.push({
        id: `brazier_${idx}`,
        x: bX,
        z: bZ,
      });
    });

    return {
      megaliths,
      barricades,
      braziers,
      safeRadius: this.SAFE_RADIUS,
      arenaBounds: this.ARENA_BOUNDS,
    };
  }

  static findFogSpawnPoint(
    playerPos: Point2D,
    layout: ArenaLayout,
    rng: () => number = Math.random
  ): Point2D {
    const minDistance = 24.0;
    const maxDistance = 35.0;
    const allObstacles = [...layout.megaliths, ...layout.barricades];

    // Try up to 35 randomized samples in the distance fog across the arena
    for (let i = 0; i < 35; i++) {
      let angle = rng() * Math.PI * 2;
      const playerDistFromOrigin = Math.hypot(playerPos.x, playerPos.z);
      if (playerDistFromOrigin > 20) {
        const centerAngle = Math.atan2(-playerPos.z, -playerPos.x);
        angle = centerAngle + (rng() - 0.5) * Math.PI * 1.3;
      }

      const dist = minDistance + rng() * (maxDistance - minDistance);
      let candX = playerPos.x + Math.cos(angle) * dist;
      let candZ = playerPos.z + Math.sin(angle) * dist;

      // Clamp within arena bounds
      candX = Math.max(-layout.arenaBounds, Math.min(layout.arenaBounds, candX));
      candZ = Math.max(-layout.arenaBounds, Math.min(layout.arenaBounds, candZ));

      const actualDist = Math.hypot(candX - playerPos.x, candZ - playerPos.z);
      if (actualDist < 20.0) {
        continue;
      }

      // Check distance against obstacles
      const collidesWithObstacle = allObstacles.some((obs) => {
        const halfW = obs.width / 2 + 1.2;
        const halfD = obs.depth / 2 + 1.2;
        const insideBox =
          Math.abs(candX - obs.x) < halfW && Math.abs(candZ - obs.z) < halfD;
        const tooCloseCenter = Math.hypot(candX - obs.x, candZ - obs.z) < 2.6;
        return insideBox || tooCloseCenter;
      });

      if (!collidesWithObstacle) {
        return { x: candX, z: candZ };
      }
    }

    // Deterministic fallback: far corner opposite the player
    const signX = playerPos.x >= 0 ? -1 : 1;
    const signZ = playerPos.z >= 0 ? -1 : 1;
    const cornerCandidates = [
      { x: signX * 36.0, z: signZ * 36.0 },
      { x: signX * 38.0, z: signZ * 20.0 },
      { x: signX * 20.0, z: signZ * 38.0 },
    ];
    for (const c of cornerCandidates) {
      const collides = allObstacles.some(
        (obs) => Math.hypot(c.x - obs.x, c.z - obs.z) < 3.0
      );
      if (!collides) {
        return c;
      }
    }
    return cornerCandidates[0];
  }
}
