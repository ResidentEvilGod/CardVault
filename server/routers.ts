import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { adminRouter } from "./routers/admin";
import { binderRouter } from "./routers/binder";
import { cardsRouter } from "./routers/cards";
import { creditsRouter } from "./routers/credits";
import { profileRouter } from "./routers/profile";
import { sellRouter } from "./routers/sell";
import { stripeRouter } from "./routers/stripe";
import { templatesRouter } from "./routers/templates";
import { xrplRouter } from "./routers/xrpl";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  cards: cardsRouter,
  binder: binderRouter,
  credits: creditsRouter,
  sell: sellRouter,
  templates: templatesRouter,
  admin: adminRouter,
  profile: profileRouter,
  stripe: stripeRouter,
  xrpl: xrplRouter,
});

export type AppRouter = typeof appRouter;
