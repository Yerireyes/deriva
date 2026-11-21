import { Art } from '../art/Art.js';
import { SlamAttack, JabAttack, BeamAttack } from './attacks.js';
import { BEAT, HARD_SCRIPT, HARD_SCRIPT_BEATS, HARD_COMBOS } from './script.js';
import { InkBlob, RushWall } from './projectiles.js';
import { W, H, TAU } from '../core/constants.js';
import { rand, pick, clamp } from '../core/utils.js';
import { Shockwave } from '../entities/effects.js';
import { Coin, Powerup } from '../entities/pickups.js';

/* El Kraken. Guion del combate (this.mode):
 *   fight   → fase 1: barra de vida, se le daña con el sonar en el nódulo
 *   falling → cae "derrotado" (falsa victoria)
 *   calm    → calma: botín, silencio… y algo se mueve
 *   rising  → vuelve a emerger
 *   frenzy  → fase 2: sin barra de vida, ataques encadenados; hay que sobrevivir
 *   fleeing → se agota; aparece la salida y la nave huye
 * `this.cfg` viene de la dificultad (data/difficulty.js). Con cfg.script la fase 2
 * no es aleatoria: sigue el guion de boss/script.js, sincronizado con la canción. */
export class Kraken {
  constructor(run, opts) {
    this.run = run;
    this.cfg = run.level.bossCfg;
    this.maxHp = this.cfg.hp; this.hp = this.maxHp;
    this.T = this.cfg.script                              // duraciones de cada modo, en frames
      ? { falling: 150, calm: Kraken.BUILD_AT + Kraken.BUILD - 110, rising: 110, frenzy: Math.round(HARD_SCRIPT_BEATS * BEAT) }
      : Kraken.T;
    this.scriptAt = 0; this.songT = null; this.tired = false; this.lane = 2;
    this.comboT = 0; this.comboAt = 0; this.comboWait = 130;    // fase 1 de difícil: combo en curso
    run.speed = this.cfg.scroll[0];
    if (this.cfg.hitInvuln) run.level.mods.hitInvuln = this.cfg.hitInvuln;
    this.x = W - 54; this.baseY = H / 2; this.y = this.baseY;
    this.t = 0; this.enter = 100; this.hurt = 0; this.sink = 0;
    this.attacks = []; this.queue = [];
    this.timer = 130; this.sinceSlam = 0;
    this.mode = 'fight'; this.modeT = 0;
    this.nextPattern = 0; this.lastZone = ''; this.lastAimed = ''; this.turn = 0;
    if (opts && opts.phase2) {                       // punto de control: reintentar desde la fase 2
      this.hp = 0; this.enter = 0; this.sink = Kraken.DEPTH;
      this.setMode('calm'); this.modeT = this.T.calm - 150;
    }
  }
  get enraged() { return this.hp <= this.maxHp * this.cfg.enrageAt; }
  tele(frames) { return Math.round(frames * this.cfg.tele); }
  get inPhase2() { return this.mode === 'rising' || this.mode === 'frenzy'; }
  later(delay, fn) { this.queue.push({ at: this.t + delay, fn }); }
  setMode(mode) { this.mode = mode; this.modeT = 0; }

