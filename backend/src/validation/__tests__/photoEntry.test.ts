import { describe, expect, it } from "vitest";
import { normalizePhotoParseResult, normalizeUnit } from "../photoEntry";

describe("normalizeUnit", () => {
  it("passes through exact matches", () => {
    expect(normalizeUnit("kg")).toBe("kg");
    expect(normalizeUnit("bags")).toBe("bags");
  });

  it("maps common synonyms to the canonical unit", () => {
    expect(normalizeUnit("pcs")).toBe("pieces");
    expect(normalizeUnit("Ltr")).toBe("litre");
    expect(normalizeUnit("KGS")).toBe("kg");
    expect(normalizeUnit("qtl")).toBe("quintal");
  });

  it("falls back to kg for null, missing, or unrecognized units", () => {
    expect(normalizeUnit(null)).toBe("kg");
    expect(normalizeUnit(undefined)).toBe("kg");
    expect(normalizeUnit("crates")).toBe("kg");
  });
});

describe("normalizePhotoParseResult", () => {
  it("computes a missing total from quantity and unit_price", () => {
    const result = normalizePhotoParseResult({
      supplier_name: "Sharma Traders",
      invoice_number: null,
      date: null,
      gst_amount: null,
      line_items: [{ item: "Rice", quantity: 10, unit: "kg", unit_price: 44, total: null }],
    });
    expect(result.line_items[0].total).toBe(440);
  });

  it("computes a missing unit_price from quantity and total", () => {
    const result = normalizePhotoParseResult({
      line_items: [{ item: "Sugar", quantity: 5, unit: "kg", unit_price: null, total: 250 }],
    });
    expect(result.line_items[0].unit_price).toBe(50);
  });
});
