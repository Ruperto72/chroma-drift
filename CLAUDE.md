# Chroma Drift

Modern tolkning av bollfysik-/färgsamlarspel i 80-talsstil (inspirerat av Wizball).
Eget namn och egna figurer – återanvänd inga namn eller grafik från originalet.

## Nuläge
- Vite + ES-moduler i src/ (canvas 2D, vanilla JS, WebAudio, inga runtime-beroenden)
- `npm run dev` (dev-server, även på LAN), `npm run build` → dist/, `npm test` (Vitest)
- Gemensamt tillstånd: `G` och `view` i src/state.js
- Loopande värld (L=4800), virtuell höjd ~540, skalas via S i resize()
- Terräng i src/terrain.js: mark som kontrollpunkter (höjd över botten, avstånd L/antal), hål, banobjekt (rock, pillar, mushroom, cloud, thorns, crystal)
- Världar som JSON i src/levels/ (palette, need, ground[48], objects, zones, rules, decor); zoner ice/water/lava i src/zones.js, regler wind/embers i src/rules.js
- Grottor (src/caves.js): per värld ett synligt hål + 1–2 dolda ingångar (bush, rock, cliff); treasure/dark; G.scene 'surface'|'cave', ytan sparas och återställs; utgång via ljusstråle
- Fysiklägen: snurr (start) → Thrust → Antigrav
- Kraftfält: gröna pärlor flyttar markören; Thrust/Antigrav/Rapid/Double/Satellite/Shield
- Fiender tappar R/G/B-droppar; fulla mätare = världen färgläggs, nästa nivå
- Touch: virtuell joystick + FIRE/POWER-knappar

## Tester och verifiering
- `test/levels.test.js` validerar banfilerna (fält, mått, objekt/zoner/ingångar inom världen och fria från varandra, loot i grottorna, ett extraliv per värld)
- `test/playability.test.js` simulerar riktig fysik i spinnläge (60 och 30 fps): lavagropar, pelare, alla grottor och att klippan går att flyga över. Kör `npm test` efter varje ändring i src/levels/
- Node kan inte importera banfilernas JSON utan import-attribut – kör simuleringar som Vitest-tester
- Headless Edge kör bara en `requestAnimationFrame` under virtuell tid: driv `update()`/`render()`/`hud()` manuellt i en temporär smoke-sida
- `index.html` kräver server (ES-moduler) – öppna inte via file://

## Dokumentation
- Design: docs/superpowers/specs/2026-09-25-world-variation-design.md
- Implementationsplaner per delprojekt: docs/superpowers/plans/

## Kända småbrister (uppskjutna)
- Droppar som hamnar i en lavagrop går bara att nå med Satellit/Antigrav
- Vinden märks knappt i Thrust/Antigrav; vinddrift på droppar beror på fps och påverkar även pärlor
- Studshöjden är något lägre vid 30 fps (~126 mot ~136)
- Glöd faller igenom stenar/pelare/moln
- Vid scenbyte yta↔grotta flyger satelliten, partiklar och flygtexter med fel koordinater en kort stund
- I läget 'clear' kan bollen rulla ner i ett hål utom synhåll, och klippan kan ta in en i en grotta
- Grottfienders position räknas vid inträdet (fel efter storleksändring i grottan); de skjuter genom berget från värld 2
- Utgång från klippgrotta hamnar alltid till höger om klippan

## Nästa steg (idéer)
- Gryt-mekanik: blanda R/G/B till målfärg per nivå
- Fysiklägen som tillståndsmaskin, fiendevågor data-drivna från JSON
- Nivåeditor, riktiga ljud/musik-stems

## Kodstil
- Engelska i UI-texter och kod