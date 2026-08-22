import { describe, it, expect } from 'vitest';
import { parseRows, MATURITIES } from './data.js';

const HEADER = 'Time\tX1M\tX3M\tX6M\tX1Y\tX2Y\tX3Y\tX5Y\tX7Y\tX10Y\tX20Y\tX30Y';
const row = (time, vals) => [time, ...vals].join('\t');

describe('parseRows', () => {
  it('exports 11 maturities in order', () => {
    expect(MATURITIES).toEqual(['X1M','X3M','X6M','X1Y','X2Y','X3Y','X5Y','X7Y','X10Y','X20Y','X30Y']);
  });

  it('parses dates with 2-digit year pivot at 20', () => {
    const t = [HEADER,
      row('01/02/90', ['N/A',7.83,7.89,7.81,7.87,7.9,7.87,7.98,7.94,'N/A',8]),
      row('03/15/05', ['N/A',2.8,3.0,3.3,3.7,3.9,4.1,4.3,4.5,4.9,4.8])].join('\n');
    const rows = parseRows(t);
    expect(rows[0].date.getFullYear()).toBe(1990);
    expect(rows[1].date.getFullYear()).toBe(2005);
  });

  it('coerces N/A and empty to NaN in curve', () => {
    const t = [HEADER, row('01/02/90', ['N/A',7.83,'',7.81,7.87,7.9,7.87,7.98,7.94,'N/A',8])].join('\n');
    const c = parseRows(t)[0].curve;
    expect(Number.isNaN(c[0])).toBe(true);
    expect(Number.isNaN(c[2])).toBe(true);
    expect(c[1]).toBe(7.83);
  });

  it('drops rows with fewer than 7 valid yields', () => {
    const sparse = row('01/03/90', ['N/A','N/A','N/A','N/A','N/A',1,2,3,4,'N/A','N/A']);
    const full = row('01/02/90', ['N/A',7.83,7.89,7.81,7.87,7.9,7.87,7.98,7.94,'N/A',8]);
    expect(parseRows([HEADER, sparse, full].join('\n'))).toHaveLength(1);
  });
});
