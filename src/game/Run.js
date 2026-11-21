import { Kraken } from '../boss/Kraken.js';
import { W, PX, TAU } from '../core/constants.js';
import { rand, randInt } from '../core/utils.js';
import { BALANCE } from '../data/balance.js';
import { POWERUPS } from '../data/powerups.js';
import { Player } from '../entities/Player.js';
import { Ping, Shockwave, Particle } from '../entities/effects.js';
import { Spawner } from './Spawner.js';
import { Stats } from '../services/Stats.js';

/* Una inmersión: todo el estado de una partida en un nivel. */
export class Run {
  constructor(game, level, opts) {
    this.game = game; this.level = level; this.save = game.save; this.audio = game.audio; this.music = game.music;
    this.stats = Stats.compute(game.save);
    this.player = new Player(this.stats);
    this.hazards = []; this.pickups = []; this.zones = []; this.pings = []; this.fx = []; this.labels = [];
    this.tick = 0; this.distance = 0; this.scroll = 0; this.speed = level.speed.base;
    this.integrity = this.stats.maxIntegrity; this.runCoins = 0;
    this.effects = { shield: 0, radar: 0, slow: 0 };
    this.pingCooldown = 0; this.invuln = 0; this.armor = 0; this.ultActive = 0; this.ultCooldown = 0;
    this.phase = 'playing';        // playing | finishing | celebrating | dying | over
    this.gate = null; this.celebrateT = 0; this.celebrateMax = 1; this.dyingT = 0;
    this.shakeT = 0; this.shakeMag = 0;
    this.revealRadius = BALANCE.ping.reveal; this.inThermal = false;
    this.pull = 0;                 // corriente vertical (px/frame²)
    this.warned = false; this.bossWarning = 0; this.rumbleT = 0;
    this.banner = 150; this.result = null;
    this.spawner = new Spawner(this);
    this.boss = level.boss === 'kraken' ? new Kraken(this, opts) : null;
  }
  get reduceMotion() { return this.save.data.settings.reduceMotion; }
  get scrollSpeed() { return this.effects.slow > 0 ? this.speed * BALANCE.powerups.slow.factor : this.speed; }
  get inRunway() { return !!this.level.target && this.level.target - this.distance <= this.level.runway; }

  /* ---- acciones del jugador ---- */
  emitPing() {
    if (this.phase !== 'playing' || this.pingCooldown > 0) return;
    this.pings.push(new Ping(this.player.x, this.player.y, this.tick));
    this.pingCooldown = this.stats.pingCooldown;
    this.audio.beep(520, 0.35, 0.05);
  }
  activateUltimate() {
    if (this.phase !== 'playing' || this.ultCooldown > 0) return;
    if (!this.stats.ult.activate(this)) { this.audio.deny(); return; }
    this.ultCooldown = this.stats.ultCooldown;
    this.ultActive = this.stats.ultDuration;
  }

  /* ---- reglas ---- */
  /* Visibilidad (0..1) de un punto según sonar, radar y ultimate. */
  reveal(x, y) {
    let best = 0;
    if (this.ultActive > 0 && this.stats.ultId === 'vision') best = 0.9;
    const R = this.revealRadius;
    for (const p of this.pings) {
      const d = Math.hypot(x - p.x, y - p.y), ring = Math.abs(d - p.r);
      if (ring < R) best = Math.max(best, (1 - ring / R) * p.alpha);
      if (d < p.r) best = Math.max(best, p.alpha * 0.35 * Math.max(0, 1 - d / 500));
    }
    if (this.effects.radar > 0) {
      const d = Math.hypot(x - this.player.x, y - this.player.y), RR = BALANCE.powerups.radar.radius;
      if (d < RR) best = Math.max(best, (1 - d / RR) * 0.85 + 0.1);
    }
    return this.save.data.settings.highContrast ? Math.min(1, best * 1.6) : best;
  }
  damage() {
    if (this.phase !== 'playing' || this.invuln > 0 || this.armor > 0) return false;
    if (this.effects.shield > 0) {
      this.effects.shield = 0;
      this.invuln = BALANCE.player.shieldInvuln;
      this.burst(this.player.x, this.player.y, POWERUPS.shield.color, 12);
      this.audio.beep(660, 0.2, 0.07);
      return true;
    }
    this.integrity--;
    this.invuln = this.level.mods.hitInvuln;
    this.shake(12, 6);
    this.audio.beep(120, 0.4, 0.08, 'game', 'square');
    if (this.integrity <= 0) {
      this.phase = 'dying'; this.dyingT = 55;
      this.burst(this.player.x, this.player.y, '232,84,61', 26);
      this.fx.push(new Shockwave(this.player.x, this.player.y, '232,84,61', 6));
    }
    return true;
  }
  heal() {
    this.integrity = Math.min(this.stats.maxIntegrity, this.integrity + 1);
    this.burst(this.player.x, this.player.y, POWERUPS.heal.color, 12);
    this.audio.chord([700, 950], 0.18, 0.06);
  }
  applyPowerup(type) {
    if (type === 'heal') {
      if (this.integrity < this.stats.maxIntegrity) this.heal();
      else { this.addCoins(5); this.audio.beep(1250, 0.1, 0.05); }   // casco lleno: se convierte en monedas
      return;
    }
    this.effects[type] = this.stats.powerDur[type];
    this.audio.chord([880, 1180], 0.14, 0.05);
  }
  addCoins(n) { this.save.data.coins += n; this.runCoins += n; this.save.touch(); }

