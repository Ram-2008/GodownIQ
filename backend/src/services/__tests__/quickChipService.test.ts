import { describe, expect, it } from "vitest";
import { median, mode, scoreRecencyWeighted } from "../quickChipService";

describe("median", () => {
  it("returns the middle value for an odd-length list", () => {
    expect(median([5, 1, 3])).toBe(3);
  });

  it("averages the two middle values for an even-length list", () => {
    expect(median([10, 20, 30, 40])).toBe(25);
  });

  it("handles a single value", () => {
    expect(median([7])).toBe(7);
  });
});

describe("mode", () => {
  it("returns the most frequent value", () => {
    expect(mode(["kg", "kg", "bags"])).toBe("kg");
  });

  it("returns the first value on a tie", () => {
    expect(mode(["kg", "bags"])).toBe("kg");
  });
});

describe("scoreRecencyWeighted", () => {
  it("weights last-7-day purchases 3x over the 30-day count", () => {
    expect(scoreRecencyWeighted(2, 5)).toBe(2 * 3 + 5);
  });

  it("is zero when there is no history", () => {
    expect(scoreRecencyWeighted(0, 0)).toBe(0);
  });

  it("ranks a frequently-bought-recently item above a rarely-bought-recently one", () => {
    const riceScore = scoreRecencyWeighted(4, 10); // bought often, recently
    const dieselScore = scoreRecencyWeighted(0, 10); // bought equally often overall, but not recently
    expect(riceScore).toBeGreaterThan(dieselScore);
  });
});
