import { Sprite } from './Sprite.js';
import { makeRockSprite, makeKrakenSprite } from './generators.js';
import { ART_PALETTES, ART_ROWS } from './sprites.js';
import { PAINTS } from '../data/ships.js';

/* Banco de sprites: se construye una sola vez al arrancar. */
export const Art = {
  ships: {},
  build() {
    const mk = (name, pal) => new Sprite(ART_ROWS[name], ART_PALETTES[pal || name]);
    this.mine = mk('mine');
    this.mineLit = mk('mine', 'mineLit');
    this.fish = mk('fish');
    this.coin = mk('coin', 'coin');
    this.coinBig = mk('coinBig', 'coin');
    this.powerup = { shield: mk('shield'), radar: mk('radar'), slow: mk('slow'), heal: mk('heal') };
    this.ink = mk('ink');
    this.sucker = mk('sucker');
    this.weak = mk('weak');
    this.leviSeg = mk('leviSeg', 'levi');
    this.leviJaw = mk('leviJaw', 'levi');
    this.rocks = [];
    for (let i = 0; i < 14; i++) {
      this.rocks.push(makeRockSprite(13 + ((i * 7) % 15), 13 + ((i * 11) % 15), i + 1));
    }
    this.kraken = makeKrakenSprite(false);
    this.krakenAngry = makeKrakenSprite(true);
    this.krakenFlash = this.kraken.tinted('#ffffff');
  },
  ship(shipId, paintId) {
    const key = shipId + ':' + paintId;
    if (!this.ships[key]) {
      const rows = ART_ROWS['ship_' + shipId] || ART_ROWS.ship_explorer;
      this.ships[key] = new Sprite(rows, (PAINTS[paintId] || PAINTS.abisal).colors);
    }
    return this.ships[key];
  },
};
