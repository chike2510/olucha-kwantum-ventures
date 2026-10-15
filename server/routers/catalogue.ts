import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc.js";
import { getProductBySlug, listProducts } from "../db.js";

export const catalogueRouter = router({
  list: publicProcedure.input(z.object({ search: z.string().optional(), category: z.string().optional() }).optional())
    .query(({ input }) => listProducts(input?.search, input?.category)),
  bySlug: publicProcedure.input(z.object({ slug: z.string() })).query(({ input }) => getProductBySlug(input.slug)),
});
