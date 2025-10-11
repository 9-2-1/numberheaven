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

// 同一主题色系列颜色
function colorSeries(themeColor: { r: number; g: number; b: number }) {
  const { l: tl, c: tc, h: th } = convertRgbToOklch(themeColor);
  return {
    titleColor: oklchtorgbstr({ l: 0.6, c: tc, h: th }),
    numColor: oklchtorgbstr({ l: 0.6, c: tc, h: th }),
    labelColor: oklchtorgbstr({ l: 0.7, c: tc, h: th }),
    lineColor: oklchtorgbstr({ l: 0.7, c: tc, h: th }),
    bgColor: oklchtorgbstr({ l: 0.95, c: tc, h: th }),
  };
}

function fdate(time: number) {
  const date = new Date(time * 1000);
  return date.getDate() == 1
    ? date.getMonth() + 1 + "/1"
    : date.getDate().toString();
}

// 处理有数据情况的函数
function renderDataCard(
  cardDiv: HTMLDivElement,
  name: string,
  number: { value: number; history: { time: number; value: number }[] },
  tnow: number,
) {
  const graph = new SVGGraph();
  graph.renderStart(cardDiv);
  // 计算x轴时间范围
  const xMin = tnow - 6.5 * 24 * 60 * 60; // -6.5d
  const xMax = tnow + 0.5 * 24 * 60 * 60; // +0.5d
  graph.xMin = xMin;
  graph.xMax = xMax;
  const lasttime = number.history[number.history.length - 1].time;
  // 历史记录
  const historyList = Array.from(number.history);
  historyList.push({ time: xMax, value: number.value });
  const points = historyList.map((history) => ({
    x: history.time,
    y: history.value,
  }));
  // 计算y轴范围
  const yPad = 10;
  const yRange = nameMode[name]?.[4] ?? 20;
  const yMinMin = nameMode[name]?.[3] ?? null;
  graph.autoYRange(points);
  if (graph.yMax - graph.yMin < yRange) {
    const avg = (graph.yMin + graph.yMax) / 2;
    graph.yMin = avg - yRange / 2;
    graph.yMax = avg + yRange / 2;
  }
  if (yMinMin !== null && graph.yMin < yMinMin) {
    graph.yMax += yMinMin - graph.yMin;
    graph.yMin = yMinMin;
  }

  graph.yMax += yPad;
  graph.yMin -= yPad;

  const themeColor = nameMode[name]?.[2] ?? rgb(179, 91, 51);
  const { titleColor, numColor, labelColor, lineColor, bgColor } =
    colorSeries(themeColor);

  const xAxisYv = graph.yMin + yPad;
  const yAxisXv = graph.xMax - 0.5 * 24 * 60 * 60; // tnow

  const tzoffset = new Date().getTimezoneOffset() * 60;
  const yInterval = graph.findYInterval(20);

  graph.renderBackground(bgColor);
  graph.renderXAxis(xAxisYv, 24 * 60 * 60, tzoffset, labelColor, fdate);
  graph.renderYAxis(yAxisXv, yInterval, 0, labelColor, null);
  graph.renderLine(points, lineColor, "solid");

  const title = nameMode[name]?.[0] ?? name;
  graph.renderTitle(title, titleColor);
  graph.renderValue(number.value, numColor);
  graph.renderUpdateTime(lasttime, titleColor);

  graph.renderTo(cardDiv);
}

function renderNoDataCard(cardDiv: HTMLDivElement, name: string) {
  const graph = new SVGGraph();
  const title = nameMode[name]?.[0] ?? name;
  const themeColor = nameMode[name]?.[2] ?? rgb(179, 91, 51);
  const { titleColor, numColor, bgColor } = colorSeries(themeColor);
  graph.renderStart(cardDiv);
  graph.renderBackground(bgColor);
  graph.renderTitle(nameMode[name]?.[0] ?? name, titleColor);
  graph.renderValue("NoData", numColor);
  graph.renderTo(cardDiv);
}
