import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  addToBinder,
  getBinderCardById,
  getBinderCards,
  removeFromBinder,
  updateBinderCard,
} from "../db";

export const binderRouter = router({
  // Get all binder cards for user
  list: protectedProcedure.query(async ({ ctx }) => {
    return getBinderCards(ctx.user.id);
  }),

  // Add a card to binder
  add: protectedProcedure
    .input(z.object({
      cardId: z.number(),
      condition: z.enum(["NM", "LP", "MP", "HP", "DMG"]).default("NM"),
      isGraded: z.boolean().default(false),
      gradingCompany: z.string().optional(),
      gradeLevel: z.string().optional(),
      certNumber: z.string().optional(),
      quantity: z.number().min(1).default(1),
      notes: z.string().optional(),
      purchasePrice: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await addToBinder({
        userId: ctx.user.id,
        cardId: input.cardId,
        condition: input.condition,
        isGraded: input.isGraded,
        gradingCompany: input.gradingCompany,
        gradeLevel: input.gradeLevel,
        certNumber: input.certNumber,
        quantity: input.quantity,
        notes: input.notes,
        purchasePrice: input.purchasePrice,
      });
      return result;
    }),

  // Update binder card
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      condition: z.enum(["NM", "LP", "MP", "HP", "DMG"]).optional(),
      isGraded: z.boolean().optional(),
      gradingCompany: z.string().optional(),
      gradeLevel: z.string().optional(),
      certNumber: z.string().optional(),
      quantity: z.number().min(1).optional(),
      notes: z.string().optional(),
      purchasePrice: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await updateBinderCard(id, ctx.user.id, data);
      return { success: true };
    }),

  // Remove from binder
  remove: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await removeFromBinder(input.id, ctx.user.id);
      return { success: true };
    }),

  // Get single binder card
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const result = await getBinderCardById(input.id, ctx.user.id);
      if (!result) throw new TRPCError({ code: "NOT_FOUND" });
      return result;
    }),
});
