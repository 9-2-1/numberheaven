NumberHeaven

简单的数据显示

后端：NodeJS + Sqlite 记录不同名称的数字变化

```
CREATE TABLE number (
  name TEXT PRIMARY KEY, -- 名称
  color TEXT, -- 主题色，"#RRGGBB"，例如"#66ccff"
  order TEXT, -- 前端显示顺序
  value REAL, -- 当前数值
  last REAL -- 最后一次更新
) WITHOUT ROWID;
CREATE TABLE history (
  time REAL -- 时间
  name TEXT, -- 名称
  value REAL, -- 数值
);
CREATE INDEX history_time ON history(time)
```

两个API: get_numbers -- 获得所有数字以及7天内的历史。值得注意的是，除了7天内的点之外需要获取7天前最晚的一个点，这样趋势线左侧连续

post_update(name, value, color?, order?) -- 更新数字

前端：Svelte 显示所有数字，按照 (order, name) 先 order 后 name 排序。建议在后端排好序按照这样的格式，一个或者两个占一整行（根据屏幕宽度）：

```
↘这是一个Component
[名称] [最后更新时间]
[              ] |      ---
[ 数 字（大字）] |    ---  ---
[              ] | ---        ----
                  ↗"---"是七天变化趋势线
```

关于变化趋势线(可能需要实现为 子Component)

- 鼓励使用svg/Path
- 画带刻度的x轴和y轴
- x轴刻度为0点的日期。使用浏览器当前时区。
- y轴刻度需要适应。1,2,5,10,以此类推，选择能看清（刻度间隔大于字号x2）的最小单位
- 注意大小变化 (bind:clientHeight, etc.)

关于颜色

- 使用合适的库，将主题色转换为 oklch。取主题色的 h 生成 Component各部分的颜色，使颜色效果统一。
  - 例如背景为 {l:0.9, c:0.05, h}, 名称为 {l:0.6, c:0.2, h}，等等

其他

- 使用 TypeScript
- 是不是有什么方法可以直接同时启动前端和后端？
- Svelte的 $props 正确用法示例: `const {foo, bar}: {foo: number, bar: string} = $props();`
- Svelte的 snippet 正确用法示例：

```
{#snippet figure(image)}
<figure>
  <img src={image.src} alt={image.caption} width={image.width} height={image.height} />
  <figcaption>{image.caption}</figcaption>
</figure>
{/snippet}

{#each images as image}
  {#if image.href}
    <a href={image.href}>
      {@render figure(image)}
    </a>
  {:else}
    {@render figure(image)}
  {/if}
{/each}
```

```
{#snippet header()}
<th>fruit</th>
<th>qty</th>
<th>price</th>
<th>total</th>
{/snippet}

{#snippet row(d)}
<td>{d.name}</td>
<td>{d.qty}</td>
<td>{d.price}</td>
<td>{d.qty \* d.price}
</td>
{/snippet}

<Table data={fruits} {header} {row} />
```

```
<!-- this is semantically the same as the above -->
<Table data={fruits}>
    {#snippet header()}
        <th>fruit</th>
        <th>qty</th>
        <th>price</th>
        <th>total</th>
    {/snippet}

    {#snippet row(d)}
        <td>{d.name}</td>
        <td>{d.qty}</td>
        <td>{d.price}</td>
        <td>{d.qty * d.price}</td>
    {/snippet}
</Table>
```

- 有 Svelte MCP。应该充分使用此MCP确保代码质量。
