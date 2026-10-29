import { describe, expect, it } from "vitest";
import { buildManualHandoffPayload, isManualHandoffEligible, type ManualHandoffOrder } from "./manualHandoff";

const paidOrder: ManualHandoffOrder = {
  id: 42,
  customerName: "Preview Buyer",
  customerEmail: "buyer@example.test",
  customerPhone: "+2348000000000",
  deliveryCountry: "Nigeria",
  deliveryAddress: "Preview-only address",
  totalKobo: 125_000,
  currency: "NGN",
  status: "paid",
  paystackReference: "okv-preview-reference",
  verifiedPaymentAt: new Date("2026-10-26T10:00:00.000Z"),
  createdAt: new Date("2026-10-26T09:55:00.000Z"),
  items: [{ productName: "Preview sample", quantity: 1, unitPriceKobo: 100_000, variant: { color: "Blue" } }],
};

describe("manual CJ handoff drafts", () => {
  it("creates a review-only draft for a server-verified paid order", () => {
    expect(isManualHandoffEligible(paidOrder)).toBe(true);
    expect(buildManualHandoffPayload(paidOrder)).toMatchObject({
      documentType: "manual-cjdropshipping-review-draft",
      previewOnly: true,
      instruction: expect.stringContaining("does not create or submit a CJ order"),
      payment: { status: "paid", verifiedAt: "2026-10-26T10:00:00.000Z" },
      customer: { name: "Preview Buyer", deliveryCountry: "Nigeria" },
      items: [{ productName: "Preview sample", quantity: 1, variant: { color: "Blue" } }],
      internalOrderId: 42,
    });
  });

  it("rejects unpaid or manually marked paid orders that have no verification timestamp", () => {
    const unverified = { ...paidOrder, verifiedPaymentAt: null };
    const notPaid = { ...paidOrder, status: "processing" };
    expect(isManualHandoffEligible(unverified)).toBe(false);
    expect(isManualHandoffEligible(notPaid)).toBe(false);
    expect(() => buildManualHandoffPayload(unverified)).toThrow("Only a server-verified paid order can be prepared for manual review.");
    expect(() => buildManualHandoffPayload(notPaid)).toThrow("Only a server-verified paid order can be prepared for manual review.");
  });
});
