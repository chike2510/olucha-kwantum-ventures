const ORDER_LABELS: Record<string, string> = {
  pending: "Awaiting payment",
  paid: "Payment received",
  processing: "Preparing your order",
  shipped: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function orderStatusLabel(status: string): string {
  return ORDER_LABELS[status] ?? readableStatus(status);
}

export function readableStatus(status: string): string {
  const words = status.replace(/[_-]+/g, " ").trim();
  if (!words) return "Awaiting an update";
  const text = words === words.toUpperCase() ? words.toLowerCase() : words;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
