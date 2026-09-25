# Chroma Drift – Variation i världarna: terräng, objekt, landskap och grottor

Datum: 2026-09-25
Status: Godkänd design, väntar på granskning av spec

## Syfte

Göra spelet mer intressant att utforska. Prioritet: **upptäckarglädje och hemligheter** (huvudfokus), därefter omväxling mellan världar och skicklighet i styrningen.

## Beslut

| Fråga | Beslut |
|---|---|
| Grottornas roll | Ren bonus – krävs aldrig för att klara en värld |
| Banornas ursprung | Handgjorda, beskrivna i data (hemligheter ligger på fast plats) |
| Ingångarnas synlighet | Per värld: 1 synlig grotta + 1–2 dolda |
| Grottornas karaktär | Varierar per grotta; första typerna: `treasure` och `dark` |
| Kodstruktur | Moduler med Vite (dev-server, hot reload, `npm run build`) |

## Uppdelning

Fyra delprojekt i ordning. Varje delprojekt får egen implementationsplan och ska vara spelbart när det är klart.

0. Modulstruktur med Vite (ren omstrukturering)
1. Terrängmodell och banobjekt
2. Eget landskap och regler per värld
3. Hål och grottor

---

## Delprojekt 0 – Modulstruktur

### Filstruktur

```
chroma-drift/
├─ index.html          markup + CSS, laddar src/main.js som modul
├─ package.json        devDependencies: vite, vitest
├─ src/
│  ├─ main.js          bootstrap: resize, frame-loop, menyknappar
│  ├─ config.js        L, TOP, HUDF, COLORS, SLOTS
│  ├─ levels.js        LEVELS (ersätts av src/levels/*.json i delprojekt 2)
│  ├─ util.js          mod, wd, clamp, lerp, rnd, tint, hash
│  ├─ state.js         exporterar gemensamma objekten `G` och `view`
│  ├─ game.js          spelflöde: newGame, startLevel, levelClear, gameOver, update
│  ├─ fx.js            banner, addText, burst
│  ├─ terrain.js       groundY (i dag), terrängmodell (delprojekt 1)
│  ├─ audio.js         AudioContext, SFX, sfx()
│  ├─ input.js         tangentbord, touch-joystick, knappar
│  ├─ player.js        updatePlayer, die
│  ├─ enemies.js       spawnWave, fiendeuppdatering, killEnemy
│  ├─ pickups.js       droppar, pärlor, canBuy/activate
│  ├─ render.js        drawWorld, drawPlayer, drawEnemy, drawPickups, render
│  └─ hud.js           hud()
└─ public/
```

### Tillstånd

Dagens closure-variabler (`G`, `P`, `spark`, `own`, `enemies`, `bullets`, `ebullets`, `drops`, `gems`, `parts`, `texts`, `camX`, `shake`, `paused`) samlas i ett exporterat objekt `G` i `state.js`. Moduler importerar `G` och läser/skriver dess fält. Logiken flyttas men skrivs inte om.

Skalvariablerna `W`, `H`, `S` och `ctx` hålls i `view` i `state.js` så att fysikkod som använder `H` (t.ex. `groundY`) kan läsa dem.

### Krav

- Spelet beter sig identiskt: samma fysik, texter, ljud, touchkontroller och localStorage-nyckel `chromaDriftBest`.
- `npm run dev` startar dev-server; `npm run build` ger statisk mapp i `dist/`.
- Vitest-tester för rena funktioner i `util.js` (`mod`, `wd`, `clamp`, `tint`) och `terrain.js` (`groundY` inom förväntat intervall).

---

## Delprojekt 1 – Terrängmodell och banobjekt

### Mark som data

Marken beskrivs med kontrollpunkter: höjd över skärmens botten, jämnt fördelade med avståndet L / antal punkter. Handgjorda banor använder 48 punkter (en per 100 enheter). Mellan punkter används cosinusinterpolation som loopar (sista punkten → första). Alla vertikala värden i banfiler (`ground`, objektens `y`) är höjd över skärmens botten.

```js
ground: [120, 130, 150, 140, 90, 90, 90, 160, /* … 48 st */]
```

Saknar en värld `ground` (eller är det inte en array) genereras 240 punkter ur dagens sinusformel (avvikelse < 1,5 enhet), så att världarna ser ut som nu tills delprojekt 2. Notera: i dagens `LEVELS` är `ground` en färg – den flyttas till `palette.ground` i delprojekt 2.

