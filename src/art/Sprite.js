import { PX } from '../core/constants.js';
import { snap, makeCanvas } from '../core/utils.js';

/* Un Sprite es una rejilla de píxeles pre-renderizada en un canvas.
 * Se dibuja centrado y alineado a la rejilla de PX para que quede nítido. */
export class Sprite {
  constructor(rows, palette) {
    this.w = Math.max(...rows.map(r => r.length));
    this.h = rows.length;
    this.canvas = makeCanvas(this.w, this.h);
    const c = this.canvas.getContext('2d');
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const col = palette ? palette[row[x]] : row[x];
        if (col) { c.fillStyle = col; c.fillRect(x, y, 1, 1); }
      }
    });
  }
  /* Copia de un solo color (para destellos de daño). */
  tinted(color) {
    const s = Object.create(Sprite.prototype);
    s.w = this.w; s.h = this.h;
    s.canvas = makeCanvas(this.w, this.h);
    const c = s.canvas.getContext('2d');
    c.drawImage(this.canvas, 0, 0);
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = color;
    c.fillRect(0, 0, this.w, this.h);
    return s;
  }
  draw(ctx, x, y, o) {
    const alpha = o && o.alpha !== undefined ? o.alpha : 1;
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, alpha);
    ctx.translate(snap(x), snap(y));
    if (o && o.rot) ctx.rotate(o.rot);
    if (o && (o.flipX || o.flipY)) ctx.scale(o.flipX ? -1 : 1, o.flipY ? -1 : 1);
    ctx.drawImage(this.canvas, -Math.floor(this.w / 2) * PX, -Math.floor(this.h / 2) * PX, this.w * PX, this.h * PX);
    ctx.restore();
  }
}
