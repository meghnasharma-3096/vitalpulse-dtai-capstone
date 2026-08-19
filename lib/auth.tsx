"use client";

import { createContext, useContext } from "react";
import type { Role, CurrentUser } from "@/lib/auth-server";

export type { Role, CurrentUser };

// Populated once, server-side, in app/layout.tsx from the session cookie — every
// subsystem reads it through useCurrentUser() below rather than touching cookies
// or role-checking logic directly.
export const CurrentUserContext = createContext<CurrentUser | null>(null);

export function CurrentUserProvider({
  user,
  children,
}: {
  user: CurrentUser | null;
  children: React.ReactNode;
}) {
  return <CurrentUserContext.Provider value={user}>{children}</CurrentUserContext.Provider>;
}

/**
 * The contract every subsystem calls to get the logged-in user.
 * Never build your own auth logic, read cookies directly, or duplicate role checks —
 * call this hook, and let lib/data.ts enforce access server-side.
 */
export function useCurrentUser(): CurrentUser | null {
  return useContext(CurrentUserContext);
}
