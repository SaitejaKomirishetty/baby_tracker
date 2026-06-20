"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { households, householdMembers, invites } from "@/db/schema";
import {
  AuthError,
  requireUserId,
  requireHouseholdMember,
} from "@/lib/authz";
import {
  ACTIVE_BABY_COOKIE,
  ACTIVE_HOUSEHOLD_COOKIE,
} from "@/lib/context";
import {
  createHouseholdSchema,
  inviteSchema,
  joinHouseholdSchema,
  updateMemberRoleSchema,
} from "@/lib/validators";
import { generateInviteCode } from "@/lib/utils";

const COOKIE_OPTS = {
  httpOnly: false,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};

export type ActionResult =
  | { ok: true; message?: string; data?: Record<string, unknown> }
  | { ok: false; error: string };

function errMessage(e: unknown) {
  return e instanceof AuthError
    ? e.message
    : e instanceof Error
      ? e.message
      : "Something went wrong";
}

/* ----------------------------- Active selection ---------------------------- */

export async function setActiveHousehold(householdId: string) {
  await requireHouseholdMember(householdId); // verifies membership
  const jar = await cookies();
  jar.set(ACTIVE_HOUSEHOLD_COOKIE, householdId, COOKIE_OPTS);
  jar.delete(ACTIVE_BABY_COOKIE); // reset baby when switching households
  revalidatePath("/", "layout");
}

export async function setActiveBaby(babyId: string) {
  const jar = await cookies();
  jar.set(ACTIVE_BABY_COOKIE, babyId, COOKIE_OPTS);
  revalidatePath("/", "layout");
}

/* -------------------------------- Households -------------------------------- */

export async function createHousehold(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const parsed = createHouseholdSchema.safeParse({
      name: formData.get("name"),
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message };
    }

    const [household] = await db
      .insert(households)
      .values({ name: parsed.data.name, createdByUserId: userId })
      .returning();

    await db.insert(householdMembers).values({
      householdId: household.id,
      userId,
      role: "owner",
    });

    const jar = await cookies();
    jar.set(ACTIVE_HOUSEHOLD_COOKIE, household.id, COOKIE_OPTS);
  } catch (e) {
    return { ok: false, error: errMessage(e) };
  }
  redirect("/dashboard");
}

/* --------------------------------- Invites --------------------------------- */

export async function createInvite(
  householdId: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { userId } = await requireHouseholdMember(householdId, "owner");
    const parsed = inviteSchema.safeParse({
      role: formData.get("role"),
      email: formData.get("email") ?? "",
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message };
    }

    const code = generateInviteCode();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.insert(invites).values({
      householdId,
      code,
      role: parsed.data.role,
      email: parsed.data.email || null,
      createdByUserId: userId,
      expiresAt,
    });

    revalidatePath("/settings");
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
    return {
      ok: true,
      message: "Invite created",
      data: { code, url: `${base}/join?code=${code}` },
    };
  } catch (e) {
    return { ok: false, error: errMessage(e) };
  }
}

