import { TAU } from './config.js';
import { G } from './state.js';
import { rnd } from './util.js';

export function banner(text) { G.banner = { text, t: 2.6 }; }
export function addText(x, y, text, col = '#fff') { G.texts.push({ x, y, text, col, t: 0 }); }
export function burst(x, y, col, n, sp = 220) {
  for (let i = 0; i < n; i++) { const a = rnd(0, TAU), v = rnd(40, sp); G.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(.35, .8), max: .8, col, sz: rnd(2, 4.5) }); }
}
