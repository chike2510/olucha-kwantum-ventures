export type PublishedNewsPost = {
  slug: string;
  title: string;
  excerpt: string;
  content?: string;
};

export type NewsArticleView = {
  slug: string;
  tag: string;
  title: string;
  body: string;
  paragraphs?: string[];
};

export function mapNewsPosts(posts: readonly PublishedNewsPost[] | null | undefined): NewsArticleView[] {
  return (posts ?? []).map((post) => ({
    slug: post.slug,
    tag: "Olucha guide",
    title: post.title,
    body: post.excerpt,
  }));
}

export function mapNewsArticle(post: PublishedNewsPost | null | undefined): NewsArticleView | null {
  if (!post) return null;
  return {
    slug: post.slug,
    tag: "Olucha guide",
    title: post.title,
    body: post.excerpt,
    paragraphs: (post.content ?? "").split(/\n+/).map((paragraph) => paragraph.trim()).filter(Boolean),
  };
}
