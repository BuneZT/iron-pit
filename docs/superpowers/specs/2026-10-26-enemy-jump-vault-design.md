# Enemy Jump & Obstacle Vaulting Design Specification

## 1. Goal & Context
Currently in `iron-pit`, the player can jump onto static obstacles (such as fallen rubble blocks and crypt barricades) to escape enemy attacks. Living chasers in `EnemyController.ts` only apply horizontal velocity toward the player (`setLinearVelocity(dir.x * chaseSpeed, vel.y, dir.z * chaseSpeed)`) without upward velocity, leaving them pushing flat against obstacle colliders. Furthermore, the contact damage check only measures horizontal 2D distance.

This feature enables demonic chasers to:
1. **Vault obstacles** when their horizontal forward movement is obstructed.
2. **Leap up at the player** when the player is elevated on objects or ledges.
3. Check **3D distance** for contact damage so grounded enemies cannot hit elevated players through floors/pedestals, while leaping enemies can hit players at matching elevation.

---

## 2. Technical Architecture & Kinematics

### 2.1 State Tracking per Enemy (`EnemyInstance` in `src/scene/EnemyController.ts`)
Each `EnemyInstance` will track:
* `jumpCooldown: number`: Cooldown in seconds before the next leap (initialized to `0.8 + Math.random() * 0.4` so mob groups desynchronize their jumps).
* `stuckTimer: number`: Accumulator measuring consecutive seconds spent chasing with negligible forward progress.
* `prevPosition: Vector3`: Enemy position at the previous update frame, used to calculate actual linear displacement.

### 2.2 Trigger Conditions
In `EnemyController.update(dt, playerPosition, waveNumber)`, for each `ALIVE` enemy not currently in hit stagger:
1. **Movement Stall Detection:**
   * Compute actual displacement: `actualDist = Vector3.Distance(enemy.root.position, enemy.prevPosition)`.
   * If the enemy is actively pursuing (`distToPlayer > 0.9m`) and `actualDist < 0.6 * chaseSpeed * dt`:
     * Increment `enemy.stuckTimer += dt`.
   * Else:
     * Reset `enemy.stuckTimer = 0`.
   * Update `enemy.prevPosition.copyFrom(enemy.root.position)`.

2. **Jump Evaluation:**
   When `enemy.jumpCooldown <= 0` and the enemy is approximately grounded (Havok linear velocity `Math.abs(vel.y) < 0.8`):
   * **Case A: Vertical Pursuit Leap (Perched Player)**
     * Condition: `playerPosition.y > enemy.root.position.y + 0.6m` and `distToPlayer <= 5.2m`.
     * Velocity/Impulse: Upward impulse scaled for jump speed `~8.2 m/s` plus forward horizontal push `~6.0 m/s` toward the player.
     * Cooldown: Reset `enemy.jumpCooldown = 1.6s`.
   * **Case B: Obstacle Vault Leap (Blocked Chaser)**
     * Condition: `enemy.stuckTimer >= 0.28s` and `distToPlayer > 1.2m`.
     * Velocity/Impulse: Upward impulse scaled for jump speed `~6.8 m/s` plus forward horizontal push `~5.0 m/s` in pursuit direction.
     * Cooldown: Reset `enemy.jumpCooldown = 1.4s`, `enemy.stuckTimer = 0`.

3. **Impulse Execution:**
   Applied via Havok:
   ```ts
   enemy.aggregate.body.applyImpulse(
     new Vector3(forwardX * mass, jumpSpeedY * mass, forwardZ * mass),
     enemy.root.position
   );
   ```

### 2.3 Contact Damage 3D Validation
Update contact damage check in `EnemyController.update`:
* Horizontal distance: `horizontalDist <= this.contactDistance` (1.45m).
* Vertical distance: `Math.abs(playerPosition.y - enemy.root.position.y) <= 1.4m`.
* Contact damage is triggered only when both conditions are met.

### 2.4 Performance & Garbage Collection Rules (AGENTS.md 3.2)
* Allocate reusable scratch vectors in `EnemyController`:
  * `private readonly tmpToPlayer = Vector3.Zero()`
  * `private readonly tmpMoveDir = Vector3.Zero()`
  * `private readonly tmpJumpImpulse = Vector3.Zero()`
* Zero per-frame `new Vector3()` calls in hot render loops.

---

## 3. Verification Plan
* **Headless Unit Tests (`tests/EnemyJump.test.ts`):**
  * Verify `stuckTimer` accumulates when an enemy is obstructed by static obstacles.
  * Verify leap impulse is applied with positive `y` velocity when player is perched higher.
  * Verify grounded contact damage fails when player is perched 2m above, but succeeds when matching elevation or leaping.
* **Full Suite:** `npm test` passes cleanly.
* **Production Build:** `npm run build` succeeds without type errors.
