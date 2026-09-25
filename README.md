# Chroma Drift

**▶ Play in your browser: https://ruperto72.github.io/chroma-drift/**

A modern take on the 80s bouncing-ball colour collector. The world has lost its colours: bounce through four looping worlds, shoot the creatures, collect the colour drops they leave behind and fill the red, green and blue meters to paint the landscape back to life.

The ball bounces on its own and at first you only control its spin. Green gems move the cursor along the power bar – activate a power when it's lit to earn **Thrust** (full steering), **Antigrav** (free flight), **Rapid** fire, **Double** shots, a **Satellite** helper or a temporary **Shield**.

## Features

- **Four worlds**, each with its own hand-made landscape, palette and rule:
  - *The Meadows* – gentle hills, rocks, mushrooms and clouds
  - *Dusk Valley* – steep valleys, pillars and gusting wind
  - *Frost Coast* – slippery ice fields and water pools
  - *Ember Woods* – lava pits, thorns and falling embers
- **Level objects** – mushrooms for super bounces, rocks and clouds to land on, pillars that block your way, thorns, and crystals you can shoot for colour drops.
- **Caves** – every world hides a visible hole and one or two secret entrances (a bush, a cracked rock, an opening high up a cliff). Inside are treasure caves and pitch-dark caves full of stars, gems and one extra life per world.
- Keyboard and touch controls, procedural WebAudio sound effects, no runtime dependencies.

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Spin / steer | ← → or A D | Left joystick |
| Bounce height, fly with Antigrav | ↑ ↓ or W S | Left joystick |
| Fire (hold) | Space or J | FIRE |
| Activate the lit power | Enter, Shift or K | POWER |
| Pause | P | – |

## Getting started

Requires a current [Node.js](https://nodejs.org/) LTS (22 or later).

```bash
npm install
npm run dev       # dev server with hot reload (also reachable on your LAN for phone testing)
npm test          # Vitest: unit, level-data and playability tests
npm run build     # static build in dist/
npm run preview   # serve the build locally
```

The game uses ES modules, so open it through the dev or preview server rather than double-clicking `index.html`.

## Project structure

```
index.html            page, menus and touch controls
src/
  main.js             canvas setup, resize, frame loop
  state.js            shared game state (G) and view scale (view)
  game.js             game flow and per-frame update
  player.js           ball physics
  enemies.js, pickups.js, fx.js, audio.js, input.js
  terrain.js          ground as control points, holes, level objects, cave terrain
  zones.js            ice, water and lava
  rules.js            wind and embers
  caves.js            cave entrances, scene switching, loot
  render.js, hud.js   drawing
  levels/*.json       one file per world
test/                 Vitest suites
docs/superpowers/     design spec and implementation plans
```

## Editing worlds

Each world in `src/levels/` is plain JSON: palette, colour targets (`need`), 48 ground heights, objects, zones, rules, decor and caves. All vertical values are heights above the bottom of the screen. After editing, run `npm test` – the level tests check that the data is valid, and the playability tests simulate the real physics to make sure lava pits, pillars and every cave can still be crossed without power-ups.
