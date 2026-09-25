# Delprojekt 1 – Terrängmodell och banobjekt: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ersätt sinusmarken med data (kontrollpunkter + hål) och lägg till banobjekt – sten, svamp, moln, pelare, taggar, kristall – som bollen, hoppfiender, droppar och skott interagerar med.

**Architecture:** `src/terrain.js` äger aktuell scens terräng: kontrollpunkter (höjd över skärmens botten), hål och en klonad objektlista som laddas med `loadTerrain(level)` i `startLevel()`. Alla geometrifrågor (`groundAt`, `surfaceBelow`, `collideCircle`, `touchesHazard`, `hitObjectWithBullet`) räknar live från `view.H`, så storleksändring fungerar utan omräkning. Spellogiken (player/enemies/pickups/game) byter `groundY` mot dessa funktioner; `render.js` ritar objekten.

**Tech Stack:** Vanilla JS ES-moduler, Canvas 2D, Vite, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-25-world-variation-design.md` (avsnitt "Delprojekt 1 – Terrängmodell och banobjekt")

## Global Constraints

- Vertikala värden i banfiler (`ground[]`, objektens `y`) är **höjd över skärmens botten**; skärm-y = `view.H − höjd`.
- Kontrollpunktsavstånd = `L / ground.length` (L = 4800). Handgjorda banor: 48 punkter. Genererad standardmark: 240 punkter (felet mot dagens formel < 1,5 enhet).
- Interpolation: cosinus, loopar (sista punkten → första).
- Objekt-`x` är mittpunkt i världskoordinat 0–L; avstånd mäts med `wd()` (loopande).
- Objektmått: `pillar` w 28; `mushroom` w 44 h 28, studs ×1,6; `crystal` w 26 h 36 hp 3; `cloud` tjocklek 14; `thorns` h 14. `rock` tar `w`,`h` från data.
- Sidostuds mot solida objekt: vx speglas och dämpas ×0,6.
- Kristall: 3 träffar → 2 droppar i färg `c`, försvinner.
- Inga runtime-beroenden. UI-text på engelska, kod på engelska.

## Review Focus

1. **Boll som faller på en objektkant** (centrum strax utanför toppen) – ska glida av, aldrig fastna inne i objektet. Test: `test/player.test.js` "never ends up inside a rock when dropped on its corner" (Task 3).
2. **Antigrav in i en pelares sida / uppåt genom moln** – ska stoppas i sidled resp. passera utan att teleporteras upp på toppen. Test: `test/terrain.test.js` "lets a body pass up through a cloud" (Task 2) + "pushes body out of a pillar side" (Task 2).
3. **Skärmrotation/storleksändring** – objekt och mark flyttar med `view.H`. Test: `test/terrain.test.js` "follows view.H changes" (Task 2).
4. **Kristall förstörd när världen redan är klar** – dropparna ska fortfarande kunna plockas utan fel. Manuell kontroll i Task 4.
5. **Död på taggar** – bollen återuppstår på samma x; den får inte landa på taggarna igen och dö i en loop. Test: `test/player.test.js` "respawns clear of thorns" (Task 3).

---

## Filstruktur

| Fil | Ändring |
|---|---|
| `src/terrain.js` | Skrivs om: markdata, hål, objekt, geometrifrågor |
| `src/levels.js` | The Meadows får en temporär testlayout med alla objekttyper |
| `src/game.js` | `loadTerrain` i `startLevel`; skott mot objekt; `updateObjects` |
| `src/player.js` | Landning via `surfaceBelow`, sidokrock, svamp, taggar |
| `src/enemies.js` | Hoppfiender mot objekt; `groundAt` för spawn/dyk |
| `src/pickups.js` | Droppar landar på objekt |
| `src/audio.js` | Nya ljud `boing`, `clink` |
| `src/render.js` | Mark/dekor via `groundAt`; `drawObjects`; skugga på närmaste yta |
| `test/terrain.test.js` | Skrivs om |
| `test/player.test.js` | Ny |

---

### Task 1: Markdata med interpolation och hål

**Files:**
- Modify: `src/terrain.js` (hela filen)
- Modify: `src/game.js` (import + `startLevel`)
- Modify: `src/player.js`, `src/enemies.js`, `src/pickups.js`, `src/render.js` (byt `groundY` → `groundAt`)
- Test: `test/terrain.test.js` (skrivs om)

**Interfaces:**
- Consumes: `L`, `TAU` (config), `view` (state), `mod`, `wd` (util)
- Produces:
  - `defaultGround(n = 240): number[]` – dagens formel samplad
  - `loadTerrain(level: { ground?: number[], objects?: object[] }): void`
  - `heightAt(x): number` – interpolerad höjd över botten (ignorerar hål)
  - `groundAt(x): number | null` – skärm-y för marken, `null` över hål

- [ ] **Step 1: Skriv om `test/terrain.test.js`**

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { loadTerrain, groundAt } from '../src/terrain.js';
import { view } from '../src/state.js';
import { L, TAU } from '../src/config.js';

const oldGround = x => { const t = x / L * TAU; return 540 - 82 - 22 * Math.sin(t * 5) - 12 * Math.sin(t * 13 + 1.3) - 6 * Math.sin(t * 31 + .4); };
const ramp = Array.from({ length: 48 }, (_, i) => 100 + i);

beforeEach(() => { view.H = 540; });

describe('groundAt – default ground', () => {
  it('matches the old sine formula within 1.5 units', () => {
    loadTerrain({});
    for (let x = 0; x < L; x += 7) expect(Math.abs(groundAt(x) - oldGround(x))).toBeLessThan(1.5);
  });
  it('is continuous across the world loop', () => {
    loadTerrain({});
    expect(groundAt(L - .001)).toBeCloseTo(groundAt(0), 2);
    expect(groundAt(L + 250)).toBeCloseTo(groundAt(250), 6);
    expect(groundAt(-250)).toBeCloseTo(groundAt(L - 250), 6);
  });
});

describe('groundAt – level data', () => {
  it('hits control points exactly (height above bottom)', () => {
    loadTerrain({ ground: ramp });
    expect(groundAt(0)).toBe(540 - 100);
    expect(groundAt(1000)).toBe(540 - 110);
  });
  it('interpolates halfway between points', () => {
    loadTerrain({ ground: ramp });
    expect(groundAt(1050)).toBeCloseTo(540 - 110.5, 6);
  });
  it('wraps from the last point to the first', () => {
    loadTerrain({ ground: ramp });
    expect(groundAt(4750)).toBeCloseTo(540 - (147 + 100) / 2, 6);
  });
  it('returns null over a hole', () => {
    loadTerrain({ ground: Array(48).fill(100), objects: [{ type: 'hole', x: 1000, w: 80 }] });
    expect(groundAt(1000)).toBeNull();
    expect(groundAt(1039)).toBeNull();
    expect(groundAt(1041)).toBe(440);
  });
});
```

