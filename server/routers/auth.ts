import { COOKIE_NAME } from "../../shared/const.js";
import { getSessionCookieOptions } from "../_core/cookies.js";
import { publicProcedure, router } from "../_core/trpc.js";

export const authRouter = router({
  me: publicProcedure.query(({ ctx }) => ctx.user),
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    const response = ctx.res as any;
    if (typeof response.clearCookie === "function") response.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    else response.cookie(COOKIE_NAME, "", { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),
});