export async function revokeInvite(inviteId: string): Promise<ActionResult> {
  try {
    const invite = await db.query.invites.findFirst({
      where: eq(invites.id, inviteId),
    });
    if (!invite) return { ok: false, error: "Invite not found" };
    await requireHouseholdMember(invite.householdId, "owner");
    await db.delete(invites).where(eq(invites.id, inviteId));
    revalidatePath("/settings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMessage(e) };
  }
}

/**
 * Core invite redemption. Used by both the register flow and the in-app join
 * flow. Validates the code, expiry, and that the user isn't already a member.
 */
export async function acceptInviteByCode(code: string, userId: string) {
  const invite = await db.query.invites.findFirst({
    where: eq(invites.code, code.trim().toUpperCase()),
  });
  if (!invite) throw new AuthError("Invalid invite code");
  if (invite.expiresAt.getTime() < Date.now()) {
    throw new AuthError("This invite has expired");
  }

  const already = await db.query.householdMembers.findFirst({
    where: and(
      eq(householdMembers.householdId, invite.householdId),
      eq(householdMembers.userId, userId)
    ),
  });
  if (!already) {
    await db.insert(householdMembers).values({
      householdId: invite.householdId,
      userId,
      role: invite.role,
    });
  }

  await db
    .update(invites)
    .set({ acceptedByUserId: userId, acceptedAt: new Date() })
    .where(eq(invites.id, invite.id));

  return invite.householdId;
}

export async function joinHousehold(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  let householdId: string;
  try {
    const userId = await requireUserId();
    const parsed = joinHouseholdSchema.safeParse({ code: formData.get("code") });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message };
    }
    householdId = await acceptInviteByCode(parsed.data.code, userId);
    const jar = await cookies();
    jar.set(ACTIVE_HOUSEHOLD_COOKIE, householdId, COOKIE_OPTS);
    jar.delete(ACTIVE_BABY_COOKIE);
  } catch (e) {
    return { ok: false, error: errMessage(e) };
  }
  redirect("/dashboard");
}

/* ------------------------------ Member management --------------------------- */

export async function updateMemberRole(
  householdId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    await requireHouseholdMember(householdId, "owner");
    const parsed = updateMemberRoleSchema.safeParse({
      memberId: formData.get("memberId"),
      role: formData.get("role"),
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message };
    }

    const target = await db.query.householdMembers.findFirst({
      where: eq(householdMembers.id, parsed.data.memberId),
    });
    if (!target || target.householdId !== householdId) {
      return { ok: false, error: "Member not found" };
    }

    // Don't allow demoting the last owner.
    if (target.role === "owner" && parsed.data.role !== "owner") {
      const owners = await db.query.householdMembers.findMany({
        where: and(
          eq(householdMembers.householdId, householdId),
          eq(householdMembers.role, "owner")
        ),
      });
      if (owners.length <= 1) {
        return { ok: false, error: "A household must keep at least one owner" };
      }
    }

    await db
      .update(householdMembers)
      .set({ role: parsed.data.role })
      .where(eq(householdMembers.id, parsed.data.memberId));

    revalidatePath("/settings");
    return { ok: true, message: "Role updated" };
  } catch (e) {
    return { ok: false, error: errMessage(e) };
  }
}

export async function removeMember(
  householdId: string,
  memberId: string
): Promise<ActionResult> {
  try {
    const { userId } = await requireHouseholdMember(householdId, "owner");
    const target = await db.query.householdMembers.findFirst({
      where: eq(householdMembers.id, memberId),
    });
    if (!target || target.householdId !== householdId) {
      return { ok: false, error: "Member not found" };
    }
    if (target.userId === userId) {
      return { ok: false, error: "Use “Leave household” to remove yourself" };
    }
    await db.delete(householdMembers).where(eq(householdMembers.id, memberId));
    revalidatePath("/settings");
    return { ok: true, message: "Member removed" };
  } catch (e) {
    return { ok: false, error: errMessage(e) };
  }
}

export async function leaveHousehold(householdId: string): Promise<ActionResult> {
  try {
    const { userId, membership } = await requireHouseholdMember(householdId);
    if (membership.role === "owner") {
      const owners = await db.query.householdMembers.findMany({
        where: and(
          eq(householdMembers.householdId, householdId),
          eq(householdMembers.role, "owner")
        ),
      });
      if (owners.length <= 1) {
        return {
          ok: false,
          error: "Transfer ownership before leaving (you're the only owner)",
        };
      }
    }
    await db
      .delete(householdMembers)
      .where(
        and(
          eq(householdMembers.householdId, householdId),
          eq(householdMembers.userId, userId)
        )
      );
    const jar = await cookies();
    jar.delete(ACTIVE_HOUSEHOLD_COOKIE);
    jar.delete(ACTIVE_BABY_COOKIE);
  } catch (e) {
    return { ok: false, error: errMessage(e) };
  }
  redirect("/dashboard");
}
