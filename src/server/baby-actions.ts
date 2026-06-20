"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { babies } from "@/db/schema";
import {
  AuthError,
  requireBabyAccess,
  requireHouseholdMember,
} from "@/lib/authz";
import { ACTIVE_BABY_COOKIE } from "@/lib/context";
import { babySchema } from "@/lib/validators";

export type BabyResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

function fail(e: unknown): BabyResult {
  return {
    ok: false,
    error:
      e instanceof AuthError
        ? e.message
        : e instanceof Error
          ? e.message
          : "Something went wrong",
  };
}

function parseBaby(formData: FormData) {
  return babySchema.safeParse({
    name: formData.get("name"),
    birthDate: formData.get("birthDate"),
    sex: formData.get("sex") || "unspecified",
    birthWeightGrams: formData.get("birthWeightGrams"),
    birthLengthCm: formData.get("birthLengthCm"),
    birthHeadCircumferenceCm: formData.get("birthHeadCircumferenceCm"),
    photoUrl: formData.get("photoUrl") || "",
  });
}

export async function createBaby(
  householdId: string,
  _prev: BabyResult | undefined,
  formData: FormData
): Promise<BabyResult> {
  let newId: string;
  try {
    const { userId } = await requireHouseholdMember(householdId, "owner");
    const parsed = parseBaby(formData);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message };
    }
    const d = parsed.data;
    const [row] = await db
      .insert(babies)
      .values({
        householdId,
        createdByUserId: userId,
        name: d.name,
        birthDate: d.birthDate,
        sex: d.sex,
        birthWeightGrams: d.birthWeightGrams,
        birthLengthCm: d.birthLengthCm,
        birthHeadCircumferenceCm: d.birthHeadCircumferenceCm,
        photoUrl: d.photoUrl || null,
      })
      .returning({ id: babies.id });
    newId = row.id;

    const jar = await cookies();
    jar.set(ACTIVE_BABY_COOKIE, newId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    revalidatePath("/", "layout");
  } catch (e) {
    return fail(e);
  }
  redirect("/dashboard");
}

export async function updateBaby(
  babyId: string,
  _prev: BabyResult | undefined,
  formData: FormData
): Promise<BabyResult> {
  try {
    await requireBabyAccess(babyId, "owner");
    const parsed = parseBaby(formData);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message };
    }
    const d = parsed.data;
    await db
      .update(babies)
      .set({
        name: d.name,
        birthDate: d.birthDate,
        sex: d.sex,
        birthWeightGrams: d.birthWeightGrams,
        birthLengthCm: d.birthLengthCm,
        birthHeadCircumferenceCm: d.birthHeadCircumferenceCm,
        photoUrl: d.photoUrl || null,
      })
      .where(eq(babies.id, babyId));
    revalidatePath("/", "layout");
  } catch (e) {
    return fail(e);
  }
  redirect("/settings");
}

export async function deleteBaby(babyId: string): Promise<BabyResult> {
  try {
    await requireBabyAccess(babyId, "owner");
    await db.delete(babies).where(eq(babies.id, babyId));
    const jar = await cookies();
    jar.delete(ACTIVE_BABY_COOKIE);
    revalidatePath("/", "layout");
  } catch (e) {
    return fail(e);
  }
  redirect("/dashboard");
}
