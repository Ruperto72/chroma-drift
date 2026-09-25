import { TOP, COLORS } from './config.js';
import { LEVELS } from './levels.js';
import { G, view } from './state.js';
import { lerp, rnd, wd } from './util.js';
import { sfx } from './audio.js';
import { banner, burst } from './fx.js';
import { firing } from './input.js';
import { updatePlayer, die, shoot } from './player.js';
import { spawnWave, killEnemy, updateEnemies } from './enemies.js';
import { updateAllPickups } from './pickups.js';

export function curLevel() { return LEVELS[G.level % LEVELS.length]; }

export function newGame(state) {
  Object.assign(G, {
    own: { thrust: false, anti: false, rapid: false, double: false, sat: false },
    state, score: 0, lives: 3, level: 0, sel: -1, shield: 0, fireCD: 0, dead: 0, t: 0, clearT: 0, sat: 0, banner: null,
  });
  startLevel();
}

export function startLevel() {
  const extra = Math.floor(G.level / LEVELS.length) * 2;
  G.need = curLevel().need.map(n => n + extra);
  G.got = [0, 0, 0]; G.sat = 0; G.spawnT = 1.8; G.clearT = 0;
  G.P = { x: 0, y: TOP + 120, vx: 0, vy: 0, r: 18, spin: G.state === 'menu' ? .45 : 0, ang: 0, face: 1, inv: 2 };
  G.camX = G.P.x - view.W / 2;
  G.spark = { x: G.P.x - 40, y: G.P.y - 30, a: 0 };
  G.enemies = []; G.bullets = []; G.ebullets = []; G.drops = []; G.gems = []; G.parts = []; G.texts = [];
  if (G.state !== 'menu') banner(`World ${G.level + 1}: ${curLevel().name}`);
}

export function levelClear() {
  G.state = 'clear'; G.clearT = 0;
  for (const e of G.enemies) burst(e.x, e.y, e.color >= 0 ? COLORS[e.color] : '#fff', 10);
  G.enemies = []; G.ebullets = [];
  const bonus = 1000 * (G.level + 1); G.score += bonus;
  banner('The colours are back!  +' + bonus);
  sfx('clear'); sfx('clear', .18); sfx('gem', .4);
}

export function gameOver() {
  G.state = 'over';
  const rec = G.score > G.best; if (rec) { G.best = G.score; try { localStorage.setItem('chromaDriftBest', G.best); } catch (e) {} }
  document.getElementById('overText').textContent = `Score: ${G.score}  ·  Reached world ${G.level + 1}` + (rec ? '  ·  New high score!' : `  ·  High score: ${G.best}`);
  document.getElementById('over').hidden = false;
}

export function tryContinue() {
  if (G.paused) { G.paused = false; return true; }
  if (G.state === 'clear' && G.clearT > 1.6) { G.level++; G.state = 'play'; startLevel(); return true; }
  return false;
}

export function update(dt) {
  G.t += dt;
  if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
  if (G.state === 'menu') { updatePlayer(dt); }
  if (G.state === 'play' || G.state === 'clear') {
    updatePlayer(dt);
    if (G.state === 'over') return;
    const { P, spark, own } = G;
    if (G.shield > 0) G.shield -= dt;

    // fire
    G.fireCD -= dt;
    if (G.state === 'play' && firing() && G.fireCD <= 0 && G.dead <= 0) {
      shoot(P.x + P.face * P.r, P.y, P.face);
      if (own.double) shoot(P.x - P.face * P.r, P.y, -P.face);
      if (own.sat) shoot(spark.x, spark.y, P.face);
      G.fireCD = own.rapid ? .11 : .26; sfx('shot');
    }

    // spark
    if (own.sat) {
      spark.a += dt * 3;
      const tx = P.x - P.face * 46, ty = P.y - 34 + Math.sin(spark.a) * 8;
      spark.x += wd(tx - spark.x) * Math.min(1, 5 * dt); spark.y += (ty - spark.y) * Math.min(1, 5 * dt);
    }

    if (G.state === 'play') {
      G.spawnT -= dt;
      if (G.spawnT <= 0 && G.enemies.length < 7 + G.level * 2) { spawnWave(); G.spawnT = Math.max(1.1, 2.4 + rnd(0, 1.5) - G.level * .25); }
      const prog = (G.got[0] + G.got[1] + G.got[2]) / (G.need[0] + G.need[1] + G.need[2]);
      G.sat = lerp(G.sat, .06 + prog * .4, Math.min(1, 2 * dt));
    } else {
      G.clearT += dt; G.sat = Math.min(1, G.sat + dt * .45);
    }

    updateEnemies(dt);

    // bullets
    for (const b of G.bullets) {
      b.x += b.vx * dt; b.life -= dt;
      for (const e of G.enemies) {
        if (e.dead) continue;
        if (Math.abs(wd(b.x - e.x)) < e.r + 7 && Math.abs(b.y - e.y) < e.r + 7) {
          b.life = 0; e.hp--;
          if (e.hp <= 0) killEnemy(e); else { e.flash = .1; burst(b.x, b.y, '#ffffff', 4, 120); }
          break;
        }
      }
    }
    G.bullets = G.bullets.filter(b => b.life > 0);
    for (const b of G.ebullets) { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; }

    // collisions with player & spark
    if (G.dead <= 0 && G.state === 'play') {
      for (const e of G.enemies) {
        if (e.dead) continue;
        const dx = wd(e.x - P.x), dy = e.y - P.y;
        if (dx * dx + dy * dy < (P.r + e.r * .8) ** 2) { if (G.shield > 0) killEnemy(e); else if (P.inv <= 0) { die(); break; } }
      }
      for (const b of G.ebullets) {
        const dx = wd(b.x - P.x), dy = b.y - P.y;
        if (b.life > 0 && dx * dx + dy * dy < (P.r + 4) ** 2) { b.life = 0; if (G.shield <= 0 && P.inv <= 0) die(); }
      }
    }
    if (own.sat) {
      for (const e of G.enemies) if (!e.dead && Math.hypot(wd(e.x - spark.x), e.y - spark.y) < e.r + 10) killEnemy(e);
      for (const b of G.ebullets) if (Math.hypot(wd(b.x - spark.x), b.y - spark.y) < 12) { b.life = 0; burst(b.x, b.y, '#9ff', 5, 90); }
    }
    G.ebullets = G.ebullets.filter(b => b.life > 0 && b.y < view.H && b.y > 0);
    const cx = G.camX + view.W / 2;
    G.enemies = G.enemies.filter(e => !e.dead && !(e.age > 4 && Math.abs(wd(e.x - cx)) > view.W / 2 + 520));

    updateAllPickups(dt);
  }

  // particles / texts / camera
  for (const p of G.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.vx *= .98; p.life -= dt; }
  G.parts = G.parts.filter(p => p.life > 0);
  for (const t of G.texts) { t.t += dt; t.y -= 30 * dt; }
  G.texts = G.texts.filter(t => t.t < 1);
  const tx = G.P.x - view.W / 2 + G.P.face * view.W * .12;
  G.camX += (tx - G.camX) * Math.min(1, 3 * dt);
  if (G.shake > 0) G.shake = Math.max(0, G.shake - 30 * dt);
}
