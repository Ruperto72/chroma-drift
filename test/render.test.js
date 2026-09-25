import { describe, it, expect } from 'vitest';
import { G, view } from '../src/state.js';
import { zoneSpan } from '../src/render.js';

describe('zoneSpan', () => {
  it('keeps a wide zone on screen while its left edge is far off to the left', () => {
    view.W = 960; G.camX = 600;
    expect(zoneSpan({ x: 550, w: 700 })).toEqual([-400, 300]);
  });
  it('places a zone ahead of the camera across the world loop', () => {
    view.W = 960; G.camX = 4500;
    expect(zoneSpan({ x: 200, w: 200 })).toEqual([400, 600]);
  });
});
