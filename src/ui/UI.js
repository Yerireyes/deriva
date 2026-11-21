import { Art } from '../art/Art.js';
import { $ } from '../core/utils.js';
import { LEVELS } from '../data/levels.js';
import { UPGRADES, UPGRADE_MAX } from '../data/upgrades.js';
import { CATALOGS } from './Shop.js';
import { DIFFICULTIES, resolveLevel } from '../data/difficulty.js';
import { SONG_NAMES } from '../data/songs.js';

export const COIN = '<i class="coin"></i>';

/* Pantallas del overlay y su navegación con historial. */
export class UI {
  constructor(game) {
    this.game = game;
    this.overlay = $('overlay');
    this.screen = 'menu';
    this.history = [];
    this.overlay.addEventListener('click', e => {
      const el = e.target.closest ? e.target.closest('[data-act]') : null;
      if (el && !el.disabled) game.act(el.dataset.act, el.dataset.arg);
    });
    this.bindOptions();
  }
  show(name) {
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    $('screen-' + name).classList.add('active');
    this.overlay.style.display = 'flex';
    this.overlay.scrollTop = 0;
    this.screen = name;
    if (name === 'menu') this.syncMenu();
    if (name === 'levels') this.renderLevels();
    if (name === 'shop') this.renderShop();
    if (name === 'help') this.paintSprites($('screen-help'));
  }
  go(name) { this.history.push(this.screen); this.show(name); }
  back() { this.show(this.history.pop() || 'menu'); }
  hide() { this.overlay.style.display = 'none'; this.screen = 'playing'; }

  /* Dibuja sprites del juego en los <canvas data-sprite> de la interfaz. */
  paintSprites(root) {
    root.querySelectorAll('canvas[data-sprite]').forEach(cv => {
      const parts = cv.dataset.sprite.split(':');
      const s = parts[0] === 'ship' ? Art.ship(parts[1], parts[2]) : parts[0] === 'powerup' ? Art.powerup[parts[1]] : Art[parts[0]];
      if (!s) return;
      cv.width = s.w; cv.height = s.h;
      cv.style.width = s.w * 2 + 'px';
      cv.getContext('2d').drawImage(s.canvas, 0, 0);
    });
  }

  renderLevels() {
    const save = this.game.save, d = save.data;
    let html = '';
    LEVELS.forEach(L => {
      const open = save.isUnlocked(L);
      const need = L.unlockAfter && LEVELS.find(x => x.id === L.unlockAfter);
      let meta;
      if (!open) meta = `Supera ${need.name} para desbloquear`;
      else if (L.endless) meta = `${L.blurb} · récord ${save.best} m`;
      else if (L.boss) meta = L.blurb;
      else meta = `Meta: ${resolveLevel(L, save.difficulty).target} m · ${L.blurb}`;
      const tag = L.endless ? 'Extra' : 'Nivel ' + L.id;
      const done = save.done.includes(L.id) ? ' ✓' : '';
      html += `<button class="level-btn" data-act="play" data-arg="${L.id}" ${open ? '' : 'disabled'}>${tag} — ${L.name}${done}<small>${meta}</small></button>`;
    });
    $('level-list').innerHTML = html;
    $('levelsTitle').textContent = 'Seleccionar nivel — ' + DIFFICULTIES[save.difficulty].name;
  }

  renderShop() {
    const game = this.game, d = game.save.data, shop = game.shop;
    $('shopCoins').textContent = d.coins;
    let html = '<h3>Mejoras</h3>';
    Object.keys(UPGRADES).forEach(id => {
      const def = UPGRADES[id], lvl = d.upgrades[id], cost = shop.upgradeCost(id);
      const pips = '■'.repeat(lvl) + '□'.repeat(UPGRADE_MAX - lvl);
      html += `<div class="card"><div class="info"><div class="name">${def.name}<span class="pips">${pips}</span></div>` +
        `<div class="desc">${cost === null ? def.desc(lvl) : 'Siguiente: ' + def.desc(lvl + 1)}</div></div>` +
        `<button class="buy" data-act="upgrade" data-arg="${id}" ${cost === null || d.coins < cost ? 'disabled' : ''}>${cost === null ? 'Máx.' : cost + ' ' + COIN}</button></div>`;
    });
    Object.keys(CATALOGS).forEach(kind => {
      const c = CATALOGS[kind];
      html += `<h3>${c.title}</h3>`;
      Object.keys(c.table).forEach(id => {
        const item = c.table[id], owned = d[c.owned].includes(id), on = d[c.equipped] === id;
        const arg = kind + ':' + id;
        let btn;
        if (!owned) btn = `<button class="buy" data-act="buy" data-arg="${arg}" ${d.coins < item.cost ? 'disabled' : ''}>${item.cost} ${COIN}</button>`;
        else if (on) btn = `<button class="buy" disabled>${c.on}</button>`;
        else btn = `<button class="buy" data-act="equip" data-arg="${arg}">${c.use}</button>`;
        let icon = '';
        if (kind === 'ship') icon = `<canvas class="pix" data-sprite="ship:${id}:${d.equippedPaint}"></canvas>`;
        if (kind === 'paint') icon = `<canvas class="pix" data-sprite="ship:${d.equippedShip}:${id}"></canvas>`;
        html += `<div class="card${owned ? '' : ' locked'}">${icon}<div class="info"><div class="name">${item.name}</div>` +
          `<div class="desc">${item.desc || 'Color del casco. Solo estético.'}</div></div>${btn}</div>`;
      });
    });
    $('shop-body').innerHTML = html;
    this.paintSprites($('shop-body'));
  }

