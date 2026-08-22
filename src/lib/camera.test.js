import { describe, it, expect } from 'vitest';
import { widthToRadius, radiusToWidth, viewToPosition, readView, tweenView } from './camera.js';

describe('zoom math', () => {
  it('round-trips width <-> radius', () => {
    const r = widthToRadius(30, 60);
    expect(radiusToWidth(30, r)).toBeCloseTo(60);
  });
  it('narrow fov means far camera at same width', () => {
    expect(widthToRadius(0.5, 35)).toBeGreaterThan(widthToRadius(30, 35));
  });
});

describe('viewToPosition', () => {
  it('azi=0 puts camera straight above', () => {
    const p = viewToPosition({ azi: 0, phi: 1.5707963, fov: 0.1, width: 50, lookat_x: 0, lookat_y: 7, lookat_z: 0 });
    expect(p.x).toBeCloseTo(0, 3);
    expect(p.z).toBeCloseTo(0, 3);
    expect(p.y).toBeCloseTo(widthToRadius(0.1, 50));
  });
});

describe('readView', () => {
  it('inverts viewToPosition', () => {
    const view = { azi: 1.24, phi: 0.758999, fov: 30, width: 60, lookat_x: 4.05, lookat_y: 5.03, lookat_z: -6.174 };
    const p = viewToPosition(view);
    const fake = { position: { x: p.x, y: p.y, z: p.z, length: () => Math.hypot(p.x, p.y, p.z) }, fov: 30 };
    const back = readView(fake, { x: 4.05, y: 5.03, z: -6.174 });
    expect(back.azi).toBeCloseTo(1.24, 3);
    expect(back.phi).toBeCloseTo(0.758999, 3);
    expect(back.width).toBeCloseTo(60, 1);
  });
});

describe('readView pole and quadrant cases', () => {
  it('returns finite azi and phi at the pole (x=0, z=0)', () => {
    const r = widthToRadius(0.1, 50);
    const fake = { position: { x: 0, y: r, z: 0, length: () => r }, fov: 0.1 };
    const back = readView(fake, { x: 0, y: 0, z: 0 });
    expect(Number.isFinite(back.azi)).toBe(true);
    expect(Number.isFinite(back.phi)).toBe(true);
    expect(back.azi).toBeCloseTo(0, 3);
  });

  it('inverts viewToPosition for a quadrant view with x<0 (phi > pi/2)', () => {
    const view = { azi: 1.1, phi: 1.613071831, fov: 30, width: 60, lookat_x: 0, lookat_y: 0, lookat_z: 0 };
    const p = viewToPosition(view);
    expect(p.x).toBeLessThan(0);
    const fake = { position: { x: p.x, y: p.y, z: p.z, length: () => Math.hypot(p.x, p.y, p.z) }, fov: 30 };
    const back = readView(fake, { x: 0, y: 0, z: 0 });
    expect(back.azi).toBeCloseTo(1.1, 3);
    expect(back.phi).toBeCloseTo(1.613071831, 3);
  });
});

describe('tweenView', () => {
  it('ends exactly at target and calls onDone', async () => {
    const from = { azi: 0, phi: 0, fov: 30, width: 40, lookat_x: 0, lookat_y: 0, lookat_z: 0 };
    const to = { azi: 1, phi: 1, fov: 20, width: 60, lookat_x: 1, lookat_y: 2, lookat_z: 3 };
    let last;
    await new Promise((res) => tweenView(from, to, (v) => (last = v), res, 50));
    expect(last.azi).toBeCloseTo(1);
    expect(last.width).toBeCloseTo(60);
  });
});
