import { L } from './config.js';

export const mod = (a, n) => ((a % n) + n) % n;
export const wd = a => mod(a + L / 2, L) - L / 2;
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const rnd = (a, b) => a + Math.random() * (b - a);

const rgbCache = new Map();
export function rgbOf(h) { let v = rgbCache.get(h); if (!v) { const n = parseInt(h.slice(1), 16); v = [n >> 16 & 255, n >> 8 & 255, n & 255]; rgbCache.set(h, v); } return v; }
export function tint(h, s, a = 1) {
  const [r, g, b] = rgbOf(h), y = r * .3 + g * .59 + b * .11;
  return `rgba(${(y + (r - y) * s) | 0},${(y + (g - y) * s) | 0},${(y + (b - y) * s) | 0},${a})`;
}
export function hash(k) { const v = Math.sin(k * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); }
export function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
