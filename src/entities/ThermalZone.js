import { PX, TAU } from '../core/constants.js';
import { rand, snap } from '../core/utils.js';
import { Entity } from './Entity.js';

/* Capa térmica: dentro de ella el sonar revela la mitad. */
export class ThermalZone extends Entity {
  constructor(x, y, w, h) { super(x, y); this.w = w; this.h = h; this.wave = rand(0, TAU); }
  update(run, dx) { this.x -= dx; this.wave += 0.04; if (this.x < -this.w) this.dead = true; }
  contains(p) { return Math.abs(p.x - this.x) < this.w / 2 && Math.abs(p.y - this.y) < this.h / 2; }
  draw(ctx) {
    ctx.fillStyle = 'rgba(232,163,61,0.05)';
    ctx.fillRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
    ctx.fillStyle = 'rgba(232,163,61,0.3)';
    for (let ly = this.y - this.h / 2 + 4; ly < this.y + this.h / 2; ly += 10) {
      for (let lx = this.x - this.w / 2; lx < this.x + this.w / 2; lx += 8) {
        ctx.fillRect(snap(lx), snap(ly + Math.sin(lx * 0.05 + this.wave) * 4), 4, PX);
      }
    }
  }
}