  renderResult(run, info) {
    const L = run.level, won = run.result === 'won';
    let title, lines = [];
    if (won) {
      title = L.boss ? 'Has escapado del Kraken' : 'Nivel completado';
      lines.push(L.boss ? `Sobreviviste a<br><b>${L.name}</b>` : `${L.name} superada<br><b>${L.target} m</b>`);
      lines.push(`Bono de nivel<br><b>+${info.bonus} ${COIN}</b>`);
    } else {
      title = L.endless ? 'Fin de la inmersión' : 'Casco perforado';
      if (L.boss) lines.push(run.boss.resultLine());
      else lines.push(`Distancia recorrida<br><b>${Math.floor(run.distance)} m</b>`);
      if (info.record) lines.push('<b class="gold">¡Nuevo récord!</b>');
    }
    lines.push(`Monedas esta inmersión<br><b>${run.runCoins} ${COIN}</b>`);
    if (info.hardUnlocked) lines.push('<b class="bad">Dificultad difícil desbloqueada</b><br>Actívala en el menú principal');
    if (info.unlocked.length) lines.push(`Desbloqueado<br><b>${info.unlocked.map(l => l.name).join(' · ')}</b>`);
    let buttons = '';
    if (won && info.next) buttons += `<button data-act="play" data-arg="${info.next.id}">Continuar a ${info.next.name}</button>`;
    if (info.checkpoint) buttons += '<button data-act="retry" data-arg="phase2">Reintentar la segunda fase</button>';
    buttons += `<button data-act="retry">${won ? 'Repetir nivel' : info.checkpoint ? 'Empezar el combate de nuevo' : 'Volver a sumergirse'}</button>` +
      '<button data-act="nav" data-arg="shop">Ir a la tienda</button><button data-act="menu">Menú principal</button>';
    $('screen-gameover').innerHTML = `<h1${won ? '' : ' class="bad"'}>${title}</h1><div class="stat">${lines.join('<br>')}</div><div class="menu-buttons">${buttons}</div>`;
  }

  /* Botón de dificultad y tono del menú. */
  syncMenu() {
    const save = this.game.save, hard = save.difficulty === 'hard', btn = $('difficultyBtn');
    btn.disabled = !save.hardUnlocked;
    btn.innerHTML = save.hardUnlocked
      ? `Dificultad: ${DIFFICULTIES[save.difficulty].name}<small>pulsa para cambiar</small>`
      : 'Dificultad: Fácil<small>supera El Kraken para desbloquear la difícil</small>';
    $('menuTagline').innerHTML = hard
      ? 'El abismo ya te conoce.<br>Esta vez no va a esperar a que mires.'
      : 'Navegas a ciegas en el abismo.<br>El sonar revela lo que hay cerca, por un instante.';
    if (this.screen === 'levels') this.renderLevels();
  }

  bindOptions() {
    const s = () => this.game.save.data.settings;
    const on = (id, ev, fn) => $(id).addEventListener(ev, e => { fn(e.target); this.game.applySettings(); this.game.save.touch(); });
    on('sfxVolume', 'input', t => { s().sfxVolume = t.value / 100; });
    on('uiVolume', 'input', t => { s().uiVolume = t.value / 100; });
    on('musicVolume', 'input', t => { s().musicVolume = t.value / 100; });
    on('muteToggle', 'change', t => { s().muted = t.checked; });
    on('contrastToggle', 'change', t => { s().highContrast = t.checked; });
    on('motionToggle', 'change', t => { s().reduceMotion = t.checked; });
  }
  syncOptions() {
    const s = this.game.save.data.settings, key = s.ultimateKey.toUpperCase();
    $('sfxVolume').value = Math.round(s.sfxVolume * 100);
    $('uiVolume').value = Math.round(s.uiVolume * 100);
    $('musicVolume').value = Math.round(s.musicVolume * 100);
    $('muteToggle').checked = s.muted;
    $('contrastToggle').checked = s.highContrast;
    $('motionToggle').checked = s.reduceMotion;
    $('rebindBtn').textContent = this.game.awaitingKey ? '…' : key;
    $('ultHintKey').textContent = key;
    $('songBtn').textContent = SONG_NAMES[s.bossSong] || SONG_NAMES.original;
  }
}
