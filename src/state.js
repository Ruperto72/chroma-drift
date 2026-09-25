export const view = { W: 960, H: 540, S: 1, ctx: null };

export const G = {
  state: 'menu', score: 0, lives: 3, level: 0, sel: -1, shield: 0, fireCD: 0, dead: 0, t: 0, clearT: 0, sat: 0, banner: null,
  need: [0, 0, 0], got: [0, 0, 0], spawnT: 0,
  P: null, spark: null, own: null,
  enemies: [], bullets: [], ebullets: [], drops: [], gems: [], parts: [], texts: [], embers: [], emberT: 0,
  camX: 0, shake: 0, paused: false, best: 0,
  scene: 'surface', cave: null, surfaceSnapshot: null, cavesUsed: new Set(), lifeTaken: false, loot: [],
};
try { G.best = +localStorage.getItem('chromaDriftBest') || 0; } catch (e) {}
