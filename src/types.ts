/** Configuration for sparkline labels. */
export interface LabelConfig {
  show: "last" | "minmax" | "all" | "none";
  font?: string;
}

/** A custom annotation placed at a specific data index. */
export interface Annotation {
  index: number;
  text: string;
}

/** Options for creating a sparkline. */
export interface SparklineOptions {
  data: number[];
  width: number;
  height: number;
  font?: string;
  lineColor?: string;
  fillColor?: string;
  lineWidth?: number;
  padding?: number;
  labels?: LabelConfig;
  annotations?: Annotation[];
}

/** Where a label is placed relative to its data point. */
export type LabelPlacement = "above" | "below" | "left" | "right";

/** A resolved label after collision avoidance. */
export interface ResolvedLabel {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  placement: LabelPlacement;
  dataIndex: number;
  color: string;
}

/** The computed layout for a sparkline, ready to paint. */
export interface SparklineLayout {
  /** Polyline points in canvas coordinates. */
  points: Array<{ x: number; y: number }>;
  /** Fill polygon (points + baseline closure). */
  fillPoints: Array<{ x: number; y: number }> | null;
  /** Pre-positioned, collision-free labels. */
  labels: ResolvedLabel[];
  /** Data bounds. */
  dataMin: number;
  dataMax: number;
  minIndex: number;
  maxIndex: number;
}

/** Minimal Pretext surface we depend on. */
export interface PretextHandle {
  prepare(texts: string[]): void;
  layout(text: string): { width: number; height: number };
}

/** Minimal Pretext module (font-aware). */
export interface PretextModule {
  prepare(font: string, texts: string[]): void;
  layout(font: string, text: string): { width: number; height: number };
}
