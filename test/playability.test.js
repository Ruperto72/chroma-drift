import { describe, it, expect, afterEach } from 'vitest';
import { G, view } from '../src/state.js';
import { loadTerrain, groundAt } from '../src/terrain.js';
import { loadZones } from '../src/zones.js';
import { loadRules } from '../src/rules.js';
import { updatePlayer } from '../src/player.js';
import { keys } from '../src/input.js';
import { LEVELS } from '../src/levels/index.js';

// Spin mode (no Thrust yet), direction held, 20 different start phases.
function cross(lv, from, to, fps) {
  const dir = Math.sign(to - from), res = { passed: 0, dead: 0, stuck: 0 };
  for (let k = 0; k < 20; k++) {
    view.H = 540; loadTerrain(lv); loadZones(lv); loadRules({});
    Object.assign(G, { state: 'play', dead: 0, shield: 0, lives: 3, t: 0, parts: [], own: { thrust: false, anti: false, rapid: false, double: false, sat: false } });
    const x = from + k * 7 * dir;
    G.P = { x, y: groundAt(x) - 18 - k * 6, vx: dir * 260, vy: 0, r: 18, spin: dir, ang: 0, face: dir, inv: 0 };
    keys.ArrowRight = dir > 0; keys.ArrowLeft = dir < 0;
    let r = 'stuck';
    for (let i = 0; i < 20 * fps; i++) {
      updatePlayer(1 / fps);
      if (G.dead > 0) { r = 'dead'; break; }
      if (dir > 0 ? G.P.x > to : G.P.x < to) { r = 'passed'; break; }
    }
    res[r]++;
  }
  return res;
}

afterEach(() => { keys.ArrowRight = keys.ArrowLeft = false; });

const [, dusk, , ember] = LEVELS;

describe('playability in spin mode', () => {
  it.each([
    ['Ember Woods lava 850', ember, 450, 1150],
    ['Ember Woods lava 2250', ember, 1850, 2600],
    ['Ember Woods lava 3750', ember, 4150, 3400],
  ])('%s kills at most 6 of 20 crossings', (_, lv, from, to) => {
    for (const fps of [60, 30]) expect(cross(lv, from, to, fps).dead).toBeLessThanOrEqual(6);
  });
  it.each([
    ['Dusk Valley pillar 1100 from the right', dusk, 1500, 900],
    ['Dusk Valley pillar 1100 from the left', dusk, 700, 1300],
    ['Dusk Valley pillar 2400 from the right', dusk, 2800, 2200],
    ['Dusk Valley pillar 2400 from the left', dusk, 2000, 2600],
    ['Dusk Valley pillar 3600 from the left', dusk, 3200, 3800],
    ['Dusk Valley pillar 3600 from the right', dusk, 4000, 3400],
    ['Ember Woods pillar 2700 from the left', ember, 2400, 2900],
    ['Ember Woods pillar 2700 from the right', ember, 3000, 2500],
  ])('%s can be passed without Thrust', (_, lv, from, to) => {
    expect(cross(lv, from, to, 60).passed).toBeGreaterThanOrEqual(16);
    expect(cross(lv, from, to, 30).passed).toBeGreaterThanOrEqual(6);
  });
});
