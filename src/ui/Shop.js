import { BALANCE } from '../data/balance.js';
import { SHIPS, PAINTS } from '../data/ships.js';
import { ULTIMATES } from '../data/ultimates.js';
import { UPGRADE_MAX } from '../data/upgrades.js';

/* Catálogos de la tienda: añadir una categoría es añadir una entrada. */
export const CATALOGS = {
  ultimate: { title: 'Ultimates — equipa una', table: ULTIMATES, owned: 'ownedUltimates', equipped: 'equippedUltimate', on: 'Equipada', use: 'Equipar' },
  ship:     { title: 'Naves', table: SHIPS, owned: 'ownedShips', equipped: 'equippedShip', on: 'En uso', use: 'Usar' },
  paint:    { title: 'Pinturas', table: PAINTS, owned: 'ownedPaints', equipped: 'equippedPaint', on: 'En uso', use: 'Usar' },
};

/* Reglas de compra (sin DOM). */
export class Shop {
  constructor(save) { this.save = save; }
  upgradeCost(id) {
    const lvl = this.save.data.upgrades[id] || 0;
    return lvl >= UPGRADE_MAX ? null : BALANCE.upgradeCosts[lvl];
  }
  buyUpgrade(id) {
    const cost = this.upgradeCost(id);
    if (cost === null || !this.save.spend(cost)) return false;
    this.save.data.upgrades[id]++;
    this.save.flush();
    return true;
  }
  buy(kind, id) {
    const c = CATALOGS[kind], d = this.save.data, item = c && c.table[id];
    if (!item || d[c.owned].includes(id) || !this.save.spend(item.cost)) return false;
    d[c.owned].push(id);
    d[c.equipped] = id;
    this.save.flush();
    return true;
  }
  equip(kind, id) {
    const c = CATALOGS[kind], d = this.save.data;
    if (!c || !d[c.owned].includes(id)) return false;
    d[c.equipped] = id;
    this.save.flush();
    return true;
  }
}
