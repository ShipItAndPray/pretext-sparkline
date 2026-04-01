import type { SparklineLayout, SparklineOptions } from "./types.js";

/**
 * Render the sparkline to a canvas context using pre-computed layout.
 * No measurement happens here -- everything is positioned by layout.ts.
 */
export function renderSparkline(
  ctx: CanvasRenderingContext2D,
  layout: SparklineLayout,
  options: SparklineOptions,
): void {
  const {
    width,
    height,
    lineColor = "#4F8EF7",
    fillColor,
    lineWidth = 1.5,
    font = "11px sans-serif",
  } = options;

  ctx.clearRect(0, 0, width, height);

  if (layout.points.length === 0) return;

  // Fill area
  if (fillColor && layout.fillPoints) {
    ctx.save();
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.moveTo(layout.fillPoints[0].x, layout.fillPoints[0].y);
    for (let i = 1; i < layout.fillPoints.length; i++) {
      ctx.lineTo(layout.fillPoints[i].x, layout.fillPoints[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Line
  ctx.save();
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(layout.points[0].x, layout.points[0].y);
  for (let i = 1; i < layout.points.length; i++) {
    ctx.lineTo(layout.points[i].x, layout.points[i].y);
  }
  ctx.stroke();
  ctx.restore();

  // Min/max dots
  if (layout.points.length > 1) {
    const minPt = layout.points[layout.minIndex];
    const maxPt = layout.points[layout.maxIndex];

    // Min dot (red)
    ctx.save();
    ctx.fillStyle = "#EF4444";
    ctx.beginPath();
    ctx.arc(minPt.x, minPt.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Max dot (green)
    ctx.save();
    ctx.fillStyle = "#34D399";
    ctx.beginPath();
    ctx.arc(maxPt.x, maxPt.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // End dot
  const lastPt = layout.points[layout.points.length - 1];
  ctx.save();
  ctx.fillStyle = lineColor;
  ctx.beginPath();
  ctx.arc(lastPt.x, lastPt.y, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Labels
  if (layout.labels.length > 0) {
    ctx.save();
    ctx.font = font;
    ctx.textBaseline = "top";

    for (const label of layout.labels) {
      ctx.fillStyle = label.color;
      ctx.fillText(label.text, label.x, label.y);
    }

    ctx.restore();
  }
}
