import { Art } from '../art/Art.js';
import { TAU } from '../core/constants.js';
import { rand, snap } from '../core/utils.js';
import { BALANCE } from '../data/balance.js';
import { POWERUPS } from '../data/powerups.js';
import { Entity } from './Entity.js';

/* ---- Recogibles ---- */
export class Pickup extends Entity {
  constructor(x, y, r) { super(x, y); this.r = r; this.pulse = rand(0, TAU); }
  update(run, dx) {
    super.update(run, dx);
    this.pulse += 0.08;
    const p = run.player, d = Math.hypot(p.x - this.x, p.y - this.y);
    if (run.phase === 'playing' && run.stats.magnet > 0 && d < run.stats.magnet + this.r && d > 1) {
      this.x += (p.x - this.x) / d * 4.5;
      this.y += (p.y - this.y) / d * 4.5;
    }
    if (run.phase !== 'dying' && d < p.r + 4 + this.r) { this.dead = true; this.collect(run); }
  }
  bob(run) { return run.reduceMotion ? 0 : Math.sin(this.pulse) * 2; }
}

export class Coin extends Pickup {
  constructor(x, y, big) { super(x, y, big ? 10 : 6); this.big = big; }
  collect(run) {
    const base = this.big ? BALANCE.coins.bigValue : BALANCE.coins.value;
    run.addCoins(Math.max(1, Math.round(base * run.level.coinMult)));
    run.burst(this.x, this.y, '232,201,61', this.big ? 8 : 4);
    run.audio.beep(this.big ? 1250 : 1000, 0.08, 0.05);
  }
  draw(ctx, run) { (this.big ? Art.coinBig : Art.coin).draw(ctx, this.x, this.y + this.bob(run)); }
}

export class Powerup extends Pickup {
  constructor(x, y, type) { super(x, y, 12); this.type = type; }
  collect(run) { run.applyPowerup(this.type); run.burst(this.x, this.y, POWERUPS[this.type].color, 10); }
  draw(ctx, run) {
    const y = this.y + this.bob(run);
    ctx.fillStyle = `rgba(${POWERUPS[this.type].color},0.14)`;
    ctx.fillRect(snap(this.x) - 16, snap(y) - 16, 32, 32);
    ctx.strokeStyle = `rgba(${POWERUPS[this.type].color},0.5)`;
    ctx.lineWidth = 2;
    ctx.strokeRect(snap(this.x) - 16, snap(y) - 16, 32, 32);
    Art.powerup[this.type].draw(ctx, this.x, y);
  }
}
