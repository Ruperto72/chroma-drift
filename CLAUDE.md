# Chroma Drift

Modern tolkning av bollfysik-/färgsamlarspel i 80-talsstil (inspirerat av Wizball).
Eget namn och egna figurer – återanvänd inga namn eller grafik från originalet.

## Nuläge
- Enfilsprototyp: index.html (canvas 2D, vanilla JS, WebAudio, inga beroenden)
- Loopande värld (L=4800), virtuell höjd ~540, skalas via S i resize()
- Fysiklägen: snurr (start) → Thrust → Antigrav
- Kraftfält: gröna pärlor flyttar markören; Thrust/Antigrav/Rapid/Double/Satellite/Shield
- Fiender tappar R/G/B-droppar; fulla mätare = världen färgläggs, nästa nivå
- Touch: virtuell joystick + FIRE/POWER-knappar

## Nästa steg (idéer)
- Bryt ut till moduler (physics, enemies, render, hud) med Vite
- Gryt-mekanik: blanda R/G/B till målfärg per nivå
- Fysiklägen som tillståndsmaskin, fiendevågor data-drivna från JSON
- Nivåeditor, riktiga ljud/musik-stems

## Kodstil
- Engelska i UI-texter och kod