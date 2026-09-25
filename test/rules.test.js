import { describe, it, expect, beforeEach } from 'vitest';
import { G, view } from '../src/state.js';
import { TOP } from '../src/config.js';
import { loadTerrain } from '../src/terrain.js';
import { loadRules, windForce, windRatio, updateEmbers } from '../src/rules.js';

beforeEach(() => {
  view.H = 540; view.W = 960;
  loadTerrain({ ground: Array(48).fill(100) });
  Object.assign(G, { state: 'play', camX: 0 });
});

describe('wind', () => {
  it('is absent without a wind rule', () => {
    loadRules({});
    expect(windForce(2)).toBe(0);
    expect(windRatio(2)).toBeNull();
  });
  it('follows a sine over its period', () => {
    loadRules({ rules: { wind: { strength: 160, period: 8 } } });
    expect(windForce(2)).toBeCloseTo(160, 6);
    expect(windForce(6)).toBeCloseTo(-160, 6);
    expect(windForce(0)).toBeCloseTo(0, 6);
  });
});

describe('embers', () => {
  it('spawn only with an embers rule', () => {
    loadRules({});
    updateEmbers(.1);
    expect(G.embers).toHaveLength(0);
    loadRules({ rules: { embers: { rate: 1 } } });
    updateEmbers(.01);
    expect(G.embers).toHaveLength(1);
    expect(G.embers[0].y).toBeGreaterThanOrEqual(TOP);
  });
  it('burn out when they reach the ground', () => {
    loadRules({});
    G.embers = [{ x: 100, y: 439, vx: 0, vy: 120, t: 0 }];
    updateEmbers(1 / 60);
    expect(G.embers).toHaveLength(0);
  });
  it('do not spawn after level clear', () => {
    loadRules({ rules: { embers: { rate: 1 } } });
    G.state = 'clear';
    updateEmbers(.1);
    expect(G.embers).toHaveLength(0);
  });
  it('clears embers on level load', () => {
    G.embers = [{ x: 100, y: 200, vx: 0, vy: 120, t: 0 }];
    loadRules({});
    expect(G.embers).toHaveLength(0);
  });
});
