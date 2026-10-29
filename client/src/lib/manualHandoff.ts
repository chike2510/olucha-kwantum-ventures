export type ManualHandoffOrder = {
  id: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  deliveryCountry: string | null;
  deliveryAddress: string | null;
  totalKobo: number;
  currency: string;
  status: string;
  paystackReference: string | null;
  verifiedPaymentAt: Date | null;
  createdAt: Date;
  items: Array<{
    productName: string;
    quantity: number;
    unitPriceKobo: number;
    variant: { size?: string; color?: string } | null;
  }>;
};

export function isManualHandoffEligible(order: Pick<ManualHandoffOrder, "status" | "verifiedPaymentAt">): boolean {
  return order.status === "paid" && order.verifiedPaymentAt instanceof Date && Number.isFinite(order.verifiedPaymentAt.getTime());
}

export function buildManualHandoffPayload(order: ManualHandoffOrder) {
  const verifiedAt = order.verifiedPaymentAt;
  if (!isManualHandoffEligible(order) || !(verifiedAt instanceof Date)) {
    throw new Error("Only a server-verified paid order can be prepared for manual review.");
  }
  return {
    documentType: "manual-cjdropshipping-review-draft",
    previewOnly: true,
    instruction: "For administrator review only. This file does not create or submit a CJ order and does not authorize a supplier payment.",
    payment: {
      status: order.status,
      verifiedBy: "Paystack server-side transaction verification",
      verifiedAt: verifiedAt.toISOString(),
      reference: order.paystackReference,
      totalKobo: order.totalKobo,
      currency: order.currency,
    },
    customer: {
      name: order.customerName,
      email: order.customerEmail,
      phone: order.customerPhone,
      deliveryCountry: order.deliveryCountry,
      deliveryAddress: order.deliveryAddress,
    },
    items: order.items.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPriceKobo: item.unitPriceKobo,
      variant: item.variant,
    })),
    internalOrderId: order.id,
    orderCreatedAt: order.createdAt.toISOString(),
  };
}
