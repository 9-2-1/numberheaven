const layout = [
  ["goldie"],
  ["anki", "bbdc"],
  ["tagspaces", "zhihu"],
  ["bilibili", "xiaohongshu", "douyin"],
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
  [string, string, { r: number; g: number; b: number }]
> = {
  goldie: ["点数", "cd", rgb(172, 228, 68)],
  anki: ["Anki待复习", "卡片", rgb(81, 171, 231)],
  bbdc: ["不背单词待复习", "单词", rgb(255, 104, 0)],
  tagspaces: ["未标记文件", "文件", rgb(29, 209, 159)],
  zhihu: ["知乎稍后再看", "回答", rgb(23, 114, 246)],
  bilibili: ["b站稍后再看", "视频", rgb(0, 174, 236)],
  xiaohongshu: ["小红书稍后再看", "笔记", rgb(255, 36, 66)],
  douyin: ["抖音稍后再看", "视频", rgb(22, 24, 35)],
};

window.addEventListener("load", async () => {
  const numbers: {
    [name: string]: {
      value: number;
      history: {
        time: number;
        value: number;
      }[];
    };
  } = await (await fetch("get_numbers")).json();
  const numbersDiv = document.getElementById("numbers")!;
  const backgroundDivList: { name: string; element: HTMLDivElement }[] = [];
  for (const line of layout) {
    const numberLine = document.createElement("div");
    numberLine.classList.add("number_line");
    for (const name of line) {
      // <div class="number_card">
      //   <div class="number_card_upper">
      //     <div class="number_card_background"></div>
      //     <div class="number_name">点数</div>
      //     <div class="number_value">
      //       <div class="number_value_num">100</div>
      //       <div class="number_value_unit">cd</div>
      //     </div>
      //     <div class="number_history_max">100</div>
      //     <div class="number_history_min">0</div>
      //   </div>
      //   <div class="number_card_lower">
      //     <div class="number_history_length">7天</div>
      //     <div class="number_history_last">5/1 12:34</div>
      //   </div>
      // </div>

      let strokePath = "";
      let graphMax = numbers[name]?.value ?? 0;
      let graphMin = graphMax;
      let lasttime = "";

      let historyList = Array.from(numbers[name]?.history ?? []); // 复制数组

      if (historyList.length > 0) {
        let now = new Date().getTime() / 1000;
        let back = 7 * 24 * 60 * 60; // 7天

        lasttime = new Date(
          historyList[historyList.length - 1].time * 1000,
        ).toLocaleString();

        historyList.push({
          time: now,
          value: numbers[name].value,
        });

        let backleft: { time: number; value: number } | null = null;
        while (historyList.length > 0 && historyList[0].time < now - back) {
          backleft = historyList.shift()!;
        }

        if (backleft) {
          const historyleft = historyList[0]!;
          historyList.unshift({
            time: now - back,
            value:
              backleft.value +
              ((historyleft.value - backleft.value) *
                (now - back - backleft.time)) /
                (historyleft.time - backleft.time),
          });
        } else {
          const historyleft = historyList[0]!;
          historyList.unshift({
            time: now - back,
            value: historyleft.value,
          });
        }

        for (const history of historyList) {
          graphMax = Math.max(graphMax, history.value);
          graphMin = Math.min(graphMin, history.value);
        }

        if (graphMax - graphMin < 40) {
          const graphMid = (graphMax + graphMin) / 2;
          graphMax = graphMid + 20;
          graphMin = graphMid - 20;
        }

        for (const history of historyList) {
          const x = ((history.time - now + back) / back) * 100;
          const y =
            100 - ((history.value - graphMin) / (graphMax - graphMin)) * 100;
          strokePath += `L${x} ${y}`;
        }
      }

      const theme = nameMode[name]?.[2];
      const { l: tl, c: tc, h: th } = convertRgbToOklch(theme);

      const titleColor = oklchtorgbstr({ l: 0.4, c: tc, h: th });
      const numColor = oklchtorgbstr({ l: 0.5, c: tc, h: th });
      const unitColor = oklchtorgbstr({ l: 0.6, c: tc, h: th });
      const labelColor = oklchtorgbstr({ l: 0.7, c: tc, h: th });
      const underColor = oklchtorgbstr({ l: 0.9, c: tc, h: th });
      const graphColor = oklchtorgbstr({ l: 0.9, c: tc, h: th });
      const bgColor = oklchtorgbstr({ l: 0.95, c: tc, h: th });

      const cardDiv = document.createElement("div");
      cardDiv.classList.add("number_card");
      cardDiv.style.setProperty("--title-color", titleColor);
      cardDiv.style.setProperty("--num-color", numColor);
      cardDiv.style.setProperty("--unit-color", unitColor);
      cardDiv.style.setProperty("--label-color", labelColor);
      cardDiv.style.setProperty("--graph-color", graphColor);
      cardDiv.style.setProperty("--under-color", underColor);
      cardDiv.style.setProperty("--bg-color", bgColor);
      numberLine.appendChild(cardDiv);

      const upperDiv = document.createElement("div");
      upperDiv.classList.add("number_card_upper");
      cardDiv.appendChild(upperDiv);

      const backgroundDiv = document.createElement("div");
      backgroundDiv.classList.add("number_card_background");
      backgroundDiv.innerHTML = `<svg class="number_card_background_svg" preserveAspectRatio="none" viewBox="0 0 100 100"><path d="M0 100 ${strokePath} L100 100 Z" fill="${graphColor}"/></svg>`;
      backgroundDivList.push({ name, element: backgroundDiv });
      upperDiv.appendChild(backgroundDiv);

      const nameDiv = document.createElement("div");
      nameDiv.classList.add("number_name");
      nameDiv.textContent = nameMode[name]?.[0] ?? "???";
      upperDiv.appendChild(nameDiv);

      const valueDiv = document.createElement("div");
      valueDiv.classList.add("number_value");
      upperDiv.appendChild(valueDiv);

      const valueNumDiv = document.createElement("div");
      valueNumDiv.classList.add("number_value_num");
      valueNumDiv.textContent = numbers[name]?.value.toString() ?? "???";
      valueDiv.appendChild(valueNumDiv);

      const valueUnitDiv = document.createElement("div");
      valueUnitDiv.classList.add("number_value_unit");
      valueUnitDiv.textContent = nameMode[name]?.[1] ?? "???";
      valueDiv.appendChild(valueUnitDiv);

      const historyMaxDiv = document.createElement("div");
      historyMaxDiv.classList.add("number_history_max");
      historyMaxDiv.textContent = graphMax.toString();
      upperDiv.appendChild(historyMaxDiv);

      const historyMinDiv = document.createElement("div");
      historyMinDiv.classList.add("number_history_min");
      historyMinDiv.textContent = graphMin.toString();
      upperDiv.appendChild(historyMinDiv);

      const lowerDiv = document.createElement("div");
      lowerDiv.classList.add("number_card_lower");
      cardDiv.appendChild(lowerDiv);

      const historyLengthDiv = document.createElement("div");
      historyLengthDiv.classList.add("number_history_length");
      historyLengthDiv.textContent = "7天";
      lowerDiv.appendChild(historyLengthDiv);

      const historyLastDiv = document.createElement("div");
      historyLastDiv.classList.add("number_history_last");
      historyLastDiv.textContent = lasttime;
      lowerDiv.appendChild(historyLastDiv);
    }
    numbersDiv.appendChild(numberLine);
  }
});
