import { describe, it, expect, beforeEach } from 'vitest';
import { loadTerrain, groundAt, surfaceBelow, collideCircle, touchesHazard, hazardBelow, hitObjectWithBullet, damageObject, objects } from '../src/terrain.js';
import { view } from '../src/state.js';
import { L, TAU } from '../src/config.js';

const oldGround = x => { const t = x / L * TAU; return 540 - 82 - 22 * Math.sin(t * 5) - 12 * Math.sin(t * 13 + 1.3) - 6 * Math.sin(t * 31 + .4); };
const ramp = Array.from({ length: 48 }, (_, i) => 100 + i);

beforeEach(() => { view.H = 540; });

describe('groundAt – default ground', () => {
  it('matches the old sine formula within 1.5 units', () => {
    loadTerrain({});
    for (let x = 0; x < L; x += 7) expect(Math.abs(groundAt(x) - oldGround(x))).toBeLessThan(1.5);
  });
  it('is continuous across the world loop', () => {
    loadTerrain({});
    expect(groundAt(L - .001)).toBeCloseTo(groundAt(0), 2);
    expect(groundAt(L + 250)).toBeCloseTo(groundAt(250), 6);
    expect(groundAt(-250)).toBeCloseTo(groundAt(L - 250), 6);
  });
});

describe('groundAt – level data', () => {
  it('hits control points exactly (height above bottom)', () => {
    loadTerrain({ ground: ramp });
    expect(groundAt(0)).toBe(540 - 100);
    expect(groundAt(1000)).toBe(540 - 110);
  });
  it('interpolates halfway between points', () => {
    loadTerrain({ ground: ramp });
    expect(groundAt(1050)).toBeCloseTo(540 - 110.5, 6);
  });
  it('wraps from the last point to the first', () => {
    loadTerrain({ ground: ramp });
    expect(groundAt(4750)).toBeCloseTo(540 - (147 + 100) / 2, 6);
  });
  it('returns null over a hole', () => {
    loadTerrain({ ground: Array(48).fill(100), objects: [{ type: 'hole', x: 1000, w: 80 }] });
    expect(groundAt(1000)).toBeNull();
    expect(groundAt(1039)).toBeNull();
    expect(groundAt(1041)).toBe(440);
  });
});

describe('objects', () => {
  const flat = Array(48).fill(100);            // ground at y 440
  const level = {
    ground: flat,
    objects: [
      { type: 'rock', x: 1000, w: 60, h: 40 },   // top 400
      { type: 'cloud', x: 1400, y: 200, w: 100 }, // top 340
      { type: 'mushroom', x: 2000 },              // top 412
      { type: 'thorns', x: 2600, w: 70 },         // top 426
      { type: 'pillar', x: 3000, h: 150 },        // top 290
      { type: 'crystal', x: 3500, c: 1 },         // top 404
    ],
  };
  beforeEach(() => { view.H = 540; loadTerrain(level); });

  it('lands on top of a rock', () => {
    expect(surfaceBelow(1000, 390)).toMatchObject({ y: 400, kind: 'rock' });
  });
  it('falls back to the ground below a rock top', () => {
    expect(surfaceBelow(1000, 410)).toMatchObject({ y: 440, kind: 'ground' });
  });
  it('lands on a cloud from above but not from below', () => {
    expect(surfaceBelow(1400, 330)).toMatchObject({ y: 340, kind: 'cloud' });
    expect(surfaceBelow(1400, 350)).toMatchObject({ y: 440, kind: 'ground' });
  });
  it('lets a body pass up through a cloud', () => {
    const b = { x: 1400, y: 350, vx: 0, r: 18 };
    expect(collideCircle(b)).toBeNull();
    expect(b.y).toBe(350);
  });
  it('reports mushrooms as their own kind', () => {
    expect(surfaceBelow(2000, 400)).toMatchObject({ y: 412, kind: 'mushroom' });
  });
  it('finds objects across the world loop', () => {
    expect(surfaceBelow(4800 + 1000, 390)).toMatchObject({ kind: 'rock' });
    expect(surfaceBelow(1000 - 4800, 390)).toMatchObject({ kind: 'rock' });
  });
  it('pushes body out of a rock side and damps vx', () => {
    const b = { x: 955, y: 420, vx: 200, r: 18 };
    expect(collideCircle(b)).toMatchObject({ type: 'rock' });
    expect(b.x).toBeCloseTo(952, 6);
    expect(b.vx).toBeCloseTo(-120, 6);
  });
  it('pushes body out of a pillar side', () => {
    const b = { x: 3025, y: 350, vx: -300, r: 18 };
    expect(collideCircle(b)).toMatchObject({ type: 'pillar' });
    expect(b.x).toBeCloseTo(3000 + 14 + 18, 6);
    expect(b.vx).toBeCloseTo(180, 6);
  });
  it('leaves a body resting on a rock top alone', () => {
    const b = { x: 1000, y: 382, vx: 50, r: 18 };
    expect(collideCircle(b)).toBeNull();
    expect(b.x).toBe(1000);
  });
  it('detects thorns', () => {
    expect(touchesHazard({ x: 2600, y: 421, r: 18 })).toMatchObject({ type: 'thorns' });
    expect(touchesHazard({ x: 2600, y: 300, r: 18 })).toBeNull();
  });
  it('reports hazards below an x regardless of height', () => {
    expect(hazardBelow(2600, 18)).toBe(true);
    expect(hazardBelow(2660, 18)).toBe(false);
  });
  it('stops bullets at pillars and crystals only', () => {
    expect(hitObjectWithBullet({ x: 3000, y: 400 })).toMatchObject({ type: 'pillar' });
    expect(hitObjectWithBullet({ x: 3000, y: 250 })).toBeNull();
    expect(hitObjectWithBullet({ x: 1000, y: 420 })).toBeNull();
    expect(hitObjectWithBullet({ x: 3500, y: 420 })).toMatchObject({ type: 'crystal' });
  });
  it('destroys a crystal after three hits', () => {
    const c = objects().find(o => o.type === 'crystal');
    expect(damageObject(c)).toBe(false);
    expect(damageObject(c)).toBe(false);
    expect(damageObject(c)).toBe(true);
    expect(surfaceBelow(3500, 390).kind).toBe('ground');
    expect(hitObjectWithBullet({ x: 3500, y: 420 })).toBeNull();
  });
  it('resets object state on reload', () => {
    const c = objects().find(o => o.type === 'crystal');
    damageObject(c); damageObject(c); damageObject(c);
    loadTerrain(level);
    expect(objects().find(o => o.type === 'crystal').gone).toBe(false);
  });
  it('follows view.H changes', () => {
    view.H = 600;
    expect(surfaceBelow(1000, 450)).toMatchObject({ y: 460, kind: 'rock' });
    expect(surfaceBelow(1400, 390)).toMatchObject({ y: 400, kind: 'cloud' });
  });
});

describe('real level data', () => {
  it('ignores a non-array ground field (palette colour) and uses the default ground', async () => {
    const { LEVELS } = await import('../src/levels.js');
    view.H = 540;
    loadTerrain(LEVELS[0]);
    for (const o of objects()) expect(Number.isFinite(surfaceBelow(o.x, 0).y)).toBe(true);
    const b = { x: 0, y: 200, vx: 0, r: 18 };
    expect(collideCircle(b)).toBeNull();
    expect(b.x).toBe(0);
  });
});
