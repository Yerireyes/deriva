/* Helpers matemáticos y de DOM sin estado. */
import { PX } from './constants.js';

export const rand = (a, b) => a + Math.random() * (b - a);

export const randInt = (a, b) => Math.floor(rand(a, b + 1));

export const pick = arr => arr[Math.floor(Math.random() * arr.length)];

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const snap = v => Math.round(v / PX) * PX;

export const $ = id => document.getElementById(id);

export function circleRectDist(cx, cy, rx, ry, rw, rh) {
  const qx = clamp(cx, rx - rw / 2, rx + rw / 2);
  const qy = clamp(cy, ry - rh / 2, ry + rh / 2);
  return Math.hypot(cx - qx, cy - qy);
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
