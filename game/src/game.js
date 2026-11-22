// Night Vault — the game itself: state machine, objectives, cameras,
// coins, win and caught. Title → playing ⇄ paused → win / caught.
import { CAMERAS, SEED, TILE, VISION } from './config.js';
import { Guard, GUARD_ALERT } from './guard.js';
import { GUARDS } from './config.js';
import { Player } from './player.js';
import { Sound } from './audio.js';
import { findTiles, isExit } from './level.js';
import { makeRng } from './rng.js';
import { visibility } from './vision.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WIN = 'win';
export const SCREEN_CAUGHT = 'caught';

export class Game {
  constructor() {
    this.rng = makeRng(SEED);
    this.sound = new Sound();
    this.screen = SCREEN_TITLE;
    this.time = 0;
    this.coresTaken = 0;
    this.cores = [];
    this.guards = [];
    this.cameras = [];
    this.player = null;
    this.exitOpen = false;
    this.timesSpotted = 0; // how often a guard went fully alert
    this.timesSeen = 0; // frames any guard had any detection (for rating)
    this.coinPings = []; // {x, y, ttl}
    this.alertFlash = 0;
    this.message = '';
    this.messageTtl = 0;
    this.bestTime = null;
    this.reset();
  }

  reset() {
    this.time = 0;
    this.coresTaken = 0;
    this.exitOpen = false;
    this.timesSpotted = 0;
    this.timesSeen = 0;
    this.coinPings = [];
    this.alertFlash = 0;
    this.message = '';
    this.messageTtl = 0;
    const start = findTiles('P')[0];
    this.player = new Player(start.x, start.y);
    this.cores = findTiles('1')
      .concat(findTiles('2'), findTiles('3'))
      .map((t) => ({ x: t.x, y: t.y, taken: false, bob: this.rng() * 6 }));
    this.guards = GUARDS.map((def) => new Guard(def));
    this.cameras = CAMERAS.map((c) => ({
      x: (c.tile[0] + 0.5) * TILE,
      y: (c.tile[1] + 0.5) * TILE,
      baseAngle: c.baseAngle,
      sweep: c.sweep,
      period: c.period,
      phase: this.rng() * 6,
      detection: 0,
    }));
    this.screen = SCREEN_TITLE;
  }

  get totalCores() {
    return this.cores.length;
  }

  /** Highest detection across guards and cameras, 0..1. */
  get maxDetection() {
    let max = 0;
    for (const g of this.guards) max = Math.max(max, g.detection);
    for (const c of this.cameras) max = Math.max(max, c.detection);
    return max;
  }

  get anyAlert() {
    return this.guards.some((g) => g.state === GUARD_ALERT);
  }

  start() {
    this.reset();
    this.screen = SCREEN_PLAY;
    this.showMessage('Steal all three cores, then reach the green exit.');
  }

  showMessage(text, ttl = 4) {
    this.message = text;
    this.messageTtl = ttl;
  }

  onSpotted(guard) {
    this.timesSpotted += 1;
    this.alertFlash = 1;
    this.sound.alarm();
    this.showMessage(`${guard.name} spotted you — break line of sight!`, 3);
  }

