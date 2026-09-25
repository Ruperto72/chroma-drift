import { TAU, L, TOP, HUDF, COLORS } from './config.js';
import { G, view } from './state.js';
import { mod, wd, clamp, rnd, tint, hash, rrect } from './util.js';
import { groundAt, surfaceBelow, objects, objBox } from './terrain.js';
import { curLevel } from './game.js';
import { allZones, waterSurface } from './zones.js';

const sx = x => mod(x - G.camX + 300, L) - 300;

function drawDecor(kind, wx, x, gy, h, s, pal) {
  const { ctx } = view;
  if (kind === 'meadow') {
    if (h > .62) {
      const th = 30 + h * 30;
      ctx.fillStyle = tint('#5a3b22', s); ctx.fillRect(x - 3, gy - th, 6, th + 4);
      ctx.fillStyle = tint(pal.grass, s * .9); ctx.beginPath(); ctx.arc(x, gy - th, 16 + h * 8, 0, TAU); ctx.fill();
      ctx.fillStyle = tint(pal.deco, s); ctx.beginPath(); ctx.arc(x + 6, gy - th - 4, 3.5, 0, TAU); ctx.arc(x - 7, gy - th + 5, 3, 0, TAU); ctx.fill();
    } else if (h > .3) {
      for (let i = 0; i < 3; i++) {
        const fx = x + (i - 1) * 12, fy = groundAt(wx + (i - 1) * 12);
        if (fy == null) continue;
        ctx.strokeStyle = tint(pal.grass, s); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 14 - i * 3); ctx.stroke();
        ctx.fillStyle = tint(pal.deco, s); ctx.beginPath(); ctx.arc(fx, fy - 15 - i * 3, 4, 0, TAU); ctx.fill();
      }
    }
  } else if (kind === 'dusk') {
    if (h > .6) {
      const th = 36 + h * 30;
      ctx.strokeStyle = tint('#2a1a24', s); ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath();
      ctx.moveTo(x, gy + 2); ctx.lineTo(x, gy - th);
      ctx.moveTo(x, gy - th * .6); ctx.lineTo(x - 14, gy - th * .85);
      ctx.moveTo(x, gy - th * .75); ctx.lineTo(x + 12, gy - th - 6); ctx.stroke(); ctx.lineCap = 'butt';
    } else if (h > .35) {
      ctx.fillStyle = tint('#3b2440', s); ctx.fillRect(x - 2, gy - 34, 4, 36);
      ctx.fillStyle = tint(pal.deco, s, .25); ctx.beginPath(); ctx.arc(x, gy - 38, 12, 0, TAU); ctx.fill();
      ctx.fillStyle = tint(pal.deco, s); ctx.beginPath(); ctx.arc(x, gy - 38, 5, 0, TAU); ctx.fill();
    }
  } else if (kind === 'icicles') {
    if (h > .55) {
      ctx.fillStyle = tint('#f4fbff', s); ctx.beginPath(); ctx.ellipse(x, gy + 2, 26 + h * 14, 10 + h * 6, 0, Math.PI, 0); ctx.fill();
    } else if (h > .3) {
      ctx.fillStyle = tint('#bfe9ff', s, .9); ctx.beginPath();
      for (let i = -1; i <= 1; i++) { const bx = x + i * 8, sh = 14 + (1 - Math.abs(i)) * 12 + h * 10; ctx.moveTo(bx - 4, gy + 2); ctx.lineTo(bx, gy - sh); ctx.lineTo(bx + 4, gy + 2); }
      ctx.fill();
    }
  } else if (kind === 'embers') {
    if (h > .5) {
      const th = 24 + h * 34;
      ctx.fillStyle = tint('#1a0d0a', s); ctx.fillRect(x - 5, gy - th, 10, th + 4);
      ctx.fillStyle = `rgba(255,${(120 + Math.sin(G.t * 4 + h * 9) * 40) | 0},40,.9)`; ctx.beginPath(); ctx.arc(x, gy - th, 3.5, 0, TAU); ctx.fill();
    }
  }
}

