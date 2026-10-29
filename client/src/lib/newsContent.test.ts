import { describe, expect, it } from "vitest";
import { mapNewsArticle, mapNewsPosts } from "./newsContent";

describe("backend-backed news content", () => {
  it("returns no articles when the backend has no published posts", () => {
    expect(mapNewsPosts(undefined)).toEqual([]);
    expect(mapNewsPosts([])).toEqual([]);
    expect(mapNewsArticle(undefined)).toBeNull();
  });

  it("maps only the supplied published backend content", () => {
    const post = { slug: "real-guide", title: "Backend guide", excerpt: "Backend-authored excerpt", content: "First paragraph.\n\nSecond paragraph." };
    expect(mapNewsPosts([post])).toEqual([{ slug: "real-guide", tag: "Olucha guide", title: "Backend guide", body: "Backend-authored excerpt" }]);
    expect(mapNewsArticle(post)).toEqual({ slug: "real-guide", tag: "Olucha guide", title: "Backend guide", body: "Backend-authored excerpt", paragraphs: ["First paragraph.", "Second paragraph."] });
  });
});
