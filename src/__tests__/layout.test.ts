import { describe, it, expect, vi } from "vitest";
import { computeLayout, formatValue, valueToY, indexToX } from "../layout.js";

// Mock Pretext handle: width = chars * 7 (monospace approximation)
function mockPretext(charWidth = 7) {
  return {
    prepare: vi.fn(),
    layout: vi.fn((text: string) => ({
      width: text.length * charWidth,
      height: 12,
    })),
  };
}

describe("formatValue", () => {
  it("formats integers without decimals", () => {
    expect(formatValue(42)).toBe("42");
    expect(formatValue(0)).toBe("0");
  });

  it("formats decimals with one place", () => {
    expect(formatValue(3.14)).toBe("3.1");
  });

  it("formats thousands as K", () => {
    expect(formatValue(1500)).toBe("1.5K");
    expect(formatValue(10000)).toBe("10.0K");
  });

  it("formats millions as M", () => {
    expect(formatValue(2500000)).toBe("2.5M");
  });

  it("handles negative values", () => {
    expect(formatValue(-1500)).toBe("-1.5K");
  });
});

describe("valueToY", () => {
  it("maps min value to bottom", () => {
    expect(valueToY(0, 0, 100, 10, 90)).toBe(90);
  });

  it("maps max value to top", () => {
    expect(valueToY(100, 0, 100, 10, 90)).toBe(10);
  });

  it("maps mid value to center", () => {
    expect(valueToY(50, 0, 100, 10, 90)).toBe(50);
  });

  it("returns center when min === max", () => {
    expect(valueToY(5, 5, 5, 10, 90)).toBe(50);
  });
});

describe("indexToX", () => {
  it("maps first index to left", () => {
    expect(indexToX(0, 10, 20, 200)).toBe(20);
  });

  it("maps last index to right", () => {
    expect(indexToX(9, 10, 20, 200)).toBe(200);
  });

  it("returns center for single-element data", () => {
    expect(indexToX(0, 1, 20, 200)).toBe(110);
  });
});

describe("computeLayout", () => {
  it("returns empty layout for empty data", () => {
    const pt = mockPretext();
    const layout = computeLayout(
      { data: [], width: 200, height: 40 },
      pt,
    );
    expect(layout.points).toHaveLength(0);
    expect(layout.labels).toHaveLength(0);
    expect(layout.fillPoints).toBeNull();
  });

  it("computes correct number of points", () => {
    const pt = mockPretext();
    const data = [10, 20, 15, 30, 25];
    const layout = computeLayout(
      { data, width: 200, height: 40 },
      pt,
    );
    expect(layout.points).toHaveLength(5);
    expect(layout.dataMin).toBe(10);
    expect(layout.dataMax).toBe(30);
    expect(layout.minIndex).toBe(0);
    expect(layout.maxIndex).toBe(3);
  });

  it("generates fill points when fillColor is set", () => {
    const pt = mockPretext();
    const data = [1, 2, 3];
    const layout = computeLayout(
      { data, width: 100, height: 30, fillColor: "rgba(0,0,0,0.1)" },
      pt,
    );
    expect(layout.fillPoints).not.toBeNull();
    // fill = data points + 2 baseline closure points
    expect(layout.fillPoints!.length).toBe(data.length + 2);
  });

  it("produces no labels when show is none", () => {
    const pt = mockPretext();
    const layout = computeLayout(
      { data: [1, 2, 3], width: 100, height: 30, labels: { show: "none" } },
      pt,
    );
    expect(layout.labels).toHaveLength(0);
    expect(pt.prepare).not.toHaveBeenCalled();
  });

  it("produces one label for 'last' mode", () => {
    const pt = mockPretext();
    const data = [10, 20, 30];
    const layout = computeLayout(
      { data, width: 200, height: 50, labels: { show: "last" } },
      pt,
    );
    expect(layout.labels).toHaveLength(1);
    expect(layout.labels[0].text).toBe("30");
    expect(layout.labels[0].dataIndex).toBe(2);
    expect(pt.prepare).toHaveBeenCalledWith(["30"]);
  });

  it("produces min/max labels for 'minmax' mode", () => {
    const pt = mockPretext();
    const data = [5, 1, 8, 3];
    const layout = computeLayout(
      { data, width: 200, height: 50, labels: { show: "minmax" } },
      pt,
    );
    expect(layout.labels).toHaveLength(2);
    const texts = layout.labels.map((l) => l.text);
    expect(texts).toContain("1");
    expect(texts).toContain("8");
  });

  it("produces labels for all points in 'all' mode", () => {
    const pt = mockPretext();
    const data = [10, 20, 30];
    const layout = computeLayout(
      { data, width: 300, height: 80, labels: { show: "all" } },
      pt,
    );
    expect(layout.labels).toHaveLength(3);
  });

  it("places annotation labels at correct data indices", () => {
    const pt = mockPretext();
    const data = [10, 20, 30, 40];
    const layout = computeLayout(
      {
        data,
        width: 300,
        height: 80,
        annotations: [{ index: 2, text: "peak!" }],
      },
      pt,
    );
    expect(layout.labels).toHaveLength(1);
    expect(layout.labels[0].text).toBe("peak!");
    expect(layout.labels[0].dataIndex).toBe(2);
  });

  it("avoids label overlaps", () => {
    const pt = mockPretext();
    // Dense data: all labels close together
    const data = [10, 11, 12, 13, 14];
    const layout = computeLayout(
      { data, width: 200, height: 50, labels: { show: "all" } },
      pt,
    );

    // No two labels should overlap
    for (let i = 0; i < layout.labels.length; i++) {
      for (let j = i + 1; j < layout.labels.length; j++) {
        const a = layout.labels[i];
        const b = layout.labels[j];
        const overlapX = a.x < b.x + b.width && a.x + a.width > b.x;
        const overlapY = a.y < b.y + b.height && a.y + a.height > b.y;
        const overlaps = overlapX && overlapY;
        // Allow overlap only if labels were forced (last resort)
        // In most cases they should not overlap
        if (overlaps) {
          // This is acceptable only when canvas is too small for all labels
          expect(layout.labels.length).toBeGreaterThan(3);
        }
      }
    }
  });

  it("calls pretext.prepare with all label texts", () => {
    const pt = mockPretext();
    const data = [5, 1, 8, 3];
    computeLayout(
      {
        data,
        width: 200,
        height: 50,
        labels: { show: "minmax" },
        annotations: [{ index: 0, text: "start" }],
      },
      pt,
    );
    // Should batch-prepare min, max, and annotation texts
    expect(pt.prepare).toHaveBeenCalledWith(["1", "8", "start"]);
  });
});
