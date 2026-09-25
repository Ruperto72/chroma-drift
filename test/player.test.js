import { describe, it, expect } from 'vitest';
import { G, view } from '../src/state.js';
import { loadTerrain } from '../src/terrain.js';
import { updatePlayer } from '../src/player.js';
import { loadZones } from '../src/zones.js';
import { loadRules } from '../src/rules.js';

const flat = Array(48).fill(100); // ground y 440

function setup(objects, P, extra = {}) {
  view.H = 540;
  const level = { ground: flat, objects, ...extra };
  loadTerrain(level); loadZones(level); loadRules(level);
  Object.assign(G, { state: 'play', dead: 0, shield: 0, lives: 3, t: 0, parts: [], own: { thrust: false, anti: false, rapid: false, double: false, sat: false } });
  G.P = { x: 0, y: 0, vx: 0, vy: 0, r: 18, spin: 0, ang: 0, face: 1, inv: 0, ...P };
}

describe('updatePlayer with objects', () => {
  it('bounces 1.6x higher on a mushroom', () => {
    setup([{ type: 'mushroom', x: 1000 }], { x: 1000, y: 392, vy: 300 });
    updatePlayer(1 / 60);
    expect(G.P.y).toBeCloseTo(412 - 18, 6);
    expect(G.P.vy).toBeCloseTo(-1024, 6);
  });
  it('lands on a rock top with a normal bounce', () => {
    setup([{ type: 'rock', x: 1000, w: 60, h: 40 }], { x: 1000, y: 380, vy: 300 });
    updatePlayer(1 / 60);
    expect(G.P.y).toBeCloseTo(382, 6);
    expect(G.P.vy).toBe(-640);
  });
  it('is bounced back by a rock side', () => {
    setup([{ type: 'rock', x: 1000, w: 60, h: 40 }], { x: 955, y: 415, vx: 200 });
    updatePlayer(1 / 60);
    expect(G.P.x).toBeCloseTo(952, 6);
    expect(G.P.vx).toBeLessThan(0);
  });
  it('never ends up inside a rock when dropped on its corner', () => {
    setup([{ type: 'rock', x: 1000, w: 60, h: 40 }], { x: 1040, y: 330, vy: 0 });
    for (let i = 0; i < 240; i++) {
      updatePlayer(1 / 60);
      const dx = Math.abs(G.P.x - 1000);
      expect(dx < 30 && G.P.y > 400).toBe(false);
    }
  });
  it('loses a life on thorns', () => {
    setup([{ type: 'thorns', x: 1000, w: 70 }], { x: 1000, y: 421, vy: 100 });
    updatePlayer(1 / 60);
    expect(G.lives).toBe(2);
    expect(G.dead).toBeGreaterThan(0);
  });
  it('is protected from thorns by the shield', () => {
    setup([{ type: 'thorns', x: 1000, w: 70 }], { x: 1000, y: 421, vy: 100 });
    G.shield = 5;
    updatePlayer(1 / 60);
    expect(G.lives).toBe(3);
  });
  it('respawns clear of thorns', () => {
    setup([{ type: 'thorns', x: 1000, w: 70 }], { x: 1000, y: 200 });
    Object.assign(G, { dead: .01, lives: 2 });
    updatePlayer(1 / 60);
    expect(Math.abs(G.P.x - 1000)).toBeGreaterThanOrEqual(35 + 18);
  });
  it("lands on a rock when falling fast at 30 fps", () => {
    setup([{ type: "rock", x: 1000, w: 70, h: 40 }], { x: 1000, y: 380, vy: 900 });
    updatePlayer(1 / 30);
    expect(G.P.x).toBeCloseTo(1000, 6);
    expect(G.P.y).toBeCloseTo(382, 6);
    expect(G.P.vy).toBe(-640);
  });
  it("gets the mushroom boost when falling fast at 30 fps", () => {
    setup([{ type: "mushroom", x: 1000 }], { x: 1000, y: 392, vy: 900 });
    updatePlayer(1 / 30);
    expect(G.P.vy).toBeCloseTo(-1024, 6);
  });
  it('steers four times slower on ice', () => {
    setup([], { x: 2000, y: 200, spin: 1 }, { zones: [{ type: 'ice', x: 1000, w: 400 }] });
    updatePlayer(1 / 60);
    const offIce = G.P.vx;
    setup([], { x: 1000, y: 200, spin: 1 }, { zones: [{ type: 'ice', x: 1000, w: 400 }] });
    updatePlayer(1 / 60);
    expect(G.P.vx).toBeCloseTo(offIce * .25, 6);
  });
  it('sinks slowly in water', () => {
    setup([], { x: 1000, y: 420, vy: 0 }, { zones: [{ type: 'water', x: 1000, w: 400 }] });
    updatePlayer(1 / 60);
    expect(G.P.vy).toBeCloseTo(6.25 * (1 - 2.5 / 60), 6);
  });
  it('bounces at 0.4x from the bottom of a pool', () => {
    setup([], { x: 1000, y: 420, vy: 300 }, { zones: [{ type: 'water', x: 1000, w: 400 }] });
    updatePlayer(1 / 60);
    expect(G.P.vy).toBeCloseTo(-256, 6);
  });
  it('escapes a water pool without thrust', () => {
    setup([], { x: 1000, y: 420, vy: 0 }, { zones: [{ type: 'water', x: 1000, w: 400 }] });
    let minY = Infinity;
    for (let i = 0; i < 600; i++) { updatePlayer(1 / 60); minY = Math.min(minY, G.P.y); }
    expect(minY).toBeLessThan(410);
  });
  it('loses a life in lava', () => {
    setup([], { x: 1000, y: 421, vy: 100 }, { zones: [{ type: 'lava', x: 1000, w: 160 }] });
    updatePlayer(1 / 60);
    expect(G.lives).toBe(2);
  });
  it('respawns clear of lava', () => {
    setup([], { x: 1000, y: 200 }, { zones: [{ type: 'lava', x: 1000, w: 160 }] });
    Object.assign(G, { dead: .01, lives: 2 });
    updatePlayer(1 / 60);
    expect(Math.abs(G.P.x - 1000)).toBeGreaterThanOrEqual(80 + 18);
  });
  it('is pushed sideways by the wind', () => {
    setup([], { x: 1000, y: 200 }, { rules: { wind: { strength: 160, period: 8 } } });
    G.t = 2;
    updatePlayer(1 / 60);
    expect(G.P.vx).toBeCloseTo(160 / 60, 6);
  });
  it('stops at a cave ceiling', () => {
    setup([], { x: 600, y: 262, vy: -600 }, { width: 1200, ground: Array(13).fill(100), ceiling: Array(13).fill(300) });
    updatePlayer(1 / 60);
    expect(G.P.y).toBe(540 - 300 + 18);
    expect(G.P.vy).toBe(0);
  });
  it('bounces off the far cave wall', () => {
    setup([], { x: 1195, y: 300, vx: 300, spin: 1 }, { width: 1200, ground: Array(13).fill(100), ceiling: Array(13).fill(300) });
    updatePlayer(1 / 60);
    expect(G.P.x).toBe(1200 - 18);
    expect(G.P.vx).toBeLessThan(0);
  });
  it('stays inside a hole it has sunk into instead of popping back up', () => {
    setup([{ type: 'hole', x: 1000, w: 70 }], { x: 1034, y: 450, vx: 200, vy: 100 });
    const y0 = G.P.y;
    updatePlayer(1 / 60);
    expect(G.P.y).toBeGreaterThan(y0);
    expect(G.P.x).toBeLessThanOrEqual(1000 + 35 - 18);
    expect(G.P.vx).toBeLessThan(0);
  });
});
