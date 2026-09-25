# Delprojekt 0 – Modulstruktur med Vite: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Flytta enfilsprototypen `index.html` till ES-moduler under `src/` med Vite som dev-server/byggverktyg och Vitest för tester – utan att spelets beteende ändras.

**Architecture:** Allt spelglobalt tillstånd (dagens `G`, `P`, `spark`, `own`, entitetslistor, `camX`, `shake`, `paused`, `best`) samlas i ett exporterat muterbart objekt `G` i `src/state.js`; skal-/canvasvärden (`W`, `H`, `S`, `ctx`) i `view` i samma fil. Funktionerna flyttas i stort sett ordagrant till moduler per ansvar och byter lösa variabler mot `G.x`/`view.x`. Cirkulära importer förekommer (t.ex. `game.js` ↔ `player.js`) men används bara inuti funktioner, aldrig på modulens toppnivå, vilket ES-moduler hanterar.

**Tech Stack:** Vanilla JS (ES-moduler), Canvas 2D, WebAudio, Vite (dev), Vitest (dev).

**Spec:** `docs/superpowers/specs/2026-09-25-world-variation-design.md` (avsnitt "Delprojekt 0 – Modulstruktur")

## Global Constraints

- Spelet ska bete sig identiskt: samma fysik, texter, ljud, touchkontroller och localStorage-nyckel `chromaDriftBest`.
- Inga runtime-beroenden; `vite` och `vitest` endast som `devDependencies`.
- UI-texter på engelska, kod på engelska (CLAUDE.md).
- `npm run dev` startar dev-server; `npm run build` ger statisk mapp i `dist/`.
- Unika namn på det gemensamma tillståndet: `G` (spel) och `view` (skala/canvas) – används av alla senare delprojekt.

## Review Focus

1. **Touchkontroller på mobil** – joysticken, FIRE (håll in) och POWER ska fungera som förut; kontrolleras manuellt i Task 3 via LAN-adress från `npm run dev`.
2. **Tangentbordsflöde** – mellanslag fortsätter efter världsbyte och avslutar paus, P växlar paus, byte av flik pausar automatiskt; manuellt i Task 3.
3. **Rekord överlever omladdning** – efter game over visas "High score" i menyn efter F5; manuellt i Task 3.
4. **Byggd version från undermapp** – `dist/` ska fungera även när den inte ligger i webbserverns rot (relativa sökvägar, `base: './'`); kontrolleras med `npm run preview` och genom att granska `dist/index.html` i Task 2.
5. **Storleksändring/rotation mitt i spelet** – spelet skalas om utan att fastna eller sträckas; manuellt i Task 3.

---

## Filstruktur

| Fil | Ansvar |
|---|---|
| `package.json` | npm-skript och dev-beroenden |
| `vite.config.js` | `base: './'`, `server.host: true` (LAN för mobiltest) |
| `index.html` | Markup + CSS; laddar `src/main.js` |
| `src/config.js` | `TAU`, `L`, `TOP`, `HUDF`, `COLORS`, `SLOTS` |
| `src/levels.js` | `LEVELS` |
| `src/util.js` | `mod`, `wd`, `clamp`, `lerp`, `rnd`, `rgbOf`, `tint`, `hash`, `rrect(ctx, …)` |
| `src/state.js` | `view`, `G` |
| `src/terrain.js` | `groundY` |
| `src/audio.js` | `initAudio`, `sfx` |
| `src/fx.js` | `banner`, `addText`, `burst` |
| `src/game.js` | `curLevel`, `newGame`, `startLevel`, `levelClear`, `gameOver`, `tryContinue`, `update` |
| `src/player.js` | `updatePlayer`, `die`, `shoot` |
| `src/enemies.js` | `spawnWave`, `killEnemy`, `updateEnemies` |
| `src/pickups.js` | `pickup`, `canBuy`, `activate`, `updateAllPickups` |
| `src/input.js` | `keys`, `touch`, `inX`, `inY`, `firing`, `initInput` |
| `src/render.js` | `render` (och interna draw-funktioner) |
| `src/hud.js` | `hud` |
| `src/main.js` | canvas, `resize`, frame-loop, menyknappar, start |
| `test/util.test.js`, `test/terrain.test.js` | Vitest |

Jämfört med specens fillista tillkommer `game.js` (spelflöde och `update`) och `fx.js` (effekthjälpare), och det gemensamma objektet heter `G` i stället för `game` – specen uppdateras i Task 3.

