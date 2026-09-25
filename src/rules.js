import { TAU, TOP } from './config.js';
import { G, view } from './state.js';
import { rnd } from './util.js';
import { groundAt } from './terrain.js';

let rules = {};

export function loadRules(level) { rules = level.rules || {}; G.embers = []; G.emberT = 0; }

export function windRatio(t = G.t) { const w = rules.wind; return w ? Math.sin(TAU * t / w.period) : null; }
export function windForce(t = G.t) { const w = rules.wind; return w ? w.strength * windRatio(t) : 0; }

export function updateEmbers(dt) {
  const e = rules.embers;
  if (e && G.state === 'play') {
    G.emberT -= dt;
    if (G.emberT <= 0) {
      G.emberT = rnd(.5, 1.5) / e.rate;
      G.embers.push({ x: G.camX + rnd(0, view.W), y: TOP, vx: rnd(-20, 20), vy: rnd(90, 150), t: 0 });
    }
  }
  for (const m of G.embers) {
    m.t += dt; m.x += m.vx * dt; m.y += m.vy * dt;
    const g = groundAt(m.x);
    if ((g != null && m.y > g) || m.y > view.H + 20) m.dead = true;
  }
  G.embers = G.embers.filter(m => !m.dead);
}
