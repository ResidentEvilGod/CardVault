export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Clerk (replaces Manus OAuth). Get these from dashboard.clerk.com -> API Keys.
  clerkSecretKey: process.env.CLERK_SECRET_KEY ?? "",
  clerkPublishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY ?? "",
  // Shared secret the price-update cron caller must send in an
  // `x-cron-secret` header. Generate any long random string yourself
  // (e.g. `openssl rand -hex 32`) and set the same value on whatever
  // triggers /api/scheduled/price-update (Vercel Cron, GitHub Actions, etc).
  cronSecret: process.env.CRON_SECRET ?? "",
};
