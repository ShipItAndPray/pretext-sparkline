# @shipitandpray/pretext-sparkline

Inline sparklines with collision-free value labels computed before render using [Pretext](https://github.com/chenglou/pretext).

**[Live Demo](https://shipitandpray.github.io/pretext-sparkline/)**

## Why

Every sparkline library either skips labels entirely or renders them and hopes they don't overlap. This library uses Pretext to pre-measure all label bounding boxes so collision avoidance runs _before_ any paint. Zero flicker, zero overlap.

## Install

```bash
npm install @shipitandpray/pretext-sparkline @chenglou/pretext
```

## Usage

```typescript
import { createSparkline } from "@shipitandpray/pretext-sparkline";
import * as pretext from "@chenglou/pretext";

const canvas = document.querySelector("canvas");

const sparkline = createSparkline(canvas, {
  data: [12, 15, 11, 18, 22, 19, 25, 23, 28, 30],
  width: 300,
  height: 40,
  lineColor: "#4F8EF7",
  labels: { show: "minmax" },
}, pretext);

// Update data
sparkline.setData([5, 8, 12, 9, 15, 20]);

// Resize
sparkline.setSize(400, 50);
```

## API

### `createSparkline(canvas, options, pretext)`

| Option | Type | Default | Description |
|---|---|---|---|
| `data` | `number[]` | required | Data points |
| `width` | `number` | required | Canvas width in CSS pixels |
| `height` | `number` | required | Canvas height in CSS pixels |
| `font` | `string` | `"11px sans-serif"` | Label font |
| `lineColor` | `string` | `"#4F8EF7"` | Line stroke color |
| `fillColor` | `string` | - | Fill area color (optional) |
| `lineWidth` | `number` | `1.5` | Stroke width |
| `padding` | `number` | `4` | Chart padding |
| `labels.show` | `"last" \| "minmax" \| "all" \| "none"` | `"none"` | Which labels to show |
| `annotations` | `{ index, text }[]` | `[]` | Custom callouts at data indices |

### `Sparkline` instance methods

- `setData(data)` -- replace data and re-render
- `setOptions(opts)` -- merge options and re-render
- `setSize(width, height)` -- resize and re-render
- `getLayout()` -- get last computed layout
- `destroy()` -- clean up

## How It Works

1. Collect all label texts (end value, min/max, annotations)
2. Batch-measure via `pretext.prepare()` + `layout()`
3. Run greedy collision avoidance (above > below > right > left)
4. Paint line, fill, dots, and pre-positioned labels

## License

MIT
