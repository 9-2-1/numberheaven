<script lang="ts">
  import { onMount } from 'svelte';
  import type { NumberWithHistory } from '../types';
  import NumberCard from './NumberCard.svelte';

  let numbers: NumberWithHistory[] = $state([]);
  let loading = $state(true);
  let error: string | null = $state(null);
  let timestamp = $state(Date.now());

  async function fetchNumbers() {
    try {
      loading = true;
      const response = await fetch('/api/get_numbers');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      numbers = await response.json();
      timestamp = Date.now();
    } catch (err) {
      error = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Error fetching numbers:', err);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    fetchNumbers();
  });

  // 更新数字
  // This function is exported for potential use by child components
  export async function updateNumber(name: string, value: number) {
    try {
      const response = await fetch('/api/post_update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, value }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // 重新获取数据
      await fetchNumbers();
    } catch (err) {
      error = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Error updating number:', err);
    }
  }
</script>

<div class="number-list">
  {#if loading}
    <div class="loading">Loading...</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else if numbers.length === 0}
    <div class="empty">No numbers available</div>
  {:else}
    <div class="numbers-grid">
      {#each numbers as number (number.name)}
        <NumberCard {timestamp} {number} />
      {/each}
    </div>
  {/if}
</div>

<style>
  .number-list {
    padding: 16px;
  }

  .loading,
  .error,
  .empty {
    text-align: center;
    padding: 20px;
    font-size: 18px;
  }

  .error {
    color: red;
  }

  .numbers-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }
</style>
