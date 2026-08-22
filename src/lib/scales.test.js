import { describe, it, expect } from 'vitest';
import { makeScales, WORLD } from './scales.js';

const rows = [
  { date: new Date(1990, 0, 1), curve: [1,2,3,4,5,6,7,8,9,8,7] },
  { date: new Date(2015, 2, 18), curve: [0,0.5,1,1.5,2,2.5,3,3.5,4,4.5,5] },
];

describe('makeScales', () => {
  const s = makeScales(rows);
  it('maps time to x in [-40, 40]', () => {
    expect(s.x(new Date(1990, 0, 1))).toBeCloseTo(-40);
    expect(s.x(new Date(2015, 2, 18))).toBeCloseTo(40);
  });
  it('maps maturity index to z, front edge positive', () => {
    expect(s.z(-0.25)).toBeCloseTo(20);
    expect(s.z(10.25)).toBeCloseTo(-20);
    expect(s.z(0)).toBeGreaterThan(s.z(10));
  });
  it('maps yield to height', () => {
    expect(s.y(0)).toBeCloseTo(0);
    expect(s.y(9.5)).toBeCloseTo(30);
  });
  it('colors negatives red and yields blues otherwise', () => {
    expect(s.color(-0.1)).toBe('#f89493');
    expect(s.color(0.2)).toMatch(/^#[0-9a-f]{6}$/);
    expect(s.color(9)).not.toBe(s.color(0.2));
  });
  it('exports world dims', () => expect(WORLD).toEqual({ width: 80, depth: 40, height: 30 }));
});
