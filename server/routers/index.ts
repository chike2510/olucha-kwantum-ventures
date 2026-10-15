import { systemRouter } from "../_core/systemRouter.js";
import { router } from "../_core/trpc.js";
import { adminRouter } from "./admin.js";
import { authRouter } from "./auth.js";
import { newsRouter } from "./blog.js";
import { catalogueRouter } from "./catalogue.js";
import { contactRouter, inquiriesRouter } from "./contact.js";
import { accountRouter } from "./orders.js";
import { paymentsRouter } from "./payments.js";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  catalogue: catalogueRouter,
  news: newsRouter,
  inquiries: inquiriesRouter,
  contact: contactRouter,
  payments: paymentsRouter,
  admin: adminRouter,
  account: accountRouter,
});

export type AppRouter = typeof appRouter;
