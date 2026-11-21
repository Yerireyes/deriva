/* Ataques de tentáculo del Kraken (con estado propio: aviso → golpe → retirada). */
import { Art } from '../art/Art.js';
import { W, H, TAU } from '../core/constants.js';
import { rand, clamp, snap } from '../core/utils.js';

/* Dibuja un tentáculo horizontal que cubre una franja desde un borde. */
export function drawTentacleBand(ctx, side, coverage, t, still) {
  if (coverage < 2) return;
  for (let x = 0; x < W; x += 4) {
    const wav = still ? 0 : Math.sin(x * 0.05 + t * 0.07) * 5;
    const e = Math.max(4, snap(coverage + wav));
    const y0 = side === 'top' ? 0 : H - e;
    ctx.fillStyle = (x >> 2) % 8 < 2 ? '#3a0e26' : '#5a1836';
    ctx.fillRect(x, y0, 4, e);
    ctx.fillStyle = '#e0507a';
    ctx.fillRect(x, side === 'top' ? e - 2 : H - e, 4, 2);
  }
  for (let x = 24; x < W; x += 46) {
    const wav = still ? 0 : Math.sin(x * 0.05 + t * 0.07) * 5;
    const e = coverage + wav;
    if (e > 22) Art.sucker.draw(ctx, x, side === 'top' ? e - 12 : H - e + 12);
  }
}

/* Golpe de tentáculo: avisa, cubre una franja, se retira y deja un
 * nódulo vulnerable. El sonar lo daña si se lanza desde cerca. */
export class SlamAttack {
  constructor(boss, side, coverage, hold, withWeak, telegraph) {
    this.boss = boss; this.side = side; this.max = coverage; this.hold = hold; this.withWeak = withWeak;
    this.state = 'telegraph'; this.timer = telegraph || SlamAttack.T.telegraph; this.coverage = 0;
    this.blocking = true; this.done = false; this.weak = null; this.exposedAt = 0;
  }
  update(run) {
    const T = SlamAttack.T;
    this.timer--;
    if (this.state === 'extend') this.coverage = this.max * (1 - Math.max(0, this.timer) / T.extend);
    if (this.state === 'retract') this.coverage = this.max * Math.max(0, this.timer) / T.retract;
    if (this.timer > 0) return;
    if (this.state === 'telegraph') { this.state = 'extend'; this.timer = T.extend; run.audio.beep(90, 0.3, 0.07, 'game', 'sawtooth'); }
    else if (this.state === 'extend') { this.state = 'hold'; this.timer = this.hold; run.shake(8, 4); }
    else if (this.state === 'hold') { this.state = 'retract'; this.timer = T.retract; }
    else if (this.state === 'retract') {
      if (!this.withWeak) { this.done = true; return; }
      this.state = 'exposed'; this.timer = this.boss.cfg.exposed; this.exposedAt = run.tick;
      this.weak = { x: rand(190, 300), y: this.side === 'top' ? 46 : H - 46 };
      run.audio.beep(660, 0.15, 0.05);
    }
    else if (this.state === 'exposed') this.done = true;
  }
  hits(p) {
    if (this.state !== 'extend' && this.state !== 'hold') return false;
    const edge = this.coverage - 6;
    return this.side === 'top' ? p.y - p.r < edge : p.y + p.r > H - edge;
  }
  inRange(p) { return this.weak && Math.hypot(p.x - this.weak.x, p.y - this.weak.y) <= SlamAttack.RANGE; }
  /* Un pulso emitido durante la exposición, desde dentro del alcance, daña al llegar. */
  checkPings(run) {
    if (this.state !== 'exposed') return;
    for (const p of run.pings) {
      if (p.born < this.exposedAt) continue;
      const d = Math.hypot(p.x - this.weak.x, p.y - this.weak.y);
      if (d <= SlamAttack.RANGE && p.r >= d) { this.done = true; this.boss.takeHit(this.weak); return; }
    }
  }
  draw(ctx, run) {
    const t = run.tick;
    if (this.state === 'telegraph') {
      const y0 = this.side === 'top' ? 0 : H - this.max;
      const flash = 0.25 + Math.abs(Math.sin(t / 6)) * 0.5;
      ctx.fillStyle = `rgba(255,90,70,${flash * 0.16})`;
      ctx.fillRect(0, y0, W, this.max);
      ctx.fillStyle = `rgba(255,120,90,${flash})`;
      const ey = this.side === 'top' ? this.max - 2 : H - this.max;
      for (let x = (t * 2) % 24 - 24; x < W; x += 24) ctx.fillRect(x, ey, 14, 4);
      return;
    }
    if (this.state === 'exposed') {
      const w = this.weak, top = this.side === 'top';
      const near = this.inRange(run.player);
      ctx.fillStyle = '#e0507a'; ctx.fillRect(snap(w.x) - 8, top ? 0 : w.y, 16, top ? w.y : H - w.y);
      ctx.fillStyle = '#5a1836'; ctx.fillRect(snap(w.x) - 6, top ? 0 : w.y, 12, top ? w.y : H - w.y);
      const pulse = run.reduceMotion ? 0 : Math.sin(t / 5) * 3;
      ctx.strokeStyle = near ? 'rgba(150,255,190,0.95)' : 'rgba(255,200,160,0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(w.x, w.y, 20 + pulse, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,210,74,0.9)';
      ctx.beginPath(); ctx.arc(w.x, w.y, 28, -Math.PI / 2, -Math.PI / 2 + this.timer / this.boss.cfg.exposed * TAU); ctx.stroke();
      Art.weak.draw(ctx, w.x, w.y);
      run.label(w.x, top ? w.y + 46 : w.y - 46, near ? '¡SONAR AHORA!' : 'ACÉRCATE', near ? '#96ffbe' : '#ffc8a0');
      return;
    }
    drawTentacleBand(ctx, this.side, this.coverage, t, run.reduceMotion);
  }
}
SlamAttack.T = { telegraph: 54, extend: 34, retract: 30 };
SlamAttack.RANGE = 250;

