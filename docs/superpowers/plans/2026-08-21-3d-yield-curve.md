# 3-D Yield Curve Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the NYT 3-D yield-curve interactive (US surface + guided story stepper) on a modern stack.

**Architecture:** Pure d3-scaled geometry/camera math modules feed a Three.js scene wrapped in Svelte 5 components. Camera flies between scene presets via d3 tweens; axis labels are HTML divs projected each render with raycast occlusion. Render-on-demand, no RAF loop.

**Tech Stack:** Vite, Svelte 5 (runes), Three.js (latest), d3 v7 micro-packages (`d3-scale`, `d3-array`, `d3-dsv`, `d3-interpolate`, `d3-ease`, `d3-timer`), Vitest.

**Spec:** `docs/superpowers/specs/2026-08-21-3d-yield-curve-design.md`

## Global Constraints

- d3: micro-packages only, never the `d3` monolith.
- Story headline/body text must be original prose — never copy NYT text. Camera numbers are facts and are reused verbatim.
- All `src/lib/*.js` modules must be importable in Node (no `window`, no THREE renderer objects; `three` math classes like `Vector3`/`Raycaster` are fine).
- Rendering is on-demand: renders happen only on control changes, tween frames, label updates, and resize.
- Reference assets live in `.firecrawl/` (original `build.js`, `build.pretty.js`, `yield-curve.csv`); `.firecrawl/` stays gitignored.
- Working directory: `/Users/jackgaarkeuken/Documents/Code/3d-int-rate` (its own git repo).

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.js`, `src/App.svelte`, `src/app.css`, `.gitignore`, `public/yield-curve.tsv`
- Test: `src/lib/smoke.test.js` (temporary, deleted in Task 2)

**Interfaces:**
- Produces: a running Vite + Svelte 5 app and a working `npm test` (Vitest). Data available at `/yield-curve.tsv`.

- [ ] **Step 1: Scaffold with Vite**

```bash
cd /Users/jackgaarkeuken/Documents/Code/3d-int-rate
npm create vite@latest . -- --template svelte   # answer "Ignore files and continue" if prompted
npm install
npm install three d3-scale d3-array d3-dsv d3-interpolate d3-ease d3-timer
npm install -D vitest
```

- [ ] **Step 2: Configure**

Append to `.gitignore` (create if missing):

```
node_modules/
dist/
.firecrawl/
```

In `package.json` scripts, add: `"test": "vitest run"`.

Replace `src/app.css` content with:

```css
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: georgia, serif; background: #fff; color: #333; }
```

- [ ] **Step 3: Copy the data**

```bash
cp .firecrawl/yield-curve.csv public/yield-curve.tsv
```

- [ ] **Step 4: Smoke test**

`src/lib/smoke.test.js`:

```js
import { describe, it, expect } from 'vitest';
describe('toolchain', () => { it('runs', () => expect(1 + 1).toBe(2)); });
```

Run: `npm test` → PASS. Run `npm run dev` briefly and confirm the default page serves and `http://localhost:5173/yield-curve.tsv` returns the TSV.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: Vite + Svelte 5 scaffold with three/d3 deps and data"
```

---

### Task 2: data.js — parse and clean

**Files:**
- Create: `src/lib/data.js`
- Test: `src/lib/data.test.js` (also delete `src/lib/smoke.test.js`)

**Interfaces:**
- Produces: `MATURITIES` (array of 11 keys), `MATURITY_LABELS` (display names), `parseRows(tsvText) -> [{date: Date, curve: number[11]}]` (rows filtered, NaN-coerced, chronological).

- [ ] **Step 1: Write failing tests**

`src/lib/data.test.js`:

```js
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
```

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL (module not found).

- [ ] **Step 3: Implement**

`src/lib/data.js`:

```js
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
```

- [ ] **Step 4: Run tests** — `npm test` → PASS. Delete `src/lib/smoke.test.js`.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: TSV parsing with row filtering and NaN coercion"`

---

### Task 3: scales.js — world coordinates and color

**Files:**
- Create: `src/lib/scales.js`
- Test: `src/lib/scales.test.js`

**Interfaces:**
- Consumes: `parseRows` rows (for domain max date and yield values).
- Produces: `makeScales(rows) -> {x, y, z, color}` where `x(date)→[-40,40]`, `z(maturityIndex)→[20,-20]`, `y(yieldPct)→[0,30]`, `color(yieldPct)→css string` (red `#f89493` when negative). Also exports `WORLD` = `{width: 80, depth: 40, height: 30}`.

