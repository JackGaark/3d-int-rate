import { describe, it, expect } from 'vitest';
import { buildOverlays, BASE_OPACITY, setGroupOpacity } from './overlays.js';
import { makeScales } from './scales.js';

const rows = Array.from({ length: 100 }, (_, i) => ({
  date: new Date(1990 + Math.floor(i / 4), (i % 4) * 3, 1),
  curve: [1,2,3,4,5,6,7,8,9,8,7],
}));

describe('buildOverlays', () => {
  const o = buildOverlays(rows, makeScales(rows));
  it('creates the four groups plus highlights', () => {
    expect(o.groups.front.length).toBe(2);      // 3-month + 1-month front lines
    expect(o.groups.product.length).toBe(10);   // every maturity except index 0
    expect(o.groups.date.length).toBeGreaterThan(1); // first, last, maxima in range
    expect(o.groups.bottom.length).toBeGreaterThan(5);
    expect(o.highlight.last).toBeDefined();
    expect(o.highlight.products.get('X10Y')).toBeDefined();
  });
  it('applies base opacities and can fade a group', () => {
    expect(o.groups.product[0].material.opacity).toBe(BASE_OPACITY.product);
    setGroupOpacity(o.groups, 'product', 0);
    expect(o.groups.product[0].material.opacity).toBe(0);
  });
});
