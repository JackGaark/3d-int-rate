import { describe, it, expect } from 'vitest';
import { SCENES } from './scenes.js';
import maxima from './maxima.json';

describe('scenes', () => {
  it('has 6 ordered scenes with complete views', () => {
    expect(SCENES.map((s) => s.id)).toEqual(['intro','side','valley','2004-valley','low-now','top']);
    for (const s of SCENES) {
      for (const k of ['azi','phi','fov','width','lookat_x','lookat_y','lookat_z'])
        expect(typeof s.view[k]).toBe('number');
      expect(s.hed.length).toBeGreaterThan(0);
      expect(s.text.length).toBeGreaterThan(20);
    }
  });
  it('maxima is a non-empty index array', () => {
    expect(maxima.length).toBeGreaterThan(50);
    expect(Number.isInteger(maxima[0])).toBe(true);
  });
});
