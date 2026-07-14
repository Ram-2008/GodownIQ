import { describe, expect, it } from "vitest";
import { computeAnomalyPct, detectCadence, shouldNotifyOutbound } from "../alertService";

describe("computeAnomalyPct", () => {
  it("matches the spec's worked example (₹48 vs ₹41 average is ~17% over)", () => {
    expect(computeAnomalyPct(48, 41)).toBeCloseTo(17.07, 1);
  });

  it("is zero when the price matches the average exactly", () => {
    expect(computeAnomalyPct(50, 50)).toBe(0);
  });

  it("is negative when the price is below average", () => {
    expect(computeAnomalyPct(30, 40)).toBeCloseTo(-25, 5);
  });

  it("treats a zero or missing average as no anomaly (avoids divide-by-zero)", () => {
    expect(computeAnomalyPct(100, 0)).toBe(0);
  });
});

describe("detectCadence", () => {
  it("returns null with fewer than 5 purchases", () => {
    expect(detectCadence(["2026-01-01", "2026-01-05", "2026-01-09", "2026-01-13"])).toBeNull();
  });

  it("detects a consistent ~4-day cadence", () => {
    const dates = ["2026-01-01", "2026-01-05", "2026-01-09", "2026-01-13", "2026-01-17"];
    const result = detectCadence(dates);
    expect(result).not.toBeNull();
    expect(result!.avgIntervalDays).toBeCloseTo(4, 5);
    expect(result!.isConsistent).toBe(true);
  });

  it("flags an irregular buying pattern as not consistent", () => {
    const dates = ["2026-01-01", "2026-01-03", "2026-01-20", "2026-01-22", "2026-02-15"];
    const result = detectCadence(dates);
    expect(result!.isConsistent).toBe(false);
  });

  it("tolerates variation within +-2 days as still consistent", () => {
    const dates = ["2026-01-01", "2026-01-06", "2026-01-09", "2026-01-14", "2026-01-17"];
    const result = detectCadence(dates);
    expect(result!.isConsistent).toBe(true);
  });
});

describe("shouldNotifyOutbound", () => {
  it("pushes low_stock and payment_overdue outbound", () => {
    expect(shouldNotifyOutbound("low_stock")).toBe(true);
    expect(shouldNotifyOutbound("payment_overdue")).toBe(true);
  });

  it("keeps price_anomaly and reorder_reminder dashboard-only", () => {
    expect(shouldNotifyOutbound("price_anomaly")).toBe(false);
    expect(shouldNotifyOutbound("reorder_reminder")).toBe(false);
  });
});
