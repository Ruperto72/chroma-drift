# Delprojekt 2 – Eget landskap per värld: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Varje värld beskrivs av en egen JSON-fil med palett, handgjord mark, objekt, markzoner (is, vatten, lava), världsregler (vind, glöd) och egen dekor – så att de fyra världarna känns som olika platser.

**Architecture:** `src/levels/*.json` + `src/levels/index.js` ersätter `src/levels.js`. Två nya moduler: `src/zones.js` (markmaterial per x-intervall; rena frågefunktioner) och `src/rules.js` (vind som funktion av tid; glödkorn i `G.embers`). `startLevel()` laddar terräng, zoner och regler. `player.js` läser zoner/vind; `game.js` hanterar glödkollisioner; `render.js`/`hud.js` ritar zoner, dekor, glöd och vindpil.

**Tech Stack:** Vanilla JS ES-moduler, JSON-import (Vite/Vitest), Canvas 2D, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-25-world-variation-design.md` (avsnitt "Delprojekt 2 – Eget landskap per värld")

## Global Constraints

- Banfiler: `name`, `palette { sky[2], sun, far, near, ground, grass, deco }`, `need[3]`, `ground[48]` (höjd över botten), `objects[]`, `zones[]`, `rules{}`, `decor`.
- Alla vertikala värden i banfiler = höjd över skärmens botten.
- Zoner: `ice` → styrningens lerp-faktor ×0,25 (ej i Antigrav); `water` → yta på `heightAt(zone.x) + 30`, gravitation ×0,25, vy dämpas med faktor `1 − 2,5·dt`, ↑ ger −1200·dt, studs ×0,4; `lava` → kontakt med marken i zonen = `die()` (sköld skyddar).
- Regler: `wind { strength, period }` → acceleration `strength · sin(2π·t/period)` på spelare (alla lägen) och luftburna droppar (×0,5); `embers { rate }` → i genomsnitt `rate` glödkorn per sekund faller från `TOP`, kontakt = `die()`, kan skjutas bort.
- Dekor: `meadow`, `dusk`, `icicles`, `embers`.
- Världsprofiler: Meadows mjuk (endast rock/mushroom/cloud, inga zoner/regler); Dusk Valley vind + pelare; Frost Coast is + vatten; Ember Woods lava + glöd.
- Efter fyra världar börjar varvet om med `need + 2` per varv (oförändrat).
- UI-text engelska, kod engelska, inga runtime-beroenden.

## Review Focus

1. **Boll i vatten kan alltid ta sig upp** – även utan Thrust (studs ×0,4 från botten + låg gravitation ska räcka för att nå ytan och studsa vidare). Test: `test/player.test.js` "escapes a water pool without thrust" (Task 2).
2. **Återuppståndelse i lavagrop** – respawn får inte hamna över lava. Test: `test/player.test.js` "respawns clear of lava" (Task 2).
3. **Glödkorn vid världsbyte** – gamla glödkorn får inte ligga kvar/döda i nästa värld eller efter "The colours are back!". Test: `test/rules.test.js` "clears embers on level load" + "does not spawn after level clear" (Task 3).
4. **Vind i Antigrav/Thrust** – ska märkas men inte göra bollen ostyrbar (lerp mot målhastighet dominerar). Manuell kontroll i Task 4.
5. **Varv 2 (world 5+)** – banfilerna återanvänds oförändrade; objekt/zoner nollställs. Test: `test/terrain.test.js` "resets object state on reload" (finns) + manuell kontroll i Task 4.

---

## Filstruktur

| Fil | Ändring |
|---|---|
| `src/levels/meadows.json`, `dusk-valley.json`, `frost-coast.json`, `ember-woods.json` | Nya banfiler |
| `src/levels/index.js` | Ny: exporterar `LEVELS` i ordning |
| `src/levels.js` | Tas bort |
| `src/zones.js` | Ny: `loadZones`, `allZones`, `zoneAt`, `waterSurface`, `waterAt`, `inLava`, `lavaBelow` |
| `src/rules.js` | Ny: `loadRules`, `windForce`, `windRatio`, `updateEmbers` |
| `src/state.js` | `G.embers`, `G.emberT` |
| `src/game.js` | Ny LEVELS-import; ladda zoner/regler; glöd i uppdatering, skott, kollisioner, levelClear |
| `src/player.js` | Is, vatten, lava, vind |
| `src/pickups.js` | Vind på droppar |
| `src/render.js` | Palett, dekor per värld, zoner, glödkorn |
| `src/hud.js` | Vindpil |
| `test/levels.test.js`, `test/zones.test.js`, `test/rules.test.js` | Nya |
| `test/player.test.js`, `test/terrain.test.js` | Utökas/justeras |

---

### Task 1: Banfiler i JSON med palett

**Files:**
- Create: `src/levels/meadows.json`, `src/levels/dusk-valley.json`, `src/levels/frost-coast.json`, `src/levels/ember-woods.json`, `src/levels/index.js`
- Delete: `src/levels.js`
- Modify: `src/game.js` (import), `src/render.js` (`drawWorld` palett)
- Test: `test/levels.test.js` (ny), `test/terrain.test.js` (sista `describe`)

**Interfaces:**
- Consumes: `L` (config)
- Produces: `LEVELS` från `src/levels/index.js` – array av banobjekt enligt Global Constraints.

- [ ] **Step 1: Skriv `test/levels.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { LEVELS } from '../src/levels/index.js';
import { L } from '../src/config.js';

