import { MATURITY_LABELS } from './data.js';

export function makeLabelDefs(rows, scales) {
  const defs = [];
  const yFloor = scales.y.range()[0];
  const [z0, z1] = [scales.z(-0.25), scales.z(10.25)];
  const xEnd = scales.x.range()[1];

  for (const tick of scales.x.ticks(20)) {
    const year = tick.getFullYear();
    defs.push({
      axis: 'x', year,
      html: year >= 2013 ? String(year) : '’' + String(year).slice(2),
      anchor: { x: scales.x(tick), y: yFloor, z: z0 },
      align: (v) => (v.phi > 0.4 ? 'center' : v.phi > 0 ? 'right' : 'left'),
      valign: (v) => (v.phi > 0.4 ? 'top' : 'middle'),
      visible: (v) => year % 2 === 0 || v.width >= 60,
    });
  }

  MATURITY_LABELS.forEach((label, m) => {
    defs.push({
      axis: 'z',
      html: label.split(' ').join('<br>'),
      anchor: { x: xEnd + 0.5, y: yFloor, z: scales.z(m) },
      align: (v) => (v.phi > 0.3 ? 'left' : 'center'),
      valign: (v) => (v.azi < 0.3 ? 'middle' : 'top'),
      visible: () => true,
    });
  });

  for (const pct of scales.y.ticks(5)) {
    if (!pct) continue;
    defs.push({
      axis: 'y',
      html: pct + '%' + (pct === 8 ? ' yield<br>per year' : ''),
      anchor: { x: xEnd + 1, y: scales.y(pct), z: z1 },
      align: () => 'left',
      valign: () => 'middle',
      visible: () => true,
    });
  }
  return defs;
}
