/**
 * Specification rows that are safe to show customers.
 *
 * Admins can store internal flags (e.g. `previewTest: true`, `_sku`, `internalNote`) in a product's
 * specifications JSON. Those are operational data, not product facts, so they are filtered out here
 * and keys are humanised ("countryOfOrigin" → "Country of origin").
 */
const INTERNAL_KEY = /^(_|\$)|preview|test|internal|debug|admin|draft|hidden|flag|sku$|^id$/i;
const BOOLEAN_VALUE = /^(true|false|yes|no|0|1|null|undefined|enabled|disabled|on|off|n\/a)$/i;
/** Values that describe the store's own setup rather than the product (e.g. "Paystack test mode only"). */
const INTERNAL_VALUE = /\btest mode\b|\bsandbox\b|\bpreview\b|\bstaging\b/i;

export function humanizeSpecKey(key: string) {
  const spaced = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function customerSpecs(specs: Record<string, unknown> | null | undefined): Array<[string, string]> {
  if (!specs || typeof specs !== "object") return [];
  const rows: Array<[string, string]> = [];
  for (const [key, raw] of Object.entries(specs)) {
    if (!key.trim() || INTERNAL_KEY.test(key)) continue;
    if (raw === null || raw === undefined || typeof raw === "boolean" || typeof raw === "object") continue;
    const value = String(raw).trim();
    if (!value || BOOLEAN_VALUE.test(value) || INTERNAL_VALUE.test(value)) continue;
    rows.push([humanizeSpecKey(key), value]);
  }
  return rows;
}
