/* Efectos visuales efímeros. */
import { PX, TAU } from '../core/constants.js';
import { snap } from '../core/utils.js';
import { BALANCE } from '../data/balance.js';

/* ---- Efectos ---- */
export class Ping {
  constructor(x, y, tick) { this.x = x; this.y = y; this.r = 4; this.alpha = 1; this.born = tick; this.dead = false; }
  update() {
    this.r += BALANCE.ping.expand; this.alpha -= BALANCE.ping.fade;
    if (this.alpha <= 0 || this.r > 560) this.dead = true;
  }
  draw(ctx) {
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, TAU);
    ctx.strokeStyle = `rgba(79,217,180,${this.alpha * 0.7})`; ctx.lineWidth = 3; ctx.stroke();
  }
}

export class Shockwave {
  constructor(x, y, color, speed) { this.x = x; this.y = y; this.r = 6; this.alpha = 1; this.color = color || '210,255,245'; this.speed = speed || 9; this.dead = false; }
  update() { this.r += this.speed; this.alpha -= 0.035; if (this.alpha <= 0) this.dead = true; }
  draw(ctx) {
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, TAU);
    ctx.strokeStyle = `rgba(${this.color},${this.alpha})`; ctx.lineWidth = 4; ctx.stroke();
  }
}

export class Particle {
  constructor(x, y, vx, vy, life, color, size) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.life = this.max = life;
    this.color = color; this.size = size || PX * 2; this.dead = false;
  }
  update(run, dx) {
    this.x += this.vx - (dx || 0) * 0.5; this.y += this.vy; this.vx *= 0.95; this.vy *= 0.95;
    if (--this.life <= 0) this.dead = true;
  }
  draw(ctx) {
    ctx.fillStyle = `rgba(${this.color},${this.life / this.max})`;
    ctx.fillRect(snap(this.x), snap(this.y), this.size, this.size);
  }
}
