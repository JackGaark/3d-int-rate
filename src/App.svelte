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
