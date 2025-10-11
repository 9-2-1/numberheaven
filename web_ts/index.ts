const layout = [
  [
    "goldie",
    "anki",
    "bbdc",
    "tagspaces",
    "tagspaces_todo",
    "zhihu",
    "bilibili",
    "xiaohongshu",
    "douyin",
  ],
];

function rgb(r: number, g: number, b: number) {
  return { r: r / 255, g: g / 255, b: b / 255 };
}

function oklchtorgbstr({ l, c, h }: { l: number; c: number; h: number }) {
  for (let c1 = c; c1 >= 0; c1 -= 0.01) {
    const rgb = convertOklchToRgb({ l, c: c1, h });
    if (
      0 <= rgb.r &&
      rgb.r <= 1 &&
      0 <= rgb.g &&
      rgb.g <= 1 &&
      0 <= rgb.b &&
      rgb.b <= 1
    ) {
      return rgbtostr(rgb);
    }
  }
  return "rgb(255, 0, 255)";
}

function rgbtostr(rgb: { r: number; g: number; b: number }) {
  return `rgb(${Math.round(rgb.r * 255)}, ${Math.round(rgb.g * 255)}, ${Math.round(rgb.b * 255)})`;
}

const nameMode: Record<
  string,
  [string, string, { r: number; g: number; b: number }, number | null, number]
> = {
  goldie: ["点数", "cd", rgb(172, 228, 68), null, 50],
  anki: ["Anki待复习", "卡片", rgb(81, 171, 231), 0, 20],
  bbdc: ["不背单词待复习", "单词", rgb(255, 104, 0), 0, 20],
  tagspaces: ["未标记文件", "文件", rgb(29, 209, 159), 0, 20],
  tagspaces_todo: ["待处理文件", "文件", rgb(250, 101, 235), 0, 20],
  zhihu: ["知乎稍后再看", "回答", rgb(23, 114, 246), 0, 20],
  bilibili: ["b站稍后再看", "视频", rgb(0, 174, 236), 0, 20],
  xiaohongshu: ["小红书稍后再看", "笔记", rgb(255, 36, 66), 0, 20],
  douyin: ["抖音稍后再看", "视频", rgb(22, 24, 35), 0, 20],
};

let numbers: {
  [name: string]: {
    value: number;
    history: {
      time: number;
      value: number;
    }[];
  };
} = {};

const numberMap: Record<string, HTMLDivElement> = {};

function initNumbersDiv() {
  const numbersDiv = document.getElementById("numbers")!;
  for (const line of layout) {
    const numberLine = document.createElement("div");
    numberLine.classList.add("number_line");
    for (const name of line) {
      const cardDiv = document.createElement("div");
      cardDiv.classList.add("number_card");
      numberLine.appendChild(cardDiv);
      numberMap[name] = cardDiv;
    }
    numbersDiv.appendChild(numberLine);
  }
}

