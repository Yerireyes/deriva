import { TRACKS } from '../data/tracks.js';

/* Secuenciador sobre Web Audio. Programa las notas con un pequeño
 * adelanto para que el ritmo no dependa del framerate. */
export class Music {
  constructor(audio) {
    this.audio = audio;
    this.name = null; this.track = null; this.step = 0; this.nextTime = 0;
    this.gain = null; this.noise = null; this.duck = 1;
    this.cache = {};
    setInterval(() => this.pump(), 25);
  }
  static midi(token) {
    const m = /^([A-G])(#?)(-?\d)$/.exec(token);
    if (!m) return null;
    return { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0) + (parseInt(m[3], 10) + 1) * 12;
  }
  /* Convierte el texto de una pista en arrays de notas (una sola vez). */
  compile(name) {
    if (this.cache[name]) return this.cache[name];
    const src = TRACKS[name];
    const voices = src.voices.map(v => Object.assign({}, v, { seq: v.notes.join(' ').split(/\s+/).map(Music.midi) }));
    const drums = {};
    Object.keys(src.drums).forEach(k => { drums[k] = src.drums[k].split(/\s+/).map(c => c === 'x'); });
    const steps = Math.max(...voices.map(v => v.seq.length));
    return (this.cache[name] = { bpm: src.bpm, steps, voices, drums });
  }
  context() {
    const ctx = this.audio.ctx;
    if (!ctx) return null;
    if (!this.gain) {
      this.gain = ctx.createGain(); this.gain.gain.value = 0; this.gain.connect(ctx.destination);
      this.noise = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    return ctx;
  }
  level() { const s = this.audio.settings; return this.track && !s.muted ? s.musicVolume * this.duck : 0; }
  fadeTo(value, seconds) {
    const ctx = this.context();
    if (!ctx) return;
    const g = this.gain.gain, now = ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(value, now + Math.max(0.02, seconds));
  }
  play(name) {
    if (this.name === name) return;
    this.name = name; this.track = this.compile(name); this.step = 0; this.nextTime = 0;
    this.fadeTo(this.level(), 0.6);
  }
  stop(fade) { this.name = null; this.track = null; this.fadeTo(0, fade || 0.5); }
  setDuck(d) { this.duck = d; this.refresh(); }
  refresh() { if (this.track) this.fadeTo(this.level(), 0.2); }      // tras cambiar volumen o silencio

  pump() {
    const ctx = this.context();
    if (!ctx || !this.track || ctx.state !== 'running') return;
    if (this.gain.gain.value === 0 && this.level() > 0) this.fadeTo(this.level(), 0.6);   // la pista se pidió antes de tener audio
    const stepDur = 60 / this.track.bpm / 4;
    if (this.nextTime < ctx.currentTime) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < ctx.currentTime + 0.2) {
      this.schedule(ctx, this.step, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step = (this.step + 1) % this.track.steps;
    }
  }
  schedule(ctx, step, time, stepDur) {
    const tr = this.track;
    tr.voices.forEach(v => {
      const midi = v.seq[step % v.seq.length];
      if (midi === null) return;
      const o = ctx.createOscillator(), g = ctx.createGain(), dur = v.len * stepDur;
      o.type = v.wave;
      o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
      g.gain.setValueAtTime(0.0001, time);
      g.gain.linearRampToValueAtTime(v.gain, time + (v.attack || 0.008));
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      o.connect(g);
      if (v.cutoff) {
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = v.cutoff;
        g.connect(f); f.connect(this.gain);
      } else g.connect(this.gain);
      o.start(time); o.stop(time + dur + 0.03);
    });
    const hit = k => tr.drums[k] && tr.drums[k][step % tr.drums[k].length];
    if (hit('kick')) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(130, time); o.frequency.exponentialRampToValueAtTime(42, time + 0.12);
      g.gain.setValueAtTime(0.5, time); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
      o.connect(g); g.connect(this.gain); o.start(time); o.stop(time + 0.2);
    }
    if (hit('hat')) this.noiseHit(ctx, time, 'highpass', 7000, 0.1, 0.04);
    if (hit('snare')) this.noiseHit(ctx, time, 'bandpass', 1800, 0.28, 0.13);
  }
  noiseHit(ctx, time, type, freq, vol, dur) {
    const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    n.buffer = this.noise; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, time); g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    n.connect(f); f.connect(g); g.connect(this.gain);
    n.start(time); n.stop(time + dur + 0.02);
  }
}
