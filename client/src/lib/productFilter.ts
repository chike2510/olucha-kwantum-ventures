import { productCategoryMatchesFilter } from "@shared/productCategories";

export type FilterableProduct = {
  name: string;
  category: string;
  description?: string;
  spec?: string;
};

export function filterProducts<T extends FilterableProduct>(products: T[], category: string, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  return products.filter((product) => {
    const categoryMatch = productCategoryMatchesFilter(product.category, category);
    const searchableText = `${product.name} ${product.category} ${product.description ?? product.spec ?? ""}`.toLowerCase();
    const queryMatch = !normalizedQuery || searchableText.includes(normalizedQuery);
    return categoryMatch && queryMatch;
  });
}
