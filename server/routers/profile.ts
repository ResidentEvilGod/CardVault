import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { updateUser } from "../db";

export const profileRouter = router({
  update: protectedProcedure
    .input(z.object({
      name: z.string().optional(),
      notifyHighValue: z.boolean().optional(),
      ebayUsername: z.string().optional(),
      tcgplayerUsername: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await updateUser(ctx.user.id, input);
      return { success: true };
    }),
});
