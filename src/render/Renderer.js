import { Art } from '../art/Art.js';
import { W, H, PX, TAU } from '../core/constants.js';
import { rand, clamp, snap, makeCanvas } from '../core/utils.js';
import { POWERUPS } from '../data/powerups.js';

/* Todo el mundo se pinta en un búfer a media resolución y se amplía sin
 * suavizado: así sprites, anillos y partículas comparten la misma
 * rejilla de píxeles. El texto se pinta después, a resolución completa. */
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.buf = makeCanvas(W / PX, H / PX);
    this.b = this.buf.getContext('2d');
    this.b.imageSmoothingEnabled = false;
    this.snow = Array.from({ length: 46 }, () => ({ x: rand(0, W), y: rand(0, H), z: rand(0.25, 1) }));
    this.idle = 0;
  }
  static get FONT() { return 'ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace'; }

  draw(run, settings) {
    const b = this.b, ctx = this.ctx;
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.clearRect(0, 0, W / PX, H / PX);
    b.setTransform(1 / PX, 0, 0, 1 / PX, 0, 0);
    if (run) { run.labels = []; this.world(b, run); }
    else { this.idle += 0.6; this.background(b, this.idle, '23,48,63', 0.6); }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = false;
    let ox = 0, oy = 0;
    if (run && run.shakeT > 0 && !settings.reduceMotion) { ox = snap(rand(-1, 1) * run.shakeMag); oy = snap(rand(-1, 1) * run.shakeMag); }
    ctx.drawImage(this.buf, ox, oy, W, H);
    if (run) this.overlay(ctx, run, settings);
  }

  background(b, scroll, grid, dx) {
    b.fillStyle = `rgba(${grid},0.55)`;
    for (let x = -snap(scroll * 0.5) % 40; x < W; x += 40) b.fillRect(x, 0, PX, H);
    for (let y = 0; y < H; y += 40) b.fillRect(0, y, W, PX);
    this.snow.forEach(s => {
      s.x -= dx * s.z * 0.8;
      if (s.x < -4) { s.x = W + 4; s.y = rand(0, H); }
      b.fillStyle = `rgba(185,203,209,${s.z * 0.28})`;
      b.fillRect(snap(s.x), snap(s.y), PX, PX);
    });
  }

  world(b, run) {
    const paused = run.game.state !== 'playing';
    this.background(b, run.scroll, run.level.grid, paused ? 0 : run.scrollSpeed);
    run.zones.forEach(z => z.draw(b, run));
    if (run.gate) this.gate(b, run);
    if (run.boss) run.boss.draw(b, run);
    run.hazards.forEach(h => h.draw(b, run));
    run.pickups.forEach(p => p.draw(b, run));
    run.pings.forEach(p => p.draw(b));
    run.fx.forEach(f => f.draw(b));
    if (run.pull) this.current(b, run);
    this.player(b, run);
    this.effectsHud(b, run);
    this.ultimateHud(b, run);
  }

  gate(b, run) {
    const x = snap(run.gate.x), t = run.tick;
    b.fillStyle = 'rgba(125,252,255,0.14)';
    b.fillRect(x - 16, 0, 32, H);
    b.fillStyle = 'rgba(150,255,240,0.95)';
    for (let y = -(t * 2) % 16; y < H; y += 16) { b.fillRect(x - 12, y, 4, 10); b.fillRect(x + 8, y + 8, 4, 10); }
  }

  /* Corriente vertical: galones que se desplazan en el sentido del empuje. */
  current(b, run) {
    const dir = Math.sign(run.pull), off = (run.tick * 3) % 44;
    b.fillStyle = 'rgba(125,252,255,0.3)';
    for (let x = 30; x < W - 120; x += 86) {
      for (let y = -44; y < H + 44; y += 44) {
        const yy = snap(y + off * dir);
        for (let i = 0; i < 4; i++) { b.fillRect(x - i * 4 - 4, yy - i * 4 * dir, 4, 4); b.fillRect(x + i * 4, yy - i * 4 * dir, 4, 4); }
      }
    }
  }

  player(b, run) {
    if (run.phase === 'dying' || run.phase === 'over' && run.result === 'dead') return;
    const p = run.player;
    const blink = run.invuln > 0 && Math.floor(run.invuln / 5) % 2 === 0;
    p.sprite.draw(b, p.x, p.y, { alpha: blink ? 0.3 : 1, rot: run.reduceMotion ? 0 : clamp(p.vy * 0.045, -0.3, 0.3) });
    if (run.effects.shield > 0) {
      b.strokeStyle = 'rgba(111,184,255,0.85)'; b.lineWidth = 2;
      b.beginPath(); b.arc(p.x, p.y, 21, 0, TAU); b.stroke();
    }
    if (run.armor > 0) {
      b.strokeStyle = `rgba(255,210,74,${0.6 + Math.sin(run.tick / 3) * 0.3})`; b.lineWidth = 4;
      b.beginPath(); b.arc(p.x, p.y, 19, 0, TAU); b.stroke();
    }
    const pct = 1 - run.pingCooldown / run.stats.pingCooldown;       // recarga del sonar
    b.strokeStyle = run.pingCooldown > 0 ? 'rgba(232,163,61,0.7)' : 'rgba(79,217,180,0.9)';
    b.lineWidth = 2;
    b.beginPath(); b.arc(p.x, p.y, 26, -Math.PI / 2, -Math.PI / 2 + pct * TAU); b.stroke();
  }

  ring(b, x, y, r, pct, color) {
    b.lineWidth = 4;
    b.strokeStyle = 'rgba(23,48,63,0.9)';
    b.beginPath(); b.arc(x, y, r, 0, TAU); b.stroke();
    b.strokeStyle = color;
    b.beginPath(); b.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + pct * TAU); b.stroke();
  }
  effectsHud(b, run) {
    const active = Object.keys(run.effects).filter(k => run.effects[k] > 0);
    const x0 = W / 2 - (active.length - 1) * 24;
    active.forEach((k, i) => {
      const x = x0 + i * 48, y = 56;
      this.ring(b, x, y, 18, run.effects[k] / run.stats.powerDur[k], `rgb(${POWERUPS[k].color})`);
      Art.powerup[k].draw(b, x, y);
    });
  }
  ultimateHud(b, run) {
    const ready = run.ultCooldown <= 0;
    const pct = ready ? 1 : 1 - run.ultCooldown / run.stats.ultCooldown;
    const color = run.ultActive > 0 ? '#ffffff' : ready ? 'rgba(79,217,180,0.95)' : 'rgba(232,163,61,0.75)';
    this.ring(b, 40, H - 40, 20, pct, color);
  }

  /* Capa de texto y viñetas, a resolución completa. */
  overlay(ctx, run, settings) {
    const text = (str, x, y, size, color, glow, alpha) => {
      ctx.save();
      ctx.globalAlpha = clamp(alpha === undefined ? 1 : alpha, 0, 1);
      ctx.font = `bold ${size}px ${Renderer.FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 14; }
      ctx.fillStyle = color;
      ctx.fillText(str, x, y);
      ctx.restore();
    };
    if (run.ultActive > 0 && run.stats.ultId === 'vision') { ctx.fillStyle = 'rgba(79,217,180,0.06)'; ctx.fillRect(0, 0, W, H); }

    if (run.level.bossIntro && run.inRunway && run.phase === 'playing') {
      const k = 1 - (run.level.target - run.distance) / run.level.runway;
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.8);
      g.addColorStop(0, 'rgba(200,40,25,0)');
      g.addColorStop(1, `rgba(200,40,25,${0.05 + k * 0.24 + (run.shakeT > 0 ? 0.1 : 0)})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (run.bossWarning > 0) {
        const a = run.bossWarning > 90 ? (130 - run.bossWarning) / 40 : run.bossWarning / 40;
        text('ALGO INMENSO SE ACERCA', W / 2, 92, 15, '#ff8a70', 'rgba(220,60,40,0.85)', a);
      }
    }
    if (run.boss) {
      const menace = run.boss.menace();
      if (menace > 0) {
        const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.85);
        g.addColorStop(0, 'rgba(200,40,25,0)');
        g.addColorStop(1, `rgba(200,40,25,${clamp(menace, 0, 1) * 0.34})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      const d = run.boss.drama();
      if (d) {
        const j = d.jitter && !settings.reduceMotion ? d.jitter : 0;
        text(d.text, W / 2 + rand(-j, j), (d.y || H / 2 - 40) + rand(-j, j), d.size, d.color, d.glow, d.alpha);
      }
    }
    run.labels.forEach(l => text(l.text, l.x, l.y, 11, l.color, 'rgba(0,0,0,0.9)'));
    text(settings.ultimateKey.toUpperCase(), 40, H - 40, 12, run.ultCooldown <= 0 ? '#4fd9b4' : '#2a6b5c');

    if (run.pull && run.phase === 'playing') text(run.pull > 0 ? 'CORRIENTE ▼ MANTÉN ARRIBA PARA SUBIR' : 'CORRIENTE ▲ MANTÉN ABAJO PARA BAJAR', W / 2, run.pull > 0 ? 64 : H - 64, 10, '#7dfcff', null, 0.85);
    if (run.inThermal && run.phase === 'playing') text('INTERFERENCIA TÉRMICA · SONAR REDUCIDO', W / 2, H - 22, 10, '#e8a33d', null, 0.6 + Math.sin(run.tick / 8) * 0.3);

    if (run.banner > 0) {
      const a = Math.min(1, run.banner / 30, (150 - run.banner) / 20);
      text(run.level.name.toUpperCase(), W / 2, H / 2 - 40, 22, '#eafff5', 'rgba(79,217,180,0.8)', a);
      const sub = run.boss ? (run.boss.mode === 'fight' ? 'esquiva · espera el nódulo · sonar de cerca' : '…')
        : run.level.endless ? 'sin meta: llega lo más lejos posible'
        : (run.level.id === 1 ? 'ESPACIO lanza el sonar: solo ves lo que revela' : run.level.blurb);
      text(sub, W / 2, H / 2 - 14, 11, '#b9cbd1', null, a);
    }
    if (run.phase === 'celebrating') {
      const t = 1 - run.celebrateT / run.celebrateMax;
      const flash = Math.max(0, 0.35 - t) * 2.2;
      if (flash > 0 && !settings.reduceMotion) { ctx.fillStyle = `rgba(210,255,245,${flash})`; ctx.fillRect(0, 0, W, H); }
      const a = Math.min(1, t * 3) * Math.min(1, run.celebrateT / 16);
      text(run.boss ? 'HAS ESCAPADO' : 'ZONA SEGURA ALCANZADA', W / 2, H / 2 - 26, 20, '#eafff5', 'rgba(79,217,180,0.85)', a);
    }
  }
}