- [ ] **Step 2: Kör och se dem fallera**

Run: `npm test`
Expected: FAIL – `loadTerrain`/`groundAt` exporteras inte (`is not a function` / `does not provide an export`).

- [ ] **Step 3: Skriv om `src/terrain.js`**

```js
import { L, TAU } from './config.js';
import { view } from './state.js';
import { mod, wd } from './util.js';

let pts = [], step = L, holes = [], objs = [];

export function defaultGround(n = 240) {
  return Array.from({ length: n }, (_, i) => { const t = i / n * TAU; return 82 + 22 * Math.sin(t * 5) + 12 * Math.sin(t * 13 + 1.3) + 6 * Math.sin(t * 31 + .4); });
}

export function loadTerrain(level) {
  pts = level.ground || defaultGround();
  step = L / pts.length;
  const all = (level.objects || []).map(o => ({ ...o }));
  holes = all.filter(o => o.type === 'hole');
  objs = all.filter(o => o.type !== 'hole');
}

export function heightAt(x) {
  const u = mod(x, L) / step, i = Math.floor(u), f = u - i, n = pts.length;
  const a = pts[i % n], b = pts[(i + 1) % n];
  return a + (b - a) * (1 - Math.cos(Math.PI * f)) / 2;
}

export function groundAt(x) {
  for (const h of holes) if (Math.abs(wd(x - h.x)) < h.w / 2) return null;
  return view.H - heightAt(x);
}

loadTerrain({});
```

- [ ] **Step 4: Kör testerna**

Run: `npm test`
Expected: PASS – terrain-testerna (6) + util (7).

- [ ] **Step 5: Byt `groundY` → `groundAt` i spelkoden**

`src/game.js` – lägg till import och ladda terrängen i `startLevel`:

```js
import { loadTerrain } from './terrain.js';
```

I `startLevel()`, direkt efter raden `G.got = [0, 0, 0]; G.sat = 0; G.spawnT = 1.8; G.clearT = 0;`:

```js
  loadTerrain(curLevel());
```

`src/player.js`: ändra importen till `import { groundAt } from './terrain.js';` och raden `const gy = groundY(P.x);` till `const gy = groundAt(P.x);`.

`src/enemies.js`: ändra importen till `import { groundAt } from './terrain.js';` och ersätt de tre anropen `groundY(` med `groundAt(`.

`src/pickups.js`: ändra importen till `import { groundAt } from './terrain.js';` och `groundY(d.x)` till `groundAt(d.x)`.

`src/render.js`: ändra importen till `import { groundAt } from './terrain.js';`. I `drawWorld` ersätt dekor- och markdelen (från `// deco (trees & flowers)` till och med sista `ctx.stroke();`) med:

```js
  // deco (trees & flowers) sitting on ground
  const step = 200, k0 = Math.floor((camX - 60) / step), k1 = Math.floor((camX + W + 60) / step);
  for (let k = k0; k <= k1; k++) {
    const wx = k * step, h = hash(mod(k, L / step)), x = wx - camX, gy = groundAt(wx);
    if (gy == null) continue;
    if (h > .62) {
      const th = 30 + h * 30;
      ctx.fillStyle = tint('#5a3b22', s); ctx.fillRect(x - 3, gy - th, 6, th + 4);
      ctx.fillStyle = tint(lv.grass, s * .9); ctx.beginPath(); ctx.arc(x, gy - th, 16 + h * 8, 0, TAU); ctx.fill();
      ctx.fillStyle = tint(lv.deco, s); ctx.beginPath(); ctx.arc(x + 6, gy - th - 4, 3.5, 0, TAU); ctx.arc(x - 7, gy - th + 5, 3, 0, TAU); ctx.fill();
    } else if (h > .3) {
      for (let i = 0; i < 3; i++) {
        const fx = x + (i - 1) * 12, fy = groundAt(wx + (i - 1) * 12);
        if (fy == null) continue;
        ctx.strokeStyle = tint(lv.grass, s); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 14 - i * 3); ctx.stroke();
        ctx.fillStyle = tint(lv.deco, s); ctx.beginPath(); ctx.arc(fx, fy - 15 - i * 3, 4, 0, TAU); ctx.fill();
      }
    }
  }
  // ground (holes drop below the screen)
  const gAt = x => groundAt(camX + x) ?? H + 40;
  ctx.fillStyle = tint(lv.ground, s); ctx.beginPath(); ctx.moveTo(-30, H + 30);
  for (let x = -30; x <= W + 38; x += 6) ctx.lineTo(x, gAt(x));
  ctx.lineTo(W + 38, H + 30); ctx.fill();
  ctx.strokeStyle = tint(lv.grass, s); ctx.lineWidth = 5; ctx.beginPath();
  for (let x = -30; x <= W + 38; x += 6) { const y = gAt(x); x === -30 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
  ctx.stroke();
```

och i `drawPlayer` raden `const x = sx(P.x), y = P.y, r = P.r, gy = groundY(P.x);` till `const x = sx(P.x), y = P.y, r = P.r, gy = groundAt(P.x) ?? view.H + 40;`.

- [ ] **Step 6: Verifiera att `groundY` är borta, bygg och testa**

Run: `grep -rn "groundY" src test; npm run build 2>&1 | tail -3; npm test 2>&1 | tail -4`
Expected: grep ger inga träffar; bygget lyckas; 13 tester PASS.

- [ ] **Step 7: Commit**

```bash
git add src test
git commit -m "Terrain as control-point data with cosine interpolation and holes"
```

---

### Task 2: Objekt och geometrifrågor

**Files:**
- Modify: `src/terrain.js`
- Test: `test/terrain.test.js` (nytt `describe`-block)

**Interfaces:**
- Consumes: Task 1 (`loadTerrain`, `groundAt`)
- Produces:
  - `objects(): object[]` – aktuella objekt (klonade, med standardmått)
  - `objBox(o): { top, bottom }` – skärm-y för objektets topp/botten
  - `surfaceBelow(x, y): { y, kind, obj } | null` – närmaste landningsyta med topp ≥ `y − 1`; `kind` ∈ `'ground' | 'rock' | 'pillar' | 'crystal' | 'mushroom' | 'cloud'`
  - `collideCircle(body: { x, y, vx, r }): object | null` – skjuter ut ur solida objekts sidor
  - `touchesHazard(body): object | null`
  - `hazardBelow(x, r): boolean` – om en fara ligger under x (oavsett höjd)
  - `hitObjectWithBullet(b: { x, y }): object | null` – `pillar`, `crystal`
  - `damageObject(o): boolean` – `true` när objektet förstörs
  - `updateObjects(dt): void` – räknar ned `flash`, `squash`

- [ ] **Step 1: Lägg till testerna i `test/terrain.test.js`**

Ändra importraden till:

```js
import { loadTerrain, groundAt, surfaceBelow, collideCircle, touchesHazard, hazardBelow, hitObjectWithBullet, damageObject, objects } from '../src/terrain.js';
```

och lägg till sist i filen:

