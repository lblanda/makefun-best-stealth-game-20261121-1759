// Night Vault — boot: canvas, game loop, screen keys and the
// ?shot= scenes used for the entry's screenshots.
import { VIEW_H, VIEW_W } from './config.js';
import { Game, SCREEN_CAUGHT, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './game.js';
import { Input } from './input.js';
import { Renderer } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const game = new Game();
const input = new Input(canvas);
const renderer = new Renderer(canvas);

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  // Screenshot mode: stage the named scene and render one frame.
  // The canvas is left showing that frame for the screenshot tool.
  stageShot(shot, game);
  renderer.draw(game);
  document.title = `Night Vault — shot ${shot}`;
} else {
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (game.screen === SCREEN_TITLE) {
      if (input.wasPressed('enter') || input.takeClick()) {
        game.sound.unlock();
        game.start();
      }
      // Let the hall patrol behind the title.
      game.update(0, input);
      renderer.draw(game);
    } else if (game.screen === SCREEN_PLAY) {
      game.sound.unlock();
      game.update(dt, input);
      renderer.draw(game);
    } else if (game.screen === SCREEN_PAUSED) {
      if (input.wasPressed('p') || input.wasPressed('escape')) {
        game.screen = SCREEN_PLAY;
        input.clearPressed();
      }
      renderer.draw(game);
    } else if (game.screen === SCREEN_WIN || game.screen === SCREEN_CAUGHT) {
      if (input.wasPressed('enter')) {
        game.start();
      }
      renderer.draw(game);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
