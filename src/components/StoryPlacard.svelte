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