- [ ] **Step 1: Write failing tests**

`src/lib/scales.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { makeScales, WORLD } from './scales.js';

const rows = [
  { date: new Date(1990, 0, 1), curve: [1,2,3,4,5,6,7,8,9,8,7] },
  { date: new Date(2015, 2, 18), curve: [0,0.5,1,1.5,2,2.5,3,3.5,4,4.5,5] },
];

describe('makeScales', () => {
  const s = makeScales(rows);
  it('maps time to x in [-40, 40]', () => {
    expect(s.x(new Date(1990, 0, 1))).toBeCloseTo(-40);
    expect(s.x(new Date(2015, 2, 18))).toBeCloseTo(40);
  });
  it('maps maturity index to z, front edge positive', () => {
    expect(s.z(-0.25)).toBeCloseTo(20);
    expect(s.z(10.25)).toBeCloseTo(-20);
    expect(s.z(0)).toBeGreaterThan(s.z(10));
  });
  it('maps yield to height', () => {
    expect(s.y(0)).toBeCloseTo(0);
    expect(s.y(9.5)).toBeCloseTo(30);
  });
  it('colors negatives red and yields blues otherwise', () => {
    expect(s.color(-0.1)).toBe('#f89493');
    expect(s.color(0.2)).toMatch(/^#[0-9a-f]{6}$/);
    expect(s.color(9)).not.toBe(s.color(0.2));
  });
  it('exports world dims', () => expect(WORLD).toEqual({ width: 80, depth: 40, height: 30 }));
});
```

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL.

- [ ] **Step 3: Implement**

`src/lib/scales.js`:

```js
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
```

- [ ] **Step 4: Run tests** — `npm test` → PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: world coordinate scales and quantile color ramp"`

---

### Task 4: surface.js — geometry builder

**Files:**
- Create: `src/lib/surface.js`
- Test: `src/lib/surface.test.js`

**Interfaces:**
- Consumes: `rows` from `parseRows`, `scales` from `makeScales`.
- Produces: `buildSurface(rows, scales) -> {positions: Float32Array, colors: Float32Array, rows: n, cols: 11}` — vertex order matches `THREE.PlaneGeometry(w, h, rows-1, 10)` traversal: index `i` → `timeIdx = i % rows`, `matIdx = floor(i / rows)`. Also `polyline(rows, scales, {matIdx}) -> Float32Array` and `polyline(rows, scales, {timeIdx}) -> Float32Array` producing xyz triples that skip NaN points.

- [ ] **Step 1: Write failing tests**

`src/lib/surface.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { buildSurface, polyline } from './surface.js';
import { makeScales } from './scales.js';

const mkRows = () => [
  { date: new Date(1990, 0, 1), curve: [NaN,2,3,4,5,6,7,8,9,8,7] },
  { date: new Date(2000, 0, 1), curve: [1,NaN,3,4,5,6,7,8,9,8,7] },
  { date: new Date(2015, 0, 1), curve: [1,2,3,4,5,6,7,8,9,8,7] },
];

describe('buildSurface', () => {
  const rows = mkRows(); const s = makeScales(rows);
  const g = buildSurface(rows, s);
  it('emits rows*cols vertices', () => {
    expect(g.rows).toBe(3); expect(g.cols).toBe(11);
    expect(g.positions.length).toBe(3 * 11 * 3);
    expect(g.colors.length).toBe(3 * 11 * 3);
  });
  it('fills a leading NaN from the next maturity', () => {
    // vertex (timeIdx 0, matIdx 0): curve[0] is NaN -> uses curve[1]=2
    const y = g.positions[0 * 3 + 1];
    expect(y).toBeCloseTo(s.y(2));
  });
  it('fills an interior NaN from the previous maturity', () => {
    // vertex (timeIdx 1, matIdx 1): NaN -> walks back to curve[0]=1
    const i = 1 * 3 + 1; // matIdx 1 block starts at rows(3) verts; timeIdx 1 => index 3+1=4
    const y = g.positions[4 * 3 + 1];
    expect(y).toBeCloseTo(s.y(1));
  });
  it('colors are normalized rgb in [0,1]', () => {
    for (const c of g.colors) { expect(c).toBeGreaterThanOrEqual(0); expect(c).toBeLessThanOrEqual(1); }
  });
});

describe('polyline', () => {
  const rows = mkRows(); const s = makeScales(rows);
  it('maturity line skips NaN days', () => {
    const line = polyline(rows, s, { matIdx: 0 });
    expect(line.length).toBe(2 * 3); // day 0 is NaN at maturity 0
  });
  it('date line skips NaN maturities', () => {
    const line = polyline(rows, s, { timeIdx: 1 });
    expect(line.length).toBe(10 * 3);
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL.

- [ ] **Step 3: Implement**

First install the color parser: `npm install d3-color`.

`src/lib/surface.js`:

```js
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
```

- [ ] **Step 4: Run tests** — `npm test` → PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: pure surface geometry and polyline builders"`

