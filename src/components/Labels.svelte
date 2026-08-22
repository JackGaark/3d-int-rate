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
