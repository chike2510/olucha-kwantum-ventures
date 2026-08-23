export type PaginationResult<T> = {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
};

export function paginate<T>(items: T[], page: number, pageSize: number): PaginationResult<T> {
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const pageCount = Math.max(1, Math.ceil(items.length / safePageSize));
  const safePage = Math.min(Math.max(1, Math.floor(page)), pageCount);
  const start = (safePage - 1) * safePageSize;
  return { items: items.slice(start, start + safePageSize), page: safePage, pageCount, total: items.length, pageSize: safePageSize };
}

export function pageRange(page: number, pageCount: number) {
  const safePageCount = Math.max(1, Math.floor(pageCount));
  const safePage = Math.min(Math.max(1, Math.floor(page)), safePageCount);
  const pages = new Set([1, safePageCount, safePage - 1, safePage, safePage + 1].filter((value) => value >= 1 && value <= safePageCount));
  return Array.from(pages).sort((a, b) => a - b);
}