const REQUIRED = { rock: ['w', 'h'], pillar: ['h'], mushroom: [], cloud: ['y', 'w'], thorns: ['w'], crystal: ['c'], hole: ['w'] };
const HEX = /^#[0-9a-f]{6}$/i;

describe.each(LEVELS.map(l => [l.name, l]))('%s', (_, lv) => {
  it('has a palette of hex colours', () => {
    const p = lv.palette;
    expect(p.sky).toHaveLength(2);
    for (const c of [...p.sky, p.sun, p.far, p.near, p.ground, p.grass, p.deco]) expect(c).toMatch(HEX);
  });
  it('needs three positive colour counts', () => {
    expect(lv.need).toHaveLength(3);
    for (const n of lv.need) expect(n).toBeGreaterThan(0);
  });
  it('has 48 ground heights within the playable band', () => {
    expect(lv.ground).toHaveLength(48);
    for (const h of lv.ground) { expect(h).toBeGreaterThanOrEqual(40); expect(h).toBeLessThanOrEqual(260); }
  });
  it('has valid objects inside the world', () => {
    for (const o of lv.objects) {
      expect(Object.keys(REQUIRED)).toContain(o.type);
      expect(o.x).toBeGreaterThanOrEqual(0); expect(o.x).toBeLessThan(L);
      for (const f of REQUIRED[o.type]) expect(typeof o[f]).toBe('number');
      if (o.type === 'crystal') expect([0, 1, 2]).toContain(o.c);
    }
  });
  it('has valid zones inside the world', () => {
    for (const z of lv.zones) {
      expect(['ice', 'water', 'lava']).toContain(z.type);
      expect(z.x).toBeGreaterThanOrEqual(0); expect(z.x).toBeLessThan(L);
      expect(z.w).toBeGreaterThan(0);
    }
  });
  it('places no object over a hole', () => {
    const holes = lv.objects.filter(o => o.type === 'hole');
    for (const o of lv.objects) if (o.type !== 'hole') for (const h of holes) expect(Math.abs(o.x - h.x)).toBeGreaterThanOrEqual((h.w + (o.w || 0)) / 2);
  });
  it('uses a known decor and known rules', () => {
    expect(['meadow', 'dusk', 'icicles', 'embers']).toContain(lv.decor);
    for (const k of Object.keys(lv.rules)) expect(['wind', 'embers']).toContain(k);
  });
});

