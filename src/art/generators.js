/* Pixel art procedural: rocas y Kraken generados por reglas sobre una rejilla. */
import { Sprite } from './Sprite.js';

export function hash2(x, y, s) {
  const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

/* Convierte una función `filled(x,y)` + `paint(x,y)` en un Sprite con contorno. */
export function gridSprite(gw, gh, filled, paint, outline) {
  const rows = [];
  for (let y = 0; y < gh; y++) {
    const row = [];
    for (let x = 0; x < gw; x++) {
      if (!filled(x, y)) { row.push(null); continue; }
      const edge = !filled(x - 1, y) || !filled(x + 1, y) || !filled(x, y - 1) || !filled(x, y + 1);
      row.push(edge ? outline : paint(x, y));
    }
    rows.push(row);
  }
  return new Sprite(rows, null);
}

export function makeRockSprite(nw, nh, seed) {
  const cx = (nw - 1) / 2, cy = (nh - 1) / 2;
  const p1 = seed * 1.3, p2 = seed * 2.9, p3 = seed * 4.1;
  const filled = (x, y) => {
    if (x < 0 || y < 0 || x >= nw || y >= nh) return false;
    const dx = (x - cx) / (nw / 2), dy = (y - cy) / (nh / 2);
    const a = Math.atan2(dy, dx);
    const r = 0.9 + 0.09 * Math.sin(a * 3 + p1) + 0.06 * Math.sin(a * 5 + p2) + 0.04 * Math.sin(a * 8 + p3);
    return Math.pow(Math.abs(dx), 2.8) + Math.pow(Math.abs(dy), 2.8) < Math.pow(r, 2.8);
  };
  const paint = (x, y) => {
    const h = hash2(x, y, seed);
    if (x + y < (nw + nh) * 0.34) return h < 0.3 ? '#2a7f6c' : '#1c5a4e';
    if (h < 0.1) return '#0a2824';
    if (x + y > (nw + nh) * 0.62) return '#0e3530';
    return '#12423a';
  };
  return gridSprite(nw, nh, filled, paint, '#4fd9b4');
}

export function makeKrakenSprite(angry) {
  const gw = 56, gh = 76;
  const body = (x, y) =>
    ((x - 27.5) / 22) ** 2 + ((y - 24) / 24) ** 2 < 1 ||       // manto
    ((x - 27.5) / 17) ** 2 + ((y - 47) / 13) ** 2 < 1;         // cara
  const tentacle = (x, y) => {
    if (y < 54) return false;
    for (let i = 0; i < 5; i++) {
      const len = 75 - (i % 2) * 7;
      if (y > len) continue;
      const c = 10.5 + i * 8.6 + Math.sin(y * 0.3 + i * 1.9) * 1.8;
      const half = Math.max(0.9, 2.6 - (y - 56) * 0.09);
      if (Math.abs(x - c) <= half) return true;
    }
    return false;
  };
  const filled = (x, y) => x >= 0 && y >= 0 && x < gw && y < gh && (body(x, y) || tentacle(x, y));
  const eyeAt = (x, y, ex) => ((x - ex) / 5.2) ** 2 + ((y - 43) / 3.6) ** 2 < 1;
  const paint = (x, y) => {
    for (const ex of [17.5, 37.5]) {
      if (eyeAt(x, y, ex)) {
        if (Math.abs(x - ex) < 1.3) return '#1a0510';
        return angry ? '#ff5a3d' : '#ffd24a';
      }
    }
    if (y >= 58 && !body(x, y)) return y % 4 === 0 ? '#b04070' : '#6a1e40';
    if (y < 36 && hash2(Math.floor(x / 3), Math.floor(y / 3), 7) < 0.16) return '#a03a66';
    if (x + y * 0.6 < 30) return '#8a2a50';
    if (x > 38 || y > 52) return '#3a0e26';
    return '#5a1836';
  };
  return gridSprite(gw, gh, filled, paint, angry ? '#ff6a8a' : '#e0507a');
}
