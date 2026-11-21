import { clamp } from '../core/utils.js';
import { BALANCE } from '../data/balance.js';
import { LEVELS } from '../data/levels.js';
import { SHIPS, PAINTS } from '../data/ships.js';
import { ULTIMATES } from '../data/ultimates.js';
import { UPGRADES, UPGRADE_MAX } from '../data/upgrades.js';
import { DIFFICULTIES } from '../data/difficulty.js';

/* Guardado con versión y migración. Usa window.storage si existe
 * (vista previa de Claude), si no localStorage, si no memoria. */
export class SaveManager {
  constructor() {
    this.data = SaveManager.defaults();
    this.dirty = false;
    this.notice = '';
  }
  static get KEY() { return 'deriva:save:v2'; }
  static get LEGACY_KEY() { return 'deriva:save'; }
  static defaults() {
    const upgrades = {};
    Object.keys(UPGRADES).forEach(id => { upgrades[id] = 0; });
    return {
      v: 2, coins: 0, upgrades,
      ownedShips: ['explorer'], equippedShip: 'explorer',
      ownedUltimates: ['vision'], equippedUltimate: 'vision',
      ownedPaints: ['abisal'], equippedPaint: 'abisal',
      completed: [], bestEndless: 0, seenHelp: false,
      difficulty: 'easy', completedHard: [], bestEndlessHard: 0,
      settings: { sfxVolume: 0.7, uiVolume: 0.7, musicVolume: 0.5, bossSong: 'original', muted: false, highContrast: false, reduceMotion: false, ultimateKey: 'q' },
    };
  }
  async _read(key) {
    try {
      if (window.storage) { const r = await window.storage.get(key); if (r && r.value) return r.value; }
    } catch (e) { /* clave inexistente */ }
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  async _write(key, value) {
    try { if (window.storage) { await window.storage.set(key, value); return; } } catch (e) { /* sigue */ }
    try { window.localStorage.setItem(key, value); } catch (e) { /* solo en memoria */ }
  }
  async load() {
    let raw = await this._read(SaveManager.KEY);
    if (raw) {
      try { this._merge(JSON.parse(raw)); } catch (e) { /* guardado corrupto: valores por defecto */ }
      return;
    }
    raw = await this._read(SaveManager.LEGACY_KEY);
    if (raw) {
      try { this._migrateV1(JSON.parse(raw)); this.flush(); } catch (e) { /* ignora */ }
    }
  }
  _merge(p) {
    const d = this.data;
    if (typeof p.coins === 'number') d.coins = Math.max(0, Math.floor(p.coins));
    if (p.upgrades) Object.keys(UPGRADES).forEach(id => { d.upgrades[id] = clamp(p.upgrades[id] | 0, 0, UPGRADE_MAX); });
    const own = (list, table, base) => Array.from(new Set([base].concat((list || []).filter(id => table[id]))));
    d.ownedShips = own(p.ownedShips, SHIPS, 'explorer');
    d.ownedUltimates = own(p.ownedUltimates, ULTIMATES, 'vision');
    d.ownedPaints = own(p.ownedPaints, PAINTS, 'abisal');
    if (d.ownedShips.includes(p.equippedShip)) d.equippedShip = p.equippedShip;
    if (d.ownedUltimates.includes(p.equippedUltimate)) d.equippedUltimate = p.equippedUltimate;
    if (d.ownedPaints.includes(p.equippedPaint)) d.equippedPaint = p.equippedPaint;
    if (Array.isArray(p.completed)) d.completed = p.completed.filter(id => LEVELS.some(l => l.id === id));
    if (typeof p.bestEndless === 'number') d.bestEndless = p.bestEndless;
    if (Array.isArray(p.completedHard)) d.completedHard = p.completedHard.filter(id => LEVELS.some(l => l.id === id));
    if (typeof p.bestEndlessHard === 'number') d.bestEndlessHard = p.bestEndlessHard;
    if (p.difficulty === 'hard') d.difficulty = 'hard';
    d.seenHelp = !!p.seenHelp;
    if (p.settings) Object.assign(d.settings, p.settings);
  }
  /* Guardado de la versión anterior: renombra mejoras, reembolsa las
   * eliminadas y da por superados los niveles (antes no había bloqueo). */
  _migrateV1(old) {
    const u = old.upgrades || {};
    const rename = { powerupDuration: 'powerDuration', ultimateCooldown: 'ultCooldown', maneuverability: 'maneuver', pickupRange: 'magnet', healChance: 'repair' };
    const upgrades = {};
    Object.keys(rename).forEach(k => { upgrades[rename[k]] = u[k] | 0; });
    let refund = 0;
    ['powerupFrequency', 'ultimateDuration'].forEach(k => {
      for (let i = 0; i < (u[k] | 0); i++) refund += BALANCE.legacyUpgradeCosts[i] || 0;
    });
    const ults = (old.ownedUltimates || []).map(id => id === 'brake' ? 'repair' : id);
    this._merge({
      coins: (old.coins | 0) + refund, upgrades,
      ownedShips: old.ownedShips, equippedShip: old.equippedShip,
      ownedUltimates: ults, equippedUltimate: old.equippedUltimate === 'brake' ? 'repair' : old.equippedUltimate,
      completed: [1, 2, 3],
      settings: old.ultimateKey ? { ultimateKey: old.ultimateKey } : null,
    });
    if (refund > 0) this.notice = `Guardado actualizado: +${refund} monedas reembolsadas por mejoras retiradas.`;
  }
  touch() { this.dirty = true; }
  flush() { this.dirty = false; this._write(SaveManager.KEY, JSON.stringify(this.data)); }
  flushIfDirty() { if (this.dirty) this.flush(); }

  /* ---- progreso: cada dificultad lleva su propia lista de niveles superados y su récord ---- */
  get hardUnlocked() { return this.data.completed.includes(DIFFICULTIES.hard.unlockAfter); }
  get difficulty() { return this.data.difficulty === 'hard' && this.hardUnlocked ? 'hard' : 'easy'; }
  get done() { return this.difficulty === 'hard' ? this.data.completedHard : this.data.completed; }
  get best() { return this.difficulty === 'hard' ? this.data.bestEndlessHard : this.data.bestEndless; }
  set best(v) { this.data[this.difficulty === 'hard' ? 'bestEndlessHard' : 'bestEndless'] = v; }
  isUnlocked(level) { return !level.unlockAfter || this.done.includes(level.unlockAfter); }
  spend(cost) {
    if (this.data.coins < cost) return false;
    this.data.coins -= cost;
    return true;
  }
}
