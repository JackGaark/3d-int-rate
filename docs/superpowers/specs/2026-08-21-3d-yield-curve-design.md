# 3-D Yield Curve — Design Spec

**Date:** 2026-08-21
**Status:** Approved for planning

## Purpose

Rebuild the NYT "A 3-D View of a Chart That Predicts the Economic Future"
interactive (March 2015) as a modern web app: an interactive 3-D surface of
daily US Treasury yields (1990–2015) with a guided story stepper that flies
the camera between narrative viewpoints.

The architecture mirrors the original (investigated from its production
bundle) but on a modern stack. This is a fresh build, not a restoration of
the earlier Svelte port.

## Stack

- **Vite + Svelte 5** (runes)
- **Three.js** (current release)
- **d3 v7 micro-packages only:** `d3-scale`, `d3-array`, `d3-dsv`,
  `d3-interpolate`, `d3-ease`, `d3-timer`
- **Vitest** for unit tests

## Data

- Source: the NYT snapshot `yield-curve.csv` (TSV despite the name), already
  downloaded. Daily rows 1990–2015; columns `Time` + 11 maturities
  `X1M X3M X6M X1Y X2Y X3Y X5Y X7Y X10Y X20Y X30Y`.
- Ships in `public/yield-curve.tsv`, parsed with `d3-dsv`.
- Cleaning rules (from the original):
  - `N/A`, empty, and undefined values become `NaN`.
  - Rows with fewer than 7 valid yields are dropped.
  - Two-digit years: `>20` → 19xx, else 20xx.
- Surface gap rule: a leading-`NaN` vertex copies the first valid neighbor;
  interior `NaN`s walk back to the previous valid maturity (prevents holes).

## World coordinate system (d3 scales)

| Axis | Scale | Domain | Range |
|------|-------|--------|-------|
| X | `scaleTime` | 1990-01-01 → max date | −40 … +40 |
| Z | `scaleLinear` | maturity index −0.25 … 10.25 | +20 … −20 |
| Y | `scaleLinear` | yield 0 … 9.5 % | 0 … 30 |

Color: `scaleQuantile` over all yield values → 22-step blue ramp
(`#eef4f8` … `#243d52`); negative yields → `#f89493`.

## Modules

```
src/
  lib/
    data.js        # parse TSV, filter rows, coerce dates/NaN  (pure)
    scales.js      # the 3 world scales + color ramp           (pure)
    surface.js     # positions + vertex colors from data       (pure)
    camera.js      # view-state math + tween                   (pure math + d3-timer)
    scenes.js      # scene presets                             (data)
  components/
    Scene.svelte         # renderer, OrbitControls, lifecycle dispose
    Labels.svelte        # projected HTML axis labels + occlusion
    StoryPlacard.svelte  # per-scene headline/text
    Stepper.svelte       # dots + next/back
  App.svelte
```

### surface.js (pure)

Builds `{positions: Float32Array, colors: Float32Array}` for a
`PlaneGeometry(rows × 11)` — no renderer dependency, fully unit-testable.
Mesh material: `MeshBasicMaterial({ vertexColors: true, side: DoubleSide })`,
no lighting.

### Overlay lines

`THREE.Line` groups keyed by kind, each with a base opacity:

- `front` (1.0): black highlight lines for the 3-month and 1-month series
  at the front edge.
- `product` (0.5): white line per maturity across time.
- `date` (0.2): white curve per selected date (first row, last row, plus
  local-maxima dates baked into `scenes.js`).
- `bottom` (1.0): floor grid ticks.

Scenes toggle groups via opacity tweens (the original's `hideGridLines`).
A black "today" curve on the last row fades in for scenes that highlight it.

### camera.js

View state: `{azi, phi, fov, width, lookat_x, lookat_y, lookat_z}`.

- Radius from zoom: `r = width / (2·tan(fov/2 · π/180))` — scenes zoom by
  narrowing FOV without changing apparent size.
- Position: spherical placement
  `(r·sin(azi)·cos(phi), r·cos(azi), r·sin(azi)·sin(phi))`.
- Scene transitions: `d3.interpolateObject` between current and target
  state, `easeCubicInOut`, driven by `d3.timer` over 2000 ms. Each frame
  writes camera position/fov/target and requests a render.
- OrbitControls stays enabled; free orbiting between steps. Reading current
  state back from the camera lets a tween start from wherever the user
  orbited to. `maxPolarAngle = 0.7π` (no under-floor views).

### Labels.svelte

HTML `<div>` per axis label (years on X, maturities on Z, `%` on Y):

- Each render: `anchor.clone().project(camera)` → screen px; CSS left/top.
- Alignment flips by camera angle (functions of `phi`/`azi`, thresholds
  from the original).
- Occlusion: `Raycaster` from camera toward anchor; if the surface is hit
  closer than the anchor, hide the label (debounced).
- Year labels thin out when zoomed (`width < 40` → every other year).

### Rendering loop

Render-on-demand only: OrbitControls `change` events, tween frames, and
resize trigger renders. No continuous RAF loop.

### scenes.js

Ordered scene presets, each:
`{ id, hed, text, camera: {azi, phi, fov, width, lookat}, hideGrids: [],
hideLabels: [], highlightDate?, highlightProduct? }`.

Camera parameter values reuse the original's numbers (facts). Headline and
body text are **original prose written for this project** — the NYT's
narrative text is copyrighted and is not copied. Story beats covered:
yield-curve intro, the 2015 flat curve, steep-curve recoveries, inverted
curves preceding recessions, the long decline of long rates.

### Stepper / placard

Dots (one per scene) + next/back buttons drive a `sceneIndex` rune in
`App.svelte`. On change: fade out per-scene overlays, apply new scene's
toggles, tween camera. Placard shows `hed`/`text`.

## Testing

- Vitest unit tests for `data.js` (filtering, NaN, date parsing),
  `scales.js` (domains/ranges, color edge cases), `surface.js` (vertex
  count, gap-filling, color assignment), `camera.js` (width↔radius
  round-trip, spherical placement, state read-back).
- Visual verification in the dev server against the original's three
  framings (perspective / top / side).

## Out of scope

Germany/Japan surfaces, mobile/static fallback, WebGL detection,
per-scene annotation callouts, analytics.
