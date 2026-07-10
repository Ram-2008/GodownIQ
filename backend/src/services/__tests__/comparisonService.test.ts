import { describe, expect, it } from "vitest";
import { attributeSpendChange } from "../comparisonService";

describe("attributeSpendChange", () => {
  it("splits a spend increase into quantity and price effects that sum to the total change", () => {
    // 100 units @ ₹10 = ₹1000 last month; 102 units @ ₹11 (~10% pricier) this month = ₹1122
    const result = attributeSpendChange(100, 1000, 102, 1122);
    expect(result.spend_change_pct).toBeCloseTo(12.2, 5);
    expect(result.quantity_effect_pct! + result.price_effect_pct!).toBeCloseTo(result.spend_change_pct!, 5);
    expect(result.quantity_change_pct).toBeCloseTo(2, 5);
  });

  it("attributes a pure price rise entirely to the price effect", () => {
    const result = attributeSpendChange(50, 500, 50, 550);
    expect(result.quantity_effect_pct).toBeCloseTo(0, 5);
    expect(result.price_effect_pct).toBeCloseTo(10, 5);
  });

  it("attributes a pure quantity rise entirely to the quantity effect", () => {
    const result = attributeSpendChange(50, 500, 60, 600);
    expect(result.price_effect_pct).toBeCloseTo(0, 5);
    expect(result.quantity_effect_pct).toBeCloseTo(20, 5);
  });

  it("returns null percentages for a brand-new item with no prior-period spend", () => {
    const result = attributeSpendChange(0, 0, 10, 100);
    expect(result.spend_change_pct).toBeNull();
    expect(result.quantity_change_pct).toBeNull();
    expect(result.quantity_effect_pct).toBeNull();
  });
});
