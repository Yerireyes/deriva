import { H } from '../core/constants.js';

/* Teclado + táctil. Solo traduce eventos a intenciones; no conoce el juego. */
export class Input {
  constructor(canvas, handlers) {
    this.up = false; this.down = false;
    this.targetY = null;            // arrastre táctil / ratón
    this.h = handlers;
    const dir = e => {
      const k = e.key.toLowerCase();
      if (k === 'arrowup' || k === 'w') return 'up';
      if (k === 'arrowdown' || k === 's') return 'down';
      return null;
    };
    document.addEventListener('keydown', e => {
      if (this.h.captureKey && this.h.captureKey(e)) { e.preventDefault(); return; }
      const d = dir(e), playing = this.h.playing();     // en los menús, flechas y espacio siguen siendo del navegador
      if (d) { this[d] = true; if (playing) e.preventDefault(); return; }
      if (e.code === 'Space') { if (playing) { e.preventDefault(); if (!e.repeat) this.h.ping(); } return; }
      if (e.key === 'Escape') { e.preventDefault(); this.h.pause(); return; }
      if (e.key.toLowerCase() === this.h.ultimateKey()) { e.preventDefault(); if (!e.repeat) this.h.ultimate(); }
    });
    document.addEventListener('keyup', e => { const d = dir(e); if (d) this[d] = false; });
    window.addEventListener('blur', () => this.release());

    const toY = e => {
      const r = canvas.getBoundingClientRect();
      return (e.clientY - r.top) / r.height * H;
    };
    canvas.addEventListener('pointerdown', e => { this.targetY = toY(e); });
    canvas.addEventListener('pointermove', e => { if (this.targetY !== null) this.targetY = toY(e); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => canvas.addEventListener(n, () => { this.targetY = null; }));
  }
  release() { this.up = this.down = false; this.targetY = null; }
}
