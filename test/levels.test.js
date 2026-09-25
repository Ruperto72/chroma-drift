import { describe, it, expect } from 'vitest';
import { LEVELS } from '../src/levels/index.js';
import { L } from '../src/config.js';
import { view } from '../src/state.js';
import { loadTerrain, heightAt, ceilingAt } from '../src/terrain.js';

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
  it('gives every water pool banks at or above its surface', () => {
    view.H = 540; loadTerrain(lv);
    for (const z of lv.zones.filter(z => z.type === 'water')) {
      const surface = heightAt(z.x) + 30;
      expect(heightAt(z.x - z.w / 2)).toBeGreaterThanOrEqual(surface);
      expect(heightAt(z.x + z.w / 2)).toBeGreaterThanOrEqual(surface);
    }
  });
  it('keeps objects out of lava and water', () => {
    for (const z of lv.zones.filter(z => z.type !== 'ice')) for (const o of lv.objects) expect(Math.abs(o.x - z.x)).toBeGreaterThanOrEqual((z.w + (o.w || 0)) / 2);
  });
  it('uses a known decor and known rules', () => {
    expect(['meadow', 'dusk', 'icicles', 'embers']).toContain(lv.decor);
    for (const k of Object.keys(lv.rules)) expect(['wind', 'embers']).toContain(k);
  });
  it('has one visible and one or two hidden caves with valid entrances', () => {
    const kinds = lv.caves.map(c => c.entrance.kind);
    expect(kinds.filter(k => k === 'hole')).toHaveLength(1);
    expect(kinds.length - 1).toBeGreaterThanOrEqual(1);
    expect(kinds.length - 1).toBeLessThanOrEqual(2);
    view.H = 540; loadTerrain(lv);
    for (const c of lv.caves) {
      expect(['hole', 'bush', 'rock', 'cliff']).toContain(c.entrance.kind);
      expect(['treasure', 'dark']).toContain(c.type);
      expect(c.entrance.x).toBeGreaterThanOrEqual(300);
      expect(c.entrance.x).toBeLessThan(L - 300);
      if (c.entrance.kind === 'cliff') {
        expect(c.entrance.y).toBeGreaterThanOrEqual(heightAt(c.entrance.x) + 60);
        expect(c.entrance.y).toBeLessThanOrEqual(heightAt(c.entrance.x) + 260);
      }
    }
  });
  it('keeps cave entrances clear of objects and zones', () => {
    const ew = { hole: 70, bush: 50, rock: 64, cliff: 40 };
    for (const c of lv.caves) {
      const w = ew[c.entrance.kind];
      for (const o of lv.objects) expect(Math.abs(c.entrance.x - o.x)).toBeGreaterThanOrEqual((w + (o.w || 44)) / 2 + 20);
      for (const z of lv.zones) expect(Math.abs(c.entrance.x - z.x)).toBeGreaterThanOrEqual((w + z.w) / 2 + 20);
    }
  });
  it('shapes every cave with room to bounce', () => {
    for (const c of lv.caves) {
      expect(c.floor).toHaveLength(c.width / 100 + 1);
      expect(c.ceiling).toHaveLength(c.width / 100 + 1);
      c.floor.forEach((f, i) => {
        expect(c.ceiling[i] - f).toBeGreaterThanOrEqual(180);
        expect(c.ceiling[i]).toBeLessThanOrEqual(430);
      });
    }
  });
  it('places cave loot inside the cave', () => {
    for (const c of lv.caves) {
      view.H = 540; loadTerrain({ width: c.width, ground: c.floor, ceiling: c.ceiling });
      for (const it of c.loot) {
        expect(['gem', 'star', 'life']).toContain(it.type);
        expect(it.x).toBeGreaterThanOrEqual(100);
        expect(it.x).toBeLessThanOrEqual(c.width - 100);
        expect(it.y).toBeGreaterThanOrEqual(heightAt(it.x) + 20);
        expect(it.y).toBeLessThanOrEqual(540 - ceilingAt(it.x) - 20);
      }
    }
  });
  it('hides exactly one extra life per world', () => {
    expect(lv.caves.flatMap(c => c.loot).filter(it => it.type === 'life')).toHaveLength(1);
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

describe('caves across worlds', () => {
  it('have unique ids', () => {
    const ids = LEVELS.flatMap(l => l.caves.map(c => c.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