describe('world profiles', () => {
  const [meadows, dusk, frost, ember] = LEVELS;
  it('keeps The Meadows gentle', () => {
    expect(meadows.zones).toEqual([]);
    expect(meadows.rules).toEqual({});
    expect(meadows.objects.every(o => ['rock', 'mushroom', 'cloud'].includes(o.type))).toBe(true);
  });
  it('gives Dusk Valley wind and pillars', () => {
    expect(dusk.rules.wind).toBeDefined();
    expect(dusk.objects.some(o => o.type === 'pillar')).toBe(true);
  });
  it('gives Frost Coast ice and water', () => {
    expect(frost.zones.some(z => z.type === 'ice')).toBe(true);
    expect(frost.zones.some(z => z.type === 'water')).toBe(true);
  });
  it('gives Ember Woods lava and embers', () => {
    expect(ember.zones.some(z => z.type === 'lava')).toBe(true);
    expect(ember.rules.embers).toBeDefined();
  });
});
```

I `test/terrain.test.js`, ersätt hela sista blocket `describe('real level data', …)` med (banorna har nu riktiga arrayer, så färgsträngs-fallet testas direkt):

```js
describe('non-array ground', () => {
  it('ignores a non-array ground field and uses the default ground', () => {
    view.H = 540;
    loadTerrain({ ground: '#6b4a2b', objects: [{ type: 'rock', x: 900, w: 70, h: 40 }] });
    expect(Number.isFinite(surfaceBelow(900, 0).y)).toBe(true);
    const b = { x: 0, y: 200, vx: 0, r: 18 };
    expect(collideCircle(b)).toBeNull();
    expect(b.x).toBe(0);
  });
});
```

- [ ] **Step 2: Kör och se dem fallera**

Run: `npm test`
Expected: FAIL – `test/levels.test.js` kan inte importera `../src/levels/index.js`.

- [ ] **Step 3: Skapa banfilerna**

`src/levels/meadows.json`:

```json
{
  "name": "The Meadows",
  "palette": { "sky": ["#2f6fd0", "#a8e0ff"], "sun": "#fff3a0", "far": "#5b8c6a", "near": "#3f9b4a", "ground": "#6b4a2b", "grass": "#62d65a", "deco": "#ff5c7a" },
  "need": [3, 3, 3],
  "ground": [90, 95, 100, 104, 106, 104, 100, 95, 90, 86, 84, 84, 86, 90, 96, 102, 108, 112, 114, 112, 108, 102, 96, 90, 86, 82, 80, 80, 82, 86, 92, 98, 104, 110, 114, 116, 114, 110, 104, 98, 92, 88, 85, 84, 84, 85, 87, 89],
  "objects": [
    { "type": "mushroom", "x": 700 },
    { "type": "rock", "x": 1100, "w": 70, "h": 36 },
    { "type": "cloud", "x": 1500, "y": 215, "w": 110 },
    { "type": "rock", "x": 2200, "w": 50, "h": 50 },
    { "type": "mushroom", "x": 2600 },
    { "type": "cloud", "x": 2700, "y": 330, "w": 90 },
    { "type": "rock", "x": 3500, "w": 80, "h": 30 },
    { "type": "cloud", "x": 4100, "y": 210, "w": 100 }
  ],
  "zones": [],
  "rules": {},
  "decor": "meadow"
}
```

`src/levels/dusk-valley.json`:

```json
{
  "name": "Dusk Valley",
  "palette": { "sky": ["#2b1055", "#e0707a"], "sun": "#ffd1a8", "far": "#6a3f7a", "near": "#9a4a74", "ground": "#3b2440", "grass": "#f08a5d", "deco": "#ffd166" },
  "need": [4, 3, 5],
  "ground": [80, 80, 90, 120, 160, 190, 200, 190, 160, 120, 85, 70, 65, 70, 90, 130, 170, 200, 210, 200, 170, 130, 95, 75, 70, 75, 95, 125, 150, 165, 170, 160, 135, 105, 85, 75, 72, 78, 100, 135, 170, 195, 205, 195, 165, 125, 95, 82],
  "objects": [
    { "type": "pillar", "x": 1100, "h": 130 },
    { "type": "cloud", "x": 1800, "y": 320, "w": 100 },
    { "type": "mushroom", "x": 2300 },
    { "type": "pillar", "x": 2400, "h": 140 },
    { "type": "rock", "x": 3000, "w": 60, "h": 40 },
    { "type": "pillar", "x": 3600, "h": 120 },
    { "type": "cloud", "x": 4200, "y": 330, "w": 100 }
  ],
  "zones": [],
  "rules": { "wind": { "strength": 160, "period": 8 } },
  "decor": "dusk"
}
```

`src/levels/frost-coast.json`:

```json
{
  "name": "Frost Coast",
  "palette": { "sky": ["#0f2a3a", "#7fdcef"], "sun": "#ffffff", "far": "#5f8fa8", "near": "#9ec9d9", "ground": "#2e4a5a", "grass": "#e8f6ff", "deco": "#ff6b9a" },
  "need": [5, 5, 4],
  "ground": [95, 95, 95, 95, 95, 95, 96, 97, 97, 96, 95, 80, 60, 55, 55, 60, 80, 95, 96, 97, 97, 96, 95, 95, 95, 95, 110, 125, 130, 125, 110, 95, 95, 95, 80, 60, 52, 52, 60, 80, 95, 95, 96, 96, 96, 95, 95, 95],
  "objects": [
    { "type": "rock", "x": 900, "w": 50, "h": 30 },
    { "type": "crystal", "x": 2000, "c": 1 },
    { "type": "rock", "x": 2800, "w": 60, "h": 40 },
    { "type": "cloud", "x": 3000, "y": 240, "w": 100 },
    { "type": "crystal", "x": 4000, "c": 2 }
  ],
  "zones": [
    { "type": "ice", "x": 550, "w": 700 },
    { "type": "water", "x": 1400, "w": 400 },
    { "type": "ice", "x": 2300, "w": 500 },
    { "type": "water", "x": 3700, "w": 400 },
    { "type": "ice", "x": 4400, "w": 500 }
  ],
  "rules": {},
  "decor": "icicles"
}
```

`src/levels/ember-woods.json`:

```json
{
  "name": "Ember Woods",
  "palette": { "sky": ["#22022a", "#ff7e5f"], "sun": "#ffe08a", "far": "#7a2e2e", "near": "#b5452f", "ground": "#2a1410", "grass": "#ffb347", "deco": "#7cff6b" },
  "need": [6, 5, 6],
  "ground": [100, 100, 105, 110, 110, 105, 100, 70, 50, 50, 70, 100, 105, 110, 115, 115, 110, 105, 100, 100, 95, 70, 50, 50, 70, 95, 100, 105, 110, 120, 130, 130, 120, 110, 100, 100, 70, 50, 50, 70, 100, 105, 105, 100, 100, 100, 100, 100],
  "objects": [
    { "type": "rock", "x": 1400, "w": 60, "h": 50 },
    { "type": "thorns", "x": 1700, "w": 60 },
    { "type": "pillar", "x": 2700, "h": 130 },
    { "type": "thorns", "x": 3300, "w": 70 },
    { "type": "rock", "x": 4200, "w": 70, "h": 40 }
  ],
  "zones": [
    { "type": "lava", "x": 850, "w": 160 },
    { "type": "lava", "x": 2250, "w": 160 },
    { "type": "lava", "x": 3750, "w": 160 }
  ],
  "rules": { "embers": { "rate": 0.6 } },
  "decor": "embers"
}
```

`src/levels/index.js`:

```js
import meadows from './meadows.json';
import duskValley from './dusk-valley.json';
import frostCoast from './frost-coast.json';
import emberWoods from './ember-woods.json';