```js
describe('objects', () => {
  const flat = Array(48).fill(100);            // ground at y 440
  const level = {
    ground: flat,
    objects: [
      { type: 'rock', x: 1000, w: 60, h: 40 },   // top 400
      { type: 'cloud', x: 1400, y: 200, w: 100 }, // top 340
      { type: 'mushroom', x: 2000 },              // top 412
      { type: 'thorns', x: 2600, w: 70 },         // top 426
      { type: 'pillar', x: 3000, h: 150 },        // top 290
      { type: 'crystal', x: 3500, c: 1 },         // top 404
    ],
  };
  beforeEach(() => { view.H = 540; loadTerrain(level); });

  it('lands on top of a rock', () => {
    expect(surfaceBelow(1000, 390)).toMatchObject({ y: 400, kind: 'rock' });
  });
  it('falls back to the ground below a rock top', () => {
    expect(surfaceBelow(1000, 410)).toMatchObject({ y: 440, kind: 'ground' });
  });
  it('lands on a cloud from above but not from below', () => {
    expect(surfaceBelow(1400, 330)).toMatchObject({ y: 340, kind: 'cloud' });
    expect(surfaceBelow(1400, 350)).toMatchObject({ y: 440, kind: 'ground' });
  });
  it('lets a body pass up through a cloud', () => {
    const b = { x: 1400, y: 350, vx: 0, r: 18 };
    expect(collideCircle(b)).toBeNull();
    expect(b.y).toBe(350);
  });
  it('reports mushrooms as their own kind', () => {
    expect(surfaceBelow(2000, 400)).toMatchObject({ y: 412, kind: 'mushroom' });
  });
  it('finds objects across the world loop', () => {
    expect(surfaceBelow(4800 + 1000, 390)).toMatchObject({ kind: 'rock' });
    expect(surfaceBelow(1000 - 4800, 390)).toMatchObject({ kind: 'rock' });
  });
  it('pushes body out of a rock side and damps vx', () => {
    const b = { x: 955, y: 420, vx: 200, r: 18 };
    expect(collideCircle(b)).toMatchObject({ type: 'rock' });
    expect(b.x).toBeCloseTo(952, 6);
    expect(b.vx).toBeCloseTo(-120, 6);
  });
  it('pushes body out of a pillar side', () => {
    const b = { x: 3025, y: 350, vx: -300, r: 18 };
    expect(collideCircle(b)).toMatchObject({ type: 'pillar' });
    expect(b.x).toBeCloseTo(3000 + 14 + 18, 6);
    expect(b.vx).toBeCloseTo(180, 6);
  });
  it('leaves a body resting on a rock top alone', () => {
    const b = { x: 1000, y: 382, vx: 50, r: 18 };
    expect(collideCircle(b)).toBeNull();
    expect(b.x).toBe(1000);
  });
  it('detects thorns', () => {
    expect(touchesHazard({ x: 2600, y: 421, r: 18 })).toMatchObject({ type: 'thorns' });
    expect(touchesHazard({ x: 2600, y: 300, r: 18 })).toBeNull();
  });
  it("reports hazards below an x regardless of height", () => {
    expect(hazardBelow(2600, 18)).toBe(true);
    expect(hazardBelow(2660, 18)).toBe(false);
  });
  it('stops bullets at pillars and crystals only', () => {
    expect(hitObjectWithBullet({ x: 3000, y: 400 })).toMatchObject({ type: 'pillar' });
    expect(hitObjectWithBullet({ x: 3000, y: 250 })).toBeNull();
    expect(hitObjectWithBullet({ x: 1000, y: 420 })).toBeNull();
    expect(hitObjectWithBullet({ x: 3500, y: 420 })).toMatchObject({ type: 'crystal' });
  });
  it('destroys a crystal after three hits', () => {
    const c = objects().find(o => o.type === 'crystal');
    expect(damageObject(c)).toBe(false);
    expect(damageObject(c)).toBe(false);
    expect(damageObject(c)).toBe(true);
    expect(surfaceBelow(3500, 390).kind).toBe('ground');
    expect(hitObjectWithBullet({ x: 3500, y: 420 })).toBeNull();
  });
  it('resets object state on reload', () => {
    const c = objects().find(o => o.type === 'crystal');
    damageObject(c); damageObject(c); damageObject(c);
    loadTerrain(level);
    expect(objects().find(o => o.type === 'crystal').gone).toBe(false);
  });
  it('follows view.H changes', () => {
    view.H = 600;
    expect(surfaceBelow(1000, 450)).toMatchObject({ y: 460, kind: 'rock' });
    expect(surfaceBelow(1400, 390)).toMatchObject({ y: 400, kind: 'cloud' });
  });
});
```

- [ ] **Step 2: Kör och se dem fallera**

Run: `npm test`
Expected: FAIL – `surfaceBelow is not a function` m.fl.

- [ ] **Step 3: Implementera i `src/terrain.js`**

Lägg till efter importerna:

```js
const SHAPES = {
  rock:     { solid: true },
  pillar:   { solid: true, w: 28, stopsShots: true },
  crystal:  { solid: true, w: 26, h: 36, stopsShots: true, hp: 3 },
  mushroom: { solid: true, w: 44, h: 28, bounce: 1.6 },
  cloud:    { h: 14 },
  thorns:   { h: 14, hazard: true },
  hole:     {},
};
```

Ersätt raden `const all = (level.objects || []).map(o => ({ ...o }));` i `loadTerrain` med:

```js
  const all = (level.objects || []).map(o => ({ ...SHAPES[o.type], ...o, flash: 0, squash: 0, gone: false }));
```

Lägg till efter `groundAt`:

