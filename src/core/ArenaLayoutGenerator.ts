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
  static readonly ARENA_BOUNDS = 44.0;
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

    // 1. Generate 1 Gothic Megalith in each quadrant (16m to 26m from axes)
    quadrants.forEach((q, idx) => {
      const x = q.signX * (16 + rng() * 10);
      const z = q.signZ * (16 + rng() * 10);
      const w = 3.5 + rng() * 0.5;
      const d = 3.5 + rng() * 0.5;
      const h = 4.4 + rng() * 0.8;

      megaliths.push({
        id: `megalith_${idx}`,
        type: 'MEGALITH',
        x,
        z,
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

    // 2. Generate Crypt Barricades (1 or 2 per quadrant)
    quadrants.forEach((q, idx) => {
      // Primary cardinal/diagonal barricade
      const isHorizontal = rng() > 0.5;
      const bLen = 5.8 + rng() * 1.0;
      const bThick = 1.4;

      // Position along cardinal or diagonal lanes
      let bx = 0;
      let bz = 0;
      let attempts = 0;
      let valid = false;

      while (attempts < 20 && !valid) {
        attempts++;
        if (attempts % 2 === 0) {
          // Cardinal-oriented
          if (isHorizontal) {
            bx = q.signX * (10 + rng() * 14);
            bz = q.signZ * (20 + rng() * 8);
          } else {
            bx = q.signX * (20 + rng() * 8);
            bz = q.signZ * (10 + rng() * 14);
          }
        } else {
          // Mid-field
          bx = q.signX * (14 + rng() * 12);
          bz = q.signZ * (14 + rng() * 12);
        }

        const distCenter = Math.hypot(bx, bz);
        if (distCenter < this.SAFE_RADIUS + 0.5) continue;
        if (
          Math.abs(bx) > this.ARENA_BOUNDS - 2 ||
          Math.abs(bz) > this.ARENA_BOUNDS - 2
        )
          continue;

        // Check distance to all megaliths and other barricades
        const allObs = [...megaliths, ...barricades];
        const tooClose = allObs.some(
          (obs) => Math.hypot(obs.x - bx, obs.z - bz) < this.MIN_OBSTACLE_SPACING
        );
        if (!tooClose) {
          valid = true;
        }
      }

      if (valid) {
        barricades.push({
          id: `barricade_${idx}_0`,
          type: 'BARRICADE',
          x: bx,
          z: bz,
          width: isHorizontal ? bLen : bThick,
          height: 1.9,
          depth: isHorizontal ? bThick : bLen,
          rotationY: (rng() - 0.5) * 0.15,
        });
      }

      // In 2 quadrants, place an extra flanking barricade
      if (idx % 2 === 1) {
        let extraValid = false;
        let extraAttempts = 0;
        let eBx = 0;
        let eBz = 0;
        const eHorizontal = !isHorizontal;

        while (extraAttempts < 25 && !extraValid) {
          extraAttempts++;
          eBx = q.signX * (12 + rng() * 16);
          eBz = q.signZ * (12 + rng() * 16);

          const distCenter = Math.hypot(eBx, eBz);
          if (distCenter < this.SAFE_RADIUS + 1.0) continue;
          if (
            Math.abs(eBx) > this.ARENA_BOUNDS - 2 ||
            Math.abs(eBz) > this.ARENA_BOUNDS - 2
          )
            continue;

          const allObs = [...megaliths, ...barricades];
          const tooClose = allObs.some(
            (obs) =>
              Math.hypot(obs.x - eBx, obs.z - eBz) < this.MIN_OBSTACLE_SPACING
          );
          if (!tooClose) {
            extraValid = true;
          }
        }

        if (extraValid) {
          barricades.push({
            id: `barricade_${idx}_1`,
            type: 'BARRICADE',
            x: eBx,
            z: eBz,
            width: eHorizontal ? 5.4 : bThick,
            height: 1.9,
            depth: eHorizontal ? bThick : 5.4,
            rotationY: (rng() - 0.5) * 0.15,
          });
        }
      }
    });

    // 3. Generate 1 Iron Brazier per quadrant in the inner perimeter ring (11m to 16m)
    quadrants.forEach((q, idx) => {
      let bX = 0;
      let bZ = 0;
      let valid = false;
      let attempts = 0;

      while (attempts < 30 && !valid) {
        attempts++;
        const angle = q.baseAngle + (rng() - 0.5) * 0.5;
        const dist = this.SAFE_RADIUS + 1.0 + rng() * 5.0; // 11.0m to 16.0m
        bX = Math.cos(angle) * dist;
        bZ = Math.sin(angle) * dist;

        if (
          Math.abs(bX) > this.ARENA_BOUNDS ||
          Math.abs(bZ) > this.ARENA_BOUNDS
        )
          continue;

        const allObs = [...megaliths, ...barricades, ...braziers];
        const tooClose = allObs.some(
          (obs) => Math.hypot(obs.x - bX, obs.z - bZ) < 4.5
        );
        if (!tooClose) {
          valid = true;
        }
      }

      if (!valid) {
        // Fallback default position in quadrant
        bX = q.signX * 12;
        bZ = q.signZ * 12;
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
    const maxDistance = 32.0;
    const allObstacles = [...layout.megaliths, ...layout.barricades];

    // Try up to 30 randomized samples in the distance fog
    for (let i = 0; i < 30; i++) {
      // If player is close to arena edge, bias spawn angle toward arena center
      let angle = rng() * Math.PI * 2;
      const playerDistFromOrigin = Math.hypot(playerPos.x, playerPos.z);
      if (playerDistFromOrigin > 22) {
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

      // Check distance against obstacles (ensure outside expanded bounding box & not close to center)
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
