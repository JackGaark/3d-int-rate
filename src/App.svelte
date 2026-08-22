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
  let started = false;
  const scene = $derived(SCENES[sceneIdx]);
  const hiddenAxes = $derived(scene.hideLabels);

  $effect(() => {
    fetch('/yield-curve.tsv').then((r) => r.text()).then((t) => {
      rows = parseRows(t);
      scales = makeScales(rows);
    });
  });

  $effect(() => {
    if (sceneComp && rows && !started) {
      started = true;
      goTo(0);
    }
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
  main { max-width: 1200px; margin: 0 auto; padding: 1rem; }
  h1 { font-size: 1.6rem; margin-bottom: 0.5rem; }
  .stage { position: relative; }
</style>
