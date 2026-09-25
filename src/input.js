import { G } from './state.js';
import { clamp } from './util.js';
import { tryContinue } from './game.js';
import { activate } from './pickups.js';

export const keys = {}, touch = { x: 0, y: 0, fire: false };

export const inX = () => G.state === 'menu' ? 0 : clamp((keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0) + touch.x, -1, 1);
export const inY = () => G.state === 'menu' ? 0 : clamp((keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0) + touch.y, -1, 1);
export const firing = () => keys.Space || keys.KeyJ || touch.fire;

export function initInput() {
  addEventListener('keydown', e => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    keys[e.code] = true;
    if (e.code === 'Space' || e.code === 'KeyJ') tryContinue();
    if (['Enter', 'ShiftLeft', 'ShiftRight', 'KeyK'].includes(e.code) && G.state === 'play') activate();
    if (e.code === 'KeyP' && (G.state === 'play' || G.state === 'clear')) G.paused = !G.paused;
  });
  addEventListener('keyup', e => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play') G.paused = true; });
  addEventListener('pointerdown', () => { tryContinue(); });

  const tUI = document.getElementById('touch'), zone = document.getElementById('zone'), base = document.getElementById('base'), knob = document.getElementById('knob');
  const showTouch = () => { tUI.hidden = false; };
  if (matchMedia('(pointer: coarse)').matches) showTouch();
  addEventListener('touchstart', showTouch, { once: true, passive: true });
  let stickId = null, ox = 0, oy = 0;
  zone.addEventListener('pointerdown', e => {
    stickId = e.pointerId; zone.setPointerCapture(e.pointerId); ox = e.clientX; oy = e.clientY;
    base.style.left = ox + 'px'; base.style.top = oy + 'px'; base.classList.add('on'); knob.style.transform = 'translate(-50%,-50%)';
  });
  zone.addEventListener('pointermove', e => {
    if (e.pointerId !== stickId) return;
    let dx = e.clientX - ox, dy = e.clientY - oy; const m = Math.hypot(dx, dy), R = 55;
    if (m > R) { dx *= R / m; dy *= R / m; }
    touch.x = Math.abs(dx / R) < .18 ? 0 : dx / R; touch.y = Math.abs(dy / R) < .3 ? 0 : dy / R;
    knob.style.transform = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
  });
  const stickEnd = e => { if (e.pointerId !== stickId) return; stickId = null; touch.x = touch.y = 0; base.classList.remove('on'); };
  zone.addEventListener('pointerup', stickEnd); zone.addEventListener('pointercancel', stickEnd);
  const bFire = document.getElementById('bFire'), bPow = document.getElementById('bPow');
  bFire.addEventListener('pointerdown', e => { bFire.setPointerCapture(e.pointerId); touch.fire = true; });
  ['pointerup', 'pointercancel'].forEach(n => bFire.addEventListener(n, () => { touch.fire = false; }));
  bPow.addEventListener('pointerdown', () => { if (G.state === 'play') activate(); });
}
