import { TOP } from './config.js';
import { G } from './state.js';
import { clamp, lerp, rnd } from './util.js';
import { surfaceBelow, collideCircle, touchesHazard, hazardBelow } from './terrain.js';
import { sfx } from './audio.js';
import { burst } from './fx.js';
import { inX, inY } from './input.js';
import { gameOver } from './game.js';
import { zoneAt, waterAt, inLava, lavaBelow } from './zones.js';
import { windForce } from './rules.js';

export function shoot(x, y, dir) { G.bullets.push({ x, y, vx: dir * 720 + G.P.vx * .3, life: .85 }); }

export function die() {
  const P = G.P;
  if (G.dead > 0 || P.inv > 0 || G.state !== 'play') return;
  G.lives--; G.dead = 1.8; G.shake = 14; G.own.sat = false; G.shield = 0;
  burst(P.x, P.y, '#ffcf4a', 40, 320); burst(P.x, P.y, '#ffffff', 20, 200); sfx('die');
}

export function updatePlayer(dt) {
  const P = G.P, own = G.own;
  if (G.dead > 0) {
    G.dead -= dt;
    if (G.dead <= 0) {
      if (G.lives < 0) { gameOver(); return; }
      Object.assign(P, { y: TOP + 90, vx: 0, vy: 0, spin: 0, inv: 2.5 });
      for (let i = 0; i < 100 && (hazardBelow(P.x, P.r) || lavaBelow(P.x, P.r)); i++) P.x += 20;
    }
    return;
  }
  const ix = inX(), iy = inY();
  const water = waterAt(P), grip = !own.anti && zoneAt(P.x, 'ice') ? .25 : 1;
  if (ix) P.face = Math.sign(ix);
  if (own.anti) {
    P.vx = lerp(P.vx, ix * 330, Math.min(1, 7 * dt));
    P.vy = lerp(P.vy, iy * 300, Math.min(1, 7 * dt));
  } else {
    P.vy += 1500 * dt * (water ? .25 : 1);
    if (water) { P.vy *= Math.max(0, 1 - 2.5 * dt); if (iy < 0) P.vy -= 1200 * dt; }
    if (own.thrust) P.vx = lerp(P.vx, ix * 330, Math.min(1, 6 * dt * grip));
    else {
      P.spin = clamp(P.spin + ix * 2.2 * dt, -1, 1);
      P.vx = lerp(P.vx, P.spin * 260, Math.min(1, 1.6 * dt * grip));
      if (!ix && Math.abs(P.vx) > 20) P.face = Math.sign(P.vx);
    }
  }
  P.vx += windForce() * dt;
  const prevBottom = P.y + P.r;
  P.x += P.vx * dt; P.y += P.vy * dt;
  collideCircle(P, prevBottom);
  const s = surfaceBelow(P.x, prevBottom);
  if (s && P.y + P.r > s.y) {
    P.y = s.y - P.r;
    if (own.anti) P.vy = Math.min(0, P.vy);
    else {
      let b = 640; if (own.thrust) { if (iy < 0) b = 860; else if (iy > 0) b = 380; }
      if (s.kind === 'mushroom') { b *= s.obj.bounce; s.obj.squash = 1; sfx('boing'); } else sfx('bounce');
      if (water) b *= .4;
      P.vy = -b;
      for (let i = 0; i < 5; i++) G.parts.push({ x: P.x + rnd(-10, 10), y: s.y, vx: rnd(-60, 60), vy: rnd(-80, -20), life: .4, max: .4, col: 'rgba(220,220,220,.7)', sz: rnd(1.5, 3) });
    }
  }
  if (G.shield <= 0 && (touchesHazard(P) || inLava(P))) die();
  if (P.y - P.r < TOP) { P.y = TOP + P.r; if (P.vy < 0) P.vy = 0; }
  P.ang += P.vx * dt / P.r;
  if (P.inv > 0) P.inv -= dt;
}
