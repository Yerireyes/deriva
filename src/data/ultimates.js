import { Shockwave } from '../entities/effects.js';

/* Ultimates: `activate(run)` devuelve false si no se puede usar ahora. */
export const ULTIMATES = {
  vision: { name: 'Visión total', cost: 0, duration: 300, cooldown: 1080,
    desc: 'Revela todo durante 5 s. Recarga 18 s.',
    activate(run) { run.audio.chord([220, 440], 0.5, 0.06); return true; } },

  pulse: { name: 'Pulso de choque', cost: 100, duration: 20, cooldown: 960,
    desc: 'Destruye rocas, minas, peces y tinta cercanos. Recarga 16 s.',
    activate(run) {
      const p = run.player, R = 190;
      run.fx.push(new Shockwave(p.x, p.y, '232,163,61', 12));
      run.hazards.forEach(h => {
        if (h.destructible && Math.hypot(h.x - p.x, h.y - p.y) < R) { h.dead = true; run.burst(h.x, h.y, h.color, 8); }
      });
      run.shake(10, 5);
      run.audio.beep(150, 0.35, 0.09, 'game', 'square');
      return true;
    } },

  reinforced: { name: 'Casco reforzado', cost: 140, duration: 150, cooldown: 1500,
    desc: 'Invulnerable durante 2,5 s. Recarga 25 s.',
    activate(run) { run.armor = run.stats.ultDuration; run.audio.chord([300, 500], 0.4, 0.06); return true; } },

  repair: { name: 'Dron reparador', cost: 160, duration: 20, cooldown: 2400,
    desc: 'Repara 1 punto de casco. Recarga 40 s.',
    activate(run) {
      if (run.integrity >= run.stats.maxIntegrity) return false;
      run.heal();
      return true;
    } },
};
