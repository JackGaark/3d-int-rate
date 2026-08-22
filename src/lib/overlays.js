import * as THREE from 'three';
import { polyline } from './surface.js';
import { MATURITIES } from './data.js';
import maxima from './maxima.json';

export const BASE_OPACITY = { front: 1, product: 0.5, date: 0.2, bottom: 1 };

const line = (positions, { color = 0xffffff, opacity = 1 } = {}) => {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
};

export function buildOverlays(rows, scales) {
  const groups = { front: [], product: [], date: [], bottom: [] };

  // Front: black lines tracing the short end (3-month primary, 1-month where present).
  groups.front.push(line(polyline(rows, scales, { matIdx: 1 }), { color: 0x000000 }));
  groups.front.push(line(polyline(rows, scales, { matIdx: 0 }), { color: 0x000000 }));

  // Product: white line per maturity (skip index 0, drawn as front).
  for (let m = 1; m < MATURITIES.length; m++)
    groups.product.push(line(polyline(rows, scales, { matIdx: m }), { opacity: BASE_OPACITY.product }));

  // Date: first row, last row, plus maxima indices within range.
  const dateIdxs = [0, rows.length - 1, ...maxima.filter((i) => i > 0 && i < rows.length - 1)];
  for (const t of dateIdxs)
    groups.date.push(line(polyline(rows, scales, { timeIdx: t }), { opacity: BASE_OPACITY.date }));

  // Bottom: floor grid along time at y=0.
  const [z0, z1] = [scales.z(-0.25), scales.z(10.25)];
  for (const tick of scales.x.ticks(20)) {
    const x = scales.x(tick);
    groups.bottom.push(line(new Float32Array([x, 0, z0, x, 0, z1]), { color: 0xdddddd }));
  }

  // Axis frame: three edges in dark gray.
  const [x0, x1] = [scales.x.range()[0], scales.x.range()[1]];
  const axes = [
    line(new Float32Array([x0, 0, z0, x1, 0, z0]), { color: 0x888888 }),
    line(new Float32Array([x1, 0, z0, x1, 0, z1]), { color: 0x888888 }),
    line(new Float32Array([x1, 0, z1, x1, scales.y.range()[1], z1]), { color: 0x888888 }),
  ];

  // Highlights: black "today" curve + black per-maturity lines, hidden initially.
  const last = line(polyline(rows, scales, { timeIdx: rows.length - 1 }), { color: 0x000000, opacity: 0 });
  const products = new Map();
  MATURITIES.forEach((k, m) => {
    if (m < 3) return;
    products.set(k, line(polyline(rows, scales, { matIdx: m }), { color: 0x000000, opacity: 0 }));
  });

  return { groups, axes, highlight: { last, products } };
}

export function setGroupOpacity(groups, kind, value) {
  groups[kind].forEach((l) => (l.material.opacity = value));
}
