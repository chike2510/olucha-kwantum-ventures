export const FASHION_CATEGORY = "Fashion" as const;

/** The original three Fashion child collections. */
export const FASHION_SUBCATEGORIES = [
  "Men's Fashion",
  "Women's Fashion",
  "Children's Fashion",
] as const;

/** Additional shopper categories shown alongside the Fashion collection. */
export const ADDITIONAL_FASHION_CATEGORIES = [
  "Shoes & Footwear",
  "Bags & Luggage",
  "Watches & Jewellery",
  "Fashion Accessories",
  "Sportswear",
  "Traditional Fashion",
  "Underwear & Nightwear",
] as const;

/** Parent collections shown on the storefront category cards. */
export const PRODUCT_CATEGORIES = ["Electronics", FASHION_CATEGORY, "Agro Products"] as const;

/** Valid category values for products, in display order. */
export const PRODUCT_CATEGORY_OPTIONS = [
  "Electronics",
  FASHION_CATEGORY,
  ...FASHION_SUBCATEGORIES,
  ...ADDITIONAL_FASHION_CATEGORIES,
  "Agro Products",
] as const;

/** Storefront filters include every product category plus the Fashion parent. */
export const STORE_CATEGORY_FILTERS = ["All products", ...PRODUCT_CATEGORY_OPTIONS] as const;

/**
 * Return category values included by a selected collection. Fashion is a parent
 * collection; its legacy/general products and original three child categories belong to it.
 */
export function getProductCategoryFilterValues(category: string): readonly string[] {
  return category === FASHION_CATEGORY
    ? [FASHION_CATEGORY, ...FASHION_SUBCATEGORIES]
    : [category];
}

export function productCategoryMatchesFilter(productCategory: string, selectedCategory: string): boolean {
  return selectedCategory === "All products" || getProductCategoryFilterValues(selectedCategory).includes(productCategory);
}
