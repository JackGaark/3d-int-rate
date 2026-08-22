import { describe, it, expect } from 'vitest';
import { makeLabelDefs } from './labels.js';
import { makeScales } from './scales.js';

const rows = [
  { date: new Date(1990, 0, 1), curve: [1,2,3,4,5,6,7,8,9,8,7] },
  { date: new Date(2015, 0, 1), curve: [1,2,3,4,5,6,7,8,9,8,7] },
];

describe('makeLabelDefs', () => {
  const defs = makeLabelDefs(rows, makeScales(rows));
  it('produces x year, z maturity, and y percent labels', () => {
    expect(defs.filter((d) => d.axis === 'x').length).toBeGreaterThan(10);
    expect(defs.filter((d) => d.axis === 'z').length).toBe(11);
    expect(defs.filter((d) => d.axis === 'y').length).toBeGreaterThan(2);
  });
  it('year labels thin out when zoomed in', () => {
    const odd = defs.find((d) => d.axis === 'x' && d.year % 2 === 1);
    expect(odd.visible({ width: 60, phi: 0.7, azi: 1.2 })).toBe(true);
    expect(odd.visible({ width: 50, phi: 0.7, azi: 1.2 })).toBe(false);
  });
  it('alignment responds to camera angle', () => {
    const x = defs.find((d) => d.axis === 'x');
    expect(x.align({ phi: 0.5 })).toBe('center');
    expect(x.align({ phi: 0.2 })).toBe('right');
    expect(x.align({ phi: -0.1 })).toBe('left');
  });
});
