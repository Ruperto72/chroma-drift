import { describe, it, expect } from 'vitest';
import { mod, wd, clamp, lerp, tint } from '../src/util.js';
import { L } from '../src/config.js';

describe('mod', () => {
  it('wraps negative values', () => expect(mod(-1, 10)).toBe(9));
  it('wraps values above n', () => expect(mod(25, 10)).toBe(5));
});

describe('wd', () => {
  it('gives shortest signed distance across the world loop', () => {
    expect(wd(100)).toBe(100);
    expect(wd(L - 100)).toBe(-100);
    expect(wd(-(L - 50))).toBe(50);
  });
});

describe('clamp / lerp', () => {
  it('clamps', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });
  it('lerps', () => expect(lerp(10, 20, .25)).toBe(12.5));
});

describe('tint', () => {
  it('keeps full colour at saturation 1', () => expect(tint('#ff0000', 1)).toBe('rgba(255,0,0,1)'));
  it('goes to luminance grey at saturation 0', () => expect(tint('#ff0000', 0, .5)).toBe('rgba(76,76,76,0.5)'));
});
