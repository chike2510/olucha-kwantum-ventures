import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { canManuallyTransition, ORDER_STATUSES } from "../../shared/orderStatus.js";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc.js";
import { getOrderById, listAllOrdersWithItems, listOrdersForUser, updateOrderStatusFrom } from "../db.js";

const orderStatusInput = z.object({
  id: z.number().int().positive(),
  status: z.enum(ORDER_STATUSES),
});

/** Signed-in customer procedures (profile and own orders). */
export const accountRouter = router({
  me: protectedProcedure.query(({ ctx }) => ctx.user),
  orders: protectedProcedure.query(({ ctx }) => listOrdersForUser(ctx.user.id)),
});

/** Admin order procedures, merged into the admin router. */
export const adminOrderProcedures = {
  orders: adminProcedure.query(() => listAllOrdersWithItems()),
  updateOrderStatus: adminProcedure.input(orderStatusInput).mutation(async ({ input }) => {
    if (input.status === "paid") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Orders are marked paid only by verified Paystack payments." });
    }
    if (input.status === "pending") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Orders cannot be moved back to pending." });
    }
    const order = await getOrderById(input.id);
    if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
    if (!canManuallyTransition(order.status, input.status)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: order.status === "pending"
          ? "Unpaid orders can only be cancelled."
          : `An order that is ${order.status} cannot be moved to ${input.status}.`,
      });
    }
    const result = await updateOrderStatusFrom(order.id, order.status, input.status);
    if (!result.success) throw new TRPCError({ code: "CONFLICT", message: "This order changed while you were editing it. Refresh and try again." });
    return { success: true, status: input.status };
  }),
};
