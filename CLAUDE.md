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

## Nästa steg (idéer)
- Gryt-mekanik: blanda R/G/B till målfärg per nivå
- Fysiklägen som tillståndsmaskin, fiendevågor data-drivna från JSON
- Nivåeditor, riktiga ljud/musik-stems

## Kodstil
- Engelska i UI-texter och kod