function drawWorld() {
  const { ctx, W, H } = view, camX = G.camX, lv = curLevel().palette, s = G.sat;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, tint(lv.sky[0], s)); g.addColorStop(1, tint(lv.sky[1], s));
  ctx.fillStyle = g; ctx.fillRect(-30, -30, W + 60, H + 60);
  // sun
  ctx.fillStyle = tint(lv.sun, s, .85); ctx.beginPath(); ctx.arc(W * .8, TOP + 70, 34, 0, TAU); ctx.fill();
  ctx.fillStyle = tint(lv.sun, s, .18); ctx.beginPath(); ctx.arc(W * .8, TOP + 70, 58, 0, TAU); ctx.fill();
  // far hills
  ctx.fillStyle = tint(lv.far, s); ctx.beginPath(); ctx.moveTo(-30, H);
  for (let x = -30; x <= W + 38; x += 8) { const w = camX * .22 + x; ctx.lineTo(x, H - 210 - 42 * Math.sin(w * .0042) - 24 * Math.sin(w * .011 + 2)); }
  ctx.lineTo(W + 38, H); ctx.fill();
  // near hills
  ctx.fillStyle = tint(lv.near, s); ctx.beginPath(); ctx.moveTo(-30, H);
  for (let x = -30; x <= W + 38; x += 8) { const w = camX * .5 + x; ctx.lineTo(x, H - 150 - 30 * Math.sin(w * .006 + 1) - 14 * Math.sin(w * .017)); }
  ctx.lineTo(W + 38, H); ctx.fill();
  // deco sitting on ground
  const decor = curLevel().decor;
  const step = 200, k0 = Math.floor((camX - 60) / step), k1 = Math.floor((camX + W + 60) / step);
  for (let k = k0; k <= k1; k++) {
    const wx = k * step, gy = groundAt(wx);
    if (gy != null) drawDecor(decor, wx, wx - camX, gy, hash(mod(k, L / step)), s, lv);
  }
  // ground (holes drop below the screen)
  const gAt = x => groundAt(camX + x) ?? H + 40;
  ctx.fillStyle = tint(lv.ground, s); ctx.beginPath(); ctx.moveTo(-30, H + 30);
  for (let x = -30; x <= W + 38; x += 6) ctx.lineTo(x, gAt(x));
  ctx.lineTo(W + 38, H + 30); ctx.fill();
  ctx.strokeStyle = tint(lv.grass, s); ctx.lineWidth = 5; ctx.beginPath();
  for (let x = -30; x <= W + 38; x += 6) { const y = gAt(x); x === -30 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
  ctx.stroke();
}

