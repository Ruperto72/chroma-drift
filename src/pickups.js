import { COLORS, SLOTS } from './config.js';
import { G } from './state.js';
import { rnd, wd } from './util.js';
import { groundAt } from './terrain.js';
import { sfx } from './audio.js';
import { addText, banner, burst } from './fx.js';
import { levelClear } from './game.js';

export function pickup(x, y, extra) { return Object.assign({ x, y, vx: rnd(-30, 30), vy: -90, t: 0 }, extra); }

export function canBuy(id) { const own = G.own; if (id === 'anti') return own.thrust && !own.anti; if (id === 'shield') return true; return !own[id]; }

export function activate() {
  if (G.sel < 0 || G.dead > 0) return;
  const s = SLOTS[G.sel], P = G.P;
  if (!canBuy(s.id)) { sfx('deny'); addText(P.x, P.y - 30, s.id === 'anti' ? 'Needs Thrust' : 'Already owned', '#ff9a9a'); return; }
  if (s.id === 'shield') G.shield = 10;
  else { G.own[s.id] = true; if (s.id === 'sat') { G.spark.x = P.x; G.spark.y = P.y; } }
  G.sel = -1; sfx('power'); banner(s.label + ' activated');
  burst(P.x, P.y, '#ffcf4a', 18, 160);
}

function updatePickups(list, dt, onCollect) {
  const P = G.P, spark = G.spark;
  for (const d of list) {
    d.t += dt; d.vy = Math.min(d.vy + 220 * dt, 80); d.vx *= .98;
    d.x += d.vx * dt; d.y += d.vy * dt;
    const gy = groundAt(d.x) - 9; if (d.y > gy) { d.y = gy; d.vy = 0; d.vx = 0; }
    if (G.own.sat) {
      const dx = wd(spark.x - d.x), dy = spark.y - d.y, m = Math.hypot(dx, dy);
      if (m < 130 && m > 1) { d.x += dx / m * 280 * dt; d.y += dy / m * 280 * dt; d.vy = 0; }
      if (m < 16) { d.gone = true; onCollect(d); continue; }
    }
    if (G.dead <= 0) { const dx = wd(P.x - d.x), dy = P.y - d.y; if (dx * dx + dy * dy < (P.r + 11) ** 2) { d.gone = true; onCollect(d); continue; } }
    if (d.t > 13) d.gone = true;
  }
  return list.filter(d => !d.gone);
}

export function updateAllPickups(dt) {
  G.drops = updatePickups(G.drops, dt, d => {
    G.score += 25; sfx('drop');
    if (G.got[d.c] < G.need[d.c]) {
      G.got[d.c]++;
      addText(d.x, d.y - 10, G.got[d.c] === G.need[d.c] ? 'Full!' : '+1', COLORS[d.c]);
      if (G.state === 'play' && G.got.every((g, i) => g >= G.need[i])) levelClear();
    }
  });
  G.gems = updatePickups(G.gems, dt, g => {
    G.sel = (G.sel + 1) % SLOTS.length; G.score += 40; sfx('gem');
    addText(g.x, g.y - 10, SLOTS[G.sel].label, '#b8ffea');
  });
}