---

### Task 5: camera.js — view-state math and tween

**Files:**
- Create: `src/lib/camera.js`
- Test: `src/lib/camera.test.js`

**Interfaces:**
- Consumes: nothing internal (pure math + `d3-interpolate`/`d3-ease`/`d3-timer`).
- Produces:
  - `widthToRadius(fovDeg, width) -> r` and `radiusToWidth(fovDeg, r) -> width`
  - `viewToPosition(view) -> {x, y, z}` (spherical placement from `{azi, phi}` and derived `r`)
  - `readView(camera, target) -> view` (reads back `{azi, phi, fov, width, lookat_x/y/z}` from a THREE camera + target vector)
  - `tweenView(from, to, onFrame, onDone, duration = 2000)` — d3-timer driven, cubic-in-out; `onFrame(view)` per tick; returns `{stop}`.

- [ ] **Step 1: Write failing tests**

`src/lib/camera.test.js`:

```js
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
```

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL.

- [ ] **Step 3: Implement**

`src/lib/camera.js`:

```js
import { interpolateObject } from 'd3-interpolate';
import { easeCubicInOut } from 'd3-ease';
import { timer } from 'd3-timer';

const rad = (deg) => (deg / 180) * Math.PI;

export const widthToRadius = (fovDeg, width) => width / (2 * Math.tan(0.5 * rad(fovDeg)));
export const radiusToWidth = (fovDeg, r) => r * 2 * Math.tan(0.5 * rad(fovDeg));

export function viewToPosition(v) {
  const r = widthToRadius(v.fov, v.width);
  return {
    x: r * Math.sin(v.azi) * Math.cos(v.phi),
    y: r * Math.cos(v.azi),
    z: r * Math.sin(v.azi) * Math.sin(v.phi),
  };
}

export function readView(camera, target) {
  const r = camera.position.length();
  let phi = Math.atan(camera.position.z / camera.position.x);
  if (phi < -0.5) phi += Math.PI;
  return {
    azi: Math.acos(camera.position.y / r),
    phi,
    fov: camera.fov,
    width: radiusToWidth(camera.fov, r),
    lookat_x: target.x, lookat_y: target.y, lookat_z: target.z,
  };
}

export function tweenView(from, to, onFrame, onDone, duration = 2000) {
  const interp = interpolateObject(from, to);
  const t = timer((elapsed) => {
    const s = Math.min(1, elapsed / duration);
    onFrame(interp(easeCubicInOut(s)));
    if (s >= 1) { t.stop(); onDone && onDone(); }
  });
  return { stop: () => t.stop() };
}
```

- [ ] **Step 4: Run tests** — `npm test` → PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: camera view-state math and d3 tween"`

---

### Task 6: scenes.js + maxima data

