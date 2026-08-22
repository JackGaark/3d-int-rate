<script>
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
  import { buildSurface } from '../lib/surface.js';
  import { buildOverlays } from '../lib/overlays.js';
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
  export function getOverlays() { return overlays; }

  let surfaceMesh;
  let overlays;

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

    overlays = buildOverlays(rows, scales);
    Object.values(overlays.groups).flat().forEach((l) => scene.add(l));
    overlays.axes.forEach((l) => scene.add(l));
    scene.add(overlays.highlight.last);
    overlays.highlight.products.forEach((l) => scene.add(l));

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