  update() {
    const run = this.run, T = this.T;
    this.t++; this.modeT++;
    if (this.songT !== null && ++this.songT % 90 === 0) run.game.song.sync(Kraken.SONG_START + this.songT / 60);
    if (this.enter > 0) this.enter--;
    if (this.hurt > 0) this.hurt--;
    const bob = this.mode === 'frenzy' ? 0.07 : 0.03;
    this.y = this.baseY + (run.reduceMotion ? 0 : Math.sin(this.t * bob) * 16);

    switch (this.mode) {
      case 'fight':
        this.runAttacks();
        if (run.phase === 'playing') {
          const busy = this.attacks.some(a => a.blocking) || this.queue.length > 0 || run.hazards.some(h => h instanceof RushWall);
          if (this.cfg.script) this.runCombo();
          else if (!busy && --this.timer <= 0) { this.launch(); this.timer = Math.round(this.timer * this.cfg.pace); }
          if (this.cfg.punish) {                         // difícil: no te deja acercarte tranquilo al nódulo
            const open = this.attacks.find(a => a.state === 'exposed' && !a.punished);
            if (open) { open.punished = true; this.later(34, () => this.attacks.push(new JabAttack(this, run.player.y, 30))); }
          }
        }
        break;

      case 'falling':
        this.sink = Math.min(Kraken.DEPTH, this.sink + 1.8);
        if (this.modeT % 7 === 0) this.explode();
        if (this.modeT >= T.falling) { this.setMode('calm'); this.dropLoot(); }
        break;

      case 'calm':
        if (this.cfg.script && this.modeT === Kraken.BUILD_AT) { this.songT = 0; run.game.bossCue('build'); }   // entra la canción
        if (this.cfg.script && (this.modeT === Kraken.BUILD_AT + 200 || this.modeT === Kraken.BUILD_AT + 340)) { run.shake(24, 2); run.audio.rumble(0.25); }
        if (this.modeT === T.calm - 140) { run.shake(30, 2); run.audio.rumble(0.2); }
        if (this.modeT === T.calm - 60) { run.shake(60, 5); run.audio.rumble(0.7); }
        if (this.modeT >= T.calm) {
          this.setMode('rising');
          run.speed = this.cfg.scroll[1];                // empieza la huida
          run.shake(T.rising, 8); run.audio.rumble(1);
          if (!this.cfg.script) run.game.bossCue('drop');
        }
        break;

      case 'rising':
        this.sink = Kraken.DEPTH * (1 - this.modeT / T.rising) ** 2;
        if (this.modeT >= T.rising) {
          this.sink = 0; this.setMode('frenzy'); this.nextPattern = 40; this.lanesFired = false;
          if (this.cfg.script) { run.game.bossCue('drop'); run.shake(20, 8); }      // justo en el drop
        }
        break;

      case 'frenzy':
        this.runAttacks();
        if (run.phase !== 'playing') break;
        if (this.cfg.script) { this.runScript(); break; }
        if (this.modeT >= T.frenzy) { this.flee(); break; }
        if (this.modeT === 1 || this.modeT === T.frenzy / 2) run.pickups.push(new Powerup(W + 40, rand(120, H - 120), 'shield'));   // un respiro
        if (this.modeT >= this.nextPattern && this.modeT < T.frenzy - 150) this.nextFrenzyPattern();
        break;

      case 'fleeing':
        this.sink += 1.6;
        if (this.sink < Kraken.DEPTH && this.modeT % 6 === 0) this.explode();
        break;
    }
  }

  /* Difícil, fase 1: cada punto de vida tiene su combo fijo, que termina dejando el
   * nódulo expuesto. Si no lo dañas, el mismo combo vuelve a empezar: se aprende a base de repetirlo. */
  get combo() { return HARD_COMBOS[Math.min(this.maxHp - this.hp, HARD_COMBOS.length - 1)]; }
  runCombo() {
    if (this.comboWait > 0) { this.comboWait--; return; }
    const steps = this.combo.steps;
    this.comboT++;
    while (this.comboAt < steps.length && steps[this.comboAt][0] <= this.comboT) steps[this.comboAt++][1](this);
    const idle = !this.attacks.length && !this.queue.length && !this.run.hazards.some(h => h instanceof RushWall);
    if (this.comboAt >= steps.length && idle) this.resetCombo(50);
  }
  resetCombo(wait) { this.comboT = 0; this.comboAt = 0; this.comboWait = wait; this.run.pull = 0; }

  /* Difícil: ejecuta las entradas del guion cuyo tiempo ya llegó. */
  runScript() {
    const beat = (this.modeT - 1) / BEAT;
    while (this.scriptAt < HARD_SCRIPT.length && HARD_SCRIPT[this.scriptAt][0] <= beat) HARD_SCRIPT[this.scriptAt++][1](this);
    if (beat >= HARD_SCRIPT_BEATS) this.flee();
  }