---

### Task 1: Vite-uppsättning och grundmoduler med tester

**Files:**
- Create: `package.json`, `vite.config.js`, `src/config.js`, `src/util.js`, `src/state.js`, `src/terrain.js`
- Test: `test/util.test.js`, `test/terrain.test.js`

**Interfaces:**
- Consumes: –
- Produces:
  - `config.js`: `TAU: number`, `L = 4800`, `TOP = 72`, `HUDF: string`, `COLORS: string[3]`, `SLOTS: {id,label}[6]`
  - `util.js`: `mod(a,n)`, `wd(a)`, `clamp(v,a,b)`, `lerp(a,b,t)`, `rnd(a,b)`, `rgbOf(hex)`, `tint(hex,s,a=1): string`, `hash(k)`, `rrect(ctx,x,y,w,h,r)` (bygger path, fyller inte)
  - `state.js`: `view = { W, H, S, ctx }`, `G` (alla spelfält, se kod)
  - `terrain.js`: `groundY(x): number` (skärm-y, läser `view.H`)

- [ ] **Step 1: Skapa `package.json` och installera**

```json
{
  "name": "chroma-drift",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  }
}
```

Run: `npm install -D vite vitest`
Expected: `node_modules/` skapas, `devDependencies` fylls i.

- [ ] **Step 2: Skapa `vite.config.js`**

```js
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { host: true },
});
```

- [ ] **Step 3: Skriv testerna**

`test/util.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { mod, wd, clamp, lerp, tint } from '../src/util.js';
import { L } from '../src/config.js';

describe('mod', () => {
  it('wraps negative values', () => expect(mod(-1, 10)).toBe(9));
  it('wraps values above n', () => expect(mod(25, 10)).toBe(5));
});

describe('wd', () => {
  it('gives shortest signed distance across the world loop', () => {
    expect(wd(100)).toBe(100);
    expect(wd(L - 100)).toBe(-100);
    expect(wd(-(L - 50))).toBe(50);
  });
});

describe('clamp / lerp', () => {
  it('clamps', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });
  it('lerps', () => expect(lerp(10, 20, .25)).toBe(12.5));
});

describe('tint', () => {
  it('keeps full colour at saturation 1', () => expect(tint('#ff0000', 1)).toBe('rgba(255,0,0,1)'));
  it('goes to luminance grey at saturation 0', () => expect(tint('#ff0000', 0, .5)).toBe('rgba(76,76,76,0.5)'));
});
```

`test/terrain.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { groundY } from '../src/terrain.js';
import { view } from '../src/state.js';
import { L } from '../src/config.js';

describe('groundY', () => {
  it('stays within the hill amplitude band', () => {
    view.H = 540;
    for (let x = 0; x < L; x += 10) {
      const y = groundY(x);
      expect(y).toBeGreaterThanOrEqual(540 - 82 - 40);
      expect(y).toBeLessThanOrEqual(540 - 82 + 40);
    }
  });
  it('is continuous across the world loop', () => {
    view.H = 540;
    expect(groundY(0)).toBeCloseTo(groundY(L), 6);
  });
});
```

- [ ] **Step 4: Kör testerna och se dem fallera**

Run: `npm test`
Expected: FAIL – `Failed to resolve import "../src/util.js"` (modulerna finns inte).

- [ ] **Step 5: Skapa `src/config.js`**

```js
export const TAU = Math.PI * 2, L = 4800, TOP = 72;
export const HUDF = 'Rubik,system-ui,sans-serif';
export const COLORS = ['#ff4d5e', '#4dff88', '#4d8dff'];
export const SLOTS = [
  { id: 'thrust', label: 'Thrust' },
  { id: 'anti',   label: 'Antigrav' },
  { id: 'rapid',  label: 'Rapid' },
  { id: 'double', label: 'Double' },
  { id: 'sat',    label: 'Satellite' },
  { id: 'shield', label: 'Shield' },
];
```

- [ ] **Step 6: Skapa `src/util.js`**

