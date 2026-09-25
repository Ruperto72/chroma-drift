import { describe, it, expect } from 'vitest';
import { G, view } from '../src/state.js';
import { newGame, startLevel, update } from '../src/game.js';
import { groundAt, objects, damageObject, caveWidth, holeAt, openHole } from '../src/terrain.js';
import { enterCave, breakEntrance, updateCaves } from '../src/caves.js';
import { updatePlayer } from '../src/player.js';
import { LEVELS } from '../src/levels/index.js';

function world(i) { view.H = 540; view.W = 960; newGame('play'); G.level = i; startLevel(); G.P.inv = 0; }
const caveOf = (i, kind) => LEVELS[i].caves.find(c => c.entrance.kind === kind);
const lifeCave = i => LEVELS[i].caves.find(c => c.loot.some(l => l.type === 'life'));

describe('cave entrances', () => {
  it('opens every cave entrance in play', () => {
    for (let i = 0; i < LEVELS.length; i++) {
      world(i);
      for (const c of LEVELS[i].caves) {
        if (c.entrance.kind === 'hole') expect(groundAt(c.entrance.x)).toBeNull();
        else expect(objects().some(o => o.cave === c.id)).toBe(true);
      }
    }
  });
  it('shows no entrances behind the menu', () => {
    view.H = 540; view.W = 960; newGame('menu');
    expect(groundAt(caveOf(0, 'hole').entrance.x)).not.toBeNull();
    expect(objects().some(o => o.cave)).toBe(false);
  });
  it('opens a hidden passage when a bush is shot', () => {
    world(0);
    const c = caveOf(0, 'bush'), o = objects().find(o => o.cave === c.id);
    expect(damageObject(o)).toBe(true);
    breakEntrance(o);
    expect(groundAt(o.x)).toBeNull();
    expect(holeAt(o.x)).toMatchObject({ cave: c.id });
  });
  it('needs three hits to crack a rock entrance', () => {
    world(1);
    const o = objects().find(o => o.cave === caveOf(1, 'rock').id);
    expect(damageObject(o)).toBe(false);
    expect(damageObject(o)).toBe(false);
    expect(damageObject(o)).toBe(true);
  });
  it('enters a cliff only through its opening', () => {
    const c = caveOf(1, 'cliff');
    for (const [dy, scene] of [[0, 'cave'], [100, 'surface']]) {
      world(1);
      const o = objects().find(o => o.cave === c.id);
      G.own.anti = true;
      Object.assign(G.P, { x: o.x - 20 - 18 + 2, y: view.H - c.entrance.y + dy, vx: 300, vy: 0 });
      updatePlayer(1 / 60);
      expect(G.scene).toBe(scene);
    }
  });
});

describe('entering and leaving', () => {
  it('drops into the cave through its hole', () => {
    world(0);
    const c = caveOf(0, 'hole');
    Object.assign(G.P, { x: c.entrance.x, y: view.H + 30 });
    updateCaves();
    expect(G.scene).toBe('cave');
    expect(G.cave.id).toBe(c.id);
    expect(caveWidth()).toBe(c.width);
  });
  it('leaves the surface exactly as it was', () => {
    world(2);
    const crystal = objects().find(o => o.type === 'crystal');
    damageObject(crystal); damageObject(crystal); damageObject(crystal);
    const enemies = [{ type: 'float', x: 5, y: 5 }], drops = [{ x: 1, y: 1, c: 0 }], embers = [{ x: 2, y: 2 }];
    Object.assign(G, { enemies, drops, embers, camX: 1234 });
    enterCave(caveOf(2, 'hole'));
    G.P.x = G.cave.width - 30;
    updateCaves();
    expect(G.scene).toBe('surface');
    expect(G.enemies).toBe(enemies);
    expect(G.drops).toBe(drops);
    expect(G.embers).toBe(embers);
    expect(G.camX).toBe(1234);
    expect(objects().find(o => o.type === 'crystal').gone).toBe(true);
  });
  it('returns the ball to a closed entrance', () => {
    world(0);
    const c = caveOf(0, 'hole');
    enterCave(c);
    G.P.x = c.width - 30;
    updateCaves();
    expect(G.P.x).toBe(c.entrance.x);
    expect(G.P.inv).toBe(2);
    expect(groundAt(c.entrance.x)).not.toBeNull();
    Object.assign(G.P, { y: view.H + 30, inv: 0 });
    updateCaves();
    expect(G.scene).toBe('surface');
    expect(G.P.y).toBeLessThan(view.H);
  });
  it('counts every cave found', () => {
    world(0);
    expect(G.cavesUsed.size).toBe(0);
    enterCave(caveOf(0, 'bush'));
    expect(G.cavesUsed.size).toBe(1);
  });
});

describe('inside a cave', () => {
  it('collects stars, gems and the extra life', () => {
    world(0);
    enterCave(lifeCave(0));
    const lives = G.lives, score = G.score;
    for (const it of [...G.loot]) { G.P.x = it.x; G.P.y = view.H - it.y; updateCaves(); }
    expect(G.loot).toHaveLength(0);
    expect(G.lives).toBe(lives + 1);
    expect(G.score).toBeGreaterThan(score);
    expect(G.lifeTaken).toBe(true);
  });
  it('hides the extra life once it has been taken', () => {
    world(0);
    G.lifeTaken = true;
    enterCave(lifeCave(0));
    expect(G.loot.some(l => l.type === 'life')).toBe(false);
  });
  it('spawns no enemy waves inside a cave', () => {
    world(0);
    enterCave(caveOf(0, 'hole'));
    G.spawnT = 0;
    update(1 / 60);
    expect(G.enemies).toHaveLength(0);
  });
  it('keeps dark cave foes however far they are from the camera', () => {
    world(0);
    const c = LEVELS[0].caves.find(c => c.type === 'dark');
    enterCave(c);
    G.P.inv = 99;
    for (let i = 0; i < 360; i++) update(1 / 60);
    expect(G.enemies).toHaveLength(c.foes.length);
  });
  it('removes drops that fall into a hole', () => {
    world(0);
    openHole(1000, 70, null);
    G.drops = [{ x: 1000, y: view.H + 50, vx: 0, vy: 80, t: 0, c: 0 }];
    update(1 / 60);
    expect(G.drops).toHaveLength(0);
  });
});