### Objekt

```js
objects: [
  { type: 'rock',     x: 820,  w: 60, h: 40 },
  { type: 'mushroom', x: 1150 },
  { type: 'cloud',    x: 1400, y: 260, w: 90 },
  { type: 'pillar',   x: 2100, h: 140 },
  { type: 'thorns',   x: 2600, w: 70 },
  { type: 'crystal',  x: 3050, c: 1 },
]
```

`x` är objektets mittpunkt. Objekt utan `y` står på marken (`groundAt(x)`); `h` räknas uppåt från den ytan.

| Typ | Fält | Beteende |
|---|---|---|
| `rock` | `w`, `h` | Solid låda. Topp = landningsyta med normal studs; sidor = horisontell studs (vx speglas, dämpas ×0,6). |
| `mushroom` | – | Landningsyta med studs ×1,6. Liten squash-animation vid träff. |
| `cloud` | `y`, `w` | Envägsplattform: kolliderar bara när bollen rör sig nedåt och var ovanför i föregående frame. |
| `pillar` | `h` (bredd fast 28) | Som `rock` men hög och smal. Stoppar spelarens skott. |
| `thorns` | `w` | Kontakt = `die()` om ingen sköld eller odödlighet. |
| `crystal` | `c` (0–2), hp 3 | Solid. Tar skott; vid hp 0 släpper den 2 droppar i färg `c` och försvinner. |
| `hole` | `w` | Marken saknas i intervallet. Används först i delprojekt 3. |

### Gränssnitt (`terrain.js`)

- `loadTerrain(levelData)` – bygger interna strukturer för aktuell scen.
- `groundAt(x)` – interpolerad mark som skärm-y (`H − höjd`), eller `null` över ett hål.
- `surfaceBelow(x, y)` – närmaste landningsbara yta under punkten (mark, `rock`/`pillar`/`crystal`-topp, `cloud`, `mushroom`) som `{ y, kind, obj }`.
- `collideCircle(body)` – löser sidokrockar mot solida objekt; returnerar träffat objekt eller `null`.
- `hitObjectWithBullet(bullet)` – för `pillar` (stoppar) och `crystal` (skadar).

`updatePlayer`, hoppfiender och `updatePickups` byter från `groundY` till dessa funktioner. Dykfiender (`dive`) studsar mot `groundAt`. Flygande fiender ignorerar objekt.

### Rendering

Objekten ritas i `render.js` efter marken, färgade med `tint(..., G.sat)` så att de följer färgläggningen.

### Tester

- Interpolation: värde i kontrollpunkt = punktens värde; kontinuitet över loopgränsen.
- Landning på `rock`-topp, sidostuds mot `pillar`, passage genom `cloud` underifrån, landning på `cloud` ovanifrån.
- `groundAt` returnerar `null` inom ett `hole`.

---

## Delprojekt 2 – Eget landskap per värld

### Banfiler

En JSON-fil per värld i `src/levels/`: `meadows.json`, `dusk-valley.json`, `frost-coast.json`, `ember-woods.json`, plus `index.js` som exporterar dem i ordning.

```js
{
  "name": "Frost Coast",
  "palette": { "sky": ["#0f2a3a", "#7fdcef"], "sun": "#ffffff", "far": "#5f8fa8", "near": "#9ec9d9", "ground": "#2e4a5a", "grass": "#e8f6ff", "deco": "#ff6b9a" },
  "need": [5, 5, 4],
  "ground": [ … 48 höjder … ],
  "objects": [ … ],
  "zones": [ { "type": "ice", "x": 400, "w": 600 }, { "type": "water", "x": 1800, "w": 300 } ],
  "rules": { },
  "decor": "icicles",
  "caves": [ … ]          // delprojekt 3
}
```

### Zoner (markmaterial)

| Zon | Effekt |
|---|---|
| `ice` | Horisontell lerp-faktor för styrning/snurr ×0,25; ingen dämpning av vx vid studs. |
| `water` | Ritas som vattenyta i höjd med marken + 30. Inne i vattnet: gravitation ×0,25, vy dämpas, studs mot botten ×0,4. ↑ eller Antigrav tar en upp. |
| `lava` | Kontakt = `die()` (som `thorns`). Ritas glödande och pulserande. |

### Regler (hela världen)

- `wind: { strength, period }` – sinusformad sidokraft på spelare och droppar. HUD visar en liten pil med riktning och styrka.
- `embers: { rate }` – glödkorn faller från `TOP` på slumpade x nära kameran; kontakt = `die()`, kan skjutas bort.

