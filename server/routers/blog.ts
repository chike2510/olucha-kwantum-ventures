import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc.js";
import { getPublishedBlogPost, listPublishedBlogPosts } from "../db.js";

/** Public blog ("news") procedures. Admin blog management lives in the admin router. */
export const newsRouter = router({
  list: publicProcedure.query(() => listPublishedBlogPosts()),
  bySlug: publicProcedure.input(z.object({ slug: z.string() })).query(({ input }) => getPublishedBlogPost(input.slug)),
});

export const blogPostInput = z.object({
  title: z.string().min(4).max(220),
  slug: z.string().regex(/^[a-z0-9-]+$/).max(240),
  excerpt: z.string().min(10),
  content: z.string().min(20),
  status: z.enum(["draft", "published"]).default("draft"),
});
export const blogPostUpdateInput = blogPostInput.partial().extend({ id: z.number().int().positive() });
