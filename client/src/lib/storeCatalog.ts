export type StoreProduct = {
  id: number;
  slug: string;
  name: string;
  category: "Electronics" | "Fashion" | "Agro Products";
  price: number;
  unit: string;
  description: string;
  color: string;
  tag: string;
  specs: Record<string, string>;
};

export const storeProducts: StoreProduct[] = [
  { id: 1, slug: "smart-home-essentials", name: "Smart Home Essentials", category: "Electronics", price: 48500, unit: "per set", description: "Reliable everyday devices selected for connected homes and practical daily use.", color: "from-indigo-600 to-cyan-500", tag: "Featured", specs: { use: "Home automation", supply: "Available to order", support: "Product guidance included" } },
  { id: 2, slug: "portable-power-accessories", name: "Portable Power Accessories", category: "Electronics", price: 19800, unit: "per carton", description: "Practical charging and power accessories for home, travel, and small business needs.", color: "from-slate-800 to-cyan-600", tag: "Popular", specs: { use: "Everyday power", pack: "Carton supply", support: "Product guidance included" } },
  { id: 3, slug: "contemporary-unisex-apparel", name: "Contemporary Unisex Apparel", category: "Fashion", price: 32000, unit: "per bundle", description: "Curated styles for personal wardrobes, retail buyers, and growing fashion businesses.", color: "from-rose-700 to-violet-500", tag: "New", specs: { use: "Everyday style", order: "Bundle quantities", support: "Sizing guidance available" } },
  { id: 4, slug: "hand-finished-leather-goods", name: "Hand-finished Leather Goods", category: "Fashion", price: 41000, unit: "per piece", description: "Distinctive accessories selected for modern wardrobes and thoughtful gifting.", color: "from-fuchsia-700 to-violet-500", tag: "Curated", specs: { material: "Leather", order: "Per piece", support: "Product guidance included" } },
  { id: 5, slug: "premium-dried-ginger", name: "Premium Dried Ginger", category: "Agro Products", price: 8900, unit: "per kg", description: "Quality-sourced dried ginger for households, retailers, and food businesses.", color: "from-amber-700 to-orange-400", tag: "Agro", specs: { form: "Dried produce", order: "By kilogram", availability: "Subject to stock" } },
  { id: 6, slug: "shelled-cashew-nuts", name: "Shelled Cashew Nuts", category: "Agro Products", price: 12400, unit: "per kg", description: "Carefully sourced cashew products for local customers and international buyers.", color: "from-emerald-700 to-teal-400", tag: "Agro", specs: { form: "Shelled produce", order: "By kilogram", availability: "Subject to stock" } },
];

export const storeCategories = ["All products", "Electronics", "Fashion", "Agro Products"] as const;

export function formatNaira(value: number) {
  return `₦${value.toLocaleString("en-NG")}`;
}

export function findStoreProduct(slug: string) {
  return storeProducts.find((product) => product.slug === slug);
}
