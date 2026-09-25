import { describe, it, expect } from 'vitest';
import { G, view } from '../src/state.js';
import { loadTerrain } from '../src/terrain.js';
import { updatePlayer } from '../src/player.js';

const flat = Array(48).fill(100); // ground y 440

function setup(objects, P) {
  view.H = 540;
  loadTerrain({ ground: flat, objects });
  Object.assign(G, { state: 'play', dead: 0, shield: 0, lives: 3, parts: [], own: { thrust: false, anti: false, rapid: false, double: false, sat: false } });
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
});
