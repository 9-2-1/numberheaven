<script lang="ts">
  import NumberChart from './NumberChart.svelte';
  import chroma from 'chroma-js';

  import type { NumberWithHistory } from '../types';

  let { number, timestamp }: { number: NumberWithHistory; timestamp: number } = $props();

  // 将主题色转换为 oklch 并生成不同部分的颜色
  const baseColor = $derived(chroma(number.color || '#66ccff'));
  const oklch = $derived(baseColor.oklch());
  const h = $derived(oklch[2]);

  // 生成不同部分的颜色
  const backgroundColor = $derived(chroma.oklch(0.95, 0.05, h).hex());
  const textColor = $derived(chroma.oklch(0.6, 0.2, h).hex());
  const chartLineColor = $derived(chroma.oklch(0.5, 0.3, h).hex());

  function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
</script>

<div
  class="number-card"
  style:background-color={backgroundColor}
  style:border-color={chartLineColor}
>
  <div class="card-header">
    <h3 class="number-name" style:color={textColor}>{number.name}</h3>
    <span class="last-updated" style:color={textColor}>更新于 {formatTime(number.last)}</span>
  </div>
  <div class="card-body">
    <div class="number-value" style:color={textColor}>{number.value}</div>
    <NumberChart {number} {timestamp} {textColor} {chartLineColor}></NumberChart>
  </div>
</div>

<style>
  .number-card {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    background-color: #fff;
    height: 200px;

    display: flex;
    flex-direction: column;
    justify-content: stretch;
    align-items: stretch;
  }

  .card-header {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .number-name {
    font-size: 18px;
    font-weight: bold;
    color: #333;
  }

  .last-updated {
    font-size: 12px;
    color: #666;
  }

  .card-body {
    flex: 1 1 0;
    display: grid;
    grid-template-columns: 3fr 7fr;
    overflow: hidden;
  }

  .number-value {
    font-size: 32px;
    font-weight: bold;
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>
