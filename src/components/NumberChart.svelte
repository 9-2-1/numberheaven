<script lang="ts">
  import type { NumberWithHistory } from '../types';

  let {
    number,
    timestamp,
    textColor,
    chartLineColor,
  }: { number: NumberWithHistory; timestamp: number; textColor: string; chartLineColor: string } =
    $props();

  let margin = { top: 2, right: 2, bottom: 20, left: 40 };

  // 使用 bind:clientWidth 和 bind:clientHeight 获取容器尺寸
  let containerWidth = $state(0);
  let containerHeight = $state(0);

  // 图表尺寸基于容器尺寸减去边距
  let chartWidth = $derived(containerWidth - margin.left - margin.right);
  let chartHeight = $derived(containerHeight - margin.top - margin.bottom);

  // 使用 $derived 缓存 minVal 和 maxVal
  let valid = $derived(number.history && number.history.length > 0);
  let yMinVal = $derived(valid ? Math.min(...number.history.map(r => r.value)) : 0);

  let yMaxVal = $derived(valid ? Math.max(...number.history.map(r => r.value)) : 0);

  let yMidVal = $derived((yMinVal + yMaxVal) / 2);
  let yRange = $derived(Math.max(yMaxVal - yMinVal, 1));

  let yMinRange = $derived(yMidVal - yRange / 2);
  let yMaxRange = $derived(yMidVal + yRange / 2);

  let xMaxRange = $derived(timestamp);
  let xMinRange = $derived(xMaxRange - 7 * 24 * 60 * 60 * 1000);

  // 用于计算趋势线的坐标
  let pathData = $derived(calculatePoints());

  // 计算缩放比例
  function xScale(t: number) {
    return ((t - xMinRange) / (xMaxRange - xMinRange)) * chartWidth;
  }

  function yScale(val: number) {
    return ((yMaxRange - val) / (yMaxRange - yMinRange)) * chartHeight;
  }

  // 计算坐标点
  function calculatePoints() {
    if (!valid) {
      return '';
    }

    const points = number.history.map(record => ({ x: record.time, y: record.value }));
    points.push({ x: xMaxRange, y: points[points.length - 1].y });

    // 构建路径数据
    let path = '';
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const x = xScale(point.x);
      const y = yScale(point.y);
      path += `${x},${y} `;
    }
    return path.slice(0, -1);
  }

  // 计算Y轴刻度
  function getYTicks(): number[] {
    // 简单的刻度算法，选择1, 2, 5, 10等作为刻度间隔
    const minInterval = (16 * yRange) / chartHeight;
    const interval = Math.pow(10, Math.max(0, Math.floor(Math.log10(minInterval))));
    const candidates = [1, 2, 5, 10].map(x => x * interval);
    const chosenInterval = candidates.find(x => x >= minInterval) || interval;

    const ticks = [];
    let current = Math.ceil(yMinRange / chosenInterval) * chosenInterval;
    while (current <= yMaxRange) {
      ticks.push(current);
      current += chosenInterval;
    }

    return ticks;
  }

  // 获取每天0点的时间戳
  function getMidnightTimestamp(timestamp: number): number {
    // 使用数学计算而不是 Date 对象的 mutable 方法
    const date = new Date(timestamp);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  }

  // 计算X轴刻度（每天0点）
  function getXTicks(): { time: number; label: string }[] {
    if (!valid) return [];

    // 获取开始和结束日期的0点时间戳
    const startMidnight = getMidnightTimestamp(xMinRange);
    const endMidnight = getMidnightTimestamp(xMaxRange);

    const ticks = [];
    // 跳过开始日期的0点
    let current = startMidnight + 24 * 60 * 60 * 1000;

    // 添加所有0点刻度
    while (current <= endMidnight) {
      ticks.push({ time: current, label: new Date(current).getDate().toString() });
      current += 24 * 60 * 60 * 1000; // 加一天
    }

    return ticks;
  }
</script>

<div class="chart-container" bind:clientWidth={containerWidth} bind:clientHeight={containerHeight}>
  <svg
    width={containerWidth}
    height={containerHeight}
    viewBox={`0 0 ${containerWidth} ${containerHeight}`}
  >
    <!-- X轴 -->
    <g transform={`translate(${margin.left}, ${containerHeight - margin.bottom})`}>
      <line x1="0" y1="0" x2={chartWidth} y2="0" stroke={textColor} />
      <!-- 刻度线和标签 -->
      {#if number.history.length > 0}
        {@const xTicks = getXTicks()}
        {#each xTicks as tick (tick.time)}
          {@const x = xScale(tick.time)}
          <line x1={x} y1="-5" x2={x} y2="0" stroke={textColor} stroke-width="1" />
          <text {x} y="20" font-size="10" text-anchor="middle" fill={textColor}>
            {tick.label}
          </text>
        {/each}
      {/if}
    </g>

    <!-- Y轴 -->
    <g transform={`translate(${margin.left}, ${margin.top})`}>
      <line x1="0" y1="0" x2="0" y2={chartHeight} stroke={textColor} />

      <!-- Y轴刻度和标签 -->
      {#if number.history.length > 0}
        {@const ticks = getYTicks()}

        {#each ticks as tick (tick)}
          {@const y = yScale(tick)}
          <line x1="0" y1={y} x2="5" y2={y} stroke={textColor} stroke-width="1" />
          <text x="-10" y={y + 4} font-size="10" text-anchor="end" fill={textColor}>
            {tick.toFixed(0)}
          </text>
        {/each}
      {/if}
      <!-- 趋势线 -->
      {#if number.history.length > 0}
        <polyline fill="none" stroke={chartLineColor} stroke-width="2" points={pathData} />
      {/if}
    </g>
  </svg>
</div>

<style>
  .chart-container {
    overflow: hidden;
  }
</style>
