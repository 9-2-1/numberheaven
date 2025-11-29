<script lang="ts">
  import NumberList from './components/NumberList.svelte';
</script>

<main>
  <h1>Number Heaven</h1>
  <NumberList />
</main>

<style>
  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 16px;
  }

  h1 {
    text-align: center;
    color: #333;
  }
</style>
