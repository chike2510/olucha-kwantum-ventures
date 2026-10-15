import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ENV } from "../_core/env.js";
import { getCheckoutRequestOrigin } from "../_core/requestOrigin.js";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc.js";
import { initializePaymentCheckout, isPaystackTestKey } from "../payments/index.js";

const paymentCheckoutInput = z.object({
  customerName: z.string().trim().min(2).max(160),
  customerEmail: z.string().trim().email().max(320),
  customerPhone: z.string().trim().min(7).max(50),
  deliveryCountry: z.string().trim().min(2).max(100),
  deliveryAddress: z.string().trim().min(8).max(2000),
  coupon: z.string().trim().max(40).optional(),
  items: z.array(z.object({
    slug: z.string().regex(/^[a-z0-9-]{1,200}$/),
    quantity: z.number().int().min(1).max(99),
    variant: z.object({
      size: z.string().trim().max(80).optional(),
      color: z.string().trim().max(80).optional(),
    }).optional(),
  })).min(1).max(20),
});

const safeCheckoutMessages = new Set([
  "Online payment is not available right now. Please try again later.",
  "Sign in to continue to secure checkout.",
  "The checkout host is not configured.",
  "Your cart could not be checked. Please review it and try again.",
  "One or more products are unavailable. Please refresh your cart.",
  "A cart quantity is invalid.",
  "One or more products cannot be purchased in this checkout.",
  "The cart total is invalid.",
  "The cart total is outside the supported range.",
  "Payment could not be started. No order was created; please try again.",
]);

export const paymentsRouter = router({
  /** Only a boolean leaves the server: whether the configured Paystack key is a test key. Never the key itself. */
  mode: publicProcedure.query(() => ({ testMode: isPaystackTestKey(ENV.paystackSecretKey || "") })),
  initialize: protectedProcedure.input(paymentCheckoutInput).mutation(async ({ ctx, input }) => {
    const request = ctx.req as unknown as {
      get?: (name: string) => string | undefined;
      protocol?: string;
    };
    const origin = getCheckoutRequestOrigin(request);
    try {
      return await initializePaymentCheckout(input, ctx.user.id, origin, ENV.paystackSecretKey);
    } catch (error) {
      const message = error instanceof Error && safeCheckoutMessages.has(error.message)
        ? error.message
        : "Secure checkout is temporarily unavailable. Please try again later.";
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
    }
  }),
});