```js
export const objects = () => objs;

export function objBox(o) {
  if (o.y != null) { const top = view.H - o.y; return { top, bottom: top + o.h }; }
  const base = groundAt(o.x) ?? view.H;
  return { top: base - o.h, bottom: base + 60 };
}

export function surfaceBelow(x, y) {
  let best = null;
  for (const o of objs) {
    if (o.gone || !(o.solid || o.type === 'cloud')) continue;
    if (Math.abs(wd(x - o.x)) > o.w / 2) continue;
    const top = objBox(o).top;
    if (top >= y - 1 && (!best || top < best.y)) best = { y: top, kind: o.type, obj: o };
  }
  if (best) return best;
  const g = groundAt(x);
  return g == null ? null : { y: g, kind: 'ground', obj: null };
}

export function collideCircle(b) {
  let hit = null;
  for (const o of objs) {
    if (o.gone || !o.solid) continue;
    const box = objBox(o), dx = wd(b.x - o.x), hw = o.w / 2;
    const ex = dx - Math.max(-hw, Math.min(hw, dx)), ey = b.y - Math.max(box.top, Math.min(box.bottom, b.y));
    if (ex * ex + ey * ey >= b.r * b.r) continue;
    if (ey < 0 && -ey >= Math.abs(ex)) continue; // contact from above: landing handles it
    const side = dx < 0 ? -1 : 1;
    b.x += side * (hw + b.r) - dx;
    if (b.vx * side < 0) b.vx = -b.vx * .6;
    hit = o;
  }
  return hit;
}

export function touchesHazard(b) {
  for (const o of objs) {
    if (o.gone || !o.hazard) continue;
    if (Math.abs(wd(b.x - o.x)) < o.w / 2 + b.r * .5 && b.y + b.r > objBox(o).top + 3) return o;
  }
  return null;
}

export function hazardBelow(x, r) {
  return objs.some(o => !o.gone && o.hazard && Math.abs(wd(x - o.x)) < o.w / 2 + r);
}

export function hitObjectWithBullet(bl) {
  for (const o of objs) {
    if (o.gone || !o.stopsShots) continue;
    const box = objBox(o);
    if (Math.abs(wd(bl.x - o.x)) < o.w / 2 + 4 && bl.y > box.top && bl.y < box.bottom) return o;
  }
  return null;
}

export function damageObject(o) {
  o.hp--; o.flash = .1;
  if (o.hp <= 0) { o.gone = true; return true; }
  return false;
}

export function updateObjects(dt) {
  for (const o of objs) {
    if (o.flash > 0) o.flash -= dt;
    if (o.squash > 0) o.squash = Math.max(0, o.squash - dt * 4);
  }
}
```

- [ ] **Step 4: Kör testerna**

Run: `npm test`
Expected: PASS – 28 tester (util 7, terrain 21).

- [ ] **Step 5: Commit**

```bash
git add src/terrain.js test/terrain.test.js
git commit -m "Add level objects with landing, side collision, hazards and bullet hits"
```

---

### Task 3: Objekten i spellogiken

**Files:**
- Modify: `src/player.js` (import + `updatePlayer` från `P.x += …` till `P.ang`-raden)
- Modify: `src/enemies.js` (spawn av `hop`, `hop`- och `dive`-grenar)
- Modify: `src/pickups.js` (`updatePickups`)
- Modify: `src/game.js` (import, skott-loop, `updateObjects`)
- Modify: `src/audio.js` (`SFX`)
- Modify: `src/levels.js` (The Meadows `objects`)
- Test: `test/player.test.js` (ny)

**Interfaces:**
- Consumes: Task 2 (`surfaceBelow`, `collideCircle`, `touchesHazard`, `hitObjectWithBullet`, `damageObject`, `objBox`, `updateObjects`, `groundAt`)
- Produces: spelbar värld med objekt; nya sfx-namn `'boing'`, `'clink'`

- [ ] **Step 1: Skriv `test/player.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { G, view } from '../src/state.js';
import { loadTerrain } from '../src/terrain.js';
import { updatePlayer } from '../src/player.js';

const flat = Array(48).fill(100); // ground y 440

function setup(objects, P) {
  view.H = 540;
  loadTerrain({ ground: flat, objects });
  Object.assign(G, { state: 'play', dead: 0, shield: 0, lives: 3, parts: [], own: { thrust: false, anti: false, rapid: false, double: false, sat: false } });
  G.P = { x: 0, y: 0, vx: 0, vy: 0, r: 18, spin: 0, ang: 0, face: 1, inv: 0, ...P };
}

describe('updatePlayer with objects', () => {
  it('bounces 1.6x higher on a mushroom', () => {
    setup([{ type: 'mushroom', x: 1000 }], { x: 1000, y: 392, vy: 300 });
    updatePlayer(1 / 60);
    expect(G.P.y).toBeCloseTo(412 - 18, 6);
    expect(G.P.vy).toBeCloseTo(-1024, 6);
  });
  it('lands on a rock top with a normal bounce', () => {
    setup([{ type: 'rock', x: 1000, w: 60, h: 40 }], { x: 1000, y: 380, vy: 300 });
    updatePlayer(1 / 60);
    expect(G.P.y).toBeCloseTo(382, 6);
    expect(G.P.vy).toBe(-640);
  });
  it('is bounced back by a rock side', () => {
    setup([{ type: 'rock', x: 1000, w: 60, h: 40 }], { x: 955, y: 415, vx: 200 });
    updatePlayer(1 / 60);
    expect(G.P.x).toBeCloseTo(952, 6);
    expect(G.P.vx).toBeLessThan(0);
  });
  it('never ends up inside a rock when dropped on its corner', () => {
    setup([{ type: 'rock', x: 1000, w: 60, h: 40 }], { x: 1040, y: 330, vy: 0 });
    for (let i = 0; i < 240; i++) {
      updatePlayer(1 / 60);
      const dx = Math.abs(G.P.x - 1000);
      expect(dx < 30 && G.P.y > 400).toBe(false);
    }
  });
  it('loses a life on thorns', () => {
    setup([{ type: 'thorns', x: 1000, w: 70 }], { x: 1000, y: 421, vy: 100 });
    updatePlayer(1 / 60);
    expect(G.lives).toBe(2);
    expect(G.dead).toBeGreaterThan(0);
  });
  it('is protected from thorns by the shield', () => {
    setup([{ type: 'thorns', x: 1000, w: 70 }], { x: 1000, y: 421, vy: 100 });
    G.shield = 5;
    updatePlayer(1 / 60);
    expect(G.lives).toBe(3);
  });
  it("respawns clear of thorns", () => {
    setup([{ type: "thorns", x: 1000, w: 70 }], { x: 1000, y: 200 });
    Object.assign(G, { dead: .01, lives: 2 });
    updatePlayer(1 / 60);
    expect(Math.abs(G.P.x - 1000)).toBeGreaterThanOrEqual(35 + 18);
  });
});
```

