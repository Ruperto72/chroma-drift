import { TOP } from './config.js';
import { G, view } from './state.js';
import { rnd, wd } from './util.js';
import { loadTerrain, saveTerrain, restoreTerrain, openHole, closeHole, holeAt, groundAt, ceilingAt, caveWidth, objBox } from './terrain.js';
import { loadZones } from './zones.js';
import { loadRules } from './rules.js';
import { sfx } from './audio.js';
import { banner, burst, addText } from './fx.js';
import { curLevel } from './game.js';
import { collectGem } from './pickups.js';

const EXIT = 60;
const TITLES = { treasure: 'Treasure cave', dark: 'Dark cave' };
const ENTRANCE = {
  hole:  e => ({ type: 'hole', x: e.x, w: e.w || 70 }),
  bush:  e => ({ type: 'bush', x: e.x, hp: 1, stopsShots: true }),
  rock:  e => ({ type: 'rock', x: e.x, w: 64, h: 46, hp: 3, stopsShots: true, crack: true }),
  cliff: e => ({ type: 'cliff', x: e.x, opening: e.y }),
};

export const caveById = id => (curLevel().caves || []).find(c => c.id === id) || null;

export function surfaceLevel(lv) {
  const entrances = (lv.caves || []).filter(c => !G.cavesUsed.has(c.id)).map(c => ({ ...ENTRANCE[c.entrance.kind](c.entrance), cave: c.id }));
  return { ...lv, objects: [...lv.objects, ...entrances] };
}

export function breakEntrance(o) {
  const top = objBox(o).top;
  openHole(o.x, 70, o.cave);
  burst(o.x, top + o.h / 2, '#c9b28a', 24); sfx('pop');
  addText(o.x, top, 'A hidden passage!', '#ffe066');
}

export function enterCave(cave) {
  G.surfaceSnapshot = { terrain: saveTerrain(), enemies: G.enemies, bullets: G.bullets, ebullets: G.ebullets, drops: G.drops, gems: G.gems, embers: G.embers, camX: G.camX, spawnT: G.spawnT };
  G.scene = 'cave'; G.cave = cave; G.cavesUsed.add(cave.id);
  loadTerrain({ width: cave.width, ground: cave.floor, ceiling: cave.ceiling, objects: cave.objects || [] });
  loadZones({}); loadRules({});
  G.enemies = (cave.foes || []).map(f => ({ type: 'float', x: f.x, y: view.H - f.y, baseY: view.H - f.y, vx: 0, vy: 0, t: rnd(0, 3), age: 0, r: 14, hp: 1, color: -1, phase: 0, flash: 0, dead: false, keep: true }));
  G.bullets = []; G.ebullets = []; G.drops = []; G.gems = [];
  G.loot = cave.loot.filter(l => l.type !== 'life' || !G.lifeTaken).map(l => ({ ...l }));
  Object.assign(G.P, { x: 80, y: ceilingAt(80) + 40, vx: 60, vy: 0, inv: 1 });
  G.camX = 0;
  banner(TITLES[cave.type]); sfx('power');
}

export function exitCave() {
  const s = G.surfaceSnapshot, cave = G.cave;
  loadZones(curLevel()); loadRules(curLevel());
  restoreTerrain(s.terrain); closeHole(cave.id);
  Object.assign(G, { scene: 'surface', cave: null, surfaceSnapshot: null, loot: [], enemies: s.enemies, bullets: s.bullets, ebullets: s.ebullets, drops: s.drops, gems: s.gems, embers: s.embers, camX: s.camX, spawnT: s.spawnT });
  const x = cave.entrance.x + (cave.entrance.kind === 'cliff' ? 70 : 0);
  Object.assign(G.P, { x, y: (groundAt(x) ?? view.H) - 140, vx: 0, vy: 0, inv: 2 });
  banner('Back to the surface'); sfx('gem');
}

export function tryCliff(o) {
  if (o.cave && !G.cavesUsed.has(o.cave) && Math.abs(G.P.y - (view.H - o.opening)) < 26) enterCave(caveById(o.cave));
}

function collect(it) {
  const y = view.H - it.y;
  if (it.type === 'gem') collectGem({ x: it.x, y });
  else if (it.type === 'star') { G.score += 200; addText(it.x, y, '+200', '#ffe066'); sfx('drop'); }
  else if (it.type === 'life') { G.lives++; G.lifeTaken = true; addText(it.x, y, 'Extra life!', '#ffcf4a'); sfx('power'); }
}

export function updateCaves() {
  const P = G.P;
  if (G.dead > 0 || G.state !== 'play') return;
  if (G.scene === 'surface') {
    if (P.y - P.r <= view.H) return;
    const cave = caveById(holeAt(P.x)?.cave);
    if (cave) enterCave(cave);
    else Object.assign(P, { x: P.x + 100, y: TOP + 90, vy: 0 });
    return;
  }
  for (const it of G.loot) {
    const dx = wd(it.x - P.x), dy = view.H - it.y - P.y;
    if (dx * dx + dy * dy < (P.r + 12) ** 2) { it.got = true; collect(it); }
  }
  G.loot = G.loot.filter(it => !it.got);
  if (P.x > caveWidth() - EXIT) exitCave();
}