### Dekor

`decor` väljer ritrutin för bakgrundsdekor (ingen fysik): `meadow` (dagens träd och blommor), `dusk` (döda träd, lyktor), `icicles` (istappar, snödrivor), `embers` (svedda stammar).

### Världsprofiler

| Värld | Terräng | Regel/zoner |
|---|---|---|
| The Meadows | Mjuk, få objekt: `rock`, `mushroom`, något `cloud` | – |
| Dusk Valley | Branta dalar, `pillar`, `cloud` | `wind` |
| Frost Coast | Platt, `rock`, `crystal` | `ice`, `water` |
| Ember Woods | `rock`, `thorns`, `pillar` | `lava`, `embers` |

Efter fyra världar börjar varvet om med `need + 2` per varv, som i dag.

### Tester

- Varje banfil: obligatoriska fält finns, `ground.length === 48`, alla objekt och zoner inom 0–L, inga objekt överlappar ett `hole`.
- Zonfysik som rena funktioner (t.ex. `applyZone(body, zone, dt)`).

---

## Delprojekt 3 – Hål och grottor

### Scener

`G.scene` är `'surface'` eller `'cave'`. Vid inträde i grotta sparas ytans tillstånd (fiender, skott, droppar, pärlor, spelarposition, kamera, spawn-timer) i `G.surfaceSnapshot` och grottans terräng laddas med `loadTerrain`. Vid utträde återställs ytan från snapshoten.

### Grottdata

```js
"caves": [
  { "id": "m1", "entrance": { "x": 1250, "kind": "hole", "w": 70 }, "type": "treasure",
    "width": 1600, "floor": [ … ], "ceiling": [ … ], "objects": [ … ], "loot": [ … ] },
  { "id": "m2", "entrance": { "x": 3400, "kind": "bush" }, "type": "dark", … },
  { "id": "m3", "entrance": { "x": 2200, "kind": "cliff", "y": 230 }, "type": "treasure", … }
]
```

- `floor` och `ceiling`: kontrollpunkter per 100 enheter över `width`. Grottor loopar inte; kameran klampas till `[0, width − W]`.
- `loot`: fasta positioner för pärlor, poäng-kristaller och ev. `extraLife`.
- Samma objekttyper som på ytan kan användas.

### Ingångar

| `kind` | Synlig | Hur man kommer in |
|---|---|---|
| `hole` | Ja | Hål i marken. Den som faller ner hamnar i grottan (aldrig död). |
| `bush` | Nej | Ser ut som dekor. Ett skott tar bort busken → blir ett `hole`. |
| `rock` | Nej | Sten med spricka, hp 3. Vid hp 0 → blir ett `hole`. |
| `cliff` | Nej | Mörk öppning i en `pillar`/klippvägg på höjd `y`. Man tar sig in genom att flyga in i den (i praktiken bara med Antigrav). |

### Grottyper

- `treasure` – inga fiender, ingen timer. Loot enligt `loot`. Högst ett `extraLife` per värld.
- `dark` – skärmen mörkläggs utom en ljuscirkel (radie ~120) runt bollen via canvas-komposition. Enstaka `float`-fiender utan färg. Större loot.

### Utgång

En ljusstråle i grottans högra ände. Kontakt → tillbaka till ytan vid ingångens x, ovanför marken, med `inv = 2`. Grottan markeras förbrukad i `G.cavesUsed` och ingången rasar igen (hålet blir mark, `bush`/`rock` återkommer inte) för resten av världen.

### Hemligheter

`G.secretsFound` räknar besökta dolda grottor per värld. Vid `levelClear` visas t.ex. "Secrets found: 2/3" (räknar alla grottor i världen). Räknas per spelomgång, sparas inte.

### Tester

- Snapshot/återställning: ytans fiender, droppar och position är oförändrade efter grottbesök.
- Varje ingångstyp: `bush` blir `hole` efter skott, `rock` efter 3 träffar, `cliff` triggar vid kontakt från sidan.
- Förbrukad grotta: ingången är stängd och går inte att använda igen.

---

## Utanför omfånget

- Portar, kanoner och andra interaktiva objekt utöver `crystal`
- Grottyperna tidsutmaning och vakt (läggs till senare med samma format)
- Nivåeditor
- Permanent sparade hemligheter mellan spelomgångar
- Musik/ljud utöver nya enkla sfx för nya objekt