export const LEVELS = [meadows, duskValley, frostCoast, emberWoods];
```

- [ ] **Step 4: Byt import och palett, ta bort gamla filen**

`src/game.js`: ändra `import { LEVELS } from './levels.js';` till `import { LEVELS } from './levels/index.js';`.

`src/render.js` i `drawWorld`: ändra `const { ctx, W, H } = view, camX = G.camX, lv = curLevel(), s = G.sat;` till:

```js
  const { ctx, W, H } = view, camX = G.camX, lv = curLevel().palette, s = G.sat;
```

Run: `git rm src/levels.js`

- [ ] **Step 5: Kör testerna och bygget**

Run: `npm test 2>&1 | grep -E "FAIL|Tests"; npm run build 2>&1 | tail -1`
Expected: 71 tester PASS (39 tidigare + 32 nya); bygget lyckas.

- [ ] **Step 6: Commit**

```bash
git add -A src test
git commit -m "Move worlds to JSON level files with palettes and hand-made ground"
```

---

### Task 2: Markzoner – is, vatten, lava

**Files:**
- Create: `src/zones.js`
- Modify: `src/game.js` (`startLevel`), `src/player.js` (`updatePlayer`)
- Test: `test/zones.test.js` (ny), `test/player.test.js` (setup + nya fall)

**Interfaces:**
- Consumes: `groundAt`, `heightAt` (terrain), `view` (state), `wd` (util)
- Produces:
  - `loadZones(level): void`, `allZones(): object[]`
  - `zoneAt(x, type): zone | null`
  - `waterSurface(zone): number` – skärm-y för vattenytan
  - `waterAt(body): zone | null` – kroppens centrum under ytan i en vattenzon
  - `inLava(body): boolean` – kroppens underkant når marken i en lavazon
  - `lavaBelow(x, r): boolean`

- [ ] **Step 1: Skriv `test/zones.test.js`**

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { view } from '../src/state.js';
import { loadTerrain } from '../src/terrain.js';
import { loadZones, zoneAt, waterSurface, waterAt, inLava, lavaBelow } from '../src/zones.js';

const level = {
  ground: Array(48).fill(100), // ground y 440
  zones: [{ type: 'ice', x: 500, w: 200 }, { type: 'water', x: 1500, w: 400 }, { type: 'lava', x: 3000, w: 160 }],
};

beforeEach(() => { view.H = 540; loadTerrain(level); loadZones(level); });

describe('zones', () => {
  it('finds a zone of the given type inside its span only', () => {
    expect(zoneAt(550, 'ice')).toMatchObject({ type: 'ice' });
    expect(zoneAt(700, 'ice')).toBeNull();
    expect(zoneAt(550, 'water')).toBeNull();
  });
  it('wraps across the world loop', () => {
    expect(zoneAt(500 + 4800, 'ice')).toMatchObject({ type: 'ice' });
  });
  it('puts the water surface 30 above the ground at the zone centre', () => {
    expect(waterSurface(zoneAt(1500, 'water'))).toBe(540 - 130);
  });
  it('reports water only below the surface', () => {
    expect(waterAt({ x: 1500, y: 420 })).toMatchObject({ type: 'water' });
    expect(waterAt({ x: 1500, y: 400 })).toBeNull();
  });
  it('detects lava contact at ground level only', () => {
    expect(inLava({ x: 3000, y: 422, r: 18 })).toBe(true);
    expect(inLava({ x: 3000, y: 300, r: 18 })).toBe(false);
    expect(inLava({ x: 3200, y: 422, r: 18 })).toBe(false);
  });
  it('reports lava below an x regardless of height', () => {
    expect(lavaBelow(3000, 18)).toBe(true);
    expect(lavaBelow(3100, 18)).toBe(false);
  });
  it('resets zones on reload', () => {
    loadZones({});
    expect(zoneAt(550, 'ice')).toBeNull();
  });
});
```

I `test/player.test.js`: lägg till importen `import { loadZones } from '../src/zones.js';` och ersätt `setup` med:

```js
function setup(objects, P, extra = {}) {
  view.H = 540;
  const level = { ground: flat, objects, ...extra };
  loadTerrain(level); loadZones(level);
  Object.assign(G, { state: 'play', dead: 0, shield: 0, lives: 3, t: 0, parts: [], own: { thrust: false, anti: false, rapid: false, double: false, sat: false } });
  G.P = { x: 0, y: 0, vx: 0, vy: 0, r: 18, spin: 0, ang: 0, face: 1, inv: 0, ...P };
}
```

och lägg till sist i `describe`-blocket:

```js
  it('steers four times slower on ice', () => {
    setup([], { x: 2000, y: 200, spin: 1 }, { zones: [{ type: 'ice', x: 1000, w: 400 }] });
    updatePlayer(1 / 60);
    const offIce = G.P.vx;
    setup([], { x: 1000, y: 200, spin: 1 }, { zones: [{ type: 'ice', x: 1000, w: 400 }] });
    updatePlayer(1 / 60);
    expect(G.P.vx).toBeCloseTo(offIce * .25, 6);
  });
  it('sinks slowly in water', () => {
    setup([], { x: 1000, y: 420, vy: 0 }, { zones: [{ type: 'water', x: 1000, w: 400 }] });
    updatePlayer(1 / 60);
    expect(G.P.vy).toBeCloseTo(6.25 * (1 - 2.5 / 60), 6);
  });
  it('bounces at 0.4x from the bottom of a pool', () => {
    setup([], { x: 1000, y: 420, vy: 300 }, { zones: [{ type: 'water', x: 1000, w: 400 }] });
    updatePlayer(1 / 60);
    expect(G.P.vy).toBeCloseTo(-256, 6);
  });
  it('escapes a water pool without thrust', () => {
    setup([], { x: 1000, y: 420, vy: 0 }, { zones: [{ type: 'water', x: 1000, w: 400 }] });
    let minY = Infinity;
    for (let i = 0; i < 600; i++) { updatePlayer(1 / 60); minY = Math.min(minY, G.P.y); }
    expect(minY).toBeLessThan(410);
  });
  it('loses a life in lava', () => {
    setup([], { x: 1000, y: 421, vy: 100 }, { zones: [{ type: 'lava', x: 1000, w: 160 }] });
    updatePlayer(1 / 60);
    expect(G.lives).toBe(2);
  });
  it('respawns clear of lava', () => {
    setup([], { x: 1000, y: 200 }, { zones: [{ type: 'lava', x: 1000, w: 160 }] });
    Object.assign(G, { dead: .01, lives: 2 });
    updatePlayer(1 / 60);
    expect(Math.abs(G.P.x - 1000)).toBeGreaterThanOrEqual(80 + 18);
  });
```

- [ ] **Step 2: Kör och se dem fallera**

Run: `npm test 2>&1 | grep -E "FAIL|Tests"`
Expected: FAIL – `../src/zones.js` saknas.

- [ ] **Step 3: Skapa `src/zones.js`**

```js
import { view } from './state.js';
import { wd } from './util.js';
import { groundAt, heightAt } from './terrain.js';

let zones = [];

export function loadZones(level) { zones = (level.zones || []).map(z => ({ ...z })); }
export const allZones = () => zones;

const inside = (z, x, pad = 0) => Math.abs(wd(x - z.x)) < z.w / 2 + pad;

export function zoneAt(x, type) { return zones.find(z => z.type === type && inside(z, x)) || null; }
export function waterSurface(z) { return view.H - heightAt(z.x) - 30; }
export function waterAt(b) { const z = zoneAt(b.x, 'water'); return z && b.y > waterSurface(z) ? z : null; }
export function inLava(b) {
  if (!zoneAt(b.x, 'lava')) return false;
  const g = groundAt(b.x);
  return g != null && b.y + b.r > g - 3;
}
export function lavaBelow(x, r) { return zones.some(z => z.type === 'lava' && inside(z, x, r)); }
```

- [ ] **Step 4: Kör zontesterna**

Run: `npm test 2>&1 | grep -E "FAIL|Tests"`
Expected: `test/zones.test.js` PASS; nya spelartester FAIL (is/vatten/lava saknas i `updatePlayer`).

- [ ] **Step 5: Uppdatera `src/player.js`**

Lägg till import:

```js
import { zoneAt, waterAt, inLava, lavaBelow } from './zones.js';
```

I respawn-grenen, ändra `for (let i = 0; i < 100 && hazardBelow(P.x, P.r); i++) P.x += 20;` till:

```js
      for (let i = 0; i < 100 && (hazardBelow(P.x, P.r) || lavaBelow(P.x, P.r)); i++) P.x += 20;
```

Ersätt blocket från `const ix = inX(), iy = inY();` till och med den `}` som avslutar `if (own.anti) { … } else { … }` med:

```js
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
```

I landningen, ändra `P.vy = -b;` till:

```js
      if (water) b *= .4;
      P.vy = -b;
```

och ändra `if (G.shield <= 0 && touchesHazard(P)) die();` till:

```js
  if (G.shield <= 0 && (touchesHazard(P) || inLava(P))) die();
```

- [ ] **Step 6: Ladda zoner i `src/game.js`**

Lägg till `import { loadZones } from './zones.js';` och i `startLevel()` direkt efter `loadTerrain(curLevel());`:

```js
  loadZones(curLevel());
```

- [ ] **Step 7: Kör testerna**

Run: `npm test 2>&1 | grep -E "FAIL|Tests"; npm run build 2>&1 | tail -1`
Expected: 84 tester PASS (71 + 7 zoner + 6 spelare); bygget lyckas.

- [ ] **Step 8: Commit**

```bash
git add src test
git commit -m "Add ice, water and lava ground zones"
```

---

### Task 3: Världsregler – vind och glöd

**Files:**
- Create: `src/rules.js`
- Modify: `src/state.js`, `src/game.js`, `src/player.js`, `src/pickups.js`
- Test: `test/rules.test.js` (ny), `test/player.test.js` (setup + vind)

