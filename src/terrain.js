import { L, TAU } from './config.js';
import { view } from './state.js';
import { mod, wd } from './util.js';

const SHAPES = {
  rock:     { solid: true },
  pillar:   { solid: true, w: 28, stopsShots: true },
  crystal:  { solid: true, w: 26, h: 36, stopsShots: true, hp: 3 },
  mushroom: { solid: true, w: 44, h: 28, bounce: 1.6 },
  cloud:    { h: 14 },
  thorns:   { h: 14, hazard: true },
  hole:     {},
};

let pts = [], step = L, holes = [], objs = [];

export function defaultGround(n = 240) {
  return Array.from({ length: n }, (_, i) => { const t = i / n * TAU; return 82 + 22 * Math.sin(t * 5) + 12 * Math.sin(t * 13 + 1.3) + 6 * Math.sin(t * 31 + .4); });
}

export function loadTerrain(level) {
  pts = level.ground || defaultGround();
  step = L / pts.length;
  const all = (level.objects || []).map(o => ({ ...SHAPES[o.type], ...o, flash: 0, squash: 0, gone: false }));
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

export const objects = () => objs;

export function objBox(o) {
  if (o.y != null) { const top = view.H - o.y; return { top, bottom: top + o.h }; }
  const base = groundAt(o.x) ?? view.H;
  return { top: base - o.h, bottom: base + 60 };
}

export function surfaceBelow(x, y) {
  let best = null;
  for (const o of objs) {
    if (o.gone || !(o.solid || o.type === 'cloud')) continue;
    if (Math.abs(wd(x - o.x)) > o.w / 2) continue;
    const top = objBox(o).top;
    if (top >= y - 1 && (!best || top < best.y)) best = { y: top, kind: o.type, obj: o };
  }
  if (best) return best;
  const g = groundAt(x);
  return g == null ? null : { y: g, kind: 'ground', obj: null };
}

export function collideCircle(b) {
  let hit = null;
  for (const o of objs) {
    if (o.gone || !o.solid) continue;
    const box = objBox(o), dx = wd(b.x - o.x), hw = o.w / 2;
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
  for (const o of objs) {
    if (o.gone || !o.hazard) continue;
    if (Math.abs(wd(b.x - o.x)) < o.w / 2 + b.r * .5 && b.y + b.r > objBox(o).top + 3) return o;
  }
  return null;
}

export function hazardBelow(x, r) {
  return objs.some(o => !o.gone && o.hazard && Math.abs(wd(x - o.x)) < o.w / 2 + r);
}

export function hitObjectWithBullet(bl) {
  for (const o of objs) {
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
  for (const o of objs) {
    if (o.flash > 0) o.flash -= dt;
    if (o.squash > 0) o.squash = Math.max(0, o.squash - dt * 4);
  }
}

loadTerrain({});
