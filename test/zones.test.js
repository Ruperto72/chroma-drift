import { describe, it, expect, beforeEach } from 'vitest';
import { view } from '../src/state.js';
import { loadTerrain } from '../src/terrain.js';
import { loadZones, zoneAt, waterSurface, waterAt, inLava, lavaBelow } from '../src/zones.js';

const level = {
  ground: Array(48).fill(100), // ground y 440
  zones: [{ type: 'ice', x: 500, w: 200 }, { type: 'water', x: 1500, w: 400 }, { type: 'lava', x: 3000, w: 160 }],
};

beforeEach(() => { view.H = 540; loadTerrain(level); loadZones(level); });

describe('zones', () => {
  it('finds a zone of the given type inside its span only', () => {
    expect(zoneAt(550, 'ice')).toMatchObject({ type: 'ice' });
    expect(zoneAt(700, 'ice')).toBeNull();
    expect(zoneAt(550, 'water')).toBeNull();
  });
  it('wraps across the world loop', () => {
    expect(zoneAt(500 + 4800, 'ice')).toMatchObject({ type: 'ice' });
  });
  it('puts the water surface 30 above the ground at the zone centre', () => {
    expect(waterSurface(zoneAt(1500, 'water'))).toBe(540 - 130);
  });
  it('reports water only below the surface', () => {
    expect(waterAt({ x: 1500, y: 420 })).toMatchObject({ type: 'water' });
    expect(waterAt({ x: 1500, y: 400 })).toBeNull();
  });
  it('detects lava contact at ground level only', () => {
    expect(inLava({ x: 3000, y: 422, r: 18 })).toBe(true);
    expect(inLava({ x: 3000, y: 300, r: 18 })).toBe(false);
    expect(inLava({ x: 3200, y: 422, r: 18 })).toBe(false);
  });
  it('reports lava below an x regardless of height', () => {
    expect(lavaBelow(3000, 18)).toBe(true);
    expect(lavaBelow(3100, 18)).toBe(false);
  });
  it('resets zones on reload', () => {
    loadZones({});
    expect(zoneAt(550, 'ice')).toBeNull();
  });
});
