# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A rebuild of the NYT 2015 "3-D yield curve" interactive: daily US Treasury yields 1990–2015 rendered as an orbitable Three.js surface with a guided story tour. Stack: Vite, Svelte 5 (runes), Three.js, d3 v7 micro-packages, Vitest. Full design spec: `docs/superpowers/specs/2026-08-21-3d-yield-curve-design.md`.

## Commands

```bash
npm run dev                          # Vite dev server
npm run build                        # production build to dist/
npm test                             # vitest run (all tests)
npx vitest run src/lib/camera.test.js   # single test file
npx vitest run -t "readView"         # tests matching a name
```

Tests live next to their modules as `src/lib/*.test.js`. There is no lint or typecheck script; `jsconfig.json` enables `checkJs` for editor diagnostics only.

## Architecture

The split is deliberate: **`src/lib/` is pure, Node-importable code; `src/components/` owns the renderer and DOM.**

- `src/lib/*.js` must not touch `window`, a WebGL renderer, or Svelte. Three.js math classes (`Vector3`, `Raycaster`, `BufferGeometry`, `Line`) are fine. This is what keeps everything in `lib/` unit-testable under Vitest without a browser.
- d3 is imported as micro-packages only (`d3-scale`, `d3-array`, `d3-dsv`, `d3-interpolate`, `d3-ease`, `d3-timer`). Never add the `d3` monolith.

### Data flow

1. `App.svelte` fetches `public/yield-curve.tsv` → `data.js` `parseRows` (drops rows with <7 valid yields, `N/A` → `NaN`, two-digit years `>20` → 19xx).
2. `scales.js` `makeScales(rows)` builds the world coordinate system: X = time (−40…40), Z = maturity index (+20…−20, reversed), Y = yield 0–9.5% (0…30), plus a 22-step quantile blue color ramp. `WORLD` constants define the box.
3. `surface.js` `buildSurface` produces `positions`/`colors` Float32Arrays for a `PlaneGeometry(rows × 11)`. Gap rule: a leading `NaN` copies the next valid maturity; interior `NaN`s walk back to the previous valid one. `polyline` extracts a single maturity-over-time or date-slice line.
4. `overlays.js` builds `THREE.Line` groups keyed by kind (`front`, `product`, `date`, `bottom`) with `BASE_OPACITY` per kind, plus an axis frame and hidden black "highlight" lines (last-date curve, per-maturity lines). `maxima.json` is a baked list of row indices whose date slices get drawn in the `date` group.
5. `Scene.svelte` owns the `WebGLRenderer`, `PerspectiveCamera`, and `OrbitControls`, assembles the mesh and overlays, and exposes imperative methods (`applyView`, `getCamera`, `getOverlays`, `requestRender`) that `App.svelte` calls via `bind:this`.

### Camera model and scene transitions

Camera state is the plain object `{azi, phi, fov, width, lookat_x, lookat_y, lookat_z}` (`camera.js`). Zoom is expressed as apparent `width`, and radius is derived from `width` and `fov`, so scenes zoom by narrowing FOV without changing apparent size. `viewToPosition` places the camera spherically; `readView` inverts it from a live camera (uses `atan2` so the top-down pole is finite).

`scenes.js` holds the ordered `SCENES` presets. Camera numbers are reused from the original graphic verbatim; the `hed`/`text` prose is original to this project and must never be copied from the NYT.

`App.svelte` `goTo(i)` is the transition engine: it reads the current view from the camera (so a tween starts wherever the user orbited to), then merges camera fields, per-group overlay opacities (prefixed `op_`), and highlight opacities (`hl`, `hl_p`) into one object tweened by `tweenView` (`d3-interpolate` + `easeCubicInOut` + `d3-timer`, 2000 ms). Any new per-scene animated property should be added to that same merged object rather than given its own timer.

### Rendering is on-demand

There is no continuous requestAnimationFrame loop. Renders happen only via `Scene.requestRender()`, triggered by OrbitControls `change`, tween frames, and window resize. Preserve this when adding features.

### Labels

`labels.js` `makeLabelDefs` returns declarative label defs with an `anchor` in world space and `align`/`valign`/`visible` functions of the current view. `Labels.svelte` projects each anchor to screen px on every render, and debounces a `Raycaster` occlusion check against the surface mesh (labels hidden when the surface sits between camera and anchor). Scenes hide whole axes via `hideLabels`.

## Reference assets

- `baseline/` holds PNG framings (perspective / side / top) of the original for visual comparison in the dev server.
- `.firecrawl/` (gitignored) contains the original production bundle and CSV used as reference.