- [ ] **Step 2: Kör och se dem fallera**

Run: `npm test`
Expected: FAIL i `test/player.test.js` – svampen ger `vy` -640 i stället för -1024, sidokrocken flyttar inte `x`, taggarna dödar inte, respawn hamnar på taggarna.

- [ ] **Step 3: Uppdatera `src/player.js`**

Ändra importen `import { groundAt } from './terrain.js';` till:

```js
import { surfaceBelow, collideCircle, touchesHazard, hazardBelow } from './terrain.js';
```

I respawn-grenen, ersätt `Object.assign(P, { y: TOP + 90, vx: 0, vy: 0, spin: 0, inv: 2.5 });` med:

```js
      Object.assign(P, { y: TOP + 90, vx: 0, vy: 0, spin: 0, inv: 2.5 });
      for (let i = 0; i < 100 && hazardBelow(P.x, P.r); i++) P.x += 20;
```

Ersätt blocket från `P.x += P.vx * dt; P.y += P.vy * dt;` till och med den avslutande `}` för `if (P.y + P.r > gy) { … }` med:

```js
  const prevBottom = P.y + P.r;
  P.x += P.vx * dt; P.y += P.vy * dt;
  collideCircle(P);
  const s = surfaceBelow(P.x, prevBottom);
  if (s && P.y + P.r > s.y) {
    P.y = s.y - P.r;
    if (own.anti) P.vy = Math.min(0, P.vy);
    else {
      let b = 640; if (own.thrust) { if (iy < 0) b = 860; else if (iy > 0) b = 380; }
      if (s.kind === 'mushroom') { b *= s.obj.bounce; s.obj.squash = 1; sfx('boing'); } else sfx('bounce');
      P.vy = -b;
      for (let i = 0; i < 5; i++) G.parts.push({ x: P.x + rnd(-10, 10), y: s.y, vx: rnd(-60, 60), vy: rnd(-80, -20), life: .4, max: .4, col: 'rgba(220,220,220,.7)', sz: rnd(1.5, 3) });
    }
  }
  if (G.shield <= 0 && touchesHazard(P)) die();
```

- [ ] **Step 4: Lägg till ljuden i `src/audio.js`**

I `SFX`-objektet, efter `clear: [...]`:

```js
  boing: [220, 660, .18, 'sine', .07], clink: [1400, 900, .08, 'triangle', .05],
```

- [ ] **Step 5: Kör spelartesterna**

Run: `npm test`
Expected: PASS – 35 tester.

- [ ] **Step 6: Uppdatera `src/enemies.js`**

Ändra importen `import { groundAt } from './terrain.js';` till:

```js
import { groundAt, surfaceBelow, collideCircle } from './terrain.js';
```

I `spawnWave`, ersätt `if (type === 'hop') { e.r = 13; e.y = groundAt(x) - e.r; e.vy = -rnd(300, 600); }` med:

```js
    if (type === 'hop') { e.r = 13; e.y = (groundAt(x) ?? view.H) - e.r; e.vy = -rnd(300, 600); }
```

I `updateEnemies`, ersätt `hop`-grenen:

```js
    else if (e.type === 'hop') {
      const prevBottom = e.y + e.r;
      e.vy += 1100 * dt; e.x += e.vx * dt; e.y += e.vy * dt;
      collideCircle(e);
      const s = surfaceBelow(e.x, prevBottom); if (s && e.y + e.r > s.y) { e.y = s.y - e.r; e.vy = -rnd(420, 620); }
    }
```

och i `dive`-grenen raden `const gy = groundAt(e.x); if (e.y > gy - e.r) { … }` med:

