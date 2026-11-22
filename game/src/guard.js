// Night Vault — the wardens: patrol, suspicion, chase and search.
// A guard's state is one of patrol, suspicious, alert or search.
import { TILE, VISION } from './config.js';
import { angleTo, circleFits, hasLineOfSight } from './level.js';
import { detectionGain, visibility } from './vision.js';

export const GUARD_PATROL = 'patrol';
export const GUARD_SUSPICIOUS = 'suspicious';
export const GUARD_ALERT = 'alert';
export const GUARD_SEARCH = 'search';

const WAIT_LOOK = 0.9; // seconds a suspicious guard stares before moving

export class Guard {
  constructor(def) {
    this.name = def.name;
    this.waypoints = def.waypoints.map(([c, r]) => ({
      x: (c + 0.5) * TILE,
      y: (r + 0.5) * TILE,
    }));
    this.speed = def.speed;
    this.wait = def.wait;
    this.x = this.waypoints[0].x;
    this.y = this.waypoints[0].y;
    this.targetIndex = 1 % this.waypoints.length;
    this.facing = 0;
    this.state = GUARD_PATROL;
    this.waitLeft = 0;
    this.detection = 0;
    this.lastSeen = null; // {x, y} where the player was last seen
    this.searchLeft = 0;
    this.lookLeft = 0;
    this.caughtPlayer = false;
    this.stepPhase = 0;
    this.scanPhase = 0; // deterministic sweep while waiting at a waypoint
    this.waitFacing = 0;
  }

  /** Distance to a point, in pixels. */
  distTo(x, y) {
    return Math.hypot(x - this.x, y - this.y);
  }

  /** Walk toward (x, y) at `speed`, sliding along walls. */
  moveToward(x, y, speed, dt) {
    const dx = x - this.x;
    const dy = y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) return true;
    const step = Math.min(d, speed * dt);
    const nx = this.x + (dx / d) * step;
    const ny = this.y + (dy / d) * step;
    this.facing = Math.atan2(dy, dx);
    if (circleFits(nx, this.y, 12)) this.x = nx;
    if (circleFits(this.x, ny, 12)) this.y = ny;
    this.stepPhase += step;
    return d <= speed * dt + 1;
  }

  /** A noise at (x, y) pulls a patrolling guard to investigate. */
  hearNoise(x, y) {
    if (this.state === GUARD_ALERT) return;
    if (this.distTo(x, y) > 260) return;
    this.lastSeen = { x, y };
    this.state = GUARD_SUSPICIOUS;
    this.lookLeft = 0;
    this.detection = Math.max(this.detection, VISION.suspicionAt);
  }

  update(dt, player, onSpotted) {
    // --- sight: does this guard see the player now? ---
    const seen = visibility(this.x, this.y, this.facing, VISION.range, VISION.halfAngle, player);
    if (seen > 0) {
      this.detection = Math.min(1, this.detection + detectionGain(seen, dt));
      this.lastSeen = { x: player.x, y: player.y };
      if (this.detection >= 1 && this.state !== GUARD_ALERT) {
        this.state = GUARD_ALERT;
        onSpotted(this);
      } else if (this.detection >= VISION.suspicionAt && this.state === GUARD_PATROL) {
        this.state = GUARD_SUSPICIOUS;
        this.lookLeft = WAIT_LOOK;
      }
    } else {
      this.detection = Math.max(0, this.detection - VISION.decayRate * dt);
      if (this.state === GUARD_SUSPICIOUS && this.detection < VISION.suspicionAt) {
        this.state = GUARD_PATROL;
      }
    }

    // --- movement by state ---
    if (this.state === GUARD_PATROL) {
      if (this.waitLeft > 0) {
        this.waitLeft -= dt;
        // Scan the room while waiting at a waypoint.
        this.scanPhase += dt;
        this.facing = this.waitFacing + Math.sin(this.scanPhase * 1.5) * 0.5;
      } else {
        const target = this.waypoints[this.targetIndex];
        if (this.moveToward(target.x, target.y, this.speed, dt)) {
          this.targetIndex = (this.targetIndex + 1) % this.waypoints.length;
          this.waitLeft = this.wait;
          this.scanPhase = 0;
          this.waitFacing = this.facing;
        }
      }
    } else if (this.state === GUARD_SUSPICIOUS) {
      if (this.lookLeft > 0) {
        this.lookLeft -= dt;
        if (this.lastSeen) this.facing = angleTo(this.x, this.y, this.lastSeen.x, this.lastSeen.y);
      } else if (this.lastSeen) {
        if (this.moveToward(this.lastSeen.x, this.lastSeen.y, this.speed * 1.25, dt)) {
          this.state = GUARD_SEARCH;
          this.searchLeft = VISION.searchTime;
        }
      }
    } else if (this.state === GUARD_ALERT) {
      if (this.lastSeen) {
        this.moveToward(this.lastSeen.x, this.lastSeen.y, VISION.chaseSpeed, dt);
        if (!hasLineOfSight(this.x, this.y, player.x, player.y)) {
          // Lost the player: keep hunting the last seen spot, then search.
          if (this.distTo(this.lastSeen.x, this.lastSeen.y) < 24) {
            this.state = GUARD_SEARCH;
            this.searchLeft = VISION.searchTime;
          }
        }
      }
      if (this.distTo(player.x, player.y) < VISION.catchDistance && !player.hidden) {
        this.caughtPlayer = true;
      }
    } else if (this.state === GUARD_SEARCH) {
      this.searchLeft -= dt;
      // Sweep the area: turn slowly, drift toward the last seen spot.
      this.facing += dt * 1.6;
      if (this.searchLeft <= 0) {
        this.state = GUARD_PATROL;
        this.detection = 0;
      }
    }
  }
}
