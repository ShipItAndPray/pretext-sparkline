import { describe, it, expect, vi } from "vitest";
import { computeLayout, formatValue } from "../layout.js";

// Mock Pretext
function mockPretext(charWidth = 7) {
  return {
    prepare: vi.fn(),
    layout: vi.fn((text: string) => ({
      width: text.length * charWidth,
      height: 12,
    })),
  };
}

describe("Sparkline integration", () => {
  it("handles single data point", () => {
    const pt = mockPretext();
    const layout = computeLayout(
      { data: [42], width: 100, height: 30, labels: { show: "last" } },
      pt,
    );
    expect(layout.points).toHaveLength(1);
    expect(layout.dataMin).toBe(42);
    expect(layout.dataMax).toBe(42);
    expect(layout.labels).toHaveLength(1);
    expect(layout.labels[0].text).toBe("42");
  });

  it("handles constant data (all same value)", () => {
    const pt = mockPretext();
    const data = [5, 5, 5, 5];
    const layout = computeLayout(
      { data, width: 200, height: 40 },
      pt,
    );
    // All points should have the same Y (centered)
    const ys = new Set(layout.points.map((p) => p.y));
    expect(ys.size).toBe(1);
  });

  it("handles negative data", () => {
    const pt = mockPretext();
    const data = [-10, -5, -20, -1];
    const layout = computeLayout(
      { data, width: 200, height: 40, labels: { show: "minmax" } },
      pt,
    );
    expect(layout.dataMin).toBe(-20);
    expect(layout.dataMax).toBe(-1);
    expect(layout.minIndex).toBe(2);
    expect(layout.maxIndex).toBe(3);
  });

  it("handles large datasets efficiently", () => {
    const pt = mockPretext();
    const data = Array.from({ length: 500 }, (_, i) =>
      Math.sin(i * 0.1) * 100,
    );
    const start = performance.now();
    const layout = computeLayout(
      { data, width: 800, height: 50 },
      pt,
    );
    const elapsed = performance.now() - start;
    expect(layout.points).toHaveLength(500);
    expect(elapsed).toBeLessThan(100); // should be well under 100ms
  });

  it("skips annotations with out-of-range indices", () => {
    const pt = mockPretext();
    const layout = computeLayout(
      {
        data: [1, 2, 3],
        width: 200,
        height: 50,
        annotations: [
          { index: -1, text: "bad" },
          { index: 10, text: "also bad" },
          { index: 1, text: "good" },
        ],
      },
      pt,
    );
    expect(layout.labels).toHaveLength(1);
    expect(layout.labels[0].text).toBe("good");
  });

  it("combines labels and annotations without overlap", () => {
    const pt = mockPretext();
    const layout = computeLayout(
      {
        data: [10, 50, 30, 80, 20],
        width: 400,
        height: 80,
        labels: { show: "minmax" },
        annotations: [{ index: 1, text: "midpoint" }],
      },
      pt,
    );
    // Should have min label, max label, and annotation
    expect(layout.labels).toHaveLength(3);
  });

  it("respects custom padding", () => {
    const pt = mockPretext();
    const layout = computeLayout(
      { data: [1, 10], width: 200, height: 40, padding: 20 },
      pt,
    );
    // First point X should be at padding
    expect(layout.points[0].x).toBe(20);
  });
});

describe("formatValue edge cases", () => {
  it("handles zero", () => {
    expect(formatValue(0)).toBe("0");
  });

  it("handles boundary values", () => {
    expect(formatValue(999)).toBe("999");
    expect(formatValue(1000)).toBe("1.0K");
    expect(formatValue(999999)).toBe("1000.0K");
    expect(formatValue(1000000)).toBe("1.0M");
  });
});
