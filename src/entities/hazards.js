/* Peligros de los niveles normales. */
import { Art } from '../art/Art.js';
import { H, PX, TAU } from '../core/constants.js';
import { rand, pick, clamp, snap, circleRectDist } from '../core/utils.js';
import { Hazard } from './Entity.js';

export class Rock extends Hazard {
  constructor(x, y, sprite) {
    super(x, y);
    this.sprite = sprite || pick(Art.rocks);
    this.w = this.sprite.w * PX * 0.82; this.h = this.sprite.h * PX * 0.82;
  }
  hits(p) { return circleRectDist(p.x, p.y, this.x, this.y, this.w, this.h) < p.r; }
  draw(ctx, run) { this.sprite.draw(ctx, this.x, this.y, { alpha: this.visibility(run) }); }
}

export class Mine extends Hazard {
  constructor(x, y) { super(x, y); this.r = 10; this.pulse = rand(0, TAU); this.color = '232,84,61'; this.y0 = y; }
  update(run, dx) {
    super.update(run, dx); this.pulse += 0.09;
    if (run.level.mods.mineDrift) this.y = clamp(this.y0 + Math.sin(this.pulse * 0.4) * 34, 20, H - 20);
  }
  hits(p) { return Math.hypot(p.x - this.x, p.y - this.y) < this.r + p.r; }
  onHit(run) { this.dead = true; run.burst(this.x, this.y, this.color, 14); run.shake(12, 6); }
  draw(ctx, run) {
    const lit = Math.sin(this.pulse) > 0.55;
    (lit ? Art.mineLit : Art.mine).draw(ctx, this.x, this.y, { alpha: this.visibility(run) });
  }
}

/* Rape abisal: nada más rápido que el fondo. Su señuelo siempre se ve. */
export class Fish extends Hazard {
  constructor(x, y) { super(x, y); this.r = 9; this.own = rand(1.5, 2.4); this.wag = rand(0, TAU); this.color = '150,255,200'; }
  update(run, dx) {
    super.update(run, dx + this.own); this.wag += 0.15;
    if (run.level.mods.fishHoming && this.x > run.player.x + 50) this.y += clamp(run.player.y - this.y, -0.8, 0.8);
  }
  hits(p) { return Math.hypot(p.x - this.x, p.y - this.y) < this.r + p.r; }
  draw(ctx, run) {
    const bob = run.reduceMotion ? 0 : Math.sin(this.wag) * 2;
    const flick = 0.45 + Math.sin(this.wag * 1.7) * 0.2;
    ctx.fillStyle = `rgba(255,230,128,${flick})`;
    ctx.fillRect(snap(this.x - 12), snap(this.y - 6 + bob), PX, PX);
    Art.fish.draw(ctx, this.x, this.y + bob, { alpha: this.visibility(run) });
  }
}

/* Leviatán: una columna viva con las fauces abiertas; hay que pasar entre ellas. */
export class Leviathan extends Hazard {
  constructor(x, gapCenter) {
    super(x, gapCenter);
    this.gap = 104; this.wag = rand(0, TAU); this.drift = rand(0.012, 0.022);
    this.destructible = false; this.color = '160,150,225';
  }
  update(run, dx) {
    super.update(run, dx * 0.5);
    this.wag += this.drift;
    this.y = clamp(this.y + Math.sin(this.wag) * 0.45, 76, H - 76);
  }
  hits(p) {
    if (Math.abs(p.x - this.x) > 14 + p.r * 0.5) return false;
    return p.y - p.r * 0.6 < this.y - this.gap / 2 || p.y + p.r * 0.6 > this.y + this.gap / 2;
  }
  visibility(run) {
    return Math.max(run.reveal(this.x, this.y - 80), run.reveal(this.x, this.y + 80), run.reveal(this.x, run.player.y));
  }
  draw(ctx, run) {
    const top = this.y - this.gap / 2, bot = this.y + this.gap / 2;
    const glow = 0.3 + Math.sin(this.wag * 6) * 0.12;                 // ojos siempre visibles
    ctx.fillStyle = `rgba(255,230,128,${glow})`;
    ctx.fillRect(snap(this.x - 12), snap(top - 10), PX * 2, PX);
    ctx.fillRect(snap(this.x - 12), snap(bot + 8), PX * 2, PX);
    const a = this.visibility(run);
    if (a <= 0.02) return;
    const wob = y => run.reduceMotion ? 0 : Math.sin(this.wag * 3 + y * 0.05) * 4;
    for (let y = top - 24; y > -10; y -= 14) Art.leviSeg.draw(ctx, this.x + wob(y), y, { alpha: a });
    for (let y = bot + 24; y < H + 10; y += 14) Art.leviSeg.draw(ctx, this.x + wob(y), y, { alpha: a });
    Art.leviJaw.draw(ctx, this.x, top - 8, { alpha: a });
    Art.leviJaw.draw(ctx, this.x, bot + 8, { alpha: a, flipY: true });
  }
}