**Files:**
- Create: `src/lib/scenes.js`, `src/lib/maxima.json`
- Test: `src/lib/scenes.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `SCENES` — ordered array of `{id, hed, text, view: {azi, phi, fov, width, lookat_x, lookat_y, lookat_z}, hideGrids: string[], hideLabels: string[], highlightDate: boolean, highlightProduct: string|null}`. `maxima.json` — array of row indices (into filtered rows) for date lines.

- [ ] **Step 1: Extract maxima from the reference bundle**

```bash
node -e '
const src = require("fs").readFileSync(".firecrawl/build.js","utf8");
const m = src.match(/define\("data\/maxima\.json\",\[\],function\(\)\{return(\{.*?\})\}\)/s);
const maxima = eval("(" + m[1] + ")");
require("fs").writeFileSync("src/lib/maxima.json", JSON.stringify(maxima.us));
console.log("wrote", maxima.us.length, "indices");'
```

- [ ] **Step 2: Write failing test**

`src/lib/scenes.test.js`:

```js
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
```

- [ ] **Step 3: Run to verify failure** — `npm test` → FAIL.

- [ ] **Step 4: Implement**

`src/lib/scenes.js` — camera numbers verbatim from the original; ALL prose below is original to this project (do not replace with NYT text):

```js
export const SCENES = [
  {
    id: 'intro', hed: 'Reading the curve',
    text: '<p>Each slice of this surface is a yield curve: what the U.S. government pays to borrow for one month out to 30 years, on a single day. Stacked over 25 years, the curves form a landscape of interest-rate history.</p><p>The curve is a forecast in disguise — its shape encodes what markets expect from growth and inflation.</p>',
    view: { azi: 1.24, phi: 0.758999, fov: 30, width: 60, lookat_x: 4.05, lookat_y: 5.03, lookat_z: -6.174 },
    hideGrids: [], hideLabels: [], highlightDate: false, highlightProduct: null,
  },
  {
    id: 'side', hed: 'The view from today',
    text: '<p>Seen head-on, the front edge is the most recent curve. Short-term rates sit near zero and long rates are historically low — the lingering mark of the financial crisis.</p><p>A gently rising curve like this one suggests investors expect slow, steady growth ahead.</p>',
    view: { azi: 1.57061, phi: 0, fov: 0.5, width: 35, lookat_x: 0, lookat_y: 7.97333, lookat_z: 0.21667 },
    hideGrids: ['front'], hideLabels: ['x'], highlightDate: true, highlightProduct: null,
  },
  {
    id: 'valley', hed: 'Down in the valley',
    text: '<p>The deep trench in the near corner is the era of zero interest-rate policy. After 2008 the Federal Reserve pinned short-term rates to the floor for years — a valley with no precedent in the modern record.</p>',
    view: { azi: 1.32395, phi: 0.5172, fov: 30, width: 37, lookat_x: 15, lookat_y: -10, lookat_z: -3.74 },
    hideGrids: [], hideLabels: [], highlightDate: false, highlightProduct: null,
  },
  {
    id: '2004-valley', hed: 'An earlier puzzle',
    text: '<p>There is a shallower valley around 2003–2004. When the Fed then raised short rates, long rates barely moved — a flattening that puzzled policymakers at the time and foreshadowed trouble.</p>',
    view: { azi: 1.495391927, phi: 1.613071831, fov: 25, width: 30.70962433, lookat_x: 20.99316857, lookat_y: 8.035308981, lookat_z: -2.063544815 },
    hideGrids: ['product'], hideLabels: [], highlightDate: false, highlightProduct: null,
  },
  {
    id: 'low-now', hed: 'The long slide of long rates',
    text: '<p>Follow the 10-year ridge across the decades: it has been falling since 1990. Cheaper long-term borrowing reflects expectations of lower inflation and slower growth — a structural decline, not a blip.</p>',
    view: { azi: 1.570796327, phi: 1.570796327, fov: 0.1, width: 36.66054489, lookat_x: 9.908797131, lookat_y: 11.38378803, lookat_z: 0 },
    hideGrids: ['product', 'date', 'front'], hideLabels: ['y'], highlightDate: false, highlightProduct: 'X10Y',
  },
  {
    id: 'top', hed: 'The whole landscape',
    text: '<p>From above, color does the work: dark blue where borrowing was expensive, pale where it was cheap. The entire right half of the map fades toward white — a quarter-century of rates drifting down.</p>',
    view: { azi: 0, phi: 1.570796327, fov: 0.1, width: 50, lookat_x: 0, lookat_y: 7, lookat_z: 0 },
    hideGrids: ['date', 'front', 'bottom'], hideLabels: ['z'], highlightDate: false, highlightProduct: null,
  },
];
```

- [ ] **Step 5: Run tests** — `npm test` → PASS.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: scene presets with original narration and maxima indices"`

---

### Task 7: Scene.svelte — renderer and surface mesh

**Files:**
- Create: `src/components/Scene.svelte`
- Modify: `src/App.svelte`, `src/main.js` (default Vite template cleanup: remove Counter, logos)

**Interfaces:**
- Consumes: `parseRows`, `makeScales`, `buildSurface`, `viewToPosition`, `widthToRadius`, `SCENES`.
- Produces: `Scene.svelte` props `{rows, scales}`; exports (via `bind:this` component instance) `applyView(view)` (instant) and `requestRender()`. Emits nothing yet. `App.svelte` fetches `/yield-curve.tsv`, parses, renders `<Scene>`.

- [ ] **Step 1: Implement Scene.svelte**

```svelte
<script>
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
  import { buildSurface } from '../lib/surface.js';
  import { viewToPosition } from '../lib/camera.js';
  import { SCENES } from '../lib/scenes.js';

  let { rows, scales, onrender = () => {} } = $props();

  let container;
  let renderer, scene, camera, controls, frame = null;

  export function requestRender() {
    if (frame) return;
    frame = requestAnimationFrame(() => { frame = null; render(); });
  }

  function render() {
    renderer.render(scene, camera);
    onrender({ camera, controls });
  }

  export function applyView(v) {
    controls.target.set(v.lookat_x, v.lookat_y, v.lookat_z);
    const p = viewToPosition(v);
    camera.position.set(p.x, p.y, p.z);
    if (camera.fov !== v.fov) { camera.fov = v.fov; camera.updateProjectionMatrix(); }
    controls.update();
    requestRender();
  }

  export function getCamera() { return { camera, controls }; }
  export function getScene() { return scene; }
  export function getSurfaceMesh() { return surfaceMesh; }

  let surfaceMesh;

  onMount(() => {
    const aspect = 1.8;
    const w = container.clientWidth, h = w / aspect;
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(25, aspect, 0.1, 1e9);
    controls = new OrbitControls(camera, container);
    controls.maxPolarAngle = 0.7 * Math.PI;
    controls.addEventListener('change', requestRender);

    const g = buildSurface(rows, scales);
    const geo = new THREE.PlaneGeometry(1, 1, g.rows - 1, g.cols - 1);
    geo.setAttribute('position', new THREE.BufferAttribute(g.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(g.colors, 3));
    geo.computeVertexNormals();
    surfaceMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    scene.add(surfaceMesh);

    applyView(SCENES[0].view);

    const onResize = () => {
      const w2 = container.clientWidth;
      renderer.setSize(w2, w2 / aspect);
      requestRender();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  });

  onDestroy(() => {
    controls?.dispose();
    renderer?.dispose();
    scene?.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
  });
</script>

<div class="scene" bind:this={container}></div>

<style>
  .scene { width: 100%; position: relative; }
</style>
```

- [ ] **Step 2: Wire App.svelte**

```svelte
<script>
  import Scene from './components/Scene.svelte';
  import { parseRows } from './lib/data.js';
  import { makeScales } from './lib/scales.js';

  let rows = $state(null), scales = $state(null);

  $effect(() => {
    fetch('/yield-curve.tsv').then((r) => r.text()).then((t) => {
      rows = parseRows(t);
      scales = makeScales(rows);
    });
  });
</script>

<main>
  <h1>A 3-D Tour of the Yield Curve</h1>
  {#if rows}
    <Scene {rows} {scales} />
  {/if}
</main>

<style>
  main { max-width: 1200px; margin: 0 auto; padding: 1rem; }
  h1 { font-size: 1.6rem; margin-bottom: 0.5rem; }
</style>
```

- [ ] **Step 3: Verify visually**

`npm run dev`, open the page: a blue terrain surface in the intro perspective, orbitable with the mouse. `npm test` still passes.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: Three.js scene with vertex-colored yield surface"`

---

### Task 8: Overlay lines

**Files:**
- Create: `src/lib/overlays.js`
- Modify: `src/components/Scene.svelte`
- Test: `src/lib/overlays.test.js`

**Interfaces:**
- Consumes: `polyline`, `maxima.json`, rows/scales.
- Produces: `buildOverlays(rows, scales) -> {groups: {front: Line[], product: Line[], date: Line[], bottom: Line[]}, axes: Line[], highlight: {last: Line, products: Map<string, Line>}}` where every Line is a `THREE.Line` with `transparent: true` material. `BASE_OPACITY = {front: 1, product: 0.5, date: 0.2, bottom: 1}` exported. `setGroupOpacity(groups, kind, value)` helper. Scene.svelte adds all of them and exposes `overlays` via `getOverlays()`.

- [ ] **Step 1: Write failing test**

`src/lib/overlays.test.js`:

```js
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
```

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL.

- [ ] **Step 3: Implement**

`src/lib/overlays.js`:

```js
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
```

- [ ] **Step 4: Run tests** — `npm test` → PASS.

- [ ] **Step 5: Add to Scene.svelte**

In `onMount` after the surface mesh, and add the import plus a module-level `overlays` variable and `getOverlays` export:

```js
import { buildOverlays } from '../lib/overlays.js';
// after scene.add(surfaceMesh):
overlays = buildOverlays(rows, scales);
Object.values(overlays.groups).flat().forEach((l) => scene.add(l));
overlays.axes.forEach((l) => scene.add(l));
scene.add(overlays.highlight.last);
overlays.highlight.products.forEach((l) => scene.add(l));
```

```js
let overlays;
export function getOverlays() { return overlays; }
```

- [ ] **Step 6: Verify visually** — dev server: white maturity/date lines over the surface, floor grid, black front line. Commit:

```bash
git add -A && git commit -m "feat: overlay line groups, axes, and highlight lines"
```

---

### Task 9: Labels.svelte — projected HTML labels

**Files:**
- Create: `src/components/Labels.svelte`, `src/lib/labels.js`
- Modify: `src/components/Scene.svelte`, `src/App.svelte`
- Test: `src/lib/labels.test.js`

**Interfaces:**
- Consumes: scales, `MATURITY_LABELS`, `readView`, THREE `Vector3`/`Raycaster`.
- Produces: `makeLabelDefs(rows, scales) -> [{axis: 'x'|'y'|'z', html, anchor: {x,y,z}, align(view), valign(view), visible(view)}]` (pure). `Labels.svelte` props `{defs, getCamera, surfaceMesh, width, height, hiddenAxes}`; exposes `update()` — projects anchors, sets div positions, raycasts occlusion (debounced 200 ms). Scene.svelte calls `onrender` → `Labels.update()`.

- [ ] **Step 1: Write failing test**

`src/lib/labels.test.js`:

```js
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
```

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL.

- [ ] **Step 3: Implement pure defs**

`src/lib/labels.js`:

```js
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
```

(X-visible rule: even years always show; odd years only when `width >= 60`, i.e. zoomed out — the test covers width 60 → true, width 50 → false for odd years.)

- [ ] **Step 4: Run tests** — `npm test` → PASS.

- [ ] **Step 5: Implement Labels.svelte**

```svelte
<script>
  import * as THREE from 'three';
  import { readView } from '../lib/camera.js';

  let { defs, hiddenAxes = [] } = $props();

  let root;
  const ray = new THREE.Raycaster();
  let occludeTimer = null;

  export function update(camera, controls, surfaceMesh) {
    if (!root) return;
    const view = readView(camera, controls.target);
    const rect = root.getBoundingClientRect();
    const els = root.children;
    defs.forEach((d, i) => {
      const el = els[i];
      const p = new THREE.Vector3(d.anchor.x, d.anchor.y, d.anchor.z).project(camera);
      const px = ((p.x + 1) / 2) * rect.width;
      const py = (-(p.y - 1) / 2) * rect.height;
      const align = d.align(view), valign = d.valign(view);
      el.style.left = px - el.offsetWidth * (align === 'center' ? 0.5 : align === 'right' ? 1 : 0) + 'px';
      el.style.top = py - el.offsetHeight * (valign === 'middle' ? 0.5 : valign === 'bottom' ? 1 : 0) + 'px';
      el.style.textAlign = align;
      el.classList.toggle('axis-hidden', hiddenAxes.includes(d.axis) || !d.visible(view));
    });
    clearTimeout(occludeTimer);
    occludeTimer = setTimeout(() => {
      defs.forEach((d, i) => {
        const el = els[i];
        if (el.classList.contains('axis-hidden') || !surfaceMesh) return;
        const anchor = new THREE.Vector3(d.anchor.x, d.anchor.y, d.anchor.z);
        ray.set(camera.position, anchor.clone().sub(camera.position).normalize());
        const hits = ray.intersectObject(surfaceMesh);
        el.classList.toggle('occluded', hits.length > 0 && hits[0].distance < anchor.distanceTo(camera.position));
      });
    }, 200);
  }
</script>

<div class="labels" bind:this={root}>
  {#each defs as d}
    <div class="label">{@html d.html}</div>
  {/each}
</div>

<style>
  .labels { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
  .label { position: absolute; font: 11px/1.2 Arial, sans-serif; color: #666; white-space: nowrap; transition: opacity 0.2s; }
  .label.axis-hidden, .label.occluded { opacity: 0; }
</style>
```

- [ ] **Step 6: Wire into Scene.svelte**

Render `<Labels>` inside the `.scene` div, and call it from `render()`:

```svelte
<script>
  import Labels from './Labels.svelte';
  import { makeLabelDefs } from '../lib/labels.js';
  // props gain: hiddenAxes = []
  let labelsComp;
  const labelDefs = $derived(makeLabelDefs(rows, scales));
  // inside render(): labelsComp?.update(camera, controls, surfaceMesh);
</script>

<div class="scene" bind:this={container}>
  <Labels bind:this={labelsComp} defs={labelDefs} {hiddenAxes} />
</div>
```

- [ ] **Step 7: Verify visually** — dev server: year labels along the front floor edge, maturity names on the right, `%` scale on the far wall; labels flip alignment while orbiting and vanish behind the terrain. Commit:

```bash
git add -A && git commit -m "feat: projected HTML axis labels with raycast occlusion"
```

---

### Task 10: Story — stepper, placard, camera tweens

**Files:**
- Create: `src/components/Stepper.svelte`, `src/components/StoryPlacard.svelte`
- Modify: `src/App.svelte`, `src/components/Scene.svelte`

**Interfaces:**
- Consumes: `SCENES`, `tweenView`, `readView`, `setGroupOpacity`, `BASE_OPACITY`, Scene's `getCamera`/`getOverlays`/`applyView`/`requestRender`.
- Produces: full story navigation: clicking a dot or next/back tweens the camera from the *current* (possibly user-orbited) view to the scene preset over 2 s, fades grid groups and highlights, updates placard, hides labeled axes.

- [ ] **Step 1: Stepper.svelte**

```svelte
<script>
  let { count, index, onselect } = $props();
</script>

<div class="stepper">
  <button class="nav" disabled={index === 0} onclick={() => onselect(index - 1)}>&larr;</button>
  {#each Array(count) as _, i}
    <button class="dot" class:active={i === index} onclick={() => onselect(i)} aria-label={'Scene ' + (i + 1)}></button>
  {/each}
  <button class="nav" onclick={() => onselect((index + 1) % count)}>&rarr;</button>
</div>

<style>
  .stepper { display: flex; align-items: center; gap: 8px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; border: 1px solid #999; background: #fff; cursor: pointer; padding: 0; }
  .dot.active { background: #333; border-color: #333; }
  .nav { border: none; background: none; font-size: 16px; cursor: pointer; color: #333; }
  .nav:disabled { opacity: 0.3; cursor: default; }
</style>
```

- [ ] **Step 2: StoryPlacard.svelte**

```svelte
<script>
  let { hed, text } = $props();
</script>

<div class="placard">
  <h2>{hed}</h2>
  {@html text}
</div>

<style>
  .placard { position: absolute; top: 12px; left: 12px; width: 300px; background: rgba(255,255,255,0.92); padding: 14px 16px; font-size: 14px; line-height: 1.45; }
  h2 { font-size: 16px; margin-bottom: 6px; font-family: Arial, sans-serif; }
  .placard :global(p + p) { margin-top: 8px; }
</style>
```

- [ ] **Step 3: Scene transition logic in App.svelte**

```svelte
<script>
  import Scene from './components/Scene.svelte';
  import Stepper from './components/Stepper.svelte';
  import StoryPlacard from './components/StoryPlacard.svelte';
  import { parseRows } from './lib/data.js';
  import { makeScales } from './lib/scales.js';
  import { SCENES } from './lib/scenes.js';
  import { tweenView, readView } from './lib/camera.js';
  import { setGroupOpacity, BASE_OPACITY } from './lib/overlays.js';

  let rows = $state(null), scales = $state(null);
  let sceneIdx = $state(0);
  let sceneComp;
  let activeTween = null;
  const scene = $derived(SCENES[sceneIdx]);
  const hiddenAxes = $derived(scene.hideLabels);

  $effect(() => {
    fetch('/yield-curve.tsv').then((r) => r.text()).then((t) => {
      rows = parseRows(t);
      scales = makeScales(rows);
    });
  });

  function prefix(obj, p) {
    const out = {};
    for (const k of Object.keys(obj)) out[p + k] = obj[k];
    return out;
  }

  function goTo(i) {
    sceneIdx = i;
    const target = SCENES[i];
    const { camera, controls } = sceneComp.getCamera();
    const overlays = sceneComp.getOverlays();
    const from = readView(camera, controls.target);
    activeTween?.stop();

    // Opacity channels ride the same tween clock as the camera:
    // merge them into one interpolated object with prefixed keys.
    const startOp = {}, endOp = {};
    for (const k of Object.keys(BASE_OPACITY)) {
      startOp[k] = overlays.groups[k][0].material.opacity;
      endOp[k] = target.hideGrids.includes(k) ? 0 : BASE_OPACITY[k];
    }
    const fromAll = {
      ...from, ...prefix(startOp, 'op_'),
      hl: overlays.highlight.last.material.opacity,
      hl_p: overlays.highlight.products.get(target.highlightProduct)?.material.opacity ?? 0,
    };
    const toAll = {
      ...target.view, ...prefix(endOp, 'op_'),
      hl: target.highlightDate ? 1 : 0,
      hl_p: target.highlightProduct ? 1 : 0,
    };

    activeTween = tweenView(fromAll, toAll, (v) => {
      sceneComp.applyView(v);
      for (const k of Object.keys(BASE_OPACITY)) setGroupOpacity(overlays.groups, k, v['op_' + k]);
      overlays.highlight.last.material.opacity = v.hl;
      overlays.highlight.products.forEach((line, key) => {
        line.material.opacity = key === target.highlightProduct ? v.hl_p : 0;
      });
      sceneComp.requestRender();
    }, null);
  }
</script>
```

Markup below the script:

```svelte
<main>
  <h1>A 3-D Tour of the Yield Curve</h1>
  {#if rows}
    <div class="stage">
      <Scene bind:this={sceneComp} {rows} {scales} {hiddenAxes} />
      <StoryPlacard hed={scene.hed} text={scene.text} />
    </div>
    <Stepper count={SCENES.length} index={sceneIdx} onselect={goTo} />
  {/if}
</main>

<style>
  .stage { position: relative; }
</style>
```

- [ ] **Step 4: Trigger the first scene**

In `App.svelte`, after Scene mounts (e.g. a `$effect` that runs once `sceneComp && rows` are set), call `goTo(0)` guarded so it runs once. Scene.svelte's own `applyView(SCENES[0].view)` in `onMount` already frames the intro; `goTo(0)` then normalizes opacities.

- [ ] **Step 5: Verify the full flow**

`npm run dev`:
1. Intro loads in perspective framing with placard text.
2. Next → 2-second cubic flight to the head-on "side" view; front lines fade, x labels hide, black today-curve fades in.
3. Orbit freely, then click a dot: tween starts from the orbited position, not the preset.
4. All 6 scenes reachable via dots; back/next wrap correctly.
5. `npm test` passes.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: story stepper with camera flights and overlay fades"`

---

### Task 11: Baseline verification and README

**Files:**
- Create: `README.md`, `baseline/perspective.png`, `baseline/side.png`, `baseline/top.png`

**Interfaces:** none — final QA.

- [ ] **Step 1: Capture baselines**

With the dev server running, screenshot the intro (`perspective`), scene 2 (`side`), and scene 6 (`top`) framings into `baseline/`. Use browser tooling or manual screenshots. Compare each against the original graphic's framing (reference: `.firecrawl/build.pretty.js` scene numbers): terrain shape, color banding, label placement, camera angle.

- [ ] **Step 2: Fix discrepancies**

Common issues to check: Z-axis direction (1-month should be the near/front edge in the intro view), label anchor offsets, floor grid density, today-line visibility in scene 2.

- [ ] **Step 3: README.md**

```markdown
# 3-D Yield Curve

A modern rebuild of the NYT's 2015 "3-D yield curve" interactive:
daily US Treasury yields 1990–2015 as an orbitable Three.js surface
with a guided story tour.

Stack: Vite, Svelte 5, Three.js, d3 v7 micro-packages.

## Develop

    npm install
    npm run dev

## Test

    npm test

Architecture notes: `docs/superpowers/specs/2026-08-21-3d-yield-curve-design.md`.
```

- [ ] **Step 4: Final check + commit**

`npm test` → all pass. `npm run build` → succeeds.

```bash
git add -A && git commit -m "docs: README and baseline framings"
```
