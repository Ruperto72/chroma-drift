import { L, TAU } from './config.js';
import { view } from './state.js';

export const groundY = x => { const t = x / L * TAU; return view.H - 82 - 22 * Math.sin(t * 5) - 12 * Math.sin(t * 13 + 1.3) - 6 * Math.sin(t * 31 + .4); };