/* Estocada: un tentáculo cruza la pantalla a la altura donde estaba la nave. */
export class JabAttack {
  constructor(boss, y, telegraph) {
    this.boss = boss; this.y = clamp(y, 30, H - 30);
    this.state = 'telegraph'; this.timer = telegraph; this.tip = W;
    this.blocking = true; this.done = false;
  }
  update(run) {
    const T = JabAttack.T;
    this.timer--;
    if (this.state === 'extend') this.tip = -30 + (W + 30) * Math.max(0, this.timer) / T.extend;
    if (this.state === 'retract') this.tip = -30 + (W + 60) * (1 - Math.max(0, this.timer) / T.retract);
    if (this.timer > 0) return;
    if (this.state === 'telegraph') { this.state = 'extend'; this.timer = T.extend; run.audio.beep(220, 0.18, 0.07, 'game', 'sawtooth'); }
    else if (this.state === 'extend') { this.state = 'hold'; this.timer = T.hold; this.tip = -30; }
    else if (this.state === 'hold') { this.state = 'retract'; this.timer = T.retract; }
    else this.done = true;
  }
  hits(p) {
    if (this.state !== 'extend' && this.state !== 'hold') return false;
    return this.tip <= p.x + p.r && Math.abs(p.y - this.y) < JabAttack.HALF - 4 + p.r * 0.7;
  }
  draw(ctx, run) {
    const t = run.tick, HALF = JabAttack.HALF;
    if (this.state === 'telegraph') {
      const flash = 0.3 + Math.abs(Math.sin(t / 4)) * 0.6;
      ctx.fillStyle = `rgba(255,90,70,${flash * 0.14})`;
      ctx.fillRect(0, this.y - HALF, W, HALF * 2);
      ctx.fillStyle = `rgba(255,120,90,${flash})`;
      for (let x = W - (t * 6) % 28; x > -14; x -= 28) {
        ctx.fillRect(x, snap(this.y - HALF), 12, 2);
        ctx.fillRect(x, snap(this.y + HALF) - 2, 12, 2);
      }
      for (let i = 0; i < 5; i++) ctx.fillRect(W - 60 + i * 4, snap(this.y) - i * 4 - 2, 4, i * 8 + 4);   // flecha ◄
      return;
    }
    for (let x = Math.max(0, snap(this.tip)); x < W; x += 4) {
      const d = x - this.tip;
      const th = snap(Math.min(HALF - 2, 4 + d * 0.16));
      const yc = snap(this.y + (run.reduceMotion ? 0 : Math.sin(x * 0.035 + t * 0.3) * 3));
      ctx.fillStyle = '#ff6a8a'; ctx.fillRect(x, yc - th - 2, 4, th * 2 + 4);
      ctx.fillStyle = d < 16 ? '#b04070' : ((x >> 2) % 8 < 2 ? '#3a0e26' : '#6a1e40');
      ctx.fillRect(x, yc - th, 4, th * 2);
    }
    for (let x = snap(this.tip) + 70; x < W; x += 46) Art.sucker.draw(ctx, x, this.y + 6);
  }
}
JabAttack.T = { extend: 14, hold: 16, retract: 22 };
JabAttack.HALF = 20;

/* Rayo abisal: una franja horizontal que se carga y dispara al instante.
 * No viaja como la estocada: o estás fuera de la franja cuando dispara, o te da. */
export class BeamAttack {
  constructor(y, telegraph, half) {
    this.y = clamp(y, 24, H - 24); this.half = half || 22;
    this.tele = telegraph; this.timer = telegraph; this.state = 'telegraph';
    this.blocking = false; this.done = false;
  }
  update(run) {
    if (--this.timer > 0) return;
    if (this.state === 'telegraph') {
      this.state = 'fire'; this.timer = BeamAttack.FIRE;
      run.shake(5, 3);
      run.audio.beep(920, 0.1, 0.04, 'game', 'sawtooth');
    } else this.done = true;
  }
  hits(p) { return this.state === 'fire' && Math.abs(p.y - this.y) < this.half - 3 + p.r * 0.7; }
  draw(ctx, run) {
    const top = snap(this.y - this.half), h = snap(this.half * 2);
    if (this.state === 'telegraph') {
      const k = 1 - this.timer / this.tele;                       // 0 → 1 mientras carga
      ctx.fillStyle = `rgba(125,252,255,${0.05 + k * 0.12})`;
      ctx.fillRect(0, top, W, h);
      ctx.fillStyle = `rgba(190,255,250,${0.35 + k * 0.5})`;
      for (let x = (run.tick * 3) % 20 - 20; x < W; x += 20) { ctx.fillRect(x, top, 10, 2); ctx.fillRect(x, top + h - 2, 10, 2); }
      const core = snap(this.half * 2 * k * 0.5);                  // la línea central engorda
      ctx.fillStyle = `rgba(255,255,255,${0.25 + k * 0.4})`;
      ctx.fillRect(0, snap(this.y) - core / 2, W, Math.max(2, core));
      return;
    }
    const fade = this.timer / BeamAttack.FIRE;
    ctx.fillStyle = `rgba(125,252,255,${0.55 * fade + 0.2})`;
    ctx.fillRect(0, top, W, h);
    ctx.fillStyle = `rgba(255,255,255,${0.6 + fade * 0.4})`;
    ctx.fillRect(0, top + 6, W, Math.max(2, h - 12));
  }
}
BeamAttack.FIRE = 9;
