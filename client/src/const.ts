import type { BrowserClerk } from "@clerk/clerk-react";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

declare global {
  interface Window {
    Clerk?: BrowserClerk;
  }
}

// Opens Clerk's sign-in modal. Call from an event handler, e.g.
// `onClick={() => startLogin()}`. Uses the global Clerk singleton (attached
// to `window` once <ClerkProvider> in main.tsx has loaded) rather than the
// useClerk() hook so it can also be called from non-component code, like the
// tRPC query-cache error subscriber in main.tsx.
export const startLogin = () => {
  window.Clerk?.openSignIn();
};
