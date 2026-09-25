import { describe, it, expect } from 'vitest';
import { groundY } from '../src/terrain.js';
import { view } from '../src/state.js';
import { L } from '../src/config.js';

describe('groundY', () => {
  it('stays within the hill amplitude band', () => {
    view.H = 540;
    for (let x = 0; x < L; x += 10) {
      const y = groundY(x);
      expect(y).toBeGreaterThanOrEqual(540 - 82 - 40);
      expect(y).toBeLessThanOrEqual(540 - 82 + 40);
    }
  });
  it('is continuous across the world loop', () => {
    view.H = 540;
    expect(groundY(0)).toBeCloseTo(groundY(L), 6);
  });
});
