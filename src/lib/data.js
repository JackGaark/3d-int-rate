import { tsvParse } from 'd3-dsv';

export const MATURITIES = ['X1M','X3M','X6M','X1Y','X2Y','X3Y','X5Y','X7Y','X10Y','X20Y','X30Y'];
export const MATURITY_LABELS = ['1-month Treasury','3-month','6-month','1-year','2-year','3-year','5-year','7-year','10-year','20-year','30-year'];

const toNum = (v) => (v === 'N/A' || v === '' || v === undefined ? NaN : +v);

export function parseRows(tsvText) {
  return tsvParse(tsvText)
    .map((r) => {
      const [m, d, y] = r.Time.split('/').map(Number);
      return {
        date: new Date((y > 20 ? 1900 : 2000) + y, m - 1, d),
        curve: MATURITIES.map((k) => toNum(r[k])),
      };
    })
    .filter((r) => r.curve.filter((v) => !Number.isNaN(v)).length >= 7);
}