async function updateNumberAsync() {
  numbers = await (await fetch("get_numbers")).json();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

window.addEventListener("load", async () => {
  initNumbersDiv();
  while (1) {
    try {
      await updateNumberAsync();
      updateNumberDiv();
    } catch (error) {
      console.error("Error updating numbers:", error);
      // 自动重试
    }
    await sleep(10 * 1000);
  }
});

window.addEventListener("resize", () => {
  updateNumberDiv();
});

// 提取颜色计算逻辑到单独的函数
function calculateColors(themeColor: { r: number; g: number; b: number }) {
  const { l: tl, c: tc, h: th } = convertRgbToOklch(themeColor);
  return {
    titleColor: oklchtorgbstr({ l: 0.6, c: tc, h: th }),
    numColor: oklchtorgbstr({ l: 0.6, c: tc, h: th }),
    labelColor: oklchtorgbstr({ l: 0.7, c: tc, h: th }),
    lineColor: oklchtorgbstr({ l: 0.7, c: tc, h: th }),
    bgColor: oklchtorgbstr({ l: 0.95, c: tc, h: th }),
  };
}

// 处理No Data情况的函数
function renderNoDataCard(cardDiv: HTMLDivElement, name: string) {
  const title = nameMode[name]?.[0] ?? name;
  const themeColor = nameMode[name]?.[2] ?? rgb(179, 91, 51);
  const { titleColor, numColor, bgColor } = calculateColors(themeColor);

  const xPixel = cardDiv.clientWidth;
  const yPixel = cardDiv.clientHeight;

  const svg = [];
  svg.push(`<svg viewBox="0 0 ${xPixel} ${yPixel}">`);
  renderBackground(svg, xPixel, yPixel, bgColor);
  renderTitle(svg, title, titleColor);
  renderNoDataValue(svg, xPixel, yPixel, numColor);
  svg.push("</svg>");

  cardDiv.innerHTML = svg.join("");
}

// 处理有数据情况的函数
function renderDataCard(
  cardDiv: HTMLDivElement,
  name: string,
  number: { value: number; history: { time: number; value: number }[] },
  tnow: number,
) {
  // 计算x轴时间范围
  const xMin = tnow - 6.5 * 24 * 60 * 60; // -6.5d
  const xMax = tnow + 0.5 * 24 * 60 * 60; // +0.5d
  let yMin = number.value;
  let yMax = number.value;

  const lasttime = number.history[number.history.length - 1].time;

  // 裁剪历史记录
  const historyList = cropHistory(number.history, xMin, xMax);

  // 计算y轴范围
  const yRange = nameMode[name]?.[4] ?? 20;
  const yMinMin = nameMode[name]?.[3] ?? null;

  const yRangeData = calculateYRange(
    historyList,
    number.value,
    yRange,
    yMinMin,
  );
  yMin = yRangeData.yMin;
  yMax = yRangeData.yMax;

  // 准备线条数据
  const line = historyList.map((history) => ({
    x: history.time,
    y: history.value,
  }));

  const themeColor = nameMode[name]?.[2] ?? rgb(179, 91, 51);
  const { titleColor, numColor, labelColor, lineColor, bgColor } =
    calculateColors(themeColor);

  const xSize = xMax - xMin;
  const ySize = yMax - yMin;

  const xPixel = cardDiv.clientWidth;
  const yPixel = cardDiv.clientHeight;

  const svg = [];
  const AXIS_MARGIN = 0;
  const xAxisYv = yMin + yRange / 2;
  const xAxisY = (yPixel * (yMax - xAxisYv)) / ySize;
  const yAxisXv = xMax - 0.5 * 24 * 60 * 60; // tnow
  const yAxisX = (xPixel * (yAxisXv - xMin)) / xSize;

  svg.push(`<svg viewBox="0 0 ${xPixel} ${yPixel}">`);
  renderBackground(svg, xPixel, yPixel, bgColor);
  renderXAxis(svg, xPixel, xMin, xMax, xSize, xAxisY, labelColor, AXIS_MARGIN);
  renderYAxis(svg, yPixel, yMin, yMax, ySize, yAxisX, labelColor, AXIS_MARGIN);
  renderLine(svg, line, xMin, xMax, yMin, yMax, xPixel, yPixel, lineColor);

  const title = nameMode[name]?.[0] ?? name;
  renderTitle(svg, title, titleColor);
  renderValue(svg, xPixel, yPixel, number.value, numColor);
  renderUpdateTime(svg, xPixel, yPixel, lasttime, titleColor);

  svg.push("</svg>");
  cardDiv.innerHTML = svg.join("");
}

// 计算Y轴范围
function calculateYRange(
  historyList: { time: number; value: number }[],
  currentValue: number,
  yRange: number,
  yMinMin: number | null,
) {
  let yMin = currentValue;
  let yMax = currentValue;

  // 计算y轴范围
  for (const history of historyList) {
    yMax = Math.max(yMax, history.value);
    yMin = Math.min(yMin, history.value);
  }

  if (yMinMin !== null && yMin < yMinMin) {
    const shift = yMinMin - yMin;
    yMax += shift;
    yMin += shift;
  }

  yMax += yRange / 2;
  yMin -= yRange / 2;

  yMax = Math.ceil(yMax);
  yMin = Math.floor(yMin);

  return { yMin, yMax };
}

// 渲染背景
function renderBackground(
  svg: string[],
  xPixel: number,
  yPixel: number,
  bgColor: string,
) {
  svg.push(
    `<rect x="0" y="0" width="${xPixel}" height="${yPixel}" fill="${bgColor}" />`,
  );
}

// 渲染标题
function renderTitle(svg: string[], title: string, titleColor: string) {
  svg.push(
    `<text x="5" y="21" fill="${titleColor}" font-size="16" font-weight="bold" text-anchor="left">${title}</text>`,
  );
}

// 渲染无数据时的数值
function renderNoDataValue(
  svg: string[],
  xPixel: number,
  yPixel: number,
  numColor: string,
) {
  svg.push(
    `<text x="${xPixel / 2}" y="${yPixel / 2}" dominant-baseline="middle" text-anchor="middle"`,
  );
  svg.push(
    ` fill="${numColor}" font-size="${yPixel * 0.6}" font-weight="bold" opacity="0.3">NoData`,
  );
  svg.push("</text>");
}

// 渲染有数据时的数值
function renderValue(
  svg: string[],
  xPixel: number,
  yPixel: number,
  value: number,
  numColor: string,
) {
  svg.push(
    `<text x="${xPixel / 2}" y="${yPixel / 2}" dominant-baseline="middle" text-anchor="middle"`,
  );
  svg.push(
    ` fill="${numColor}" font-size="${yPixel * 0.6}" font-weight="bold" opacity="0.3">${value}`,
  );
  svg.push("</text>");
}

// 渲染更新时间
function renderUpdateTime(
  svg: string[],
  xPixel: number,
  yPixel: number,
  lasttime: number,
  titleColor: string,
) {
  svg.push(
    `<text x="${xPixel}" y="${yPixel - 5}" fill="${titleColor}" font-size="16" text-anchor="end">${new Date(lasttime * 1000).toLocaleString()}</text>`,
  );
}

// 渲染X轴
function renderXAxis(
  svg: string[],
  xPixel: number,
  xMin: number,
  xMax: number,
  xSize: number,
  xAxisY: number,
  labelColor: string,
  AXIS_MARGIN: number,
) {
  // x轴
  svg.push(
    `<line x1="${AXIS_MARGIN}" y1="${xAxisY}" x2="${xPixel - AXIS_MARGIN}" y2="${xAxisY}" stroke="${labelColor}" stroke-width="1" />`,
  );

  // x间隔
  const xInterval = 24 * 60 * 60; // 1d
  const timezoneOffset = new Date().getTimezoneOffset() * 60;
  const xBegin =
    Math.ceil((xMin - timezoneOffset) / xInterval) * xInterval + timezoneOffset;

  let x = xBegin;
  while (x <= xMax) {
    const xAxisX = (xPixel * (x - xMin)) / xSize;
    svg.push(
      `<line x1="${xAxisX}" y1="${xAxisY - 5}" x2="${xAxisX}" y2="${xAxisY + 5}" stroke="${labelColor}" stroke-width="1" />`,
    );
    // 绘制x轴标签
    const date = new Date(x * 1000).getDate();
    const xLabel =
      date == 1
        ? `${new Date(x * 1000).getMonth() + 1}/${date}`
        : date.toString();

    svg.push(
      `<text x="${xAxisX}" y="${xAxisY - 5}" fill="${labelColor}" font-size="12" text-anchor="middle">${xLabel}</text>`,
    );
    x += xInterval;
  }
}

// 渲染Y轴
function renderYAxis(
  svg: string[],
  yPixel: number,
  yMin: number,
  yMax: number,
  ySize: number,
  yAxisX: number,
  labelColor: string,
  AXIS_MARGIN: number,
) {
  // y轴
  svg.push(
    `<line x1="${yAxisX}" y1="${yPixel - AXIS_MARGIN}" x2="${yAxisX}" y2="${AXIS_MARGIN}" stroke="${labelColor}" stroke-width="1" />`,
  );

  // y间隔
  const yIntervalMin = (ySize / yPixel) * 20;
  let yInterval = 10000000;
  while (yInterval / 10 > yIntervalMin) {
    yInterval /= 10;
  }
  if (yInterval / 5 > yIntervalMin) {
    yInterval /= 5;
  } else if (yInterval / 2 > yIntervalMin) {
    yInterval /= 2;
  }
  let y = Math.ceil(yMin / yInterval) * yInterval;
  while (y <= yMax) {
    const yAxisY = (yPixel * (yMax - y)) / ySize;
    svg.push(
      `<line x1="${yAxisX - 5}" y1="${yAxisY}" x2="${yAxisX + 5}" y2="${yAxisY}" stroke="${labelColor}" stroke-width="1" />`,
    );
    // 绘制y轴标签
    const yLabel = y.toString();
    svg.push(
      `<text x="${yAxisX - 10}" y="${yAxisY}" fill="${labelColor}" font-size="12" text-anchor="end" dominant-baseline="middle">${yLabel}</text>`,
    );
    y += yInterval;
  }
}

// 渲染线条
function renderLine(
  svg: string[],
  line: { x: number; y: number }[],
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  xPixel: number,
  yPixel: number,
  lineColor: string,
) {
  const xSize = xMax - xMin;
  const ySize = yMax - yMin;

  const linePath = line
    .map(
      (p) =>
        `${(xPixel * (p.x - xMin)) / xSize} ${(yPixel * (yMax - p.y)) / ySize}`,
    )
    .join(" L ");
  svg.push(
    `<path d="M ${linePath}" stroke="${lineColor}" stroke-width="2" fill="none" />`,
  );
}

// 更新数值卡片
function updateNumberDiv() {
  const tnow = new Date().getTime() / 1000;
  for (const name of Object.keys(numbers)) {
    const cardDiv = numberMap[name];
    if (!cardDiv) {
      continue;
    }

    const number = numbers[name];
    if (!number) {
      renderNoDataCard(cardDiv, name);
    } else {
      renderDataCard(cardDiv, name, number, tnow);
    }
  }
}

// 裁剪历史数据
function cropHistory(
  history: { time: number; value: number }[],
  xMin: number,
  xMax: number,
) {
  let historyList = Array.from(history); // 复制数组

  // 右侧补足
  if (historyList[historyList.length - 1].time < xMax) {
    historyList.push({
      time: xMax,
      value: historyList[historyList.length - 1].value,
    });
  }

  // 检查右侧超出
  let outright = null;
  while (
    historyList.length > 0 &&
    historyList[historyList.length - 1].time > xMax
  ) {
    outright = historyList.pop()!;
  }
  if (outright) {
    const historyright = historyList[historyList.length - 1]!;
    historyList.unshift({
      time: xMax,
      value:
        outright.value +
        ((historyright.value - outright.value) * (xMax - outright.time)) /
          (historyright.time - outright.time),
    });
  }

  // 检查左侧超出
  let outleft = null;
  while (historyList.length > 0 && historyList[0].time < xMin) {
    outleft = historyList.shift()!;
  }
  if (outleft) {
    const historyleft = historyList[0]!;
    historyList.unshift({
      time: xMin,
      value:
        outleft.value +
        ((historyleft.value - outleft.value) * (xMin - outleft.time)) /
          (historyleft.time - outleft.time),
    });
  }
  return historyList;
}
