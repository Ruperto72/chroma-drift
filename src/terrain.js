import { L, TAU } from './config.js';
import { view } from './state.js';
import { mod, wd } from './util.js';

let pts = [], step = L, holes = [], objs = [];

export function defaultGround(n = 240) {
  return Array.from({ length: n }, (_, i) => { const t = i / n * TAU; return 82 + 22 * Math.sin(t * 5) + 12 * Math.sin(t * 13 + 1.3) + 6 * Math.sin(t * 31 + .4); });
}

export function loadTerrain(level) {
  pts = level.ground || defaultGround();
  step = L / pts.length;
  const all = (level.objects || []).map(o => ({ ...o }));
  holes = all.filter(o => o.type === 'hole');
  objs = all.filter(o => o.type !== 'hole');
}

export function heightAt(x) {
  const u = mod(x, L) / step, i = Math.floor(u), f = u - i, n = pts.length;
  const a = pts[i % n], b = pts[(i + 1) % n];
  return a + (b - a) * (1 - Math.cos(Math.PI * f)) / 2;
}

export function groundAt(x) {
  for (const h of holes) if (Math.abs(wd(x - h.x)) < h.w / 2) return null;
  return view.H - heightAt(x);
}

loadTerrain({});
