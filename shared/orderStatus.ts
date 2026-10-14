export const ORDER_STATUSES = ["pending", "paid", "processing", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Manual (admin) order status transitions.
 * "paid" is only ever set by verified Paystack payment handling, never by hand.
 * Fulfilment moves forward one step at a time: paid → processing → shipped → delivered.
 * Any order that has not been delivered may be cancelled.
 */
const MANUAL_NEXT: Record<OrderStatus, OrderStatus[]> = {
  pending: ["cancelled"],
  paid: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export function allowedManualTransitions(current: OrderStatus): OrderStatus[] {
  return MANUAL_NEXT[current] ?? [];
}

export function canManuallyTransition(from: OrderStatus, to: OrderStatus): boolean {
  return allowedManualTransitions(from).includes(to);
}
