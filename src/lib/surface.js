import { rgb } from 'd3-color';

export function buildSurface(rows, scales) {
  const nRows = rows.length, nCols = 11, n = nRows * nCols;
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const t = i % nRows;
    let m = Math.floor(i / nRows);
    let v = rows[t].curve[m];
    if (Number.isNaN(v)) {
      if (m === 0) { v = rows[t].curve[1]; m = 1; }
      else { while (Number.isNaN(v) && m > 0) { m--; v = rows[t].curve[m]; } }
    }
    const c = rgb(scales.color(v));
    positions[i * 3] = scales.x(rows[t].date);
    positions[i * 3 + 1] = scales.y(v);
    positions[i * 3 + 2] = scales.z(Math.floor(i / nRows));
    colors[i * 3] = c.r / 255; colors[i * 3 + 1] = c.g / 255; colors[i * 3 + 2] = c.b / 255;
  }
  return { positions, colors, rows: nRows, cols: nCols };
}

export function polyline(rows, scales, { matIdx, timeIdx }) {
  const pts = [];
  if (matIdx !== undefined) {
    rows.forEach((r) => {
      if (!Number.isNaN(r.curve[matIdx]))
        pts.push(scales.x(r.date), scales.y(r.curve[matIdx]), scales.z(matIdx));
    });
  } else {
    rows[timeIdx].curve.forEach((v, m) => {
      if (!Number.isNaN(v))
        pts.push(scales.x(rows[timeIdx].date), scales.y(v), scales.z(m));
    });
  }
  return new Float32Array(pts);
}
