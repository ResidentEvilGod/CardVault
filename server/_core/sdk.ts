import { clerkClient, getAuth } from "@clerk/express";
import { ForbiddenError } from "@shared/_core/errors";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";

/**
 * Verifies the request's Clerk session (populated by the `clerkMiddleware()`
 * mounted in index.ts) and returns our own internal User row, creating it
 * on first sign-in. Clerk's own user id is stored in the existing `openId`
 * column so the rest of the app (which keys everything off ctx.user.id)
 * didn't need to change.
 *
 * Replaces the old Manus-specific SDKServer. Keeps the same
 * `authenticateRequest(req)` signature so callers (context.ts,
 * storageProxy.ts) don't need edits.
 */
class SDKServer {
  async authenticateRequest(req: Request): Promise<User> {
    const { userId } = getAuth(req);

    if (!userId) {
      throw ForbiddenError("Not signed in");
    }

    const signedInAt = new Date();
    let user = await db.getUserByOpenId(userId);

    if (!user) {
      try {
        const clerkUser = await clerkClient.users.getUser(userId);
        await db.upsertUser({
          openId: userId,
          name:
            [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
            clerkUser.username ||
            null,
          email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
          loginMethod: clerkUser.primaryEmailAddress ? "email" : (clerkUser.externalAccounts[0]?.provider ?? null),
          lastSignedIn: signedInAt,
        });
        user = await db.getUserByOpenId(userId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from Clerk:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }

    if (!user) {
      throw ForbiddenError("User not found");
    }

    await db.upsertUser({ openId: user.openId, lastSignedIn: signedInAt });

    return user;
  }
}

export const sdk = new SDKServer();
