// Night Vault — the museum floor: tile lookup, collision and
// line-of-sight. The map is a grid of characters from config.js.
import { COLS, MAP, ROWS, TILE } from './config.js';

export function tileAt(col, row) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return '#';
  return MAP[row][col];
}

export function isWallTile(col, row) {
  return tileAt(col, row) === '#';
}

/** Crates block movement and sight; walls do too. */
export function blocksSight(col, row) {
  const t = tileAt(col, row);
  return t === '#' || t === 'C';
}

/** Walls and crates block movement; hedges do not. */
export function blocksMovement(col, row) {
  const t = tileAt(col, row);
  return t === '#' || t === 'C';
}

export function isHedge(col, row) {
  return tileAt(col, row) === 'H';
}

export function isExit(col, row) {
  return tileAt(col, row) === 'D';
}

/** Find every tile holding `ch` and return their pixel centres. */
export function findTiles(ch) {
  const out = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (MAP[row][col] === ch) {
        out.push({ col, row, x: (col + 0.5) * TILE, y: (row + 0.5) * TILE });
      }
    }
  }
  return out;
}

/**
 * True when a circle of `radius` at (x, y) overlaps no solid tile.
 * The circle is tested against the tiles its bounding box touches.
 */
export function circleFits(x, y, radius) {
  const left = Math.floor((x - radius) / TILE);
  const right = Math.floor((x + radius) / TILE);
  const top = Math.floor((y - radius) / TILE);
  const bottom = Math.floor((y + radius) / TILE);
  for (let row = top; row <= bottom; row += 1) {
    for (let col = left; col <= right; col += 1) {
      if (!blocksMovement(col, row)) continue;
      const cx = Math.max(col * TILE, Math.min(x, (col + 1) * TILE));
      const cy = Math.max(row * TILE, Math.min(y, (row + 1) * TILE));
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy < radius * radius) return false;
    }
  }
  return true;
}

/**
 * Line of sight between two points: sample along the segment and
 * fail when a sample lands inside a sight-blocking tile. Short
 * enough to stay cheap at 60 frames a second.
 */
export function hasLineOfSight(x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const col = Math.floor((x0 + dx * t) / TILE);
    const row = Math.floor((y0 + dy * t) / TILE);
    if (blocksSight(col, row)) return false;
  }
  return true;
}

/** Angle from (x0, y0) to (x1, y1), in radians. */
export function angleTo(x0, y0, x1, y1) {
  return Math.atan2(y1 - y0, x1 - x0);
}

/** Smallest absolute difference between two angles, in radians. */
export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}
