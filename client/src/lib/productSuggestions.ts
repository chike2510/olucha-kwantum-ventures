export type ProductSearchSuggestion = {
  id: number;
  slug: string;
  name: string;
  category: string;
  price: number;
  imageUrl?: string;
};

/** Return matching products from the supplied catalogue; never synthesize suggestions. */
export function getProductSuggestions<T extends ProductSearchSuggestion>(
  products: readonly T[],
  query: string,
  limit = 6,
): T[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery || limit < 1) return [];

  return products
    .map((product, index) => ({
      product,
      index,
      matchPosition: product.name.toLowerCase().indexOf(normalizedQuery),
    }))
    .filter((match) => match.matchPosition >= 0)
    .sort((first, second) => first.matchPosition - second.matchPosition || first.index - second.index)
    .slice(0, limit)
    .map(({ product }) => product);
}
