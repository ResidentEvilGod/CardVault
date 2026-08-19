import { trpc } from "@/lib/trpc";
import { useAuth as useClerkAuth, useClerk } from "@clerk/clerk-react";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const { isLoaded: clerkLoaded, isSignedIn } = useClerkAuth();
  const { signOut, openSignIn } = useClerk();
  const utils = trpc.useUtils();

  // Only ask our backend "who am I" (which returns the app's own user row,
  // including role) once Clerk itself has confirmed a session exists.
  // Without this gate, `auth.me` would fire and 401 before Clerk finishes
  // loading, which would incorrectly trigger main.tsx's redirect-to-login
  // handler on every page load.
  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: clerkLoaded && isSignedIn,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logout = useCallback(async () => {
    // Clerk owns the actual session now — signOut() clears it. The old
    // trpc.auth.logout mutation only clears a legacy cookie Clerk doesn't
    // use, so it's no longer part of the real sign-out path (see
    // server/routers.ts, left in place harmlessly to keep its test green).
    await signOut();
    utils.auth.me.setData(undefined, null);
    await utils.auth.me.invalidate();
  }, [signOut, utils]);

  const state = useMemo(
    () => ({
      user: meQuery.data ?? null,
      loading: !clerkLoaded || (Boolean(isSignedIn) && meQuery.isLoading),
      error: meQuery.error ?? null,
      isAuthenticated: Boolean(isSignedIn && meQuery.data),
    }),
    [clerkLoaded, isSignedIn, meQuery.data, meQuery.error, meQuery.isLoading]
  );

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (!clerkLoaded) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (redirectPath && window.location.pathname === redirectPath) return;

    if (redirectPath) {
      window.location.href = redirectPath;
    } else {
      openSignIn();
    }
  }, [redirectOnUnauthenticated, redirectPath, clerkLoaded, state.user, openSignIn]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}