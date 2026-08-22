import { describe, it, expect } from 'vitest';
import { buildSurface, polyline } from './surface.js';
import { makeScales } from './scales.js';

const mkRows = () => [
  { date: new Date(1990, 0, 1), curve: [NaN,2,3,4,5,6,7,8,9,8,7] },
  { date: new Date(2000, 0, 1), curve: [1,NaN,3,4,5,6,7,8,9,8,7] },
  { date: new Date(2015, 0, 1), curve: [1,2,3,4,5,6,7,8,9,8,7] },
];

describe('buildSurface', () => {
  const rows = mkRows(); const s = makeScales(rows);
  const g = buildSurface(rows, s);
  it('emits rows*cols vertices', () => {
    expect(g.rows).toBe(3); expect(g.cols).toBe(11);
    expect(g.positions.length).toBe(3 * 11 * 3);
    expect(g.colors.length).toBe(3 * 11 * 3);
  });
  it('fills a leading NaN from the next maturity', () => {
    // vertex (timeIdx 0, matIdx 0): curve[0] is NaN -> uses curve[1]=2
    const y = g.positions[0 * 3 + 1];
    expect(y).toBeCloseTo(s.y(2));
  });
  it('fills an interior NaN from the previous maturity', () => {
    // vertex (timeIdx 1, matIdx 1): NaN -> walks back to curve[0]=1
    const i = 1 * 3 + 1; // matIdx 1 block starts at rows(3) verts; timeIdx 1 => index 3+1=4
    const y = g.positions[4 * 3 + 1];
    expect(y).toBeCloseTo(s.y(1));
  });
  it('colors are normalized rgb in [0,1]', () => {
    for (const c of g.colors) { expect(c).toBeGreaterThanOrEqual(0); expect(c).toBeLessThanOrEqual(1); }
  });
});

describe('polyline', () => {
  const rows = mkRows(); const s = makeScales(rows);
  it('maturity line skips NaN days', () => {
    const line = polyline(rows, s, { matIdx: 0 });
    expect(line.length).toBe(2 * 3); // day 0 is NaN at maturity 0
  });
  it('date line skips NaN maturities', () => {
    const line = polyline(rows, s, { timeIdx: 1 });
    expect(line.length).toBe(10 * 3);
  });
});
