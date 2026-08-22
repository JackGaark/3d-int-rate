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
