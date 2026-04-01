# @shipitandpray/pretext-sparkline

**[Live Demo](https://shipitandpray.github.io/pretext-sparkline/)**

Inline sparklines with collision-free value labels computed before render using [Pretext](https://github.com/chenglou/pretext).

## Why

Every sparkline library either skips labels entirely or renders them and hopes they don't overlap. This library uses Pretext to pre-measure all label bounding boxes so collision avoidance runs _before_ any paint call. Zero flicker, zero overlap.

## Install

```bash
npm install @shipitandpray/pretext-sparkline @chenglou/pretext
```

## Usage

```typescript
import { createSparkline } from "@shipitandpray/pretext-sparkline";
import * as pretext from "@chenglou/pretext";

const canvas = document.querySelector("canvas") as HTMLCanvasElement;

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

// Update options
sparkline.setOptions({ lineColor: "#34D399", fillColor: "rgba(52,211,153,0.15)" });
```

## API

### `createSparkline(canvas, options, pretext)`

Returns a `Sparkline` instance. Calls `.render()` immediately.

| Option | Type | Default | Description |
|---|---|---|---|
| `data` | `number[]` | required | Array of data points |
| `width` | `number` | required | Canvas width in CSS pixels |
| `height` | `number` | required | Canvas height in CSS pixels |
| `font` | `string` | `"11px sans-serif"` | Label font (passed to Pretext) |
| `lineColor` | `string` | `"#4F8EF7"` | Line stroke color |
| `fillColor` | `string` | — | Fill area color (optional) |
| `lineWidth` | `number` | `1.5` | Stroke width in pixels |
| `padding` | `number` | `4` | Chart padding in pixels |
| `labels.show` | `"last" \| "minmax" \| "all" \| "none"` | `"none"` | Which point labels to show |
| `annotations` | `Annotation[]` | `[]` | Custom callout labels at specific data indices |

### `Annotation`

```typescript
interface Annotation {
  index: number; // data index
  text: string;  // label text
}
```

### `Sparkline` instance methods

| Method | Description |
|---|---|
| `setData(data)` | Replace data array and re-render |
| `setOptions(opts)` | Merge partial options and re-render |
| `setSize(width, height)` | Resize canvas and re-render |
| `getLayout()` | Returns the last computed `SparklineLayout` |
| `render()` | Force a full re-render |
| `destroy()` | Clear the canvas and clean up |

## How It Works

1. **Collect** all label texts: last value, min/max values, and annotation texts
2. **Batch-measure** via `pretext.prepare(font, texts)` — one blocking call, no DOM reflow
3. **Run greedy collision avoidance**: for each label try above → below → right → left
4. **Clamp** all positions to canvas bounds
5. **Paint**: fill area, polyline, min/max dots, end dot, then all pre-positioned labels

Because layout is computed before the first `ctx.fillText()`, there is no flicker and no second-pass correction.

## Types

```typescript
import type {
  SparklineOptions,
  SparklineLayout,
  ResolvedLabel,
  LabelPlacement,
  LabelConfig,
  Annotation,
  PretextHandle,
  PretextModule,
} from "@shipitandpray/pretext-sparkline";
```

## License

MIT