function drawObjects() {
  const { ctx, W } = view, s = G.sat;
  for (const o of objects()) {
    if (o.gone) continue;
    const x = sx(o.x); if (x < -o.w - 40 || x > W + o.w + 40) continue;
    const { top } = objBox(o), l = x - o.w / 2;
    ctx.save();
    if (o.type === 'rock') {
      ctx.fillStyle = tint('#8a8f99', s); rrect(ctx, l, top, o.w, o.h + 8, 10); ctx.fill();
      ctx.fillStyle = tint('#b9bec8', s); rrect(ctx, l + 5, top + 4, o.w - 10, 7, 3.5); ctx.fill();
    } else if (o.type === 'pillar') {
      ctx.fillStyle = tint('#7a6a5a', s); ctx.fillRect(l, top, o.w, o.h + 8);
      ctx.fillStyle = tint('#5e5044', s); for (let y = top + 18; y < top + o.h; y += 22) ctx.fillRect(l, y, o.w, 3);
      ctx.fillStyle = tint('#9c8a76', s); ctx.fillRect(l - 4, top, o.w + 8, 8);
    } else if (o.type === 'mushroom') {
      ctx.fillStyle = tint('#f3e6c8', s); ctx.fillRect(x - 7, top + 10, 14, o.h);
      ctx.translate(x, top + 14); ctx.scale(1 + o.squash * .25, 1 - o.squash * .35);
      ctx.fillStyle = tint('#ff5c7a', s); ctx.beginPath(); ctx.ellipse(0, 0, o.w / 2, 14, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(-9, -6, 3, 0, TAU); ctx.arc(6, -9, 2.5, 0, TAU); ctx.arc(12, -3, 2, 0, TAU); ctx.fill();
    } else if (o.type === 'cloud') {
      ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.beginPath();
      ctx.ellipse(x, top + 7, o.w / 2, 9, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(x - o.w * .2, top + 3, 11, 0, TAU); ctx.arc(x + o.w * .15, top + 1, 14, 0, TAU); ctx.fill();
    } else if (o.type === 'thorns') {
      const n = Math.max(2, Math.round(o.w / 10)), sw = o.w / n, base = top + o.h;
      ctx.fillStyle = tint('#5a2a4a', s); ctx.beginPath(); ctx.moveTo(l, base + 4);
      for (let i = 0; i < n; i++) { ctx.lineTo(l + i * sw + sw / 2, top); ctx.lineTo(l + (i + 1) * sw, base); }
      ctx.lineTo(l + o.w, base + 4); ctx.closePath(); ctx.fill();
    } else if (o.type === 'crystal') {
      const cy = top + o.h / 2;
      ctx.fillStyle = o.flash > 0 ? '#ffffff' : COLORS[o.c];
      ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + o.w / 2, cy); ctx.lineTo(x, top + o.h); ctx.lineTo(x - o.w / 2, cy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.moveTo(x, top + 4); ctx.lineTo(x + 5, cy); ctx.lineTo(x, cy + 4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(20,16,28,.7)'; ctx.lineWidth = 1.5; ctx.beginPath();
      if (o.hp < 3) { ctx.moveTo(x - 6, cy - 6); ctx.lineTo(x + 2, cy + 2); ctx.lineTo(x - 1, cy + 9); }
      if (o.hp < 2) { ctx.moveTo(x + 7, cy - 4); ctx.lineTo(x + 1, cy - 1); }
      ctx.stroke();
    }
    ctx.restore();
  }
}

export function zoneSpan(z) {
  const x0 = wd(z.x - (G.camX + view.W / 2)) + view.W / 2 - z.w / 2;
  return [x0, x0 + z.w];
}

function drawZones(pass) {
  const { ctx, W, H } = view, camX = G.camX;
  const gAt = x => groundAt(camX + x) ?? H + 40;
  for (const z of allZones()) {
    const [x0, x1] = zoneSpan(z);
    if (x1 < -40 || x0 > W + 40) continue;
    if (pass === 'ground' && z.type === 'ice') {
      ctx.strokeStyle = tint('#e6f8ff', G.sat, .95); ctx.lineWidth = 7; ctx.beginPath();
      for (let x = x0; x <= x1; x += 6) x === x0 ? ctx.moveTo(x, gAt(x)) : ctx.lineTo(x, gAt(x));
      ctx.stroke();
    } else if (pass === 'ground' && z.type === 'lava') {
      ctx.fillStyle = `rgba(255,${(90 + 40 * Math.sin(G.t * 3)) | 0},30,${.75 + .25 * Math.sin(G.t * 5)})`;
      ctx.beginPath(); ctx.moveTo(x0, H + 30);
      for (let x = x0; x <= x1; x += 6) ctx.lineTo(x, gAt(x) - 4);
      ctx.lineTo(x1, H + 30); ctx.fill();
    } else if (pass === 'water' && z.type === 'water') {
      const top = waterSurface(z);
      ctx.fillStyle = 'rgba(80,170,255,.45)'; ctx.beginPath(); ctx.moveTo(x0, top);
      for (let x = x0; x <= x1; x += 6) ctx.lineTo(x, Math.max(top, gAt(x)));
      ctx.lineTo(x1, top); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(220,245,255,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, top); ctx.lineTo(x1, top); ctx.stroke();
    }
  }
}

function drawPlayer() {
  if (G.dead > 0 || G.state === 'over') return;
  const { ctx } = view, P = G.P;
  if (P.inv > 0 && Math.floor(G.t * 12) % 2) return;
  const x = sx(P.x), y = P.y, r = P.r, gy = surfaceBelow(P.x, P.y + P.r)?.y ?? view.H + 40;
  const k = clamp(1 - (gy - y) / 320, .2, 1);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, gy + 1, r * k, 4 * k, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.translate(x, y);
  const g = ctx.createRadialGradient(-r * .35, -r * .4, 2, 0, 0, r);
  g.addColorStop(0, '#fff8dc'); g.addColorStop(.45, '#ffcf4a'); g.addColorStop(1, '#d9642a');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip(); ctx.rotate(P.ang);
  ctx.strokeStyle = 'rgba(140,50,10,.4)'; ctx.lineWidth = 3.5;
  for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-r, i * r * .55); ctx.quadraticCurveTo(0, i * r * .55 + 9, r, i * r * .55); ctx.stroke(); }
  ctx.restore();
  const f = P.face;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(f * 4 - 5, -4, 4.3, 5.6, 0, 0, TAU); ctx.ellipse(f * 4 + 5, -4, 4.3, 5.6, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#1b1030';
  ctx.beginPath(); ctx.arc(f * 5.5 - 5, -3, 2.2, 0, TAU); ctx.arc(f * 5.5 + 5, -3, 2.2, 0, TAU); ctx.fill();
  if (G.shield > 0 && (G.shield > 2 || Math.floor(G.t * 10) % 2)) {
    ctx.strokeStyle = `hsla(${(G.t * 200) % 360},100%,70%,.85)`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, r + 7, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}

function drawSpark() {
  if (!G.own.sat || G.state === 'over') return;
  const { ctx } = view, spark = G.spark;
  const x = sx(spark.x), y = spark.y;
  ctx.fillStyle = 'rgba(120,255,255,.2)'; ctx.beginPath(); ctx.arc(x, y, 16, 0, TAU); ctx.fill();
  ctx.fillStyle = '#bfffff'; ctx.beginPath(); ctx.arc(x, y, 8, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 3; i++) { const a = spark.a * 2 + i * TAU / 3; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 13, y + Math.sin(a) * 13, 2, 0, TAU); ctx.fill(); }
}

function drawGemShape(x, y, r, t) {
  const { ctx } = view, p = 1 + Math.sin(t * 6) * .12;
  ctx.fillStyle = '#b8ffea'; ctx.beginPath(); ctx.moveTo(x, y - r * p); ctx.lineTo(x + r * .7, y); ctx.lineTo(x, y + r * p); ctx.lineTo(x - r * .7, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(x - 1.5, y - r * .5, 3, 3);
}

function drawEnemy(e) {
  const { ctx, W } = view;
  const x = sx(e.x); if (x < -60 || x > W + 60) return;
  const col = e.flash > 0 ? '#ffffff' : e.color >= 0 ? COLORS[e.color] : '#8f949e';
  ctx.save(); ctx.translate(x, e.y); ctx.fillStyle = col;
  if (e.type === 'float') {
    ctx.beginPath(); ctx.arc(0, 0, e.r, Math.PI, 0); ctx.lineTo(e.r, 4);
    for (let i = 4; i >= -4; i--) ctx.lineTo(i / 4 * e.r, 6 + (i % 2 ? 7 : 2) + Math.sin(e.t * 8 + i) * 2.5);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#12101c'; ctx.beginPath(); ctx.arc(-5, -3, 2.6, 0, TAU); ctx.arc(5, -3, 2.6, 0, TAU); ctx.fill();
  } else if (e.type === 'dive') {
    const a = e.phase ? Math.atan2(e.vy, e.vx) : (e.vx < 0 ? Math.PI : 0);
    ctx.rotate(a); ctx.beginPath(); ctx.moveTo(e.r + 4, 0); ctx.lineTo(-e.r, -e.r * .8); ctx.lineTo(-e.r * .4, 0); ctx.lineTo(-e.r, e.r * .8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#12101c'; ctx.beginPath(); ctx.arc(3, 0, 2.6, 0, TAU); ctx.fill();
  } else if (e.type === 'hop') {
    const q = clamp(-e.vy / 1600, -.25, .3); ctx.scale(1 - q * .6, 1 + q);
    rrect(ctx, -e.r, -e.r, e.r * 2, e.r * 2, 6); ctx.fill();
    ctx.fillStyle = '#12101c'; ctx.fillRect(-7, -5, 4, 5); ctx.fillRect(3, -5, 4, 5);
  } else {
    ctx.fillStyle = e.flash > 0 ? '#fff' : '#3b3354'; ctx.strokeStyle = '#c7b8ff'; ctx.lineWidth = 2.5;
    ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + e.t * .5; ctx.lineTo(Math.cos(a) * e.r, Math.sin(a) * e.r); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    drawGemShape(0, 0, 8, e.t);
    ctx.fillStyle = '#c7b8ff'; for (let i = 0; i < e.hp; i++) ctx.fillRect(-9 + i * 7, e.r + 5, 5, 3);
  }
  ctx.restore();
}

function drawPickups() {
  const { ctx, W } = view;
  for (const d of G.drops) {
    if (d.t > 10 && Math.floor(d.t * 8) % 2) continue;
    const x = sx(d.x); if (x < -20 || x > W + 20) continue;
    ctx.fillStyle = COLORS[d.c]; ctx.beginPath(); ctx.moveTo(x, d.y - 11);
    ctx.quadraticCurveTo(x + 8, d.y, x, d.y + 7); ctx.quadraticCurveTo(x - 8, d.y, x, d.y - 11); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(x - 2, d.y - 1, 1.8, 0, TAU); ctx.fill();
  }
  for (const g of G.gems) {
    if (g.t > 10 && Math.floor(g.t * 8) % 2) continue;
    const x = sx(g.x); if (x < -20 || x > W + 20) continue;
    ctx.fillStyle = 'rgba(184,255,234,.25)'; ctx.beginPath(); ctx.arc(x, g.y, 13, 0, TAU); ctx.fill();
    drawGemShape(x, g.y, 9, g.t);
  }
}

export function render() {
  const { ctx, S } = view;
  ctx.setTransform(S, 0, 0, S, 0, 0);
  ctx.save();
  if (G.shake > 0) ctx.translate(rnd(-G.shake, G.shake), rnd(-G.shake, G.shake));
  drawWorld();
  drawZones('ground');
  drawObjects();
  drawPickups();
  for (const e of G.enemies) drawEnemy(e);
  ctx.fillStyle = '#fff6c2';
  for (const b of G.bullets) { const x = sx(b.x); rrect(ctx, x - 7, b.y - 2.5, 14, 5, 2.5); ctx.fill(); }
  ctx.fillStyle = '#ff8a3d';
  for (const b of G.ebullets) { ctx.beginPath(); ctx.arc(sx(b.x), b.y, 4, 0, TAU); ctx.fill(); }
  drawSpark(); drawPlayer();
  drawZones('water');
  for (const m of G.embers) {
    const x = sx(m.x);
    ctx.fillStyle = 'rgba(255,140,40,.35)'; ctx.beginPath(); ctx.arc(x, m.y, 8, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(x, m.y, 3.5, 0, TAU); ctx.fill();
  }
  for (const p of G.parts) { ctx.globalAlpha = clamp(p.life / p.max, 0, 1); ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(sx(p.x), p.y, p.sz, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `600 13px ${HUDF}`;
  for (const t of G.texts) { ctx.globalAlpha = 1 - t.t; ctx.fillStyle = t.col; ctx.fillText(t.text, sx(t.x), t.y - 20); }
  ctx.globalAlpha = 1;
  ctx.restore();
}
