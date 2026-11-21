import { clamp, $ } from '../core/utils.js';

/* HUD en el DOM: solo escribe cuando el valor cambia. */
export class Hud {
  constructor() { this.cache = {}; }
  set(id, value) {
    if (this.cache[id] === value) return;
    this.cache[id] = value;
    $(id).textContent = value;
  }
  sync(run, save) {
    this.set('coinsHud', String(save.data.coins));
    if (!run) return;
    const L = run.level;
    this.set('score', run.boss ? 'JEFE' : Math.floor(run.distance) + ' m');
    const key = run.integrity + '/' + run.stats.maxIntegrity;
    if (this.cache.integrity !== key) {
      this.cache.integrity = key;
      let html = '';
      for (let i = 0; i < run.stats.maxIntegrity; i++) html += `<div class="seg${i < run.integrity ? ' on' : ''}"></div>`;
      $('integrity').innerHTML = html;
    }
    let label, pct, color = 'var(--sonar)';
    if (run.boss) {
      ({ label, pct, color } = run.boss.hud());
    } else if (L.endless) {
      const best = save.best;
      label = `${L.name} — récord ${best} m`;
      pct = best > 0 ? Math.min(1, run.distance / best) : 0; color = 'var(--gold)';
    } else {
      label = `${L.name} — ${Math.floor(run.distance)}/${L.target} m`;
      pct = run.distance / L.target;
    }
    this.set('progressLabel', label);
    const w = Math.round(clamp(pct, 0, 1) * 100) + '%';
    if (this.cache.bar !== w + color) {
      this.cache.bar = w + color;
      const fill = $('levelProgressFill');
      fill.style.width = w; fill.style.background = color;
    }
  }
}
