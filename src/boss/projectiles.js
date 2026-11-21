/* Proyectiles y muros que lanza el Kraken. */
import { Art } from '../art/Art.js';
import { H, PX } from '../core/constants.js';
import { rand, snap } from '../core/utils.js';
import { Hazard } from '../entities/Entity.js';
import { Particle } from '../entities/effects.js';

/* Tinta del Kraken: proyectil con velocidad propia, siempre visible. */
export class InkBlob extends Hazard {
  constructor(x, y, vx, vy) { super(x, y); this.vx = vx; this.vy = vy; this.r = 8; this.color = '192,123,255'; this.t = 0; }
  update(run) {
    this.x += this.vx; this.y += this.vy; this.t++;
    if (this.t % 4 === 0) run.fx.push(new Particle(this.x + 8, this.y + rand(-4, 4), rand(0, 0.5), rand(-0.3, 0.3), 16, this.color, PX));
    if (this.x < -30 || this.y < -30 || this.y > H + 30) this.dead = true;
  }
  hits(p) { return Math.hypot(p.x - this.x, p.y - this.y) < this.r + p.r; }
  onHit(run) { this.dead = true; run.burst(this.x, this.y, this.color, 10); }
  visibility() { return 1; }
  draw(ctx) { Art.ink.draw(ctx, this.x, this.y); }
}

/* Barrida del Kraken: muros de tentáculos que cruzan a toda velocidad.
 * Cada uno deja un hueco; el siguiente nunca queda fuera de alcance. */
export class RushWall extends Hazard {
  constructor(x, gapCenter, speed, gap) {
    super(x, gapCenter);
    this.gap = gap || 98; this.speed = speed; this.destructible = false; this.t = rand(0, 100);
  }
  update() { this.x -= this.speed; this.t++; if (this.x < -40) this.dead = true; }
  hits(p) {
    if (Math.abs(p.x - this.x) > 12 + p.r * 0.5) return false;
    return p.y - p.r * 0.6 < this.y - this.gap / 2 || p.y + p.r * 0.6 > this.y + this.gap / 2;
  }
  visibility() { return 1; }
  draw(ctx, run) {
    const top = this.y - this.gap / 2, bot = this.y + this.gap / 2;
    const wob = y => run.reduceMotion ? 0 : Math.sin(y * 0.06 + this.t * 0.2) * 3;
    for (let y = 0; y < H; y += 4) {
      if (y > top - 4 && y < bot) continue;
      const tip = y > top - 12 && y < bot + 8;
      const xc = snap(this.x + wob(y)), half = tip ? 6 : 11;
      ctx.fillStyle = '#ff6a8a'; ctx.fillRect(xc - half - 2, y, half * 2 + 4, 4);
      ctx.fillStyle = (y >> 2) % 6 < 2 ? '#3a0e26' : '#6a1e40'; ctx.fillRect(xc - half, y, half * 2, 4);
    }
    for (let y = 14; y < H; y += 30) {
      if (y > top - 18 && y < bot + 18) continue;
      Art.sucker.draw(ctx, this.x + wob(y), y);
    }
    ctx.fillStyle = 'rgba(255,106,138,0.25)';                      // estela de velocidad
    for (let i = 1; i <= 3; i++) { ctx.fillRect(snap(this.x + 12 + i * 10), 0, 4, top - 8); ctx.fillRect(snap(this.x + 12 + i * 10), bot + 8, 4, H); }
    ctx.fillStyle = '#beffe9';
    ctx.fillRect(snap(this.x - 20), snap(top - 2), 40, 2);
    ctx.fillRect(snap(this.x - 20), snap(bot), 40, 2);
  }
}
