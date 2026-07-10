import { describe, expect, it } from "vitest";
import { buildConfirmationReply, buildTwiml, stripWhatsappPrefix } from "../twilioService";
import { PurchaseWithNames } from "../purchaseService";

function fakePurchase(overrides: Partial<PurchaseWithNames> = {}): PurchaseWithNames {
  return {
    id: "p1",
    item_id: "i1",
    item_name: "Rice",
    quantity: 50,
    unit: "kg",
    unit_price: 44,
    total_amount: 2200,
    purchase_date: "2026-07-09",
    supplier_id: "s1",
    supplier_name: "Sharma Traders",
    invoice_number: null,
    gst_amount: null,
    payment_status: "paid",
    payment_due_date: null,
    note: null,
    entry_source: "whatsapp",
    created_by: "u1",
    created_at: "2026-07-09T00:00:00.000Z",
    updated_at: "2026-07-09T00:00:00.000Z",
    deleted_at: null,
    ...overrides,
  };
}

describe("stripWhatsappPrefix", () => {
  it("removes the whatsapp: prefix", () => {
    expect(stripWhatsappPrefix("whatsapp:+919876543210")).toBe("+919876543210");
  });

  it("is case-insensitive on the prefix", () => {
    expect(stripWhatsappPrefix("WhatsApp:+919876543210")).toBe("+919876543210");
  });

  it("leaves a bare number unchanged", () => {
    expect(stripWhatsappPrefix("+919876543210")).toBe("+919876543210");
  });
});

describe("buildConfirmationReply", () => {
  it("matches the spec's worked example shape", () => {
    const reply = buildConfirmationReply(fakePurchase());
    expect(reply).toBe("Logged: 50kg Rice @ ₹44 = ₹2,200 from Sharma Traders ✓");
  });

  it("omits the supplier clause when there is no supplier", () => {
    const reply = buildConfirmationReply(fakePurchase({ supplier_name: null }));
    expect(reply).toBe("Logged: 50kg Rice @ ₹44 = ₹2,200 ✓");
  });

  it("shows two decimals for non-integer amounts", () => {
    const reply = buildConfirmationReply(fakePurchase({ unit_price: 44.5, total_amount: 2225.5 }));
    expect(reply).toContain("₹44.50");
    expect(reply).toContain("₹2,225.50");
  });
});

describe("buildTwiml", () => {
  it("wraps the message in a MessagingResponse XML document", () => {
    const xml = buildTwiml("hello world");
    expect(xml).toContain("<Message>hello world</Message>");
    expect(xml).toContain("<Response>");
  });
});