**Interfaces:**
- Consumes: `groundAt` (terrain), `G`, `view` (state), `TAU`, `TOP` (config), `rnd` (util)
- Produces:
  - `loadRules(level): void` – sätter regler, tömmer `G.embers`, nollställer `G.emberT`
  - `windRatio(t = G.t): number | null` – `sin(2πt/period)` eller `null` utan vind
  - `windForce(t = G.t): number` – `strength · windRatio` eller 0
  - `updateEmbers(dt): void` – spawnar (endast i `play`), flyttar, tar bort vid mark/nederkant

- [ ] **Step 1: Skriv `test/rules.test.js`**

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { G, view } from '../src/state.js';
import { TOP } from '../src/config.js';
import { loadTerrain } from '../src/terrain.js';
import { loadRules, windForce, windRatio, updateEmbers } from '../src/rules.js';

beforeEach(() => {
  view.H = 540; view.W = 960;
  loadTerrain({ ground: Array(48).fill(100) });
  Object.assign(G, { state: 'play', camX: 0 });
});

describe('wind', () => {
  it('is absent without a wind rule', () => {
    loadRules({});
    expect(windForce(2)).toBe(0);
    expect(windRatio(2)).toBeNull();
  });
  it('follows a sine over its period', () => {
    loadRules({ rules: { wind: { strength: 160, period: 8 } } });
    expect(windForce(2)).toBeCloseTo(160, 6);
    expect(windForce(6)).toBeCloseTo(-160, 6);
    expect(windForce(0)).toBeCloseTo(0, 6);
  });
});

describe('embers', () => {
  it('spawn only with an embers rule', () => {
    loadRules({});
    updateEmbers(.1);
    expect(G.embers).toHaveLength(0);
    loadRules({ rules: { embers: { rate: 1 } } });
    updateEmbers(.01);
    expect(G.embers).toHaveLength(1);
    expect(G.embers[0].y).toBeGreaterThanOrEqual(TOP);
  });
  it('burn out when they reach the ground', () => {
    loadRules({});
    G.embers = [{ x: 100, y: 439, vx: 0, vy: 120, t: 0 }];
    updateEmbers(1 / 60);
    expect(G.embers).toHaveLength(0);
  });
  it('do not spawn after level clear', () => {
    loadRules({ rules: { embers: { rate: 1 } } });
    G.state = 'clear';
    updateEmbers(.1);
    expect(G.embers).toHaveLength(0);
  });
  it('clears embers on level load', () => {
    G.embers = [{ x: 100, y: 200, vx: 0, vy: 120, t: 0 }];
    loadRules({});
    expect(G.embers).toHaveLength(0);
  });
});
```

I `test/player.test.js`: lägg till `import { loadRules } from '../src/rules.js';`, ändra i `setup` raden `loadTerrain(level); loadZones(level);` till `loadTerrain(level); loadZones(level); loadRules(level);` och lägg till sist i `describe`-blocket:

```js
  it('is pushed sideways by the wind', () => {
    setup([], { x: 1000, y: 200 }, { rules: { wind: { strength: 160, period: 8 } } });
    G.t = 2;
    updatePlayer(1 / 60);
    expect(G.P.vx).toBeCloseTo(160 / 60, 6);
  });
```

- [ ] **Step 2: Kör och se dem fallera**

Run: `npm test 2>&1 | grep -E "FAIL|Tests"`
Expected: FAIL – `../src/rules.js` saknas.

- [ ] **Step 3: Skapa `src/rules.js`**

```js
import { TAU, TOP } from './config.js';
import { G, view } from './state.js';
import { rnd } from './util.js';
import { groundAt } from './terrain.js';

let rules = {};

export function loadRules(level) { rules = level.rules || {}; G.embers = []; G.emberT = 0; }

export function windRatio(t = G.t) { const w = rules.wind; return w ? Math.sin(TAU * t / w.period) : null; }
export function windForce(t = G.t) { const w = rules.wind; return w ? w.strength * windRatio(t) : 0; }

export function updateEmbers(dt) {
  const e = rules.embers;
  if (e && G.state === 'play') {
    G.emberT -= dt;
    if (G.emberT <= 0) {
      G.emberT = rnd(.5, 1.5) / e.rate;
      G.embers.push({ x: G.camX + rnd(0, view.W), y: TOP, vx: rnd(-20, 20), vy: rnd(90, 150), t: 0 });
    }
  }
  for (const m of G.embers) {
    m.t += dt; m.x += m.vx * dt; m.y += m.vy * dt;
    const g = groundAt(m.x);
    if ((g != null && m.y > g) || m.y > view.H + 20) m.dead = true;
  }
  G.embers = G.embers.filter(m => !m.dead);
}
```

- [ ] **Step 4: Lägg till fälten i `src/state.js`**

Ändra raden `enemies: [], bullets: [], ebullets: [], drops: [], gems: [], parts: [], texts: [],` till:

```js
  enemies: [], bullets: [], ebullets: [], drops: [], gems: [], parts: [], texts: [], embers: [], emberT: 0,