  update(dt, input) {
    if (this.screen !== SCREEN_PLAY) return;
    this.time += dt;
    this.alertFlash = Math.max(0, this.alertFlash - dt * 1.5);
    if (this.messageTtl > 0) this.messageTtl -= dt;

    // --- global keys ---
    if (input.wasPressed('p') || input.wasPressed('escape')) {
      this.screen = SCREEN_PAUSED;
      input.clearPressed();
      return;
    }
    if (input.wasPressed('m')) {
      const muted = this.sound.toggleMute();
      this.showMessage(muted ? 'Sound off.' : 'Sound on.', 1.5);
    }

    this.player.update(dt, input);
    if (this.player.moving) this.sound.step(this.player.running);

    // --- coin toss: click throws a coin, guards come to listen ---
    const click = input.takeClick();
    if (click && this.player.coins > 0) {
      const landing = this.player.tossCoin(click.x, click.y);
      if (landing) {
        this.coinPings.push({ x: landing.x, y: landing.y, ttl: 1.2 });
        this.sound.coin();
        for (const g of this.guards) g.hearNoise(landing.x, landing.y);
      }
    } else if (click) {
      this.showMessage('Out of coins.', 1.5);
    }
    for (const ping of this.coinPings) ping.ttl -= dt;
    this.coinPings = this.coinPings.filter((p) => p.ttl > 0);

    // --- noise: running is heard through walls nearby ---
    const noise = this.player.noiseRadius;
    if (noise > 0) {
      for (const g of this.guards) {
        if (g.distTo(this.player.x, this.player.y) < noise + 60) {
          g.hearNoise(this.player.x, this.player.y);
        }
      }
    }

    // --- guards ---
    for (const g of this.guards) {
      g.update(dt, this.player, (guard) => this.onSpotted(guard));
      if (g.caughtPlayer) {
        this.screen = SCREEN_CAUGHT;
        this.sound.caught();
        return;
      }
    }

    // --- cameras: sweep, watch, and raise the alarm ---
    for (const c of this.cameras) {
      const angle = c.baseAngle + Math.sin((this.time + c.phase) / c.period * Math.PI * 2) * c.sweep;
      c.angle = angle;
      const seen = visibility(c.x, c.y, angle, VISION.cameraRange, VISION.cameraHalfAngle, this.player);
      if (seen > 0) {
        c.detection = Math.min(1, c.detection + seen * VISION.fillRate * 0.8 * dt);
        if (c.detection >= 1) {
          // A camera that fills up alerts the nearest guard to the spot.
          c.detection = 0.4;
          let nearest = null;
          let best = Infinity;
          for (const g of this.guards) {
            const d = g.distTo(this.player.x, this.player.y);
            if (d < best) {
              best = d;
              nearest = g;
            }
          }
          if (nearest) {
            nearest.lastSeen = { x: this.player.x, y: this.player.y };
            nearest.state = GUARD_ALERT;
            this.onSpotted(nearest);
          }
        }
      } else {
        c.detection = Math.max(0, c.detection - VISION.decayRate * dt);
      }
    }

    // --- cores: press E near one to take it ---
    for (const core of this.cores) {
      if (core.taken) continue;
      const d = Math.hypot(core.x - this.player.x, core.y - this.player.y);
      core.near = d < 34;
      if (core.near && input.wasPressed('e')) {
        core.taken = true;
        this.coresTaken += 1;
        this.sound.pickup();
        if (this.coresTaken === this.totalCores) {
          this.exitOpen = true;
          this.sound.door();
          this.showMessage('All cores stolen — the exit is open. Run!', 4);
        } else {
          this.showMessage(`Core ${this.coresTaken} of ${this.totalCores} stolen.`, 2.5);
        }
      }
    }

    // --- exit: step onto it with every core to win ---
    const col = Math.floor(this.player.x / TILE);
    const row = Math.floor(this.player.y / TILE);
    if (isExit(col, row)) {
      if (this.exitOpen) {
        this.screen = SCREEN_WIN;
        this.bestTime = this.time;
        this.sound.win();
      } else if (!this.message || this.messageTtl <= 0) {
        this.showMessage(`The exit is locked — ${this.totalCores - this.coresTaken} core(s) left.`, 2);
      }
    }

    // --- a guard that walks into the player catches them ---
    for (const g of this.guards) {
      if (g.distTo(this.player.x, this.player.y) < 18 && !this.player.hidden) {
        this.screen = SCREEN_CAUGHT;
        this.sound.caught();
        return;
      }
    }
  }

  /** Ghost rating for the win screen: never spotted is best. */
  rating() {
    if (this.timesSpotted === 0) return 'GHOST — never spotted';
    if (this.timesSpotted === 1) return 'SHADOW — spotted once';
    return 'LOUD — spotted ' + this.timesSpotted + ' times';
  }

  static formatTime(t) {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }
}
