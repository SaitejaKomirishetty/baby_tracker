import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config. Contains NO database or Node-only code so it can be
 * imported by the middleware (which runs on the edge runtime). The full config
 * in `auth.ts` spreads this and adds the Drizzle adapter + credentials provider.
 */
export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  // Providers that touch the DB / bcrypt are added in auth.ts. Keeping this empty
  // keeps the middleware bundle edge-compatible.
  providers: [],
  session: { strategy: "jwt" },
  callbacks: {
    // Used by the middleware wrapper to gate protected routes.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      // Pages reachable while signed out.
      const isAuthPage =
        pathname.startsWith("/login") || pathname.startsWith("/register");
      // /join is public (invitees may not have logged in yet) but is also
      // useful while signed in, so we never bounce logged-in users away.
      const isPublic = isAuthPage || pathname.startsWith("/join");

      if (isAuthPage && isLoggedIn) {
        // Don't show login/register to already-authenticated users.
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      if (isPublic) return true;

      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