```js
import { L } from './config.js';

export const mod = (a, n) => ((a % n) + n) % n;
export const wd = a => mod(a + L / 2, L) - L / 2;
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const rnd = (a, b) => a + Math.random() * (b - a);

const rgbCache = new Map();
export function rgbOf(h) { let v = rgbCache.get(h); if (!v) { const n = parseInt(h.slice(1), 16); v = [n >> 16 & 255, n >> 8 & 255, n & 255]; rgbCache.set(h, v); } return v; }
export function tint(h, s, a = 1) {
  const [r, g, b] = rgbOf(h), y = r * .3 + g * .59 + b * .11;
  return `rgba(${(y + (r - y) * s) | 0},${(y + (g - y) * s) | 0},${(y + (b - y) * s) | 0},${a})`;
}
export function hash(k) { const v = Math.sin(k * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); }
export function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
```

- [ ] **Step 7: Skapa `src/state.js`**

```js
export const view = { W: 960, H: 540, S: 1, ctx: null };

export const G = {
  state: 'menu', score: 0, lives: 3, level: 0, sel: -1, shield: 0, fireCD: 0, dead: 0, t: 0, clearT: 0, sat: 0, banner: null,
  need: [0, 0, 0], got: [0, 0, 0], spawnT: 0,
  P: null, spark: null, own: null,
  enemies: [], bullets: [], ebullets: [], drops: [], gems: [], parts: [], texts: [],
  camX: 0, shake: 0, paused: false, best: 0,
};
try { G.best = +localStorage.getItem('chromaDriftBest') || 0; } catch (e) {}
```

- [ ] **Step 8: Skapa `src/terrain.js`**

```js
import { L, TAU } from './config.js';
import { view } from './state.js';

export const groundY = x => { const t = x / L * TAU; return view.H - 82 - 22 * Math.sin(t * 5) - 12 * Math.sin(t * 13 + 1.3) - 6 * Math.sin(t * 31 + .4); };
```

- [ ] **Step 9: Kör testerna**

Run: `npm test`
Expected: PASS – 2 filer, 9 tester.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json vite.config.js src test
git commit -m "Add Vite/Vitest setup and core modules (config, util, state, terrain)"
```

---

### Task 2: Flytta resten av spelet till moduler

**Files:**
- Create: `src/levels.js`, `src/audio.js`, `src/fx.js`, `src/game.js`, `src/player.js`, `src/enemies.js`, `src/pickups.js`, `src/input.js`, `src/render.js`, `src/hud.js`, `src/main.js`
- Modify: `index.html:85-685` (hela inline-`<script>` ersätts)

**Interfaces:**
- Consumes: allt från Task 1.
- Produces (används av delprojekt 1–3):
  - `game.js`: `curLevel()`, `newGame(state)`, `startLevel()`, `levelClear()`, `gameOver()`, `tryContinue(): boolean`, `update(dt)`
  - `player.js`: `updatePlayer(dt)`, `die()`, `shoot(x, y, dir)`
  - `enemies.js`: `spawnWave()`, `killEnemy(e)`, `updateEnemies(dt)`
  - `pickups.js`: `pickup(x, y, extra?)`, `canBuy(id)`, `activate()`, `updateAllPickups(dt)`
  - `fx.js`: `banner(text)`, `addText(x, y, text, col?)`, `burst(x, y, col, n, sp?)`
  - `audio.js`: `initAudio()`, `sfx(name, delay?)`
  - `input.js`: `keys`, `touch`, `inX()`, `inY()`, `firing()`, `initInput()`
  - `render.js`: `render()`; `hud.js`: `hud()`

- [ ] **Step 1: Skapa `src/levels.js`**

```js
export const LEVELS = [
  { name: 'The Meadows', sky: ['#2f6fd0', '#a8e0ff'], sun: '#fff3a0', far: '#5b8c6a', near: '#3f9b4a', ground: '#6b4a2b', grass: '#62d65a', deco: '#ff5c7a', need: [3, 3, 3] },
  { name: 'Dusk Valley', sky: ['#2b1055', '#e0707a'], sun: '#ffd1a8', far: '#6a3f7a', near: '#9a4a74', ground: '#3b2440', grass: '#f08a5d', deco: '#ffd166', need: [4, 3, 5] },
  { name: 'Frost Coast', sky: ['#0f2a3a', '#7fdcef'], sun: '#ffffff', far: '#5f8fa8', near: '#9ec9d9', ground: '#2e4a5a', grass: '#e8f6ff', deco: '#ff6b9a', need: [5, 5, 4] },
  { name: 'Ember Woods', sky: ['#22022a', '#ff7e5f'], sun: '#ffe08a', far: '#7a2e2e', near: '#b5452f', ground: '#2a1410', grass: '#ffb347', deco: '#7cff6b', need: [6, 5, 6] },
];
```

- [ ] **Step 2: Skapa `src/audio.js`**

```js
let AC = null;
const SFX = {
  shot: [900, 420, .06, 'square', .025], bounce: [150, 80, .08, 'sine', .05], pop: [320, 60, .18, 'sawtooth', .06],
  drop: [660, 1320, .12, 'triangle', .08], gem: [990, 1980, .16, 'sine', .08], power: [440, 1760, .35, 'square', .05],
  deny: [200, 140, .16, 'square', .05], die: [420, 40, .7, 'sawtooth', .1], clear: [523, 1046, .5, 'triangle', .1],
};

