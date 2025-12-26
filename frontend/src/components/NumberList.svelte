<script lang="ts">
  import { onMount } from 'svelte';
  import type { NumberWithHistory } from '../types';
  import NumberCard from './NumberCard.svelte';

  let numbers: NumberWithHistory[] = $state([]);
  let initialLoading = $state(true);
  let isRefreshing = $state(false);
  let error: string | null = $state(null);
  let timestamp = $state(Date.now());

  async function fetchNumbers() {
    if (isRefreshing) {
      return;
    }
    isRefreshing = true;
    try {
      const response = await fetch('api/get_numbers');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      numbers = await response.json();
      timestamp = Date.now();
      error = null;
    } catch (err) {
      error = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Error fetching numbers:', err);
    } finally {
      isRefreshing = false;
      initialLoading = false;
    }
  }

  onMount(() => {
    fetchNumbers();
    // 10秒定时刷新
    const interval = setInterval(fetchNumbers, 10000);

    // 组件卸载时清除定时器
    return () => clearInterval(interval);
  });
</script>

<div class="number-list">
  <!-- 右上角状态指示器 -->
  <div class="status-indicators">
    {#if isRefreshing}
      <div class="loading-indicator">⟳</div>
    {/if}
    {#if error}
      <div class="error-indicator">✕</div>
    {/if}
  </div>

  {#if initialLoading}
    <div class="loading">Loading...</div>
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
    position: relative;
  }

  .status-indicators {
    position: absolute;
    top: 16px;
    right: 16px;
    display: flex;
    gap: 8px;
  }

  .loading-indicator {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background-color: rgba(0, 123, 255, 0.1);
    color: #007bff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    animation: spin 1s linear infinite;
  }

  .error-indicator {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background-color: rgba(255, 0, 0, 0.1);
    color: #dc3545;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .loading,
  .empty {
    text-align: center;
    padding: 20px;
    font-size: 18px;
  }

  .numbers-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }
</style>
