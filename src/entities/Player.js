import { Art } from '../art/Art.js';
import { H } from '../core/constants.js';
import { clamp } from '../core/utils.js';
import { BALANCE } from '../data/balance.js';

export class Player {
  constructor(stats) {
    this.x = BALANCE.player.x; this.y = H / 2; this.vy = 0;
    this.r = stats.radius;
    this.sprite = Art.ship(stats.shipId, stats.paintId);
  }
  /* `pull` es una corriente vertical externa (la usa el Kraken en difícil). */
  update(input, stats, pull) {
    let a = 0;
    if (input.up) a -= 1;
    if (input.down) a += 1;
    if (a === 0 && input.targetY !== null) {
      const d = input.targetY - this.y;
      if (Math.abs(d) > 5) a = clamp(d / 36, -1, 1);
    }
    this.vy = clamp((this.vy + a * stats.accel + (pull || 0)) * BALANCE.player.friction, -stats.maxSpeed, stats.maxSpeed);
    this.y = clamp(this.y + this.vy, 14, H - 14);
  }
}
