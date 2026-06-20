import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge-safe NextAuth instance (no DB / bcrypt) used purely for route gating.
// Next.js 16 renamed the "middleware" convention to "proxy".
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // Protect everything except Next internals, the auth API, static assets,
  // and PWA files. The `authorized` callback in auth.config handles the rest.
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
