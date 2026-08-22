import { scaleTime, scaleLinear, scaleQuantile } from 'd3-scale';
import { max } from 'd3-array';

export const WORLD = { width: 80, depth: 40, height: 30 };

// 22-step ramp from the original graphic.
const RAMP = ['#eef4f8','#ddecf4','#cce5f0','#bcddec','#aed5e7','#a0cde2','#94c5dc','#89bcd6','#7eb4d0','#74abc9','#6aa2c2','#619abb','#5892b4','#4f8aad','#4781a6','#3f799f','#3a7195','#35688c','#326082','#2f5877','#2c506c','#243d52'];

export function makeScales(rows) {
  const allYields = rows.flatMap((r) => r.curve).filter((v) => !Number.isNaN(v));
  const quant = scaleQuantile().domain(allYields).range(RAMP);
  return {
    x: scaleTime().domain([new Date(1990, 0, 1), max(rows, (r) => r.date)]).range([-WORLD.width / 2, WORLD.width / 2]),
    z: scaleLinear().domain([-0.25, 10.25]).range([WORLD.depth / 2, -WORLD.depth / 2]),
    y: scaleLinear().domain([0, 9.5]).range([0, WORLD.height]),
    color: (v) => (v < 0 ? '#f89493' : quant(v)),
  };
}
