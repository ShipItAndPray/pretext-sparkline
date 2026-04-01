import type {
  SparklineOptions,
  SparklineLayout,
  ResolvedLabel,
  LabelPlacement,
  PretextHandle,
} from "./types.js";

/** Rectangle for overlap detection. */
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Map a data value to Y coordinate (inverted: higher value = lower y). */
function valueToY(
  value: number,
  min: number,
  max: number,
  top: number,
  bottom: number,
): number {
  if (max === min) return (top + bottom) / 2;
  return bottom - ((value - min) / (max - min)) * (bottom - top);
}

/** Map a data index to X coordinate. */
function indexToX(
  index: number,
  count: number,
  left: number,
  right: number,
): number {
  if (count <= 1) return (left + right) / 2;
  return left + (index / (count - 1)) * (right - left);
}

/**
 * Compute the full sparkline layout using Pretext for label measurement.
 * All bounding boxes are known before any paint call.
 */
export function computeLayout(
  options: SparklineOptions,
  pretext: PretextHandle,
): SparklineLayout {
  const {
    data,
    width,
    height,
    lineColor = "#4F8EF7",
    fillColor,
    padding = 4,
    labels: labelConfig,
    annotations = [],
  } = options;

  if (data.length === 0) {
    return {
      points: [],
      fillPoints: null,
      labels: [],
      dataMin: 0,
      dataMax: 0,
      minIndex: 0,
      maxIndex: 0,
    };
  }

  // Find min/max
  let dataMin = data[0];
  let dataMax = data[0];
  let minIndex = 0;
  let maxIndex = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i] < dataMin) {
      dataMin = data[i];
      minIndex = i;
    }
    if (data[i] > dataMax) {
      dataMax = data[i];
      maxIndex = i;
    }
  }

  // Reserve space for labels on the right side
  const showLabels = labelConfig?.show ?? "none";
  const labelPad = 4;

  // Collect all label texts to measure
  const labelTexts: string[] = [];
  const labelIndices: number[] = [];
  const labelColors: string[] = [];

  if (showLabels === "last") {
    labelTexts.push(formatValue(data[data.length - 1]));
    labelIndices.push(data.length - 1);
    labelColors.push(lineColor);
  } else if (showLabels === "minmax") {
    labelTexts.push(formatValue(dataMin));
    labelIndices.push(minIndex);
    labelColors.push("#EF4444");
    if (maxIndex !== minIndex) {
      labelTexts.push(formatValue(dataMax));
      labelIndices.push(maxIndex);
      labelColors.push("#34D399");
    }
  } else if (showLabels === "all") {
    for (let i = 0; i < data.length; i++) {
      labelTexts.push(formatValue(data[i]));
      labelIndices.push(i);
      labelColors.push(lineColor);
    }
  }

  // Add annotation texts
  for (const ann of annotations) {
    if (ann.index >= 0 && ann.index < data.length) {
      labelTexts.push(ann.text);
      labelIndices.push(ann.index);
      labelColors.push("#F59E0B");
    }
  }

  // Batch-measure all labels via Pretext
  pretext.prepare(labelTexts);

  // Measure each label
  const measurements = labelTexts.map((text) => pretext.layout(text));

  // Compute right margin: if we have a "last" label, reserve its width
  let rightMargin = padding;
  if (showLabels === "last" && measurements.length > 0) {
    rightMargin = Math.max(rightMargin, measurements[0].width + labelPad * 2);
  }

  // Chart area
  const plotLeft = padding;
  const plotRight = width - rightMargin;
  const plotTop = padding + 8; // space for labels above
  const plotBottom = height - padding - 8; // space for labels below

  // Compute polyline points
  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < data.length; i++) {
    points.push({
      x: indexToX(i, data.length, plotLeft, plotRight),
      y: valueToY(data[i], dataMin, dataMax, plotTop, plotBottom),
    });
  }

  // Fill polygon (line + close to baseline)
  let fillPoints: Array<{ x: number; y: number }> | null = null;
  if (fillColor) {
    fillPoints = [
      ...points,
      { x: points[points.length - 1].x, y: plotBottom },
      { x: points[0].x, y: plotBottom },
    ];
  }

  // Position labels with collision avoidance
  const resolvedLabels: ResolvedLabel[] = [];
  const occupiedRects: Rect[] = [];

  for (let i = 0; i < labelTexts.length; i++) {
    const text = labelTexts[i];
    const dataIdx = labelIndices[i];
    const color = labelColors[i];
    const { width: labelW, height: labelH } = measurements[i];
    const point = points[dataIdx];

    const label = placeLabel(
      text,
      point.x,
      point.y,
      labelW,
      labelH,
      dataIdx,
      color,
      width,
      height,
      occupiedRects,
    );

    if (label) {
      resolvedLabels.push(label);
      occupiedRects.push({
        x: label.x,
        y: label.y,
        w: label.width,
        h: label.height,
      });
    }
  }

  return {
    points,
    fillPoints,
    labels: resolvedLabels,
    dataMin,
    dataMax,
    minIndex,
    maxIndex,
  };
}

/**
 * Try placing a label in multiple positions to avoid overlap.
 * Priority: above -> below -> right -> left.
 */
function placeLabel(
  text: string,
  px: number,
  py: number,
  lw: number,
  lh: number,
  dataIndex: number,
  color: string,
  canvasW: number,
  canvasH: number,
  occupied: Rect[],
): ResolvedLabel | null {
  const gap = 3;
  const candidates: Array<{ placement: LabelPlacement; x: number; y: number }> =
    [
      { placement: "above", x: px - lw / 2, y: py - lh - gap },
      { placement: "below", x: px - lw / 2, y: py + gap },
      { placement: "right", x: px + gap, y: py - lh / 2 },
      { placement: "left", x: px - lw - gap, y: py - lh / 2 },
    ];

  for (const c of candidates) {
    // Clamp to canvas bounds
    const x = Math.max(0, Math.min(c.x, canvasW - lw));
    const y = Math.max(0, Math.min(c.y, canvasH - lh));

    const rect: Rect = { x, y, w: lw, h: lh };
    const overlaps = occupied.some((r) => rectsOverlap(rect, r));

    if (!overlaps) {
      return {
        text,
        x,
        y,
        width: lw,
        height: lh,
        placement: c.placement,
        dataIndex,
        color,
      };
    }
  }

  // Last resort: place above anyway (clamped)
  const x = Math.max(0, Math.min(px - lw / 2, canvasW - lw));
  const y = Math.max(0, py - lh - gap);
  return {
    text,
    x,
    y,
    width: lw,
    height: lh,
    placement: "above",
    dataIndex,
    color,
  };
}

/** Format a number as a compact label string. */
function formatValue(v: number): string {
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(1) + "K";
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1);
}

export { formatValue, valueToY, indexToX };
