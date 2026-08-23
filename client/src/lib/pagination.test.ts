import { describe, expect, it } from "vitest";
import { pageRange, paginate } from "./pagination";

describe("paginate", () => {
  const items = ["one", "two", "three", "four", "five"];

  it("returns the requested slice and page metadata", () => {
    expect(paginate(items, 2, 2)).toEqual({ items: ["three", "four"], page: 2, pageCount: 3, total: 5, pageSize: 2 });
  });

  it("clamps invalid pages and handles empty lists", () => {
    expect(paginate(items, 99, 2).page).toBe(3);
    expect(paginate(items, 0, 2).page).toBe(1);
    expect(paginate([], 4, 6)).toEqual({ items: [], page: 1, pageCount: 1, total: 0, pageSize: 6 });
  });
});

describe("pageRange", () => {
  it("keeps the first, current, and last pages visible without duplicates", () => {
    expect(pageRange(5, 8)).toEqual([1, 4, 5, 6, 8]);
    expect(pageRange(1, 3)).toEqual([1, 2, 3]);
  });
});
