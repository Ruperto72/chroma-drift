import { describe, it, expect } from 'vitest';
import { LEVELS } from '../src/levels/index.js';
import { L } from '../src/config.js';

const REQUIRED = { rock: ['w', 'h'], pillar: ['h'], mushroom: [], cloud: ['y', 'w'], thorns: ['w'], crystal: ['c'], hole: ['w'] };
const HEX = /^#[0-9a-f]{6}$/i;

describe.each(LEVELS.map(l => [l.name, l]))('%s', (_, lv) => {
  it('has a palette of hex colours', () => {
    const p = lv.palette;
    expect(p.sky).toHaveLength(2);
    for (const c of [...p.sky, p.sun, p.far, p.near, p.ground, p.grass, p.deco]) expect(c).toMatch(HEX);
  });
  it('needs three positive colour counts', () => {
    expect(lv.need).toHaveLength(3);
    for (const n of lv.need) expect(n).toBeGreaterThan(0);
  });
  it('has 48 ground heights within the playable band', () => {
    expect(lv.ground).toHaveLength(48);
    for (const h of lv.ground) { expect(h).toBeGreaterThanOrEqual(40); expect(h).toBeLessThanOrEqual(260); }
  });
  it('has valid objects inside the world', () => {
    for (const o of lv.objects) {
      expect(Object.keys(REQUIRED)).toContain(o.type);
      expect(o.x).toBeGreaterThanOrEqual(0); expect(o.x).toBeLessThan(L);
      for (const f of REQUIRED[o.type]) expect(typeof o[f]).toBe('number');
      if (o.type === 'crystal') expect([0, 1, 2]).toContain(o.c);
    }
  });
  it('has valid zones inside the world', () => {
    for (const z of lv.zones) {
      expect(['ice', 'water', 'lava']).toContain(z.type);
      expect(z.x).toBeGreaterThanOrEqual(0); expect(z.x).toBeLessThan(L);
      expect(z.w).toBeGreaterThan(0);
    }
  });
  it('places no object over a hole', () => {
    const holes = lv.objects.filter(o => o.type === 'hole');
    for (const o of lv.objects) if (o.type !== 'hole') for (const h of holes) expect(Math.abs(o.x - h.x)).toBeGreaterThanOrEqual((h.w + (o.w || 0)) / 2);
  });
  it('uses a known decor and known rules', () => {
    expect(['meadow', 'dusk', 'icicles', 'embers']).toContain(lv.decor);
    for (const k of Object.keys(lv.rules)) expect(['wind', 'embers']).toContain(k);
  });
});

describe('world profiles', () => {
  const [meadows, dusk, frost, ember] = LEVELS;
  it('keeps The Meadows gentle', () => {
    expect(meadows.zones).toEqual([]);
    expect(meadows.rules).toEqual({});
    expect(meadows.objects.every(o => ['rock', 'mushroom', 'cloud'].includes(o.type))).toBe(true);
  });
  it('gives Dusk Valley wind and pillars', () => {
    expect(dusk.rules.wind).toBeDefined();
    expect(dusk.objects.some(o => o.type === 'pillar')).toBe(true);
  });
  it('gives Frost Coast ice and water', () => {
    expect(frost.zones.some(z => z.type === 'ice')).toBe(true);
    expect(frost.zones.some(z => z.type === 'water')).toBe(true);
  });
  it('gives Ember Woods lava and embers', () => {
    expect(ember.zones.some(z => z.type === 'lava')).toBe(true);
    expect(ember.rules.embers).toBeDefined();
  });
});
