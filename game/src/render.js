// Night Vault — all drawing: the museum floor, vision cones, guards,
// the player, HUD, minimap and the title / pause / end screens.
import { COLS, GAME_NAME, GAME_SUBTITLE, ROWS, TILE, VIEW_H, VIEW_W, VISION } from './config.js';
import { SCREEN_CAUGHT, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './game.js';
import { GUARD_ALERT, GUARD_SEARCH, GUARD_SUSPICIOUS } from './guard.js';
import { blocksSight, tileAt } from './level.js';

// Fixed lamps: warm pools of light on the floor.
const LAMPS = [
  [5, 3], [16, 2], [25, 4], [11, 8], [19, 9], [4, 13], [14, 14], [24, 15], [11, 18],
];

function hashTile(col, row) {
  let h = (col * 374761393 + row * 668265263) | 0;
  h = (h ^ (h >> 13)) | 0;
  return ((h * 1274126177) >>> 0) / 4294967296;
}

/** March a ray until a sight-blocking tile or the range; returns the hit distance. */
function castRay(x, y, angle, range) {
  const step = 6;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  for (let d = step; d <= range; d += step) {
    const col = Math.floor((x + dx * d) / TILE);
    const row = Math.floor((y + dy * d) / TILE);
    if (blocksSight(col, row)) return d;
  }
  return range;
}

/** Build a vision-cone polygon, clipped by walls, as [x, y] points. */
function conePolygon(x, y, facing, range, halfAngle) {
  const points = [[x, y]];
  const rays = 26;
  for (let i = 0; i <= rays; i += 1) {
    const a = facing - halfAngle + (2 * halfAngle * i) / rays;
    const d = castRay(x, y, a, range);
    points.push([x + Math.cos(a) * d, y + Math.sin(a) * d]);
  }
  return points;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  draw(game) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    this.drawFloor(ctx);
    this.drawLamps(ctx);
    this.drawWallsAndCover(ctx);
    this.drawExit(ctx, game);
    this.drawCores(ctx, game);
    this.drawCones(ctx, game);
    this.drawCoinPings(ctx, game);
    this.drawCameras(ctx, game);
    this.drawGuards(ctx, game);
    this.drawPlayer(ctx, game);
    this.drawVignette(ctx);
    this.drawHud(ctx, game);
    if (game.screen === SCREEN_TITLE) this.drawTitle(ctx, game);
    if (game.screen === SCREEN_PAUSED) this.drawPaused(ctx);
    if (game.screen === SCREEN_WIN) this.drawWin(ctx, game);
    if (game.screen === SCREEN_CAUGHT) this.drawCaught(ctx, game);
    if (game.alertFlash > 0) {
      ctx.fillStyle = `rgba(200, 30, 30, ${game.alertFlash * 0.18})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  drawFloor(ctx) {
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const t = tileAt(col, row);
        const x = col * TILE;
        const y = row * TILE;
        if (t === '#') continue; // walls drawn later, over the floor
        const v = hashTile(col, row);
        const shade = (col + row) % 2 === 0 ? 26 : 22;
        ctx.fillStyle = `rgb(${shade + v * 6}, ${shade + 4 + v * 6}, ${shade + 14 + v * 6})`;
        ctx.fillRect(x, y, TILE, TILE);
        if (t === 'H') {
          // Hedge: dark green tufts you can hide in.
          ctx.fillStyle = '#1d4d2b';
          ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
          ctx.fillStyle = '#2c6b3c';
          for (let i = 0; i < 5; i += 1) {
            const ox = 5 + hashTile(col * 3 + i, row) * 22;
            const oy = 5 + hashTile(col, row * 3 + i) * 22;
            ctx.beginPath();
            ctx.arc(x + ox, y + oy, 4.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  }

  drawLamps(ctx) {
    for (const [col, row] of LAMPS) {
      const x = (col + 0.5) * TILE;
      const y = (row + 0.5) * TILE;
      const grad = ctx.createRadialGradient(x, y, 4, x, y, 90);
      grad.addColorStop(0, 'rgba(255, 214, 130, 0.13)');
      grad.addColorStop(1, 'rgba(255, 214, 130, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x - 90, y - 90, 180, 180);
      ctx.fillStyle = '#ffd682';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawWallsAndCover(ctx) {
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const t = tileAt(col, row);
        const x = col * TILE;
        const y = row * TILE;
        if (t === '#') {
          ctx.fillStyle = '#3a4152';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#565f75';
          ctx.fillRect(x, y, TILE, 4);
          ctx.fillStyle = '#2b3040';
          ctx.fillRect(x, y + TILE - 3, TILE, 3);
        } else if (t === 'C') {
          ctx.fillStyle = '#6b4a26';
          ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
          ctx.strokeStyle = '#8a6238';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
          ctx.beginPath();
          ctx.moveTo(x + 4, y + 4);
          ctx.lineTo(x + TILE - 4, y + TILE - 4);
          ctx.moveTo(x + TILE - 4, y + 4);
          ctx.lineTo(x + 4, y + TILE - 4);
          ctx.stroke();
        }
      }
    }
  }

  drawExit(ctx, game) {
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        if (tileAt(col, row) !== 'D') continue;
        const x = col * TILE;
        const y = row * TILE;
        ctx.fillStyle = game.exitOpen ? '#1f9d55' : '#5c2626';
        ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
        ctx.fillStyle = game.exitOpen ? '#7dffb0' : '#c05a5a';
        ctx.font = 'bold 15px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(game.exitOpen ? 'EXIT' : 'LOCK', x + TILE / 2, y + TILE / 2);
      }
    }
  }

  drawCores(ctx, game) {
    for (const core of game.cores) {
      if (core.taken) continue;
      const bob = Math.sin(game.time * 2 + core.bob) * 3;
      const x = core.x;
      const y = core.y + bob;
      const glow = ctx.createRadialGradient(x, y, 2, x, y, 26);
      glow.addColorStop(0, 'rgba(64, 224, 255, 0.5)');
      glow.addColorStop(1, 'rgba(64, 224, 255, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - 26, y - 26, 52, 52);
      ctx.fillStyle = '#40e0ff';
      ctx.beginPath();
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x + 8, y);
      ctx.lineTo(x, y + 10);
      ctx.lineTo(x - 8, y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#d9fbff';
      ctx.beginPath();
      ctx.moveTo(x, y - 5);
      ctx.lineTo(x + 4, y);
      ctx.lineTo(x, y + 5);
      ctx.lineTo(x - 4, y);
      ctx.closePath();
      ctx.fill();
      if (core.near) {
        ctx.fillStyle = '#e8feff';
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('press E', x, y - 20);
      }
    }
  }

  drawCones(ctx, game) {
    for (const g of game.guards) {
      const alerted = g.state === GUARD_ALERT;
      const poly = conePolygon(g.x, g.y, g.facing, VISION.range, VISION.halfAngle);
      ctx.beginPath();
      ctx.moveTo(poly[0][0], poly[0][1]);
      for (let i = 1; i < poly.length; i += 1) ctx.lineTo(poly[i][0], poly[i][1]);
      ctx.closePath();
      const grad = ctx.createRadialGradient(g.x, g.y, 10, g.x, g.y, VISION.range);
      const base = alerted ? '255, 70, 60' : '255, 214, 90';
      grad.addColorStop(0, `rgba(${base}, ${alerted ? 0.4 : 0.3})`);
      grad.addColorStop(1, `rgba(${base}, 0.05)`);
      ctx.fillStyle = grad;
      ctx.fill();
    }
    for (const c of game.cameras) {
      const poly = conePolygon(c.x, c.y, c.angle ?? c.baseAngle, VISION.cameraRange, VISION.cameraHalfAngle);
      ctx.beginPath();
      ctx.moveTo(poly[0][0], poly[0][1]);
      for (let i = 1; i < poly.length; i += 1) ctx.lineTo(poly[i][0], poly[i][1]);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 90, 90, 0.16)';
      ctx.fill();
    }
  }

  drawCoinPings(ctx, game) {
    for (const ping of game.coinPings) {
      const r = (1 - ping.ttl / 1.2) * 42 + 6;
      ctx.strokeStyle = `rgba(255, 220, 120, ${ping.ttl})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ping.x, ping.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffd678';
      ctx.beginPath();
      ctx.arc(ping.x, ping.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawCameras(ctx, game) {
    for (const c of game.cameras) {
      ctx.fillStyle = '#20242e';
      ctx.fillRect(c.x - 8, c.y - 8, 16, 16);
      ctx.strokeStyle = '#8a93a8';
      ctx.lineWidth = 2;
      ctx.strokeRect(c.x - 8, c.y - 8, 16, 16);
      const a = c.angle ?? c.baseAngle;
      ctx.fillStyle = c.detection > 0.35 ? '#ff5a4a' : '#ff8a7a';
      ctx.beginPath();
      ctx.arc(c.x + Math.cos(a) * 8, c.y + Math.sin(a) * 8, 4, 0, Math.PI * 2);
      ctx.fill();
      if (c.detection > 0.05) {
        ctx.strokeStyle = '#ff5a4a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * c.detection);
        ctx.stroke();
      }
    }
  }

  drawGuards(ctx, game) {
    for (const g of game.guards) {
      // Body: amber uniform, dark outline, facing wedge.
      ctx.fillStyle = '#1c1f28';
      ctx.beginPath();
      ctx.arc(g.x, g.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = g.state === GUARD_ALERT ? '#ff5040' : '#f0a832';
      ctx.beginPath();
      ctx.arc(g.x, g.y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1c1f28';
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.arc(g.x, g.y, 11, g.facing - 0.5, g.facing + 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffe9b0';
      ctx.beginPath();
      ctx.arc(g.x + Math.cos(g.facing) * 5, g.y + Math.sin(g.facing) * 5, 3.5, 0, Math.PI * 2);
      ctx.fill();
      // State mark and detection ring.
      if (g.state === GUARD_SUSPICIOUS) {
        this.drawMark(ctx, g.x, g.y - 24, '?', '#ffd65a');
      } else if (g.state === GUARD_ALERT) {
        this.drawMark(ctx, g.x, g.y - 24, '!', '#ff5040');
      } else if (g.state === GUARD_SEARCH) {
        this.drawMark(ctx, g.x, g.y - 24, '…', '#c9d2e0');
      }
      if (g.detection > 0.05) {
        ctx.strokeStyle = g.detection >= 1 ? '#ff5040' : '#ffd65a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(g.x, g.y, 17, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * g.detection);
        ctx.stroke();
      }
    }
  }

  drawMark(ctx, x, y, text, color) {
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#10131a';
    ctx.fillText(text, x + 1, y + 1);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  drawPlayer(ctx, game) {
    const p = game.player;
    if (p.hidden) {
      ctx.globalAlpha = 0.55;
    }
    // Noise ring while running.
    if (p.noiseRadius > 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.noiseRadius * (0.85 + 0.15 * Math.sin(game.time * 6)), 0, Math.PI * 2);
      ctx.stroke();
    }
    const r = p.crouched ? 9 : 11;
    ctx.fillStyle = '#10131a';
    ctx.beginPath();
    ctx.arc(p.x, p.y, r + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.hidden ? '#3f7d4e' : '#2e6f8e';
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    // Hood point showing facing.
    ctx.fillStyle = '#bfe9ff';
    ctx.beginPath();
    ctx.moveTo(p.x + Math.cos(p.facing) * (r + 3), p.y + Math.sin(p.facing) * (r + 3));
    ctx.lineTo(p.x + Math.cos(p.facing + 2.5) * r * 0.7, p.y + Math.sin(p.facing + 2.5) * r * 0.7);
    ctx.lineTo(p.x + Math.cos(p.facing - 2.5) * r * 0.7, p.y + Math.sin(p.facing - 2.5) * r * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    if (p.hidden) {
      ctx.fillStyle = '#d8ffd8';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('hidden', p.x, p.y - 20);
    }
  }

  drawVignette(ctx) {
    const grad = ctx.createRadialGradient(
      VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.45,
      VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.95,
    );
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  drawHud(ctx, game) {
    if (game.screen !== SCREEN_PLAY) return;
    ctx.fillStyle = 'rgba(8, 10, 16, 0.72)';
    ctx.fillRect(0, 0, VIEW_W, 34);
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e8ecf4';
    ctx.fillText(`◆ ${game.coresTaken}/${game.totalCores} cores`, 12, 17);
    ctx.fillStyle = '#ffd678';
    ctx.fillText(`◉ ${game.player.coins} coins`, 150, 17);
    ctx.fillStyle = '#e8ecf4';
    ctx.fillText(`⏱ ${game.constructor.formatTime(game.time)}`, 280, 17);
    // Detection eye.
    const d = game.maxDetection;
    ctx.fillStyle = d > 0.66 ? '#ff5040' : d > 0.3 ? '#ffd65a' : '#8a93a8';
    ctx.fillText(d > 0.66 ? '◉ SEEN!' : d > 0.05 ? '◉ noticed…' : '◉ unseen', 400, 17);
    ctx.fillStyle = '#222836';
    ctx.fillRect(520, 10, 140, 14);
    ctx.fillStyle = d > 0.66 ? '#ff5040' : '#ffd65a';
    ctx.fillRect(520, 10, 140 * d, 14);
    ctx.fillStyle = '#e8ecf4';
    ctx.fillText(game.anyAlert ? '⚠ ALARM' : game.exitOpen ? '➜ EXIT OPEN' : 'sneak • C crouch • Shift run', 680, 17);
    if (game.messageTtl > 0) {
      ctx.fillStyle = 'rgba(8, 10, 16, 0.72)';
      const w = ctx.measureText(game.message).width + 24;
      ctx.fillRect((VIEW_W - w) / 2, VIEW_H - 44, w, 26);
      ctx.fillStyle = '#ffe9b0';
      ctx.textAlign = 'center';
      ctx.fillText(game.message, VIEW_W / 2, VIEW_H - 31);
      ctx.textAlign = 'left';
    }
    this.drawMinimap(ctx, game);
  }

  drawMinimap(ctx, game) {
    const scale = 4;
    const mw = COLS * scale;
    const mh = ROWS * scale;
    const ox = VIEW_W - mw - 10;
    const oy = 44;
    ctx.fillStyle = 'rgba(8, 10, 16, 0.72)';
    ctx.fillRect(ox - 4, oy - 4, mw + 8, mh + 8);
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const t = tileAt(col, row);
        if (t === '#') ctx.fillStyle = '#565f75';
        else if (t === 'C') ctx.fillStyle = '#6b4a26';
        else if (t === 'H') ctx.fillStyle = '#2c6b3c';
        else if (t === 'D') ctx.fillStyle = game.exitOpen ? '#1f9d55' : '#5c2626';
        else continue;
        ctx.fillRect(ox + col * scale, oy + row * scale, scale, scale);
      }
    }
    for (const core of game.cores) {
      if (core.taken) continue;
      ctx.fillStyle = '#40e0ff';
      ctx.fillRect(ox + (core.x / TILE) * scale - 2, oy + (core.y / TILE) * scale - 2, 4, 4);
    }
    for (const g of game.guards) {
      ctx.fillStyle = g.state === GUARD_ALERT ? '#ff5040' : '#f0a832';
      ctx.beginPath();
      ctx.arc(ox + (g.x / TILE) * scale, oy + (g.y / TILE) * scale, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#bfe9ff';
    ctx.beginPath();
    ctx.arc(ox + (game.player.x / TILE) * scale, oy + (game.player.y / TILE) * scale, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  drawTitle(ctx, game) {
    ctx.fillStyle = 'rgba(5, 7, 12, 0.82)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#40e0ff';
    ctx.font = 'bold 64px monospace';
    ctx.fillText(GAME_NAME, VIEW_W / 2, 170);
    ctx.fillStyle = '#e8ecf4';
    ctx.font = '20px monospace';
    ctx.fillText(GAME_SUBTITLE, VIEW_W / 2, 210);
    ctx.font = '16px monospace';
    ctx.fillStyle = '#c9d2e0';
    const lines = [
      'The museum sleeps. Three archive cores glow in the dark —',
      'steal them all, then slip out the green exit unseen.',
      '',
      'WASD / arrows — move      Shift — run (loud)',
      'C — sneak (slow, hard to see)      E — take a core',
      'Click — toss a coin to distract a guard      P — pause      M — mute',
      '',
      'Hedges hide you. Crates block sight. Cameras sweep the halls.',
      'A full detection ring means a chase — break line of sight!',
    ];
    lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 270 + i * 26));
    ctx.fillStyle = '#ffd65a';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('Press Enter or click to begin', VIEW_W / 2, 560);
    ctx.textAlign = 'left';
  }

  drawPaused(ctx) {
    ctx.fillStyle = 'rgba(5, 7, 12, 0.7)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8ecf4';
    ctx.font = 'bold 40px monospace';
    ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2 - 10);
    ctx.font = '16px monospace';
    ctx.fillText('Press P or Escape to keep sneaking', VIEW_W / 2, VIEW_H / 2 + 30);
    ctx.textAlign = 'left';
  }

  drawWin(ctx, game) {
    ctx.fillStyle = 'rgba(5, 20, 12, 0.85)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7dffb0';
    ctx.font = 'bold 48px monospace';
    ctx.fillText('CLEAN GETAWAY', VIEW_W / 2, 240);
    ctx.fillStyle = '#e8ecf4';
    ctx.font = '20px monospace';
    ctx.fillText(`All three cores stolen in ${game.constructor.formatTime(game.time)}`, VIEW_W / 2, 300);
    ctx.fillStyle = '#ffd65a';
    ctx.fillText(game.rating(), VIEW_W / 2, 340);
    ctx.fillStyle = '#c9d2e0';
    ctx.font = '16px monospace';
    ctx.fillText('Press Enter to play again', VIEW_W / 2, 400);
    ctx.textAlign = 'left';
  }

  drawCaught(ctx, game) {
    ctx.fillStyle = 'rgba(20, 5, 5, 0.85)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff6a5a';
    ctx.font = 'bold 48px monospace';
    ctx.fillText('CAUGHT', VIEW_W / 2, 240);
    ctx.fillStyle = '#e8ecf4';
    ctx.font = '20px monospace';
    ctx.fillText(`The wardens found you with ${game.coresTaken} of ${game.totalCores} cores.`, VIEW_W / 2, 300);
    ctx.fillStyle = '#c9d2e0';
    ctx.font = '16px monospace';
    ctx.fillText('Press Enter to try again — slower this time', VIEW_W / 2, 350);
    ctx.textAlign = 'left';
  }
}
