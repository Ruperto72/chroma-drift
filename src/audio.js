let AC = null;
const SFX = {
  shot: [900, 420, .06, 'square', .025], bounce: [150, 80, .08, 'sine', .05], pop: [320, 60, .18, 'sawtooth', .06],
  drop: [660, 1320, .12, 'triangle', .08], gem: [990, 1980, .16, 'sine', .08], power: [440, 1760, .35, 'square', .05],
  deny: [200, 140, .16, 'square', .05], die: [420, 40, .7, 'sawtooth', .1], clear: [523, 1046, .5, 'triangle', .1],
  boing: [220, 660, .18, 'sine', .07], clink: [1400, 900, .08, 'triangle', .05],
};

export function initAudio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
  if (AC && AC.state === 'suspended') AC.resume();
}

export function sfx(n, delay = 0) {
  if (!AC) return;
  const p = SFX[n], t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = p[3]; o.frequency.setValueAtTime(p[0], t); o.frequency.exponentialRampToValueAtTime(p[1], t + p[2]);
  g.gain.setValueAtTime(p[4], t); g.gain.exponentialRampToValueAtTime(.0001, t + p[2]);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + p[2] + .03);
}
