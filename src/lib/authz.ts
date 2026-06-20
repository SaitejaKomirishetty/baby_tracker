import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { babies, householdMembers, type MemberRole } from "@/db/schema";

export class AuthError extends Error {
  constructor(message = "Not authorized") {
    super(message);
    this.name = "AuthError";
  }
}

const ROLE_RANK: Record<MemberRole, number> = {
  viewer: 1,
  caregiver: 2,
  owner: 3,
};

export function roleAtLeast(role: MemberRole, min: MemberRole) {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

/** The currently signed-in user id, or throws. */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new AuthError("You must be signed in");
  return session.user.id;
}

export async function getSessionUser() {
  const session = await auth();
  return session?.user ?? null;
}

/** Fetch the user's membership in a household (source of truth: the DB). */
export async function getMembership(userId: string, householdId: string) {
  return db.query.householdMembers.findFirst({
    where: and(
      eq(householdMembers.userId, userId),
      eq(householdMembers.householdId, householdId)
    ),
  });
}

/**
 * Verify the signed-in user belongs to `householdId` with at least `minRole`.
 * Returns { userId, membership }. Throws AuthError otherwise.
 */
export async function requireHouseholdMember(
  householdId: string,
  minRole: MemberRole = "viewer"
) {
  const userId = await requireUserId();
  const membership = await getMembership(userId, householdId);
  if (!membership) throw new AuthError("You are not a member of this household");
  if (!roleAtLeast(membership.role, minRole)) {
    throw new AuthError(`This action requires ${minRole} permissions`);
  }
  return { userId, membership };
}

/**
 * Resolve a baby's household and verify access. Used by every log action so a
 * caregiver can only touch babies in households they belong to.
 */
export async function requireBabyAccess(
  babyId: string,
  minRole: MemberRole = "caregiver"
) {
  const userId = await requireUserId();
  const baby = await db.query.babies.findFirst({
    where: eq(babies.id, babyId),
  });
  if (!baby) throw new AuthError("Baby not found");

  const membership = await getMembership(userId, baby.householdId);
  if (!membership) throw new AuthError("You don't have access to this baby");
  if (!roleAtLeast(membership.role, minRole)) {
    throw new AuthError(`This action requires ${minRole} permissions`);
  }
  return { userId, baby, membership };
}

/** All households the user belongs to, with role + name. */
export async function getUserHouseholds(userId: string) {
  return db.query.householdMembers.findMany({
    where: eq(householdMembers.userId, userId),
    with: { household: true },
    orderBy: (m, { asc }) => asc(m.createdAt),
  });
}