export function initAudio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
  if (AC && AC.state === 'suspended') AC.resume();
}

export function sfx(n, delay = 0) {
  if (!AC) return;
  const p = SFX[n], t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = p[3]; o.frequency.setValueAtTime(p[0], t); o.frequency.exponentialRampToValueAtTime(p[1], t + p[2]);
  g.gain.setValueAtTime(p[4], t); g.gain.exponentialRampToValueAtTime(.0001, t + p[2]);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + p[2] + .03);
}
```

- [ ] **Step 3: Skapa `src/fx.js`**

```js
import { TAU } from './config.js';
import { G } from './state.js';
import { rnd } from './util.js';

export function banner(text) { G.banner = { text, t: 2.6 }; }
export function addText(x, y, text, col = '#fff') { G.texts.push({ x, y, text, col, t: 0 }); }
export function burst(x, y, col, n, sp = 220) {
  for (let i = 0; i < n; i++) { const a = rnd(0, TAU), v = rnd(40, sp); G.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(.35, .8), max: .8, col, sz: rnd(2, 4.5) }); }
}
```

- [ ] **Step 4: Skapa `src/player.js`**

```js
import { TOP } from './config.js';
import { G } from './state.js';
import { clamp, lerp, rnd } from './util.js';
import { groundY } from './terrain.js';
import { sfx } from './audio.js';
import { burst } from './fx.js';
import { inX, inY } from './input.js';
import { gameOver } from './game.js';

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
    }
    return;
  }
  const ix = inX(), iy = inY();
  if (ix) P.face = Math.sign(ix);
  if (own.anti) {
    P.vx = lerp(P.vx, ix * 330, Math.min(1, 7 * dt));
    P.vy = lerp(P.vy, iy * 300, Math.min(1, 7 * dt));
  } else {
    P.vy += 1500 * dt;
    if (own.thrust) P.vx = lerp(P.vx, ix * 330, Math.min(1, 6 * dt));
    else {
      P.spin = clamp(P.spin + ix * 2.2 * dt, -1, 1);
      P.vx = lerp(P.vx, P.spin * 260, Math.min(1, 1.6 * dt));
      if (!ix && Math.abs(P.vx) > 20) P.face = Math.sign(P.vx);
    }
  }
  P.x += P.vx * dt; P.y += P.vy * dt;
  const gy = groundY(P.x);
  if (P.y + P.r > gy) {
    P.y = gy - P.r;
    if (own.anti) P.vy = Math.min(0, P.vy);
    else {
      let b = 640; if (own.thrust) { if (iy < 0) b = 860; else if (iy > 0) b = 380; }
      P.vy = -b; sfx('bounce');
      for (let i = 0; i < 5; i++) G.parts.push({ x: P.x + rnd(-10, 10), y: gy, vx: rnd(-60, 60), vy: rnd(-80, -20), life: .4, max: .4, col: 'rgba(220,220,220,.7)', sz: rnd(1.5, 3) });
    }
  }
  if (P.y - P.r < TOP) { P.y = TOP + P.r; if (P.vy < 0) P.vy = 0; }
  P.ang += P.vx * dt / P.r;
  if (P.inv > 0) P.inv -= dt;
}
```

- [ ] **Step 5: Skapa `src/pickups.js`**

```js
import { COLORS, SLOTS } from './config.js';
import { G } from './state.js';
import { rnd, wd } from './util.js';
import { groundY } from './terrain.js';
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
    const gy = groundY(d.x) - 9; if (d.y > gy) { d.y = gy; d.vy = 0; d.vx = 0; }
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
```

- [ ] **Step 6: Skapa `src/enemies.js`**

```js
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
```

- [ ] **Step 7: Skapa `src/game.js`**

```js
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
```

- [ ] **Step 8: Skapa `src/input.js`**

```js
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
```

- [ ] **Step 9: Skapa `src/render.js`**

```js
import { TAU, L, TOP, HUDF, COLORS } from './config.js';
import { G, view } from './state.js';
import { mod, clamp, rnd, tint, hash, rrect } from './util.js';
import { groundY } from './terrain.js';
import { curLevel } from './game.js';