  /* Avanza ataques y colas; compartido por la fase 1 y la fase 2. */
  runAttacks() {
    const run = this.run;
    for (let i = this.queue.length - 1; i >= 0; i--) {
      if (this.queue[i].at <= this.t) { const q = this.queue.splice(i, 1)[0]; q.fn(); }
    }
    this.attacks.forEach(a => a.update(run));
    this.attacks.forEach(a => { if (a.checkPings) a.checkPings(run); });
    this.attacks = this.attacks.filter(a => !a.done);
    if (run.phase === 'playing' && this.attacks.some(a => a.hits(run.player))) run.damage();
  }
  clearAttacks() {
    this.attacks = []; this.queue = [];
    this.run.hazards.forEach(h => { h.dead = true; this.run.burst(h.x, h.y, h.color, 4); });
  }
  explode() {
    this.run.burst(this.x + rand(-50, 40), this.y + this.sink + rand(-60, 60), pick(['224,80,122', '255,210,74', '255,255,255']), 10);
  }

  /* ---------- fase 1 ---------- */
  launch() {
    const e = this.enraged;
    const table = e ? [['slam', 0.34], ['jab', 0.24], ['ink', 0.2], ['rush', 0.22]] : [['slam', 0.38], ['jab', 0.27], ['ink', 0.2], ['rush', 0.15]];
    let kind = 'slam';
    if (this.sinceSlam < 2) {
      let roll = Math.random();
      for (const [k, w] of table) { if ((roll -= w) <= 0) { kind = k; break; } }
    }
    this.sinceSlam = kind === 'slam' ? 0 : this.sinceSlam + 1;
    this[kind](e);
  }
  slam(e) {
    const side = this.run.player.y < H / 2 ? 'top' : 'bottom';      // ataca donde está la nave
    if (e && Math.random() < 0.45) {
      const other = side === 'top' ? 'bottom' : 'top';
      this.attacks.push(new SlamAttack(this, side, H * rand(0.26, 0.32), 80, true, this.tele(54)));
      this.attacks.push(new SlamAttack(this, other, H * rand(0.24, 0.3), 80, false, this.tele(54)));
    } else {
      this.attacks.push(new SlamAttack(this, side, H * rand(0.3, 0.46), e ? 80 : 60, true, this.tele(54)));
    }
    if (e) this.later(110, () => this.spit(3));
    this.timer = e ? 40 : 65;
  }
  jab(e) {
    this.attacks.push(new JabAttack(this, this.run.player.y, this.tele(e ? 34 : 44)));
    if (e) this.later(40, () => this.attacks.push(new JabAttack(this, this.run.player.y, this.tele(30))));
    this.timer = e ? 35 : 50;
  }
  ink(e) {
    this.run.audio.beep(110, 0.25, 0.06, 'game', 'square');
    this.later(26, () => this.spit(e ? 5 : 3));
    this.timer = e ? 80 : 105;
  }
  /* Barrida: `count` muros rápidos seguidos. Devuelve cuántos frames dura. */
  rush(e, count, speed) {
    const n = count || (e ? 6 : 4), v = speed || (e ? 7.4 : 6.2), every = 27;
    let gy = clamp(this.run.player.y + rand(-60, 60), 80, H - 80);
    for (let i = 0; i < n; i++) {
      this.run.hazards.push(new RushWall(W + 40 + i * every * v, gy, v));
      gy = clamp(gy + pick([-1, 1]) * rand(55, 100), 66, H - 66);
    }
    this.run.audio.beep(70, 0.5, 0.08, 'game', 'sawtooth');
    this.timer = 30;
    return Math.round((W + 40) / v + n * every);
  }
  spit(n) {
    const run = this.run, p = run.player;
    if (run.phase !== 'playing') return;
    const ox = this.x - 36, oy = this.y + 30;
    const base = Math.atan2(p.y - oy, p.x - ox), speed = this.enraged ? 4.1 : 3.5;
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * 0.2;
      run.hazards.push(new InkBlob(ox, oy, Math.cos(a) * speed, Math.sin(a) * speed));
    }
    run.burst(ox, oy, '192,123,255', 8);
    run.audio.beep(180, 0.2, 0.06, 'game', 'square');
  }

  takeHit(at) {
    const run = this.run;
    this.hp--; this.hurt = 30;
    run.fx.push(new Shockwave(at.x, at.y));
    run.burst(at.x, at.y, '255,210,74', 18);
    run.shake(14, 7);
    run.audio.chord([180, 90], 0.35, 0.09);
    run.addCoins(Math.round(5 * run.level.coinMult));
    if (this.hp <= 0) this.fakeDeath();
    else if (this.cfg.script) { this.clearAttacks(); this.resetCombo(80); }
  }

  /* ---------- transición ---------- */
  fakeDeath() {
    const run = this.run;
    this.clearAttacks();
    this.setMode('falling');
    run.shake(50, 8);
    run.audio.chord([160, 320, 640], 0.6, 0.09);
    run.music.stop(2.5);
  }
  dropLoot() {
    const run = this.run;
    for (let i = 0; i < 10; i++) run.pickups.push(new Coin(430 + i * 28, H / 2 + Math.sin(i * 0.7) * 70, i % 5 === 4));
    run.pickups.push(new Powerup(600, H / 2, 'heal'));
  }

  /* ---------- piezas del guion de difícil (boss/script.js) ---------- */
  beam(y, telegraph, half) { this.attacks.push(new BeamAttack(y, telegraph, half)); }
  setPull(dir) {
    this.run.pull = dir * 0.22;
    if (dir) this.run.audio.beep(dir > 0 ? 140 : 260, 0.3, 0.06, 'game', 'triangle');
  }
  gift(type) { this.run.pickups.push(new Powerup(W + 40, rand(120, H - 120), type)); }
  rest(on) { this.tired = on; }
  /* Pasillo continuo de muros finos cuyo hueco sigue una onda. Empieza a la altura de la nave. */
  tunnel(beats, amp, period, gap, speed) {
    const every = 8, n = Math.floor(beats * BEAT / every);
    const phase = Math.asin(clamp((this.run.player.y - H / 2) / amp, -1, 1));
    for (let i = 0; i < n; i++) {
      const y = H / 2 + amp * Math.sin(phase + i * every / period * TAU);
      this.later(i * every, () => this.run.hazards.push(new RushWall(W + 40, y, speed, gap)));
    }
    this.run.audio.beep(70, 0.5, 0.08, 'game', 'sawtooth');
  }
  /* Cinco carriles: arden todos menos uno. Sin argumento, el carril seguro empieza donde
   * está la nave y se desplaza uno al azar cada vez; con argumento, es el carril indicado. */
  lanes(fixed, telegraph) {
    if (fixed !== undefined) this.lane = fixed;
    else if (!this.lanesFired) this.lane = clamp(Math.floor(this.run.player.y / 88), 0, 4);
    else {
      const step = pick([-1, 1]);
      this.lane = this.lane + step < 0 || this.lane + step > 4 ? this.lane - step : this.lane + step;
    }
    this.lanesFired = true;
    for (let i = 0; i < 5; i++) if (i !== this.lane) this.beam(44 + i * 88, telegraph || Math.round(BEAT * 2), 44);
  }
  /* Golpe de tentáculo con parámetros fijos (para combos). `weak` deja el nódulo al retirarse. */
  strike(side, coverage, hold, weak, telegraph) { this.attacks.push(new SlamAttack(this, side, H * coverage, hold, weak, telegraph)); }
  /* Estocada a una altura fija, o a la de la nave si no se indica. */
  stab(y, telegraph) { this.attacks.push(new JabAttack(this, y === undefined ? this.run.player.y : y, telegraph || 34)); }
  /* Barrida con los huecos en alturas fijas. */
  rushFixed(gaps, speed) {
    gaps.forEach((gy, i) => this.run.hazards.push(new RushWall(W + 40 + i * 27 * speed, gy, speed)));
    this.run.audio.beep(70, 0.5, 0.08, 'game', 'sawtooth');
  }
  /* Barrido: golpes que alternan de lado y cubren media pantalla cada uno. */
  sweepN(n, every, telegraph) {
    let side = this.run.player.y < H / 2 ? 'top' : 'bottom';
    for (let i = 0; i < n; i++) {
      const s = side;
      this.later(i * every, () => this.strike(s, 0.5, 26, false, telegraph));
      side = side === 'top' ? 'bottom' : 'top';
    }
  }

  /* ---------- fase 2: frenesí ---------- */
  /* Alterna un patrón "de zona" (limita dónde puedes estar) con uno
   * "apuntado" (te persigue) que empieza antes de que acabe el anterior. */
  nextFrenzyPattern() {
    const zone = ['rushStorm', 'pincer', 'sweep'].filter(k => k !== this.lastZone);
    const aimed = ['barrage', 'inkStorm'].filter(k => k !== this.lastAimed);
    const urgency = this.modeT / this.T.frenzy;                    // 0 → 1: cada vez menos respiro
    let name, overlap = 1;
    if (this.turn++ % 2 === 0) { name = this.lastZone = pick(zone); overlap = Kraken.OVERLAP[name]; }
    else name = this.lastAimed = pick(aimed);
    const dur = this[name]();
    this.nextPattern = this.modeT + Math.round(dur * overlap + 34 - urgency * 22);
  }
  rushStorm() { return this.rush(true, 6, 7.6); }
  pincer(hold) {
    this.attacks.push(new SlamAttack(this, 'top', H * 0.27, hold || 110, false, 40));
    this.attacks.push(new SlamAttack(this, 'bottom', H * 0.27, hold || 110, false, 40));
    [100, 150].forEach(d => this.later(d, () => this.spit(3)));
    return 215;
  }
  sweep() {
    let side = this.run.player.y < H / 2 ? 'top' : 'bottom';
    for (let i = 0; i < 3; i++) {
      const s = side;
      this.later(i * 78, () => this.attacks.push(new SlamAttack(this, s, H * 0.5, 30, false, 40)));
      side = side === 'top' ? 'bottom' : 'top';
    }
    return 3 * 78 + 60;
  }
  barrage() {
    for (let i = 0; i < 4; i++) this.later(i * 38, () => this.attacks.push(new JabAttack(this, this.run.player.y, 34)));
    return 4 * 38 + 50;
  }
  inkStorm() {
    for (let i = 0; i < 3; i++) this.later(i * 46, () => this.spit(5));
    this.later(80, () => this.attacks.push(new JabAttack(this, this.run.player.y, 30)));
    return 200;
  }
  flee() {
    const run = this.run;
    this.clearAttacks();
    this.setMode('fleeing');
    run.phase = 'finishing'; run.gate = { x: W + 50 };
    run.pull = 0; this.tired = false; this.songT = null;
    run.shake(40, 6);
    run.game.bossCue('stop');
    run.audio.chord([160, 320, 640], 0.8, 0.09);
  }

  /* ---------- lo que la interfaz necesita saber ---------- */
  hud() {
    const name = this.run.level.name, T = this.T;
    switch (this.mode) {
      case 'fight': return { label: `${name} — ${this.hp}/${this.maxHp} HP`, pct: this.hp / this.maxHp, color: 'var(--danger)' };
      case 'falling': case 'calm': return { label: `${name} — 0/${this.maxHp} HP`, pct: 0, color: 'var(--danger)' };
      case 'rising': return { label: '— ? ? ? —', pct: this.t % 8 < 4 ? 1 : 0.4, color: 'var(--danger)' };
      case 'frenzy':
        if (this.cfg.script) return { label: 'SOBREVIVE', pct: 0.8 + Math.sin(this.t * 0.2) * 0.2, color: 'var(--danger)' };   // sin cuenta atrás
        return { label: `SOBREVIVE — ${Math.ceil((T.frenzy - this.modeT) / 60)} s`, pct: this.modeT / T.frenzy, color: 'var(--warning)' };
      default: return { label: '¡HUYE!', pct: 1, color: 'var(--sonar)' };
    }
  }
  /* Rótulo dramático del momento (o null). */
  drama() {
    const T = this.T, m = this.modeT, t = this.t;
    const stir = this.cfg.script ? m > Kraken.BUILD_AT + 60 : m > T.calm - 130;
    const fade = (a, b, len) => clamp(Math.min((m - a) / len, (b - m) / len), 0, 1);
    if (this.mode === 'fight' && this.cfg.script && this.enter === 0 && (this.comboWait > 0 || this.comboT < 50)) {
      const n = this.maxHp - this.hp;
      return { text: `${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][n] || ''} · ${this.combo.name}`, color: '#ff8a70', size: 13, alpha: 0.85, y: 96 };
    }
    if (this.mode === 'falling') return { text: 'AMENAZA NEUTRALIZADA', color: '#eafff5', glow: 'rgba(79,217,180,0.85)', size: 20, alpha: fade(30, T.falling + 40, 25) };
    if (this.mode === 'calm') {
      if (m < 130) return { text: 'AMENAZA NEUTRALIZADA', color: '#eafff5', glow: 'rgba(79,217,180,0.85)', size: 20, alpha: clamp((130 - m) / 30, 0, 1) };
      if (stir) return { text: 'SONAR: MOVIMIENTO EN EL FONDO', color: '#e8a33d', size: 11, alpha: t % 20 < 12 ? 0.9 : 0.25 };
      return null;
    }
    if (this.mode === 'rising') return { text: 'NO HA TERMINADO', color: '#ff8a70', glow: 'rgba(220,60,40,0.9)', size: 22, alpha: fade(0, T.rising + 20, 15), jitter: 3 };
    if (this.mode === 'frenzy' && m < 110) return { text: '¡SOBREVIVE!', color: '#ffd24a', glow: 'rgba(220,60,40,0.9)', size: 26, alpha: fade(0, 110, 15), jitter: 2 };
    if (this.tired) return { text: '. . .', color: '#b9cbd1', size: 18, alpha: 0.8 };
    if (this.mode === 'fleeing' && this.run.phase === 'finishing') return { text: '¡HUYE!', color: '#eafff5', glow: 'rgba(79,217,180,0.85)', size: 26, alpha: 1 };
    return null;
  }
  /* 0..1: cuánto se tiñe de rojo la pantalla. */
  menace() {
    const T = this.T;
    if (this.mode === 'rising') return 0.6 + 0.4 * this.modeT / T.rising;
    if (this.mode === 'frenzy') return this.tired ? 0.3 : 0.75 + Math.sin(this.t * 0.16) * 0.25;
    if (this.mode === 'calm' && this.cfg.script && this.modeT > Kraken.BUILD_AT) return 0.6 * (this.modeT - Kraken.BUILD_AT) / (T.calm - Kraken.BUILD_AT);
    if (this.mode === 'calm' && this.modeT > T.calm - 60) return (this.modeT - T.calm + 60) / 150;
    return 0;
  }
  resultLine() {
    if (this.inPhase2 && this.cfg.script) return 'El Kraken sigue ahí<br><b>No has sobrevivido</b>';       // sin pistas de cuánto falta
    if (this.inPhase2) return `Resististe<br><b>${Math.floor(this.mode === 'frenzy' ? this.modeT / 60 : 0)} de ${this.T.frenzy / 60} s</b>`;
    return `Al Kraken le quedaban<br><b>${Math.max(0, this.hp)}/${this.maxHp} HP</b>`;
  }

  draw(ctx, run) {
    this.attacks.forEach(a => a.draw(ctx, run));          // los tentáculos salen de detrás del cuerpo
    const slide = this.enter > 0 ? (this.enter / 100) ** 2 * 160 : 0;
    const shaky = this.hurt > 0 || this.mode === 'falling' || this.mode === 'rising' || this.mode === 'fleeing';
    const x = this.x + slide + (shaky ? rand(-3, 3) : 0), y = this.y + this.sink + (this.tired ? 46 : 0);
    if (y > H + 90) return;
    (this.enraged && !this.tired ? Art.krakenAngry : Art.kraken).draw(ctx, x, y);
    if (this.hurt > 0 && this.hurt % 6 < 3) Art.krakenFlash.draw(ctx, x, y, { alpha: 0.7 });
  }
}
Kraken.DEPTH = 340;                                       // cuánto se hunde fuera de pantalla
Kraken.T = { falling: 150, calm: 400, rising: 110, frenzy: 1800 };   // duraciones en frames (60 = 1 s)
Kraken.BUILD_AT = 180;      // difícil: frames de silencio antes de que entre la canción
Kraken.BUILD = 600;         // difícil: la canción suena 10 s antes de que reaparezca
Kraken.SONG_START = 10;     // segundo de la canción en el que se empieza (el drop está en el 20)
Kraken.OVERLAP = { rushStorm: 1, pincer: 0.75, sweep: 1 };          // fracción tras la que entra el patrón apuntado