```js
        const gy = groundAt(e.x) ?? Infinity; if (e.y > gy - e.r) { e.y = gy - e.r; e.vy = -Math.abs(e.vy) * .8; }
```

- [ ] **Step 7: Uppdatera `src/pickups.js`**

Ändra importen `import { groundAt } from './terrain.js';` till `import { surfaceBelow } from './terrain.js';` och i `updatePickups` ersätt de två raderna

```js
    d.x += d.vx * dt; d.y += d.vy * dt;
    const gy = groundAt(d.x) - 9; if (d.y > gy) { d.y = gy; d.vy = 0; d.vx = 0; }
```

med:

```js
    const prevY = d.y;
    d.x += d.vx * dt; d.y += d.vy * dt;
    const s = surfaceBelow(d.x, prevY + 9); if (s && d.y > s.y - 9) { d.y = s.y - 9; d.vy = 0; d.vx = 0; }
```

- [ ] **Step 8: Uppdatera `src/game.js`**

Ändra importraderna:

```js
import { banner, burst, addText } from './fx.js';
import { updateAllPickups, pickup } from './pickups.js';
import { loadTerrain, hitObjectWithBullet, damageObject, objBox, updateObjects } from './terrain.js';
```

(ersätter `import { banner, burst } from './fx.js';`, `import { updateAllPickups } from './pickups.js';` och `import { loadTerrain } from './terrain.js';`).

Direkt före raden `updateEnemies(dt);` i `update`:

```js
    updateObjects(dt);
```

Ersätt början av skott-loopen

```js
    for (const b of G.bullets) {
      b.x += b.vx * dt; b.life -= dt;
```

med:

```js
    for (const b of G.bullets) {
      b.x += b.vx * dt; b.life -= dt;
      const o = hitObjectWithBullet(b);
      if (o) {
        b.life = 0;
        if (o.hp) {
          if (damageObject(o)) {
            const top = objBox(o).top;
            G.drops.push(pickup(o.x - 6, top, { c: o.c }), pickup(o.x + 6, top, { c: o.c }));
            burst(o.x, top + o.h / 2, COLORS[o.c], 20); sfx('pop');
            G.score += 30; addText(o.x, top, '+30');
          } else { burst(b.x, b.y, '#ffffff', 4, 120); sfx('clink'); }
        }
        continue;
      }
```

- [ ] **Step 9: Testlayout för The Meadows i `src/levels.js`**

Ersätt raden för `The Meadows` med (temporärt – alla objekttyper samlade för att provspela; delprojekt 2 designar om världarna):

```js
  { name: 'The Meadows', sky: ['#2f6fd0', '#a8e0ff'], sun: '#fff3a0', far: '#5b8c6a', near: '#3f9b4a', ground: '#6b4a2b', grass: '#62d65a', deco: '#ff5c7a', need: [3, 3, 3],
    objects: [
      { type: 'mushroom', x: 600 },
      { type: 'rock', x: 900, w: 70, h: 40 },
      { type: 'cloud', x: 1300, y: 200, w: 110 },
      { type: 'cloud', x: 1480, y: 300, w: 90 },
      { type: 'pillar', x: 1900, h: 120 },
      { type: 'crystal', x: 2300, c: 0 },
      { type: 'thorns', x: 2750, w: 70 },
      { type: 'rock', x: 3200, w: 50, h: 60 },
      { type: 'mushroom', x: 3500 },
      { type: 'crystal', x: 3900, c: 2 },
      { type: 'cloud', x: 4300, y: 210, w: 90 },
    ] },
```

- [ ] **Step 10: Bygg och testa**

Run: `npm run build 2>&1 | tail -3; npm test 2>&1 | tail -4`
Expected: bygget lyckas; 35 tester PASS.

- [ ] **Step 11: Commit**

```bash
git add src test
git commit -m "Wire level objects into player, enemies, pickups and bullets"
```

---

### Task 4: Rita objekten, röktest och dokumentation

**Files:**
- Modify: `src/render.js` (import, `drawObjects`, `render`, skugga i `drawPlayer`)
- Modify: `CLAUDE.md` (Nuläge)
- Modify: `docs/superpowers/specs/2026-09-25-world-variation-design.md` (markpunktsavstånd, y-konvention)

**Interfaces:**
- Consumes: Task 2 (`objects`, `objBox`, `surfaceBelow`)
- Produces: –

- [ ] **Step 1: Uppdatera `src/render.js`**

Ändra importen `import { groundAt } from './terrain.js';` till:

```js
import { groundAt, surfaceBelow, objects, objBox } from './terrain.js';
```

I `drawPlayer` ersätt `gy = groundAt(P.x) ?? view.H + 40;` med `gy = surfaceBelow(P.x, P.y + P.r)?.y ?? view.H + 40;`.

Lägg till efter `drawWorld`:

```js
function drawObjects() {
  const { ctx, W } = view, s = G.sat;
  for (const o of objects()) {
    if (o.gone) continue;
    const x = sx(o.x); if (x < -o.w - 40 || x > W + o.w + 40) continue;
    const { top, bottom } = objBox(o), l = x - o.w / 2;
    ctx.save();
    if (o.type === 'rock') {
      ctx.fillStyle = tint('#8a8f99', s); rrect(ctx, l, top, o.w, bottom - top, 10); ctx.fill();
      ctx.fillStyle = tint('#b9bec8', s); rrect(ctx, l + 5, top + 4, o.w - 10, 7, 3.5); ctx.fill();
    } else if (o.type === 'pillar') {
      ctx.fillStyle = tint('#7a6a5a', s); ctx.fillRect(l, top, o.w, bottom - top);
      ctx.fillStyle = tint('#5e5044', s); for (let y = top + 18; y < bottom; y += 22) ctx.fillRect(l, y, o.w, 3);
      ctx.fillStyle = tint('#9c8a76', s); ctx.fillRect(l - 4, top, o.w + 8, 8);
    } else if (o.type === 'mushroom') {
      ctx.fillStyle = tint('#f3e6c8', s); ctx.fillRect(x - 7, top + 10, 14, bottom - top - 10);
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
```

I `render()`, ersätt raden `drawWorld();` med:

```js
  drawWorld();
  drawObjects();
```

- [ ] **Step 2: Bygg och testa**

Run: `npm run build 2>&1 | tail -3; npm test 2>&1 | tail -4`
Expected: bygget lyckas; 35 tester PASS.

- [ ] **Step 3: Headless-röktest**

Headless Edge kör bara en `requestAnimationFrame` under virtuell tid, så driv loopen manuellt. Skapa temporärt `smoke.html` (committas inte) som kopia av `index.html` där `<script type="module" src="./src/main.js"></script>` följs av:

```html
<script type="module">
import { G } from "./src/state.js"; import { update } from "./src/game.js"; import { render } from "./src/render.js"; import { hud } from "./src/hud.js";
const k = (t, c) => dispatchEvent(new KeyboardEvent(t, { code: c }));
setTimeout(() => {
  document.getElementById("start").click(); k("keydown", "Space"); k("keydown", "ArrowRight");
  let err = null; const xs = [];
  try { for (let i = 0; i < 3600; i++) { update(1 / 60); render(); hud(); if (i % 600 === 0) xs.push(Math.round(G.P.x)); } } catch (e) { err = e.stack; }
  const o = document.createElement("pre"); o.id = "out"; o.textContent = JSON.stringify({ err, xs, state: G.state, lives: G.lives, score: G.score, drops: G.drops.length }); document.body.append(o);
}, 300);
</script>
```

Run: starta `npx vite --port 5199 --strictPort` i bakgrunden, kör `msedge --headless=new --disable-gpu --virtual-time-budget=6000 --dump-dom http://localhost:5199/smoke.html` och grep:a `<pre id="out">`. Ta sedan bort `smoke.html` och stoppa servern.
Expected: `err` är `null`; `xs` visar att bollen rör sig (växande/varierande x).

- [ ] **Step 4: Manuell kontroll (lämnas till användaren)**

Med `npm run dev`: studsa på svampen, landa på sten och moln, bli tillbakastudsad av pelaren, dö på taggarna (och återuppstå bredvid dem), skjut sönder en kristall och plocka dropparna (även efter att världen blivit klar), se hoppfiender vid pelaren, rotera/ändra fönsterstorlek.

- [ ] **Step 5: Uppdatera `CLAUDE.md`**

Under "Nuläge", efter raden `- Loopande värld (L=4800), virtuell höjd ~540, skalas via S i resize()`, lägg till:

```markdown
- Terräng i src/terrain.js: mark som kontrollpunkter (höjd över botten, avstånd L/antal), hål, banobjekt (rock, pillar, mushroom, cloud, thorns, crystal); The Meadows har en temporär testlayout
```

- [ ] **Step 6: Uppdatera specen**

I `docs/superpowers/specs/2026-09-25-world-variation-design.md`, avsnittet "Mark som data": ersätt stycket

`Marken beskrivs med kontrollpunkter: en höjd (över skärmens botten) per 100 världsenheter, dvs. 48 punkter för L = 4800. Mellan punkter används cosinusinterpolation. Interpolationen loopar (punkt 47 → punkt 0).`

med

`Marken beskrivs med kontrollpunkter: höjd över skärmens botten, jämnt fördelade med avståndet L / antal punkter. Handgjorda banor använder 48 punkter (en per 100 enheter). Mellan punkter används cosinusinterpolation som loopar (sista punkten → första). Alla vertikala värden i banfiler (\`ground\`, objektens \`y\`) är höjd över skärmens botten.`

och stycket `Tills delprojekt 2 är klart genereras en \`ground\`-array ur dagens sinusformel så att The Meadows ser ut som nu.` med `Saknar en värld \`ground\` genereras 240 punkter ur dagens sinusformel (avvikelse < 1,5 enhet), så att världarna ser ut som nu tills delprojekt 2.`

- [ ] **Step 7: Commit**

```bash
git add src/render.js CLAUDE.md docs/superpowers/specs/2026-09-25-world-variation-design.md
git commit -m "Draw level objects and document the terrain model"
```
