export const FASHION_CATEGORY = "Fashion" as const;

export const FASHION_SUBCATEGORIES = [
  "Men's Fashion",
  "Women's Fashion",
  "Children's Fashion",
] as const;

/** Parent collections shown on the storefront category cards. */
export const PRODUCT_CATEGORIES = ["Electronics", FASHION_CATEGORY, "Agro Products"] as const;

/** Valid category values for products, in display order. */
export const PRODUCT_CATEGORY_OPTIONS = [
  "Electronics",
  FASHION_CATEGORY,
  ...FASHION_SUBCATEGORIES,
  "Agro Products",
] as const;

/** Storefront filters include the Fashion parent and its selectable children. */
export const STORE_CATEGORY_FILTERS = ["All products", ...PRODUCT_CATEGORY_OPTIONS] as const;

/**
 * Return category values included by a selected collection. Fashion is a parent
 * collection; its legacy/general products and all child categories belong to it.
 */
export function getProductCategoryFilterValues(category: string): readonly string[] {
  return category === FASHION_CATEGORY
    ? [FASHION_CATEGORY, ...FASHION_SUBCATEGORIES]
    : [category];
}

export function productCategoryMatchesFilter(productCategory: string, selectedCategory: string): boolean {
  return selectedCategory === "All products" || getProductCategoryFilterValues(selectedCategory).includes(productCategory);
}
