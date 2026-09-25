import { TAU, TOP, HUDF, COLORS, SLOTS } from './config.js';
import { G, view } from './state.js';
import { rrect } from './util.js';
import { curLevel } from './game.js';
import { canBuy } from './pickups.js';
import { windRatio } from './rules.js';

export function hud() {
  const { ctx, W, H } = view, lv = curLevel();
  const grd = ctx.createLinearGradient(0, 0, 0, TOP); grd.addColorStop(0, 'rgba(6,7,13,.75)'); grd.addColorStop(1, 'rgba(6,7,13,0)');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, W, TOP);
  ctx.textBaseline = 'middle';
  // score
  ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = `600 17px ${HUDF}`; ctx.fillText(G.score.toString().padStart(6, '0'), 14, 21);
  ctx.font = `400 12px ${HUDF}`; ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillText(`World ${G.level + 1} · ${lv.name}`, 14, 50);
  // lives
  for (let i = 0; i < Math.max(0, G.lives); i++) { ctx.fillStyle = '#ffcf4a'; ctx.beginPath(); ctx.arc(W - 20 - i * 20, 21, 7, 0, TAU); ctx.fill(); }
  // power bar
  const n = SLOTS.length, sw = Math.min(92, (W - 250) / n), x0 = W / 2 - sw * n / 2;
  for (let i = 0; i < n; i++) {
    const s = SLOTS[i], x = x0 + i * sw, sel = G.sel === i, owned = s.id !== 'shield' && G.own[s.id];
    rrect(ctx, x + 2, 8, sw - 4, 26, 7);
    ctx.fillStyle = sel ? (canBuy(s.id) ? '#ffcf4a' : '#c75c5c') : owned ? 'rgba(120,255,170,.18)' : 'rgba(0,0,0,.45)'; ctx.fill();
    ctx.strokeStyle = sel ? '#fff' : 'rgba(255,255,255,.2)'; ctx.lineWidth = sel ? 2 : 1; ctx.stroke();
    ctx.textAlign = 'center'; ctx.font = `600 ${sw < 70 ? 10 : 11}px ${HUDF}`;
    ctx.fillStyle = sel ? '#1a1300' : owned ? '#9fffc0' : '#e6e2f0'; ctx.fillText(s.label, x + sw / 2, 21.5);
  }
  // color meters
  const mw = Math.min(78, (W - 230) / 3 - 10);
  for (let c = 0; c < 3; c++) {
    const x = W - 14 - (3 - c) * (mw + 10) + 10, y = 44, f = G.got[c] / G.need[c];
    rrect(ctx, x, y, mw, 13, 6.5); ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fill();
    if (f > 0) { rrect(ctx, x, y, Math.max(13, mw * f), 13, 6.5); ctx.fillStyle = COLORS[c]; ctx.fill(); }
    ctx.textAlign = 'center'; ctx.font = `600 10px ${HUDF}`; ctx.fillStyle = f >= 1 ? '#111' : '#fff';
    ctx.fillText(`${G.got[c]}/${G.need[c]}`, x + mw / 2, y + 7);
  }
  // wind
  const wr = windRatio();
  if (wr != null) {
    const cx = W / 2, cy = 50, len = wr * 30;
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - len, cy); ctx.lineTo(cx + len, cy); ctx.stroke();
    if (Math.abs(len) > 3) { const d = Math.sign(len); ctx.beginPath(); ctx.moveTo(cx + len + d * 2, cy); ctx.lineTo(cx + len - d * 6, cy - 5); ctx.lineTo(cx + len - d * 6, cy + 5); ctx.closePath(); ctx.fill(); }
    ctx.textAlign = 'center'; ctx.font = `400 10px ${HUDF}`; ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillText('Wind', cx, cy + 12);
  }
  // banner
  if (G.banner) {
    const a = Math.min(1, G.banner.t * 2);
    ctx.textAlign = 'center'; ctx.font = `600 ${Math.min(28, W / 22)}px ${HUDF}`;
    ctx.fillStyle = `rgba(0,0,0,${.45 * a})`; ctx.fillText(G.banner.text, W / 2 + 2, H * .33 + 2);
    ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillText(G.banner.text, W / 2, H * .33);
  }
  if (G.state === 'play' && G.level === 0 && !G.own.thrust && G.t > 3 && G.t < 22) {
    ctx.textAlign = 'center'; ctx.font = `400 13px ${HUDF}`; ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fillText('Tip: collect green gems until "Thrust" is lit, then activate it for full control', W / 2, H - 24);
  }
  if (G.state === 'clear' && G.clearT > 1.6) {
    ctx.textAlign = 'center'; ctx.font = `600 16px ${HUDF}`; ctx.fillStyle = `rgba(255,255,255,${.6 + .4 * Math.sin(G.t * 5)})`;
    ctx.fillText('Press FIRE or tap the screen for the next world', W / 2, H * .33 + 40);
  }
  const caves = curLevel().caves || [];
  if (G.state === 'clear' && caves.length) {
    ctx.textAlign = 'center'; ctx.font = `400 14px ${HUDF}`; ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fillText(`Secrets found: ${G.cavesUsed.size}/${caves.length}`, W / 2, H * .33 + 66);
  }
  if (G.paused) {
    ctx.fillStyle = 'rgba(6,7,13,.6)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = `600 24px ${HUDF}`; ctx.fillText('Paused', W / 2, H / 2 - 10);
    ctx.font = `400 14px ${HUDF}`; ctx.fillText('Press P, Space or tap the screen to continue', W / 2, H / 2 + 20);
  }
}
