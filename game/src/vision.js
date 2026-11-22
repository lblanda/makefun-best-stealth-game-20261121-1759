// Night Vault — vision: whether a watcher (guard or camera) can see
// the player right now, and how fast that sight fills detection.
import { VISION } from './config.js';
import { angleDiff, angleTo, hasLineOfSight } from './level.js';

/**
 * Visibility of the player from a watcher at (wx, wy) facing
 * `facing`, with the given range and half-angle. Returns 0 when the
 * player cannot be seen, otherwise a 0..1 strength (1 at point
 * blank, fading with distance) before stance multipliers.
 */
export function visibility(wx, wy, facing, range, halfAngle, player) {
  const dx = player.x - wx;
  const dy = player.y - wy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return 0;
  if (dist > 14 && angleDiff(angleTo(wx, wy, player.x, player.y), facing) > halfAngle) return 0;
  if (!hasLineOfSight(wx, wy, player.x, player.y)) return 0;
  if (player.hidden) {
    // Inside a hedge the player is only spotted up close.
    if (dist > VISION.hedgeNear) return 0;
    return VISION.hedgeMultiplier * (1 - dist / range);
  }
  const near = 1 - dist / range;
  let strength = 0.25 + 0.75 * near;
  if (player.crouched) strength *= VISION.crouchMultiplier;
  if (player.running) strength *= VISION.runMultiplier;
  return Math.min(1.6, strength);
}

/** How much detection a visible player adds this frame. */
export function detectionGain(strength, dt) {
  return strength * VISION.fillRate * dt;
}
