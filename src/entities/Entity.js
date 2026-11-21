/* Base de todo lo que se desplaza con el fondo. */
export class Entity {
  constructor(x, y) { this.x = x; this.y = y; this.dead = false; }
  update(run, dx) { this.x -= dx; if (this.x < -110) this.dead = true; }
}

/* ---- Peligros. Contrato: hits(player), draw(ctx, run), onHit(run). ---- */
export class Hazard extends Entity {
  constructor(x, y) { super(x, y); this.destructible = true; this.color = '79,217,180'; }
  hits() { return false; }
  onHit() {}
  visibility(run) { return run.reveal(this.x, this.y); }
}
