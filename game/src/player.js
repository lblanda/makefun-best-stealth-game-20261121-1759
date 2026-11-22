// Night Vault — the infiltrator: movement, stance, hiding and the
// coin toss that distracts a guard.
import { PLAYER, TILE } from './config.js';
import { circleFits, isHedge } from './level.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = PLAYER.radius;
    this.facing = 0;
    this.moving = false;
    this.running = false;
    this.crouched = false;
    this.hidden = false; // standing inside a hedge
    this.coins = PLAYER.coins;
    this.stepPhase = 0;
    this.stepSoundAt = 0;
  }

  get speed() {
    if (this.crouched) return PLAYER.sneakSpeed;
    if (this.running) return PLAYER.runSpeed;
    return PLAYER.walkSpeed;
  }

  /** Noise radius in pixels: 0 when still or sneaking. */
  get noiseRadius() {
    if (!this.moving) return 0;
    if (this.crouched) return 0;
    if (this.running) return 150;
    return 55;
  }

  update(dt, input) {
    let dx = 0;
    let dy = 0;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    this.moving = dx !== 0 || dy !== 0;
    this.running = input.run && this.moving && !input.sneak;
    this.crouched = input.sneak;
    if (this.moving) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
      this.facing = Math.atan2(dy, dx);
      const step = this.speed * dt;
      const nx = this.x + dx * step;
      const ny = this.y + dy * step;
      if (circleFits(nx, this.y, this.radius)) this.x = nx;
      if (circleFits(this.x, ny, this.radius)) this.y = ny;
      this.stepPhase += step;
    }
    const col = Math.floor(this.x / TILE);
    const row = Math.floor(this.y / TILE);
    this.hidden = isHedge(col, row);
  }

  /** Toss a coin toward (x, y): returns the landing point or null. */
  tossCoin(x, y) {
    if (this.coins <= 0) return null;
    this.coins -= 1;
    return { x, y };
  }
}
