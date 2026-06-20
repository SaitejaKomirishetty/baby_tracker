import NextAuth, {
  type DefaultSession,
  type NextAuthConfig,
} from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
  householdMembers,
  type MemberRole,
} from "@/db/schema";
import { authConfig } from "@/auth.config";
import { credentialsSchema } from "@/lib/validators";

export type SessionMembership = {
  householdId: string;
  role: MemberRole;
};

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      memberships: SessionMembership[];
      activeHouseholdId: string | null;
    } & DefaultSession["user"];
  }
}

type AppToken = {
  id?: string;
  memberships?: SessionMembership[];
  activeHouseholdId?: string | null;
} & Record<string, unknown>;

const providers: NextAuthConfig["providers"] = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(raw) {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) return null;

      const { email, password } = parsed.data;
      const user = await db.query.users.findFirst({
        where: eq(users.email, email.toLowerCase()),
      });
      if (!user || !user.passwordHash) return null;

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return null;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      };
    },
  }),
];

// Only register Google if credentials are configured.
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

async function loadMemberships(userId: string): Promise<SessionMembership[]> {
  const rows = await db
    .select({
      householdId: householdMembers.householdId,
      role: householdMembers.role,
    })
    .from(householdMembers)
    .where(eq(householdMembers.userId, userId));
  return rows;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt" },
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      const t = token as AppToken;
      // On sign-in, stamp the user id.
      if (user?.id) {
        t.id = user.id;
      }
      // Refresh memberships on sign-in and whenever the session is updated
      // (e.g. after creating/joining a household).
      if (t.id && (user || trigger === "update" || !t.memberships)) {
        const memberships = await loadMemberships(t.id);
        t.memberships = memberships;
        if (
          !t.activeHouseholdId ||
          !memberships.some((m) => m.householdId === t.activeHouseholdId)
        ) {
          t.activeHouseholdId = memberships[0]?.householdId ?? null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      const t = token as AppToken;
      if (session.user) {
        session.user.id = t.id ?? "";
        session.user.memberships = t.memberships ?? [];
        session.user.activeHouseholdId = t.activeHouseholdId ?? null;
      }
      return session;
    },
  },
});
