import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { babies, householdMembers, type MemberRole } from "@/db/schema";
import { getSessionUser } from "@/lib/authz";

export const ACTIVE_HOUSEHOLD_COOKIE = "nestling.householdId";
export const ACTIVE_BABY_COOKIE = "nestling.babyId";

export type AppContext = {
  user: { id: string; name?: string | null; email?: string | null; image?: string | null };
  households: { id: string; name: string; role: MemberRole }[];
  activeHousehold: { id: string; name: string; role: MemberRole } | null;
  babies: (typeof babies.$inferSelect)[];
  activeBaby: typeof babies.$inferSelect | null;
  role: MemberRole | null;
};

/**
 * Resolves the full app context for the signed-in user: their households, the
 * active household (from cookie or first), its babies, and the active baby.
 * Returns null when not signed in. `activeHousehold` is null when the user has
 * no household yet (→ onboarding).
 */
export const getAppContext = cache(async function getAppContext(): Promise<AppContext | null> {
  const user = await getSessionUser();
  if (!user?.id) return null;

  const memberships = await db.query.householdMembers.findMany({
    where: eq(householdMembers.userId, user.id),
    with: { household: true },
    orderBy: (m, { asc }) => asc(m.createdAt),
  });

  const households = memberships.map((m) => ({
    id: m.householdId,
    name: m.household.name,
    role: m.role,
  }));

  if (households.length === 0) {
    return {
      user,
      households,
      activeHousehold: null,
      babies: [],
      activeBaby: null,
      role: null,
    };
  }

  const cookieStore = await cookies();
  const wantHousehold = cookieStore.get(ACTIVE_HOUSEHOLD_COOKIE)?.value;
  const activeHousehold =
    households.find((h) => h.id === wantHousehold) ?? households[0];

  const babyRows = await db.query.babies.findMany({
    where: eq(babies.householdId, activeHousehold.id),
    orderBy: (b, { asc }) => asc(b.createdAt),
  });

  const wantBaby = cookieStore.get(ACTIVE_BABY_COOKIE)?.value;
  const activeBaby =
    babyRows.find((b) => b.id === wantBaby) ?? babyRows[0] ?? null;

  return {
    user,
    households,
    activeHousehold,
    babies: babyRows,
    activeBaby,
    role: activeHousehold.role,
  };
});

/** Convenience: ensure a member with at least the given role for a baby. */
export async function babyBelongsToUser(babyId: string, userId: string) {
  const baby = await db.query.babies.findFirst({ where: eq(babies.id, babyId) });
  if (!baby) return null;
  const membership = await db.query.householdMembers.findFirst({
    where: and(
      eq(householdMembers.userId, userId),
      eq(householdMembers.householdId, baby.householdId)
    ),
  });
  return membership ? { baby, membership } : null;
}
