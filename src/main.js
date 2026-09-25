import { G, view } from './state.js';
import { newGame, update } from './game.js';
import { render } from './render.js';
import { hud } from './hud.js';
import { initInput } from './input.js';
import { initAudio } from './audio.js';

const cv = document.getElementById('c');
view.ctx = cv.getContext('2d');

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2), r = cv.getBoundingClientRect();
  cv.width = Math.max(1, Math.round(r.width * dpr));
  cv.height = Math.max(1, Math.round(r.height * dpr));
  view.S = Math.min(cv.height / 540, cv.width / 640);
  view.W = cv.width / view.S; view.H = cv.height / view.S;
}
addEventListener('resize', resize); resize();

initInput();

let last = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  const dt = Math.min(1 / 30, (ts - last) / 1000 || 0); last = ts;
  if (!G.paused && G.state !== 'over') update(dt);
  render();
  if (G.state !== 'menu') hud();
}

const menu = document.getElementById('menu'), over = document.getElementById('over');
document.getElementById('bestMenu').textContent = G.best ? `High score: ${G.best}` : '';
function start() {
  initAudio();
  menu.hidden = true; over.hidden = true; G.paused = false;
  newGame('play');
}
document.getElementById('start').addEventListener('click', start);
document.getElementById('again').addEventListener('click', start);

newGame('menu');
requestAnimationFrame(frame);
