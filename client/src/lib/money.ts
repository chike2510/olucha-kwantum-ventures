const whole = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fractional = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Formats a Naira amount consistently across the store and admin: ₦48,500 or ₦10.50 (never ₦10.5 or NGN 10). */
export function formatNairaAmount(naira: number) {
  if (!Number.isFinite(naira)) return "₦0";
  const rounded = Math.round(naira * 100) / 100;
  const formatted = (Number.isInteger(rounded) ? whole : fractional).format(rounded);
  return formatted.replace(/NGN\s?/, "₦");
}
