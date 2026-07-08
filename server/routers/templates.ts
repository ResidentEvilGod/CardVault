import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createListingTemplate,
  deleteListingTemplate,
  getListingTemplates,
  updateListingTemplate,
} from "../db";

export const templatesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getListingTemplates(ctx.user.id);
  }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(128),
      shippingDetails: z.string().optional(),
      descriptionSnippet: z.string().optional(),
      returnPolicy: z.string().optional(),
      paymentDetails: z.string().optional(),
      isDefault: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      await createListingTemplate({ ...input, userId: ctx.user.id });
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(128).optional(),
      shippingDetails: z.string().optional(),
      descriptionSnippet: z.string().optional(),
      returnPolicy: z.string().optional(),
      paymentDetails: z.string().optional(),
      isDefault: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await updateListingTemplate(id, ctx.user.id, data);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteListingTemplate(input.id, ctx.user.id);
      return { success: true };
    }),
});
