import { W, H, STEP } from '../core/constants.js';
import { $ } from '../core/utils.js';
import { LEVELS } from '../data/levels.js';
import { DIFFICULTIES, resolveLevel } from '../data/difficulty.js';
import { Song } from '../services/Song.js';
import { SONG_FILES, SONG_NAMES, SONG_LOOP_START, SONG_FADE } from '../data/songs.js';
import { Run } from './Run.js';
import { Renderer } from '../render/Renderer.js';
import { AudioManager } from '../services/AudioManager.js';
import { Input } from '../services/Input.js';
import { Music } from '../services/Music.js';
import { SaveManager } from '../services/SaveManager.js';
import { Hud } from '../ui/Hud.js';
import { Shop } from '../ui/Shop.js';
import { UI } from '../ui/UI.js';

export class Game {
  constructor() {
    this.canvas = $('c');
    this.save = new SaveManager();
    this.audio = new AudioManager(this.save.data.settings);
    this.music = new Music(this.audio);
    this.song = new Song(this.audio, SONG_FILES, SONG_LOOP_START, SONG_FADE);     // la canción del jefe en difícil
    this.shop = new Shop(this.save);
    this.renderer = new Renderer(this.canvas);
    this.hud = new Hud();
    this.ui = new UI(this);
    this.state = 'menu';           // menu | playing | paused | over
    this.run = null;
    this.awaitingKey = false;
    this.acc = 0; this.last = 0;

    this.input = new Input(this.canvas, {
      ping: () => this.run && this.state === 'playing' && this.run.emitPing(),
      ultimate: () => this.run && this.state === 'playing' && this.run.activateUltimate(),
      pause: () => this.togglePause(),
      playing: () => this.state === 'playing',
      ultimateKey: () => this.save.data.settings.ultimateKey,
      captureKey: e => this.captureKey(e),
    });
    const tap = (id, fn) => $(id).addEventListener('pointerdown', e => { e.preventDefault(); fn(); });
    tap('touchPing', () => this.run && this.state === 'playing' && this.run.emitPing());
    tap('touchUlt', () => this.run && this.state === 'playing' && this.run.activateUltimate());
    tap('touchPause', () => this.togglePause());

    // El navegador solo permite audio tras un gesto: el primero arranca la música del menú.
    const wake = () => { this.audio.init(); this.syncMusic(); };
    document.addEventListener('pointerdown', wake);
    document.addEventListener('keydown', wake);
    window.addEventListener('resize', () => this.fit());
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'playing') this.togglePause(); });
    setInterval(() => this.save.flushIfDirty(), 3000);
    this.fit();
  }

  async start() {
    await this.save.load();
    this.audio.settings = this.save.data.settings;
    this.applySettings();
    $('menuNotice').textContent = this.save.notice;
    this.ui.show('menu');
    this.syncMusic();
    requestAnimationFrame(t => { this.last = t; this.frame(t); });
    this.song.probe().then(() => {               // sin el mp3 elegido, se pasa a la sintetizada
      const s = this.save.data.settings;
      if (s.bossSong !== 'synth' && !this.song.available[s.bossSong]) { s.bossSong = 'synth'; this.applySettings(); }
    });
  }

  /* Escala todo el marco (canvas + HUD + menús) para que quepa en la ventana. */
  fit() {
    const k = Math.min(window.innerWidth / (W + 8), window.innerHeight / (H + 8), 1.75);
    $('frame').style.transform = `translate(-50%, -50%) scale(${k})`;
  }
  applySettings() {
    document.body.classList.toggle('high-contrast', this.save.data.settings.highContrast);
    document.body.classList.toggle('hard', this.save.difficulty === 'hard');
    this.ui.syncOptions();
    this.ui.syncMenu();
    this.music.refresh();
    this.song.refresh();
  }
  /* Qué suena en cada estado. En los niveles normales manda el silencio del sonar;
   * durante el combate es el propio Kraken quien cambia de pista. */
  syncMusic() {
    const m = this.music;
    m.setDuck(this.state === 'paused' ? 0.35 : 1);
    if (this.state === 'paused') this.song.pause();
    else if (this.state === 'playing') this.song.resume();
    else this.song.stop(0.4);
    if (this.state === 'menu' || this.state === 'over') m.play('menu');
    else if (this.run && !this.run.boss) m.stop(0.8);
  }
  setTheme(level) {
    LEVELS.forEach(l => document.body.classList.remove(l.theme));
    document.body.classList.add(level.theme);
  }

  /* El Kraken avisa de los momentos musicales de su segunda fase:
   *   build → (solo difícil) entra la canción, 10 s antes de que reaparezca
   *   drop  → reaparece
   *   stop  → se acabó
   * En difícil suena el mp3 (original o retro) o, si se eligió o no cargó, la pista sintetizada. */
  bossCue(cue) {
    const s = this.save.data.settings, hard = this.run && this.run.level.difficulty === 'hard';
    if (cue === 'stop') { this.song.stop(1.5); this.music.stop(1.5); return; }
    if (!hard) { if (cue === 'drop') this.music.play('frenzy'); return; }
    if (cue === 'build') {
      this.usingSong = s.bossSong !== 'synth' && this.song.ready(s.bossSong) && this.song.play(s.bossSong, 10);
      if (this.usingSong) this.music.stop(0.2); else this.music.play('hardBuild');
    }
    if (cue === 'drop' && !this.usingSong) this.music.play('hardFrenzy');
  }
  preloadSong() {
    const v = this.save.data.settings.bossSong;
    if (v !== 'synth') this.song.load(v);
  }

  /* Todas las acciones de botones pasan por aquí (data-act / data-arg). */
  act(name, arg) {
    const ok = () => this.audio.click();
    switch (name) {
      case 'nav': ok(); this.ui.go(arg); break;
      case 'back': ok(); this.ui.back(); break;
      case 'play': ok(); this.startLevel(parseInt(arg, 10)); break;
      case 'retry': ok(); this.startLevel(this.run.level.id, { phase2: arg === 'phase2' }); break;
      case 'resume': ok(); this.togglePause(); break;
      case 'menu': ok(); this.save.flushIfDirty(); this.state = 'menu'; this.run = null; this.ui.history = []; this.ui.show('menu'); this.syncMusic(); break;
      case 'upgrade': this.shop.buyUpgrade(arg) ? ok() : this.audio.deny(); this.ui.renderShop(); break;
      case 'buy': case 'equip': {
        const [kind, id] = arg.split(':');
        this.shop[name](kind, id) ? ok() : this.audio.deny();
        this.ui.renderShop();
        break;
      }
      case 'difficulty':
        if (!this.save.hardUnlocked) { this.audio.deny(); break; }
        ok(); this.save.data.difficulty = this.save.difficulty === 'hard' ? 'easy' : 'hard'; this.save.flush(); this.applySettings(); break;
      case 'song': {
        const order = Object.keys(SONG_NAMES).filter(v => v === 'synth' || this.song.available[v]), s = this.save.data.settings;
        ok(); s.bossSong = order[(order.indexOf(s.bossSong) + 1) % order.length]; this.save.touch(); this.applySettings(); this.preloadSong(); break;
      }
      case 'rebind': ok(); this.awaitingKey = true; this.ui.syncOptions(); break;
    }
  }
  captureKey(e) {
    if (!this.awaitingKey) return false;
    const k = e.key.toLowerCase();
    if (k.length === 1 && k !== ' ' && k !== 'w' && k !== 's') { this.save.data.settings.ultimateKey = k; this.save.touch(); }
    this.awaitingKey = false;
    this.ui.syncOptions();
    return true;
  }

  startLevel(id, opts) {
    const base = LEVELS.find(l => l.id === id) || LEVELS[0];
    if (!this.save.isUnlocked(base)) return;
    const level = resolveLevel(base, this.save.difficulty);        // copia con la dificultad aplicada
    if (level.boss && level.bossCfg.script) this.preloadSong();
    this.audio.init();
    this.setTheme(level);
    this.input.release();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    this.song.stop(0.2);                       // por si se reinicia con la canción en pausa
    this.run = new Run(this, level, opts);
    this.hud.cache = {};
    this.state = 'playing';
    if (level.boss) { if (opts && opts.phase2) this.music.stop(0.5); else this.music.play('boss'); }
    this.syncMusic();
    this.acc = 0;
    this.ui.history = [];
    this.ui.hide();
  }
  togglePause() {
    if (this.state === 'playing') { this.state = 'paused'; this.ui.history = []; this.ui.show('pause'); }
    else if (this.state === 'paused') { this.state = 'playing'; this.acc = 0; this.ui.hide(); }
    this.syncMusic();
  }

  /* La partida avisa aquí cuando termina: recompensas, progreso y pantalla final. */
  onRunEnd(run) {
    const d = this.save.data, L = run.level;
    const before = LEVELS.filter(l => this.save.isUnlocked(l));
    const hardBefore = this.save.hardUnlocked;
    const info = { bonus: 0, record: false, next: null, unlocked: [], hardUnlocked: false,
      checkpoint: run.result === 'dead' && !!run.boss && run.boss.inPhase2 && !run.boss.cfg.script };   // en difícil se repite todo el combate
    if (run.result === 'won') {
      info.bonus = L.bonus;
      run.addCoins(info.bonus);
      if (!this.save.done.includes(L.id)) this.save.done.push(L.id);
      info.next = LEVELS.find(l => l.id === L.id + 1 && !l.endless && this.save.isUnlocked(l)) || null;
    }
    if (L.endless && Math.floor(run.distance) > this.save.best) { this.save.best = Math.floor(run.distance); info.record = true; }
    info.hardUnlocked = !hardBefore && this.save.hardUnlocked;
    info.unlocked = LEVELS.filter(l => this.save.isUnlocked(l) && !before.includes(l));
    this.save.flush();
    this.state = 'over';
    this.ui.renderResult(run, info);
    this.ui.history = [];
    this.ui.show('gameover');
    this.syncMusic();
  }

  frame(now) {
    const dt = Math.min(120, now - this.last);
    this.last = now;
    if (this.state === 'playing') {
      this.acc += dt;
      let n = 0;
      while (this.acc >= STEP && n < 5 && this.state === 'playing') { this.run.update(this.input); this.acc -= STEP; n++; }
      if (n === 5) this.acc = 0;
    }
    this.renderer.draw(this.run, this.save.data.settings);
    this.hud.sync(this.run, this.save);
    requestAnimationFrame(t => this.frame(t));
  }
}
