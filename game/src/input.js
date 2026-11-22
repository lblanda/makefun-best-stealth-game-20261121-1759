// Night Vault — keyboard and mouse state. WASD or arrows to move,
// Shift to run, C or Control to sneak, E to take a core, click to
// toss a coin, P or Escape to pause, M to mute.
export class Input {
  constructor(canvas) {
    this.left = false;
    this.right = false;
    this.up = false;
    this.down = false;
    this.run = false;
    this.sneak = false;
    this.pressed = new Set(); // keys pressed since last read
    this.click = null; // {x, y} in canvas pixels, consumed by the game
    this.canvas = canvas;
    this.onKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      this.pressed.add(e.key.toLowerCase());
      this.updateKey(e.key.toLowerCase(), true);
    };
    this.onKeyUp = (e) => {
      this.updateKey(e.key.toLowerCase(), false);
    };
    this.onMouseDown = (e) => {
      const rect = canvas.getBoundingClientRect();
      this.click = {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height),
      };
    };
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    canvas.addEventListener('mousedown', this.onMouseDown);
  }

  updateKey(key, down) {
    if (key === 'a' || key === 'arrowleft') this.left = down;
    if (key === 'd' || key === 'arrowright') this.right = down;
    if (key === 'w' || key === 'arrowup') this.up = down;
    if (key === 's' || key === 'arrowdown') this.down = down;
    if (key === 'shift') this.run = down;
    if (key === 'c' || key === 'control') this.sneak = down;
  }

  /** True once for a key pressed since the last call. */
  wasPressed(key) {
    const hit = this.pressed.has(key);
    if (hit) this.pressed.delete(key);
    return hit;
  }

  /** Consume the pending click, if any. */
  takeClick() {
    const click = this.click;
    this.click = null;
    return click;
  }

  clearPressed() {
    this.pressed.clear();
  }
}
