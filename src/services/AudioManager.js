/* Sonido sintetizado (Web Audio). Dos canales de volumen: juego e interfaz. */
export class AudioManager {
  constructor(settings) { this.settings = settings; this.ctx = null; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; }
  }
  _vol(vol, channel) {
    const s = this.settings;
    if (s.muted || !this.ctx) return 0;
    return vol * (channel === 'ui' ? s.uiVolume : s.sfxVolume);
  }
  beep(freq, dur, vol, channel, type) {
    this.init();
    const v = this._vol(vol, channel || 'game');
    if (v <= 0) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.value = v;
    o.connect(g); g.connect(this.ctx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    o.stop(now + dur);
  }
  chord(freqs, dur, vol) { freqs.forEach((f, i) => this.beep(f, dur, vol / (1 + i * 0.3))); }
  click() { this.beep(340, 0.08, 0.06, 'ui'); }
  deny() { this.beep(140, 0.12, 0.05, 'ui', 'square'); }
  /* Rugido grave del jefe. Para usar un audio real, sustituir el cuerpo. */
  rumble(intensity) {
    this.init();
    const vol = this._vol(0.05 + intensity * 0.06, 'game');
    if (vol <= 0) return;
    const now = this.ctx.currentTime;
    [42, 55, 68].forEach((f, i) => {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.frequency.value = f + (Math.random() - 0.5) * 4;
      g.gain.value = 0;
      o.connect(g); g.connect(this.ctx.destination);
      o.start(now);
      g.gain.linearRampToValueAtTime(vol / (i + 1), now + 0.18);
      g.gain.linearRampToValueAtTime(0, now + 1.1 + intensity * 0.6);
      o.stop(now + 1.3 + intensity * 0.6);
    });
  }
}
