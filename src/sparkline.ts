import type {
  SparklineOptions,
  SparklineLayout,
  PretextModule,
} from "./types.js";
import { computeLayout } from "./layout.js";
import { renderSparkline } from "./renderer.js";

/**
 * Sparkline -- inline sparkline with collision-free labels.
 *
 * All label bounding boxes are measured via Pretext.prepare() + layout()
 * *before* any canvas paint. No overlap, no flicker.
 */
export class Sparkline {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: SparklineOptions;
  private pretext: PretextModule;
  private font: string;
  private dpr: number;
  private layout: SparklineLayout | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    options: SparklineOptions,
    pretext: PretextModule,
  ) {
    this.canvas = canvas;
    this.options = options;
    this.pretext = pretext;
    this.font = options.font ?? "11px sans-serif";
    this.dpr =
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

    const rawCtx = canvas.getContext("2d");
    if (!rawCtx) throw new Error("Canvas 2D context not available");
    this.ctx = rawCtx;
  }

  /** Replace data and re-render. */
  setData(data: number[]): void {
    this.options = { ...this.options, data };
    this.render();
  }

  /** Update options and re-render. */
  setOptions(opts: Partial<SparklineOptions>): void {
    this.options = { ...this.options, ...opts };
    if (opts.font) this.font = opts.font;
    this.render();
  }

  /** Resize and re-render. */
  setSize(width: number, height: number): void {
    this.options = { ...this.options, width, height };
    this.render();
  }

  /** Get the last computed layout (for testing or external use). */
  getLayout(): SparklineLayout | null {
    return this.layout;
  }

  /** Full render: measure labels via Pretext, compute layout, paint. */
  render(): void {
    const { width, height } = this.options;

    // Size canvas for HiDPI
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // Wrap Pretext into font-less handle for layout.ts
    const pt = this.pretext;
    const font = this.font;
    const pretextHandle = {
      prepare: (texts: string[]) => pt.prepare(font, texts),
      layout: (text: string) => pt.layout(font, text),
    };

    // Compute layout (all label positions decided here, before paint)
    this.layout = computeLayout(this.options, pretextHandle);

    // Paint
    renderSparkline(this.ctx, this.layout, this.options);
  }

  /** Clean up. */
  destroy(): void {
    this.ctx.clearRect(
      0,
      0,
      this.canvas.width / this.dpr,
      this.canvas.height / this.dpr,
    );
  }
}

/**
 * Create a sparkline on the given canvas element.
 * Pretext module must be passed in (peer dependency).
 */
export function createSparkline(
  canvas: HTMLCanvasElement,
  options: SparklineOptions,
  pretext: PretextModule,
): Sparkline {
  const sparkline = new Sparkline(canvas, options, pretext);
  sparkline.render();
  return sparkline;
}
