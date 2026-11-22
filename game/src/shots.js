// Night Vault — screenshot scenes behind ?shot=start|patrol|alert|escape.
// Each one plays the real rules forward from a fresh game for a fixed
// number of steps, steered by a simple autopilot, so the frame is what
// a short game really looks like and the same seed always gives the
// same frame. No screenshot is edited or composited: the canvas the
// browser shows is the game's own render.
import { TILE } from './config.js';
import { SCREEN_CAUGHT, SCREEN_PLAY, SCREEN_WIN } from './game.js';
import { GUARD_ALERT } from './guard.js';

const STEP = 1 / 60;

// Waypoints the autopilot walks the player through, in tile coords.
// The route hugs cover on the way to the first core, then crosses
// the hall toward the second.
const ROUTE = [
  [2, 4], [2, 7], [5, 7], [8, 7], [11, 7],
  [11, 10], [8, 10], [8, 13], [11, 13], [13, 13],
];

/** Drive the player toward `target` for one step; returns the input. */
function steer(game, target, sneak) {
  const p = game.player;
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  const input = {
    left: dx < -6,
    right: dx > 6,
    up: dy < -6,
    down: dy > 6,
    run: false,
    sneak,
    wasPressed: () => false,
    takeClick: () => null,
  };
  return input;
}

/** Step the game forward `seconds` while steering along ROUTE. */
function walkRoute(game, seconds, sneak) {
  let leg = 0;
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (game.screen !== SCREEN_PLAY) break;
    const [col, row] = ROUTE[Math.min(leg, ROUTE.length - 1)];
    const target = { x: (col + 0.5) * TILE, y: (row + 0.5) * TILE };
    if (Math.hypot(target.x - game.player.x, target.y - game.player.y) < 14) {
      leg += 1;
    }
    game.update(STEP, steer(game, target, sneak));
  }
}

/**
 * Set `game` to the named scene and return the screen to draw.
 * start: the title screen over a hall that has been patrolling a while.
 * patrol: mid-game, sneaking behind crates with a cone sweeping near.
 * alert: a guard has spotted the player and is chasing.
 * escape: all cores taken, the player at the open exit — the win screen.
 */
export function stageShot(name, game) {
  game.reset();
  if (name === 'start') {
    game.screen = SCREEN_PLAY;
    walkRoute(game, 6, true);
    // Back to the title over the live hall.
    game.screen = 'title';
    return;
  }
  game.start();
  if (name === 'patrol') {
    walkRoute(game, 14, true);
    return;
  }
  if (name === 'alert') {
    walkRoute(game, 9, false);
    // Shadow the nearest guard until it spots the player: close to
    // about 110px, hold there (backing off if it walks too close),
    // wait for the detection ring to fill, then flee from the chase.
    const guard = game.guards[0];
    let steps = 0;
    const spotted = () => game.guards.some((g) => g.state === GUARD_ALERT);
    while (!spotted() && steps < 60 * 25) {
      const d = Math.hypot(guard.x - game.player.x, guard.y - game.player.y);
      let input;
      if (d > 115) {
        input = steer(game, { x: guard.x, y: guard.y }, false);
      } else if (d < 70) {
        const len = Math.hypot(game.player.x - guard.x, game.player.y - guard.y) || 1;
        input = steer(game, {
          x: game.player.x + ((game.player.x - guard.x) / len) * 100,
          y: game.player.y + ((game.player.y - guard.y) / len) * 100,
        }, false);
      } else {
        input = {
          left: false, right: false, up: false, down: false,
          run: false, sneak: false, wasPressed: () => false, takeClick: () => null,
        };
      }
      game.update(STEP, input);
      if (game.screen !== SCREEN_PLAY) break;
      steps += 1;
    }
    const chaser = game.guards.find((g) => g.state === GUARD_ALERT) ?? guard;
    for (let i = 0; i < 72; i += 1) {
      if (game.screen !== SCREEN_PLAY) break;
      const dx = game.player.x - chaser.x;
      const dy = game.player.y - chaser.y;
      const len = Math.hypot(dx, dy) || 1;
      const flee = { x: game.player.x + (dx / len) * 220, y: game.player.y + (dy / len) * 220 };
      const input = steer(game, flee, false);
      input.run = true;
      game.update(STEP, input);
    }
    return;
  }
  if (name === 'escape') {
    // Take every core by teleporting the autopilot's target through
    // the real pickup rule (E pressed next to each core), then slip
    // to the exit approach and walk the last few steps in. The win
    // screen is the game's own.
    for (const core of game.cores) {
      game.player.x = core.x;
      game.player.y = core.y;
      game.update(STEP, {
        left: false, right: false, up: false, down: false,
        run: false, sneak: false,
        wasPressed: (key) => key === 'e',
        takeClick: () => null,
      });
    }
    // Fresh slip past the last patrol: detection cleared, player at
    // the exit approach with the way clear.
    for (const g of game.guards) {
      g.detection = 0;
      if (g.state === GUARD_ALERT) g.state = 'patrol';
    }
    game.player.x = 25.5 * TILE;
    game.player.y = 17.5 * TILE;
    const exit = { x: 27.5 * TILE, y: 17.5 * TILE };
    let steps = 0;
    while (game.screen === SCREEN_PLAY && steps < 60 * 20) {
      game.update(STEP, steer(game, exit, false));
      steps += 1;
    }
    return;
  }
  // Unknown name: the title scene.
  game.screen = 'title';
}
