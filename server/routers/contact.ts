import { z } from "zod";
import { adminProcedure, publicProcedure, router } from "../_core/trpc.js";
import { createContactMessage, createExportInquiry, listExportInquiries } from "../db.js";

const inquiryInput = z.object({
  fullName: z.string().min(2).max(160),
  email: z.string().email(),
  phone: z.string().max(50).optional(),
  productInterest: z.string().min(2).max(180),
  quantity: z.string().max(120).optional(),
  destinationCountry: z.string().min(2).max(100),
  message: z.string().max(5000).optional(),
});

export const inquiriesRouter = router({
  create: publicProcedure.input(inquiryInput).mutation(({ input }) => createExportInquiry(input)),
  adminList: adminProcedure.query(() => listExportInquiries()),
});

export const contactRouter = router({
  create: publicProcedure.input(z.object({
    fullName: z.string().min(2).max(160),
    email: z.string().email(),
    message: z.string().min(2).max(5000),
  })).mutation(({ input }) => createContactMessage(input)),
});