const sx = x => mod(x - G.camX + 300, L) - 300;

function drawWorld() {
  const { ctx, W, H } = view, camX = G.camX, lv = curLevel(), s = G.sat;
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
  // deco (trees & flowers) sitting on ground
  const step = 200, k0 = Math.floor((camX - 60) / step), k1 = Math.floor((camX + W + 60) / step);
  for (let k = k0; k <= k1; k++) {
    const wx = k * step, h = hash(mod(k, L / step)), x = wx - camX, gy = groundY(wx);
    if (h > .62) {
      const th = 30 + h * 30;
      ctx.fillStyle = tint('#5a3b22', s); ctx.fillRect(x - 3, gy - th, 6, th + 4);
      ctx.fillStyle = tint(lv.grass, s * .9); ctx.beginPath(); ctx.arc(x, gy - th, 16 + h * 8, 0, TAU); ctx.fill();
      ctx.fillStyle = tint(lv.deco, s); ctx.beginPath(); ctx.arc(x + 6, gy - th - 4, 3.5, 0, TAU); ctx.arc(x - 7, gy - th + 5, 3, 0, TAU); ctx.fill();
    } else if (h > .3) {
      for (let i = 0; i < 3; i++) {
        const fx = x + (i - 1) * 12, fy = groundY(wx + (i - 1) * 12);
        ctx.strokeStyle = tint(lv.grass, s); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 14 - i * 3); ctx.stroke();
        ctx.fillStyle = tint(lv.deco, s); ctx.beginPath(); ctx.arc(fx, fy - 15 - i * 3, 4, 0, TAU); ctx.fill();
      }
    }
  }
  // ground
  ctx.fillStyle = tint(lv.ground, s); ctx.beginPath(); ctx.moveTo(-30, H + 30);
  for (let x = -30; x <= W + 38; x += 6) ctx.lineTo(x, groundY(camX + x));
  ctx.lineTo(W + 38, H + 30); ctx.fill();
  ctx.strokeStyle = tint(lv.grass, s); ctx.lineWidth = 5; ctx.beginPath();
  for (let x = -30; x <= W + 38; x += 6) { const y = groundY(camX + x); x === -30 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
  ctx.stroke();
}