```

- [ ] **Step 5: Kör regeltesterna**

Run: `npm test 2>&1 | grep -E "FAIL|Tests"`
Expected: `test/rules.test.js` PASS; "is pushed sideways by the wind" FAIL.

- [ ] **Step 6: Vind i `src/player.js` och `src/pickups.js`**

`src/player.js`: lägg till `import { windForce } from './rules.js';` och direkt före `const prevBottom = P.y + P.r;`:

```js
  P.vx += windForce() * dt;
```

`src/pickups.js`: lägg till `import { windForce } from './rules.js';` och i `updatePickups`, direkt efter `d.t += dt; d.vy = Math.min(d.vy + 220 * dt, 80); d.vx *= .98;`:

```js
    if (d.vy) d.vx += windForce() * .5 * dt;
```

- [ ] **Step 7: Glöd i `src/game.js`**

Lägg till `import { loadRules, updateEmbers } from './rules.js';`.

I `startLevel()`, direkt efter `loadZones(curLevel());`:

```js
  loadRules(curLevel());
```

I `levelClear()`, ändra `G.enemies = []; G.ebullets = [];` till:

```js
  G.enemies = []; G.ebullets = []; G.embers = [];
```

I `update`, direkt efter `updateObjects(dt);`:

```js
    updateEmbers(dt);
```

I skott-loopen, direkt efter blocket `if (o) { … continue; }`:

```js
      const m = G.embers.find(m => !m.dead && Math.abs(wd(b.x - m.x)) < 10 && Math.abs(b.y - m.y) < 10);
      if (m) { m.dead = true; b.life = 0; burst(m.x, m.y, '#ffb347', 6, 100); continue; }
```

I kollisionsblocket `if (G.dead <= 0 && G.state === 'play') { … }`, sist inne i blocket (efter loopen över `G.ebullets`):

```js
      for (const m of G.embers) {
        const dx = wd(m.x - P.x), dy = m.y - P.y;
        if (!m.dead && dx * dx + dy * dy < (P.r + 5) ** 2) { m.dead = true; if (G.shield <= 0 && P.inv <= 0) die(); }
      }
```

och direkt efter raden `G.ebullets = G.ebullets.filter(…);`:

```js
    G.embers = G.embers.filter(m => !m.dead);
```

- [ ] **Step 8: Kör testerna och bygget**

Run: `npm test 2>&1 | grep -E "FAIL|Tests"; npm run build 2>&1 | tail -1`
Expected: 91 tester PASS (84 + 6 regler + 1 vind); bygget lyckas.

- [ ] **Step 9: Commit**

```bash
git add src test
git commit -m "Add world rules: wind and falling embers"
```

---

### Task 4: Rendering, röktest och dokumentation

**Files:**
- Modify: `src/render.js` (dekor, zoner, glöd), `src/hud.js` (vindpil)
- Modify: `CLAUDE.md`, `docs/superpowers/specs/2026-09-25-world-variation-design.md`

**Interfaces:**
- Consumes: `allZones`, `waterSurface` (zones), `windRatio` (rules), `G.embers`
- Produces: –

- [ ] **Step 1: Dekor per värld i `src/render.js`**

Lägg till före `drawWorld`:

```js
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
```

I `drawWorld`, ersätt dekorloopen (från `// deco (trees & flowers) sitting on ground` till och med loopens avslutande `}` före `// ground (holes drop below the screen)`) med:

```js
  // deco sitting on ground
  const decor = curLevel().decor;
  const step = 200, k0 = Math.floor((camX - 60) / step), k1 = Math.floor((camX + W + 60) / step);
  for (let k = k0; k <= k1; k++) {
    const wx = k * step, gy = groundAt(wx);
    if (gy != null) drawDecor(decor, wx, wx - camX, gy, hash(mod(k, L / step)), s, lv);
  }
```

- [ ] **Step 2: Zoner och glöd i `src/render.js`**

Ändra importerna: lägg till `import { allZones, waterSurface } from './zones.js';`.

Lägg till efter `drawObjects`:

```js
function drawZones(pass) {
  const { ctx, W, H } = view, camX = G.camX;
  const gAt = x => groundAt(camX + x) ?? H + 40;
  for (const z of allZones()) {
    const x0 = sx(z.x - z.w / 2), x1 = x0 + z.w;
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
```

I `render()`, ändra

```js
  drawWorld();
  drawObjects();
```

till

```js
  drawWorld();
  drawZones('ground');
  drawObjects();
```

ändra raden `drawSpark(); drawPlayer();` till:

```js
  drawSpark(); drawPlayer();
  drawZones('water');
  for (const m of G.embers) {
    const x = sx(m.x);
    ctx.fillStyle = 'rgba(255,140,40,.35)'; ctx.beginPath(); ctx.arc(x, m.y, 8, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(x, m.y, 3.5, 0, TAU); ctx.fill();
  }
```

- [ ] **Step 3: Vindpil i `src/hud.js`**

Lägg till `import { windRatio } from './rules.js';` och direkt före `// banner`:

```js
  // wind
  const wr = windRatio();
  if (wr != null) {
    const cx = W / 2, cy = 50, len = wr * 30;
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - len, cy); ctx.lineTo(cx + len, cy); ctx.stroke();
    if (Math.abs(len) > 3) { const d = Math.sign(len); ctx.beginPath(); ctx.moveTo(cx + len + d * 2, cy); ctx.lineTo(cx + len - d * 6, cy - 5); ctx.lineTo(cx + len - d * 6, cy + 5); ctx.closePath(); ctx.fill(); }
    ctx.textAlign = 'center'; ctx.font = `400 10px ${HUDF}`; ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillText('Wind', cx, cy + 12);
  }
```

- [ ] **Step 4: Bygg och testa**

Run: `npm run build 2>&1 | tail -1; npm test 2>&1 | grep -E "FAIL|Tests"`
Expected: bygget lyckas; 91 tester PASS.

- [ ] **Step 5: Headless-röktest av alla fyra världar**

Skapa temporärt `smoke.html` i repo-roten (committas inte). Det innehåller samma markup-id:n som `index.html` (`c`, `touch`, `zone`, `base`, `knob`, `bPow`, `bFire`, `menu`, `start`, `bestMenu`, `over`, `overText`, `again`), laddar `./src/main.js` och kör:

```html
<script type="module">
import { G } from "./src/state.js"; import { update, startLevel } from "./src/game.js"; import { render } from "./src/render.js"; import { hud } from "./src/hud.js";
const k = (t, c) => dispatchEvent(new KeyboardEvent(t, { code: c }));
const shot = new URLSearchParams(location.search).get("world");
setTimeout(() => {
  document.getElementById("start").click(); k("keydown", "Space"); k("keydown", "ArrowRight");
  const out = [];
  for (let w = 0; w < 4; w++) {
    G.level = w; G.state = "play"; G.lives = 9; startLevel();
    let err = null; const xs = [];
    try { for (let i = 0; i < 1800; i++) { update(1 / 60); render(); hud(); if (i % 450 === 0) xs.push(Math.round(G.P.x)); } } catch (e) { err = e.stack; }
    out.push({ w, err, xs, lives: G.lives, embers: G.embers.length });
  }
  if (shot != null) { G.level = +shot; G.state = "play"; startLevel(); for (let i = 0; i < 240; i++) update(1 / 60); G.camX = +(new URLSearchParams(location.search).get("cam") || 0); G.paused = true; G.state = "menu"; render(); }
  document.title = JSON.stringify(out);
}, 300);
</script>
```

Run: starta `npx vite --port 5199 --strictPort` i bakgrunden; kör `msedge --headless=new --disable-gpu --user-data-dir=<ny profil> --window-size=1280,640 --virtual-time-budget=8000 --dump-dom http://localhost:5199/smoke.html` och läs `<title>`.
Expected: för alla fyra världar `err: null` och varierande `xs`.

Ta sedan skärmbilder (`--screenshot=<fil> "http://localhost:5199/smoke.html?world=N&cam=X"`) av: `world=2&cam=900` (Frost Coast, vatten vid 1400), `world=3&cam=300` (Ember Woods, lava vid 850), `world=1&cam=600` (Dusk Valley, pelare vid 1100) och granska dem visuellt. Ta bort `smoke.html` och skärmbilderna, stoppa servern.

- [ ] **Step 6: Manuell kontroll (lämnas till användaren)**

Spela igenom alla fyra världar (`npm run dev`): is känns hal, vattnet går att ta sig ur, lava och glöd dödar och skölden skyddar, vindpilen följer byarna och vinden går att parera i Thrust/Antigrav, varv 2 (world 5) laddar Meadows igen med nollställda kristaller.

- [ ] **Step 7: Uppdatera `CLAUDE.md`**

Ersätt raden som börjar med `- Terräng i src/terrain.js:` med:

```markdown
- Terräng i src/terrain.js: mark som kontrollpunkter (höjd över botten, avstånd L/antal), hål, banobjekt (rock, pillar, mushroom, cloud, thorns, crystal)
- Världar som JSON i src/levels/ (palette, need, ground[48], objects, zones, rules, decor); zoner ice/water/lava i src/zones.js, regler wind/embers i src/rules.js
```

- [ ] **Step 8: Uppdatera specen**

I `docs/superpowers/specs/2026-09-25-world-variation-design.md`, avsnitt "Zoner (markmaterial)": ersätt raden för `water` med

`| \`water\` | Vattenyta på \`heightAt(zone.x) + 30\` (plan yta). Under ytan: gravitation ×0,25, vy × (1 − 2,5·dt), ↑ ger −1200·dt, studs ×0,4. |`

och i avsnittet "Regler (hela världen)" ersätt raden för `wind` med

`- \`wind: { strength, period }\` – acceleration \`strength · sin(2π·t/period)\` i sidled på spelaren (alla lägen) och luftburna droppar (×0,5). HUD visar en pil under kraftfältet.`

- [ ] **Step 9: Commit**

```bash
git add src CLAUDE.md docs/superpowers/specs/2026-09-25-world-variation-design.md
git commit -m "Render per-world decor, zones, embers and wind indicator"
```
