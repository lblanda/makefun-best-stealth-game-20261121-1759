// Night Vault — sound, all synthesized with WebAudio: no audio
// files, nothing fetched. Footsteps, coin, pickup, alarm and a low
// night-time drone. Starts on the first user gesture.
export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.drone = null;
    this.lastStep = 0;
  }

  /** Create the audio context on first gesture; safe to call often. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      this.startDrone();
    } catch {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.drone) this.drone.gain.value = this.muted ? 0 : 0.05;
    return this.muted;
  }

  startDrone() {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 55;
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 55.7;
    const gain = ctx.createGain();
    gain.gain.value = this.muted ? 0 : 0.05;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc2.start();
    lfo.start();
    this.drone = { gain };
  }

  /** A short filtered noise burst, used for footsteps. */
  step(running) {
    if (!this.ctx || this.muted) return;
    const now = performance.now();
    if (now - this.lastStep < (running ? 240 : 380)) return;
    this.lastStep = now;
    const ctx = this.ctx;
    const dur = 0.07;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = running ? 900 : 500;
    const gain = ctx.createGain();
    gain.gain.value = running ? 0.16 : 0.08;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  }

  /** A pure tone blip, with a quick decay. */
  blip(freq, dur, vol, type = 'sine') {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  coin() {
    this.blip(1568, 0.12, 0.12, 'triangle');
    setTimeout(() => this.blip(2093, 0.16, 0.1, 'triangle'), 70);
  }

  pickup() {
    this.blip(523, 0.1, 0.14);
    setTimeout(() => this.blip(784, 0.14, 0.14), 80);
    setTimeout(() => this.blip(1047, 0.2, 0.12), 160);
  }

  alarm() {
    this.blip(220, 0.35, 0.18, 'sawtooth');
    setTimeout(() => this.blip(311, 0.35, 0.18, 'sawtooth'), 160);
  }

  caught() {
    this.blip(196, 0.5, 0.2, 'sawtooth');
    setTimeout(() => this.blip(147, 0.7, 0.2, 'sawtooth'), 220);
  }

  win() {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this.blip(f, 0.3, 0.13), i * 110);
    });
  }

  door() {
    this.blip(98, 0.4, 0.15, 'triangle');
    setTimeout(() => this.blip(147, 0.5, 0.12, 'triangle'), 180);
  }
}
