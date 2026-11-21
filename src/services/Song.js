/* Reproduce una canción grabada (mp3) con bucle parcial: suena de corrido y,
 * al llegar al final, vuelve a `loopStart` sin cortes. Se puede pausar y
 * resincronizar con el reloj del juego. Si el archivo no carga, `ready()`
 * devuelve false y el juego usa la pista sintetizada. */
export class Song {
  constructor(audio, files, loopStart, fade) {
    this.audio = audio;
    this.files = files;                 // { variante: ruta }
    this.loopStart = loopStart;
    this.fade = fade || null;           // { from, to, floor }: el volumen sube entre esos segundos del archivo
    this.buffers = {}; this.loading = {};
    this.available = {};                // variante → true si su archivo existe (ver probe)
    this.src = null; this.gain = null; this.variant = null;
    this.startedAt = 0; this.offset = 0;
    this.playing = false; this.pausedAt = null; this.duck = 1;
  }
  /* En el HTML empaquetado los mp3 viajan en base64 dentro de window.DERIVA_ASSETS. */
  async bytes(variant) {
    const embedded = window.DERIVA_ASSETS && window.DERIVA_ASSETS[variant];
    if (embedded) {
      const bin = atob(embedded), out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out.buffer;
    }
    const res = await fetch(this.files[variant]);
    if (!res.ok) throw new Error('No se pudo cargar ' + this.files[variant]);
    return res.arrayBuffer();
  }
  /* Comprueba qué mp3 existen sin descargarlos. La versión pública no los incluye
   * (la canción tiene copyright), así que allí solo queda la pista sintetizada. */
  probe() {
    return Promise.all(Object.entries(this.files).map(([variant, path]) => {
      if (window.DERIVA_ASSETS && window.DERIVA_ASSETS[variant]) return (this.available[variant] = true);
      return fetch(path, { method: 'HEAD' })
        .then(res => { this.available[variant] = res.ok; })
        .catch(() => { this.available[variant] = false; });
    }));
  }
  load(variant) {
    const ctx = this.audio.ctx;
    if (!ctx || !this.files[variant] || this.buffers[variant]) return Promise.resolve();
    if (!this.loading[variant]) {
      this.loading[variant] = this.bytes(variant)
        .then(data => ctx.decodeAudioData(data))
        .then(buffer => { this.buffers[variant] = buffer; })
        .catch(err => { console.warn('[DERIVA] canción no disponible:', err.message); delete this.loading[variant]; });
    }
    return this.loading[variant];
  }
  ready(variant) { return !!this.buffers[variant]; }
  level() { const s = this.audio.settings; return s.muted ? 0 : s.musicVolume * this.duck * Song.GAIN; }

  play(variant, at) {
    const ctx = this.audio.ctx, buffer = this.buffers[variant];
    if (!ctx || !buffer) return false;
    this.halt();
    this.gain = ctx.createGain();
    this.gain.connect(ctx.destination);
    this.applyVolume(at);
    this.src = ctx.createBufferSource();
    this.src.buffer = buffer;
    this.src.loop = true; this.src.loopStart = this.loopStart; this.src.loopEnd = buffer.duration;
    this.src.connect(this.gain);
    this.src.start(0, at);
    this.variant = variant; this.offset = at; this.startedAt = ctx.currentTime;
    this.playing = true; this.pausedAt = null;
    return true;
  }
  /* Fracción de volumen (0..1) que toca en el segundo `pos` del archivo. Curva suave:
   * empieza casi inaudible y solo llega al máximo justo en el drop. */
  envelope(pos) {
    const f = this.fade;
    if (!f || pos >= f.to) return 1;
    const k = Math.max(0, (pos - f.from) / (f.to - f.from));
    return f.floor + (1 - f.floor) * k * k;
  }
  /* Fija el volumen actual y programa la subida que quede hasta el final del fundido. */
  applyVolume(pos) {
    const ctx = this.audio.ctx, g = this.gain.gain, now = ctx.currentTime, level = this.level();
    g.cancelScheduledValues(now);
    g.setValueAtTime(level * this.envelope(pos), now);
    if (this.fade && pos < this.fade.to) {
      const left = this.fade.to - pos, steps = 24;
      for (let i = 1; i <= steps; i++) g.linearRampToValueAtTime(level * this.envelope(pos + left * i / steps), now + left * i / steps);
    }
  }
  /* Convierte segundos "lineales" en posición real dentro del archivo (con el bucle). */
  wrap(sec) {
    const end = this.buffers[this.variant].duration;
    return sec < end ? sec : this.loopStart + (sec - this.loopStart) % (end - this.loopStart);
  }
  position() { return this.wrap(this.offset + this.audio.ctx.currentTime - this.startedAt); }
  halt() {
    if (this.src) { try { this.src.stop(); } catch (e) { /* ya parada */ } this.src.disconnect(); this.src = null; }
    this.playing = false;
  }
  stop(fade) {
    if (!this.playing) { this.pausedAt = null; return; }
    const ctx = this.audio.ctx, now = ctx.currentTime, f = fade || 0.3;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value, now);
    this.gain.gain.linearRampToValueAtTime(0, now + f);
    try { this.src.stop(now + f + 0.05); } catch (e) { /* ya parada */ }
    this.src = null; this.playing = false; this.pausedAt = null;
  }
  pause() { if (this.playing) { const at = this.position(); this.halt(); this.pausedAt = at; } }
  resume() { if (this.pausedAt !== null) this.play(this.variant, this.pausedAt); }
  /* Si el juego se ha retrasado respecto al audio (un tirón, otra pestaña), lo realinea. */
  sync(expectedSec) {
    if (!this.playing) return;
    const want = this.wrap(expectedSec);
    if (Math.abs(this.position() - want) > 0.12) this.play(this.variant, want);
  }
  refresh() { if (this.playing) this.applyVolume(this.position()); }
  setDuck(d) { this.duck = d; this.refresh(); }
}
Song.GAIN = 0.55;      // la grabación viene mucho más alta que las pistas sintetizadas
