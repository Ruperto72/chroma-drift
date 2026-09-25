import { TOP, COLORS } from './config.js';
import { G, view } from './state.js';
import { rnd, wd } from './util.js';
import { groundY } from './terrain.js';
import { sfx } from './audio.js';
import { addText, burst } from './fx.js';
import { pickup } from './pickups.js';

export function spawnWave() {
  const { W, H } = view;
  const lv = G.level, open = [0, 1, 2].filter(i => G.got[i] < G.need[i]);
  const color = open.length && Math.random() < .82 ? open[Math.random() * open.length | 0] : -1;
  const pool = ['float', 'float', 'hop', 'dive']; if (lv >= 1) pool.push('dive', 'hop');
  const type = pool[Math.random() * pool.length | 0];
  const side = Math.random() < .5 ? -1 : 1, n = 3 + Math.min(4, lv) + (Math.random() * 2 | 0);
  const sp = (type === 'hop' ? 110 : 95) + lv * 14;
  const baseY = rnd(TOP + 50, Math.max(TOP + 70, H * .55));
  for (let i = 0; i < n; i++) {
    const x = G.camX + (side > 0 ? W + 50 + i * 48 : -50 - i * 48);
    const e = { type, x, y: baseY, baseY, vx: -side * sp, vy: 0, t: i * .45, age: 0, r: 14, hp: 1, color, phase: 0, flash: 0, dead: false };
    if (type === 'hop') { e.r = 13; e.y = groundY(x) - e.r; e.vy = -rnd(300, 600); }
    if (type === 'dive') { e.baseY = rnd(TOP + 30, TOP + 120); e.y = e.baseY; }
    G.enemies.push(e);
  }
  if (Math.random() < .32) {
    const cs = -side;
    G.enemies.push({ type: 'carrier', x: G.camX + (cs > 0 ? W + 80 : -80), y: TOP + 60, baseY: TOP + 50 + rnd(0, 70), vx: -cs * 60, vy: 0, t: 0, age: 0, r: 22, hp: 3, color: -1, phase: 0, flash: 0, dead: false });
  }
}

export function killEnemy(e) {
  if (e.dead) return; e.dead = true;
  const pts = e.type === 'carrier' ? 250 : 50 + G.level * 10; G.score += pts; addText(e.x, e.y, '+' + pts);
  burst(e.x, e.y, e.color >= 0 ? COLORS[e.color] : '#c9ccd3', e.type === 'carrier' ? 26 : 14);
  sfx('pop');
  if (e.type === 'carrier') G.gems.push(pickup(e.x, e.y));
  else if (e.color >= 0 && Math.random() < .75) G.drops.push(pickup(e.x, e.y, { c: e.color }));
  else if (Math.random() < .16) G.gems.push(pickup(e.x, e.y));
}

export function updateEnemies(dt) {
  const P = G.P;
  for (const e of G.enemies) {
    e.t += dt; e.age += dt; if (e.flash > 0) e.flash -= dt;
    if (e.type === 'float') { e.x += e.vx * dt; e.y = e.baseY + Math.sin(e.t * 2.6) * 38; }
    else if (e.type === 'carrier') { e.x += e.vx * dt; e.y = e.baseY + Math.sin(e.t * 1.5) * 20; }
    else if (e.type === 'hop') {
      e.vy += 1100 * dt; e.x += e.vx * dt; e.y += e.vy * dt;
      const gy = groundY(e.x); if (e.y + e.r > gy) { e.y = gy - e.r; e.vy = -rnd(420, 620); }
    } else if (e.type === 'dive') {
      if (e.phase === 0) {
        e.x += e.vx * dt; e.y = e.baseY + Math.sin(e.t * 4) * 10;
        if (e.age > .6 && G.dead <= 0 && Math.abs(wd(e.x - P.x)) < 240) {
          const dx = wd(P.x - e.x), dy = P.y - e.y, m = Math.hypot(dx, dy) || 1, sp = 300 + G.level * 25;
          e.vx = dx / m * sp; e.vy = dy / m * sp; e.phase = 1;
        }
      } else {
        e.x += e.vx * dt; e.y += e.vy * dt;
        const gy = groundY(e.x); if (e.y > gy - e.r) { e.y = gy - e.r; e.vy = -Math.abs(e.vy) * .8; }
        if (e.y < TOP) { e.y = TOP; e.vy = Math.abs(e.vy); }
      }
    }
    if (G.level >= 1 && e.type !== 'carrier' && G.dead <= 0 && Math.random() < dt * (.05 + G.level * .035) && Math.abs(wd(e.x - P.x)) < view.W * .45) {
      const dx = wd(P.x - e.x), dy = P.y - e.y, m = Math.hypot(dx, dy) || 1;
      G.ebullets.push({ x: e.x, y: e.y, vx: dx / m * 220, vy: dy / m * 220, life: 4 });
    }
  }
}
