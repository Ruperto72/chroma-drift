import { L, TAU, TOP } from './config.js';
import { view } from './state.js';
import { mod, wd, clamp } from './util.js';

const SHAPES = {
  rock:     { solid: true },
  pillar:   { solid: true, w: 28, stopsShots: true },
  crystal:  { solid: true, w: 26, h: 36, stopsShots: true, hp: 3 },
  mushroom: { solid: true, w: 44, h: 28, bounce: 1.6 },
  cloud:    { h: 14 },
  thorns:   { h: 14, hazard: true },
  bush:     { w: 50, h: 34 },
  cliff:    { solid: true, w: 40, h: 300, stopsShots: true },
  hole:     {},
};

let T = {};

export function defaultGround(n = 240) {
  return Array.from({ length: n }, (_, i) => { const t = i / n * TAU; return 82 + 22 * Math.sin(t * 5) + 12 * Math.sin(t * 13 + 1.3) + 6 * Math.sin(t * 31 + .4); });
}

export function loadTerrain(level) {
  const cave = level.width != null, pts = Array.isArray(level.ground) ? level.ground : defaultGround();
  const all = (level.objects || []).map(o => ({ ...SHAPES[o.type], ...o, flash: 0, squash: 0, gone: false }));
  T = {
    pts, ceil: cave ? level.ceiling : null, loop: !cave, width: cave ? level.width : L,
    step: cave ? level.width / (pts.length - 1) : L / pts.length,
    holes: all.filter(o => o.type === 'hole'), objs: all.filter(o => o.type !== 'hole'),
  };
}

export const saveTerrain = () => T;
export function restoreTerrain(state) { T = state; }

function sample(arr, x) {
  const n = arr.length, u = T.loop ? mod(x, L) / T.step : clamp(x, 0, T.width) / T.step;
  const i = Math.min(Math.floor(u), T.loop ? n - 1 : n - 2), f = u - i;
  const a = arr[i % n], b = arr[(i + 1) % n];
  return a + (b - a) * (1 - Math.cos(Math.PI * f)) / 2;
}

export const heightAt = x => sample(T.pts, x);
export const ceilingAt = x => T.ceil ? view.H - sample(T.ceil, x) : TOP;
export const caveWidth = () => T.loop ? null : T.width;

export const holes = () => T.holes;
export function holeAt(x) { return T.holes.find(h => Math.abs(wd(x - h.x)) < h.w / 2) || null; }
export function openHole(x, w, cave) { T.holes.push({ type: 'hole', x, w, cave }); }
export function closeHole(cave) { T.holes = T.holes.filter(h => h.cave !== cave); }

export function groundAt(x) { return holeAt(x) ? null : view.H - heightAt(x); }

export const objects = () => T.objs;

export function objBox(o) {
  if (o.y != null) { const top = view.H - o.y; return { top, bottom: top + o.h }; }
  const base = groundAt(o.x) ?? view.H;
  return { top: base - o.h, bottom: base + 60 };
}

export function surfaceBelow(x, y) {
  let best = null;
  for (const o of T.objs) {
    if (o.gone || !(o.solid || o.type === 'cloud')) continue;
    if (Math.abs(wd(x - o.x)) > o.w / 2) continue;
    const top = objBox(o).top;
    if (top >= y - 1 && (!best || top < best.y)) best = { y: top, kind: o.type, obj: o };
  }
  if (best) return best;
  const g = groundAt(x);
  return g == null ? null : { y: g, kind: 'ground', obj: null };
}

export function collideCircle(b, prevBottom = Infinity) {
  let hit = null;
  for (const o of T.objs) {
    if (o.gone || !o.solid) continue;
    const box = objBox(o), dx = wd(b.x - o.x), hw = o.w / 2;
    if (box.top >= prevBottom - 1) continue; // was above the top last frame: landing handles it
    const ex = dx - Math.max(-hw, Math.min(hw, dx)), ey = b.y - Math.max(box.top, Math.min(box.bottom, b.y));
    if (ex * ex + ey * ey >= b.r * b.r) continue;
    if (ey < 0 && -ey >= Math.abs(ex)) continue; // contact from above: landing handles it
    const side = dx < 0 ? -1 : 1;
    b.x += side * (hw + b.r) - dx;
    if (b.vx * side < 0) b.vx = -b.vx * .6;
    hit = o;
  }
  return hit;
}

export function touchesHazard(b) {
  for (const o of T.objs) {
    if (o.gone || !o.hazard) continue;
    if (Math.abs(wd(b.x - o.x)) < o.w / 2 + b.r * .5 && b.y + b.r > objBox(o).top + 3) return o;
  }
  return null;
}

export function hazardBelow(x, r) {
  return T.objs.some(o => !o.gone && o.hazard && Math.abs(wd(x - o.x)) < o.w / 2 + r);
}

export function hitObjectWithBullet(bl) {
  for (const o of T.objs) {
    if (o.gone || !o.stopsShots) continue;
    const box = objBox(o);
    if (Math.abs(wd(bl.x - o.x)) < o.w / 2 + 4 && bl.y > box.top && bl.y < box.bottom) return o;
  }
  return null;
}

export function damageObject(o) {
  o.hp--; o.flash = .1;
  if (o.hp <= 0) { o.gone = true; return true; }
  return false;
}

export function updateObjects(dt) {
  for (const o of T.objs) {
    if (o.flash > 0) o.flash -= dt;
    if (o.squash > 0) o.squash = Math.max(0, o.squash - dt * 4);
  }
}

loadTerrain({});
