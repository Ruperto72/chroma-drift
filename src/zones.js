import { view } from './state.js';
import { wd } from './util.js';
import { groundAt, heightAt } from './terrain.js';

let zones = [];

export function loadZones(level) { zones = (level.zones || []).map(z => ({ ...z })); }
export const allZones = () => zones;

const inside = (z, x, pad = 0) => Math.abs(wd(x - z.x)) < z.w / 2 + pad;

export function zoneAt(x, type) { return zones.find(z => z.type === type && inside(z, x)) || null; }
export function waterSurface(z) { return view.H - heightAt(z.x) - 30; }
export function waterAt(b) { const z = zoneAt(b.x, 'water'); return z && b.y > waterSurface(z) ? z : null; }
export function inLava(b) {
  if (!zoneAt(b.x, 'lava')) return false;
  const g = groundAt(b.x);
  return g != null && b.y + b.r > g - 3;
}
export function lavaBelow(x, r) { return zones.some(z => z.type === 'lava' && inside(z, x, r)); }