function drawPlayer() {
  if (G.dead > 0 || G.state === 'over') return;
  const { ctx } = view, P = G.P;
  if (P.inv > 0 && Math.floor(G.t * 12) % 2) return;
  const x = sx(P.x), y = P.y, r = P.r, gy = groundY(P.x);
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
  drawPickups();
  for (const e of G.enemies) drawEnemy(e);
  ctx.fillStyle = '#fff6c2';
  for (const b of G.bullets) { const x = sx(b.x); rrect(ctx, x - 7, b.y - 2.5, 14, 5, 2.5); ctx.fill(); }
  ctx.fillStyle = '#ff8a3d';
  for (const b of G.ebullets) { ctx.beginPath(); ctx.arc(sx(b.x), b.y, 4, 0, TAU); ctx.fill(); }
  drawSpark(); drawPlayer();
  for (const p of G.parts) { ctx.globalAlpha = clamp(p.life / p.max, 0, 1); ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(sx(p.x), p.y, p.sz, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `600 13px ${HUDF}`;
  for (const t of G.texts) { ctx.globalAlpha = 1 - t.t; ctx.fillStyle = t.col; ctx.fillText(t.text, sx(t.x), t.y - 20); }
  ctx.globalAlpha = 1;
  ctx.restore();
}
```

- [ ] **Step 10: Skapa `src/hud.js`**

```js
import { TAU, TOP, HUDF, COLORS, SLOTS } from './config.js';
import { G, view } from './state.js';
import { rrect } from './util.js';
import { curLevel } from './game.js';
import { canBuy } from './pickups.js';

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
  if (G.paused) {
    ctx.fillStyle = 'rgba(6,7,13,.6)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = `600 24px ${HUDF}`; ctx.fillText('Paused', W / 2, H / 2 - 10);
    ctx.font = `400 14px ${HUDF}`; ctx.fillText('Press P, Space or tap the screen to continue', W / 2, H / 2 + 20);
  }
}
```

- [ ] **Step 11: Skapa `src/main.js`**

```js
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
```

- [ ] **Step 12: Ersätt inline-skriptet i `index.html`**

Ta bort hela blocket från `<script>` (rad 85) till och med `</script>` (rad 685) och ersätt med:

```html
<script type="module" src="./src/main.js"></script>
```

- [ ] **Step 13: Verifiera att inga gamla globala namn läcker**

Run: `grep -nE "\b(camX|paused|shake|enemies|bullets|ebullets|drops|gems|parts|texts|own|spark)\b" src/*.js | grep -vE "G\.(camX|paused|shake|enemies|bullets|ebullets|drops|gems|parts|texts|own|spark)|const \{ P, spark, own \}|camX = G\.camX|spark = G\.spark|own = G\.own|G\.own|^src/state\.js"`
Expected: bara träffar där namnet är en lokal variabel hämtad från `G` (t.ex. `spark.x` i `update`/`updatePickups`/`drawSpark`, `own.sat` i `update`/`updatePlayer`, `camX` i `drawWorld`). Varje träff ska spåras till en lokal `const` i samma funktion.

- [ ] **Step 14: Bygg och kör tester**

Run: `npm run build && npm test`
Expected: bygget lyckas utan varningar om saknade exporter; `dist/index.html` refererar skript via relativ sökväg `./assets/…`; testerna PASS.

- [ ] **Step 15: Röktest i webbläsare**

Run: `npm run dev` (bakgrund) och öppna den lokala URL:en.
Expected: menyn visas med bollen som studsar i bakgrunden, inga fel i devtools-konsolen. "Start game" startar spelet; bollen studsar, fiender dyker upp, skott fungerar.

- [ ] **Step 16: Commit**

```bash
git add index.html src
git commit -m "Split game into ES modules loaded by Vite"
```

---

### Task 3: Manuell verifiering och dokumentation

**Files:**
- Modify: `CLAUDE.md` (avsnitt "Nuläge")
- Modify: `docs/superpowers/specs/2026-09-25-world-variation-design.md` (namnet `game` → `G`, fillistan)

**Interfaces:**
- Consumes: körbart spel från Task 2.
- Produces: –

- [ ] **Step 1: Manuell checklista (Review Focus)**

Med `npm run dev` igång, bocka av:
1. Mobil via LAN-adressen som Vite skriver ut: joystick styr snurr, FIRE skjuter när den hålls in, POWER aktiverar markerad kraft.
2. Tangentbord: P pausar/återupptar; byte av flik pausar; mellanslag fortsätter efter "The colours are back!".
3. Spela tills game over → ladda om sidan → menyn visar "High score: N".
4. `npm run build && npm run preview` – den byggda versionen startar och ser likadan ut.
5. Ändra fönsterstorlek/rotera telefon under spel – ingen sträckning, HUD på rätt plats.

- [ ] **Step 2: Uppdatera `CLAUDE.md`, avsnitt "Nuläge"**

Ersätt raden `- Enfilsprototyp: index.html (canvas 2D, vanilla JS, WebAudio, inga beroenden)` med:

```markdown
- Vite + ES-moduler i src/ (canvas 2D, vanilla JS, WebAudio, inga runtime-beroenden)
- `npm run dev` (dev-server, även på LAN), `npm run build` → dist/, `npm test` (Vitest)
- Gemensamt tillstånd: `G` och `view` i src/state.js
```

och ta bort raden `- Bryt ut till moduler (physics, enemies, render, hud) med Vite` under "Nästa steg".

- [ ] **Step 3: Uppdatera specen**

I `docs/superpowers/specs/2026-09-25-world-variation-design.md`: ersätt `game.` med `G.` i alla förekomster (`game.scene`, `game.surfaceSnapshot`, `game.cavesUsed`, `game.secretsFound`, `game.sat`), ändra meningen om `state.js` till att objektet heter `G`, och lägg till `game.js` (spelflöde, `update`) och `fx.js` (`banner`, `addText`, `burst`) i fillistan.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md docs/superpowers/specs/2026-09-25-world-variation-design.md
git commit -m "Document module structure and align spec with G state object"
```
