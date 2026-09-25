import { describe, it, expect, beforeEach } from 'vitest';
import { loadTerrain, groundAt } from '../src/terrain.js';
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