  /* ---- efectos ---- */
  burst(x, y, color, n) {
    if (this.reduceMotion) n = Math.ceil(n / 3);
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(0.6, 3.2);
      this.fx.push(new Particle(x, y, Math.cos(a) * s, Math.sin(a) * s, randInt(14, 30), color));
    }
  }
  shake(frames, mag) { this.shakeT = Math.max(this.shakeT, frames); this.shakeMag = mag; }
  label(x, y, text, color) { this.labels.push({ x, y, text, color }); }
  celebrate(frames) {
    this.phase = 'celebrating'; this.celebrateT = this.celebrateMax = frames;
    this.fx.push(new Shockwave(this.player.x, this.player.y));
  }
  finish(result) {
    if (this.result) return;
    this.result = result; this.phase = 'over';
    this.game.onRunEnd(this);
  }

  /* ---- simulación (60 Hz) ---- */
  update(input) {
    this.tick++;
    if (this.banner > 0) this.banner--;
    if (this.shakeT > 0) this.shakeT--;
    if (this.phase === 'dying') { if (--this.dyingT <= 0) { this.finish('dead'); return; } }
    else this.player.update(input, this.stats, this.pull);

    ['pingCooldown', 'invuln', 'armor', 'ultActive', 'ultCooldown'].forEach(k => { if (this[k] > 0) this[k]--; });
    for (const k in this.effects) if (this.effects[k] > 0) this.effects[k]--;

    const dx = this.phase === 'dying' ? this.scrollSpeed * 0.3 : this.scrollSpeed;
    this.scroll += dx;
    this.inThermal = this.zones.some(z => z.contains(this.player));
    this.revealRadius = BALANCE.ping.reveal * (this.inThermal ? 0.5 : 1);

    if (this.phase === 'playing') {
      if (!this.boss) this.advance(dx);
      this.spawner.update();
    }
    if (this.boss) this.boss.update();
    if (this.phase === 'finishing') {
      this.gate.x -= dx;
      if (this.gate.x <= this.player.x) { this.celebrate(70); this.audio.chord([520, 780, 1040], 0.3, 0.07); }
    }
    if (this.phase === 'celebrating' && --this.celebrateT <= 0) { this.finish('won'); return; }

    this.zones.forEach(e => e.update(this, dx));
    this.pickups.forEach(e => e.update(this, dx));
    this.hazards.forEach(e => e.update(this, dx));
    for (const h of this.hazards) {
      if (this.phase !== 'playing') break;
      if (!h.dead && h.hits(this.player) && this.damage()) h.onHit(this);
    }
    this.pings.forEach(e => e.update());
    this.fx.forEach(e => e.update(this, dx));
    if (this.phase !== 'dying' && this.tick % 5 === 0 && !this.reduceMotion) {
      this.fx.push(new Particle(this.player.x - 18, this.player.y + rand(-3, 3), -0.5, rand(-0.2, 0.2), 22, '120,200,220', PX));
    }
    const alive = e => !e.dead;
    this.zones = this.zones.filter(alive); this.pickups = this.pickups.filter(alive);
    this.hazards = this.hazards.filter(alive); this.pings = this.pings.filter(alive); this.fx = this.fx.filter(alive);
  }
  advance(dx) {
    const L = this.level;
    this.distance += dx * BALANCE.metersPerPx;
    this.speed = Math.min(L.speed.cap, this.speed + L.speed.ramp);
    if (L.target && this.distance >= L.target) {
      this.distance = L.target; this.phase = 'finishing'; this.gate = { x: W + 50 };
      return;
    }
    if (L.bossIntro && this.inRunway) {                      // presagio del jefe
      const k = 1 - (L.target - this.distance) / L.runway;
      if (!this.warned) { this.warned = true; this.bossWarning = 130; this.rumbleT = 0; }
      if (--this.rumbleT <= 0) {
        this.shake(16 + k * 10, 3 + k * 7); this.audio.rumble(k);
        this.rumbleT = Math.max(45, 190 - k * 140);
      }
    }
    if (this.bossWarning > 0) this.bossWarning--;
  }
}
