"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  feedLogs,
  diaperLogs,
  sleepLogs,
  temperatureLogs,
  growthLogs,
  medicationLogs,
  notes,
} from "@/db/schema";
import { AuthError, requireBabyAccess, roleAtLeast } from "@/lib/authz";
import {
  feedSchema,
  diaperSchema,
  sleepSchema,
  temperatureSchema,
  growthSchema,
  medicationSchema,
  noteSchema,
} from "@/lib/validators";
import type { LogType } from "@/lib/log-meta";

export type LogResult =
  | { ok: true; id?: string; message?: string }
  | { ok: false; error: string };

function fail(e: unknown): LogResult {
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

function revalidateAll() {
  revalidatePath("/dashboard");
  revalidatePath("/log");
  revalidatePath("/analytics");
  revalidatePath("/activity");
}

function parseForm(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

/* ------------------------------- Feed -------------------------------- */

export async function createFeed(
  babyId: string,
  _prev: LogResult | undefined,
  formData: FormData
): Promise<LogResult> {
  try {
    const { userId } = await requireBabyAccess(babyId);
    const parsed = feedSchema.safeParse(parseForm(formData));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const [row] = await db
      .insert(feedLogs)
      .values({ babyId, loggedByUserId: userId, ...parsed.data })
      .returning({ id: feedLogs.id });
    revalidateAll();
    return { ok: true, id: row.id, message: "Feed logged" };
  } catch (e) {
    return fail(e);
  }
}

export async function updateFeed(
  id: string,
  _prev: LogResult | undefined,
  formData: FormData
): Promise<LogResult> {
  try {
    const row = await db.query.feedLogs.findFirst({ where: eq(feedLogs.id, id) });
    if (!row) return { ok: false, error: "Not found" };
    await requireMutate("feed", row.babyId, row.loggedByUserId);
    const parsed = feedSchema.safeParse(parseForm(formData));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    await db.update(feedLogs).set(parsed.data).where(eq(feedLogs.id, id));
    revalidateAll();
    return { ok: true, message: "Feed updated" };
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------ Diaper ------------------------------- */

export async function createDiaper(
  babyId: string,
  _prev: LogResult | undefined,
  formData: FormData
): Promise<LogResult> {
  try {
    const { userId } = await requireBabyAccess(babyId);
    const parsed = diaperSchema.safeParse(parseForm(formData));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const [row] = await db
      .insert(diaperLogs)
      .values({ babyId, loggedByUserId: userId, ...parsed.data })
      .returning({ id: diaperLogs.id });
    revalidateAll();
    return { ok: true, id: row.id, message: "Diaper logged" };
  } catch (e) {
    return fail(e);
  }
}

export async function updateDiaper(
  id: string,
  _prev: LogResult | undefined,
  formData: FormData
): Promise<LogResult> {
  try {
    const row = await db.query.diaperLogs.findFirst({ where: eq(diaperLogs.id, id) });
    if (!row) return { ok: false, error: "Not found" };
    await requireMutate("diaper", row.babyId, row.loggedByUserId);
    const parsed = diaperSchema.safeParse(parseForm(formData));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    await db.update(diaperLogs).set(parsed.data).where(eq(diaperLogs.id, id));
    revalidateAll();
    return { ok: true, message: "Diaper updated" };
  } catch (e) {
    return fail(e);
  }
}

/** One-tap diaper logging from the dashboard. */
export async function quickDiaper(
  babyId: string,
  type: "wet" | "dirty" | "both"
): Promise<LogResult> {
  try {
    const { userId } = await requireBabyAccess(babyId);
    const [row] = await db
      .insert(diaperLogs)
      .values({ babyId, loggedByUserId: userId, type, time: new Date() })
      .returning({ id: diaperLogs.id });
    revalidateAll();
    return { ok: true, id: row.id, message: "Diaper logged" };
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------- Sleep ------------------------------- */

export async function createSleep(
  babyId: string,
  _prev: LogResult | undefined,
  formData: FormData
): Promise<LogResult> {
  try {
    const { userId } = await requireBabyAccess(babyId);
    const parsed = sleepSchema.safeParse(parseForm(formData));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const [row] = await db
      .insert(sleepLogs)
      .values({
        babyId,
        loggedByUserId: userId,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime ?? null,
        note: parsed.data.note,
      })
      .returning({ id: sleepLogs.id });
    revalidateAll();
    return { ok: true, id: row.id, message: "Sleep logged" };
  } catch (e) {
    return fail(e);
  }
}

export async function updateSleep(
  id: string,
  _prev: LogResult | undefined,
  formData: FormData
): Promise<LogResult> {
  try {
    const row = await db.query.sleepLogs.findFirst({ where: eq(sleepLogs.id, id) });
    if (!row) return { ok: false, error: "Not found" };
    await requireMutate("sleep", row.babyId, row.loggedByUserId);
    const parsed = sleepSchema.safeParse(parseForm(formData));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    await db
      .update(sleepLogs)
      .set({
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime ?? null,
        note: parsed.data.note,
      })
      .where(eq(sleepLogs.id, id));
    revalidateAll();
    return { ok: true, message: "Sleep updated" };
  } catch (e) {
    return fail(e);
  }
}

/** Start a sleep session (open-ended) or end the currently-open one. */
export async function toggleSleep(babyId: string): Promise<LogResult> {
  try {
    const { userId } = await requireBabyAccess(babyId);
    const ongoing = await db.query.sleepLogs.findFirst({
      where: and(eq(sleepLogs.babyId, babyId), isNull(sleepLogs.endTime)),
      orderBy: (s, { desc }) => desc(s.startTime),
    });
    if (ongoing) {
      await db
        .update(sleepLogs)
        .set({ endTime: new Date() })
        .where(eq(sleepLogs.id, ongoing.id));
      revalidateAll();
      return { ok: true, message: "Sleep ended" };
    }
    await db
      .insert(sleepLogs)
      .values({ babyId, loggedByUserId: userId, startTime: new Date() });
    revalidateAll();
    return { ok: true, message: "Sleep started" };
  } catch (e) {
    return fail(e);
  }
}

/* ---------------------------- Temperature ---------------------------- */

export async function createTemperature(
  babyId: string,
  _prev: LogResult | undefined,
  formData: FormData
): Promise<LogResult> {
  try {
    const { userId } = await requireBabyAccess(babyId);
    const parsed = temperatureSchema.safeParse(parseForm(formData));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const [row] = await db
      .insert(temperatureLogs)
      .values({ babyId, loggedByUserId: userId, ...parsed.data })
      .returning({ id: temperatureLogs.id });
    revalidateAll();
    return { ok: true, id: row.id, message: "Temperature logged" };
  } catch (e) {
    return fail(e);
  }
}

export async function updateTemperature(
  id: string,
  _prev: LogResult | undefined,
  formData: FormData
): Promise<LogResult> {
  try {
    const row = await db.query.temperatureLogs.findFirst({
      where: eq(temperatureLogs.id, id),
    });
    if (!row) return { ok: false, error: "Not found" };
    await requireMutate("temperature", row.babyId, row.loggedByUserId);
    const parsed = temperatureSchema.safeParse(parseForm(formData));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    await db.update(temperatureLogs).set(parsed.data).where(eq(temperatureLogs.id, id));
    revalidateAll();
    return { ok: true, message: "Temperature updated" };
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------ Growth ------------------------------- */

export async function createGrowth(
  babyId: string,
  _prev: LogResult | undefined,
  formData: FormData
): Promise<LogResult> {
  try {
    const { userId } = await requireBabyAccess(babyId);
    const parsed = growthSchema.safeParse(parseForm(formData));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const [row] = await db
      .insert(growthLogs)
      .values({ babyId, loggedByUserId: userId, ...parsed.data })
      .returning({ id: growthLogs.id });
    revalidateAll();
    return { ok: true, id: row.id, message: "Measurement logged" };
  } catch (e) {
    return fail(e);
  }
}

export async function updateGrowth(
  id: string,
  _prev: LogResult | undefined,
  formData: FormData
): Promise<LogResult> {
  try {
    const row = await db.query.growthLogs.findFirst({ where: eq(growthLogs.id, id) });
    if (!row) return { ok: false, error: "Not found" };
    await requireMutate("growth", row.babyId, row.loggedByUserId);
    const parsed = growthSchema.safeParse(parseForm(formData));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    await db.update(growthLogs).set(parsed.data).where(eq(growthLogs.id, id));
    revalidateAll();
    return { ok: true, message: "Measurement updated" };
  } catch (e) {
    return fail(e);
  }
}

/* ---------------------------- Medication ----------------------------- */

export async function createMedication(
  babyId: string,
  _prev: LogResult | undefined,
  formData: FormData
): Promise<LogResult> {
  try {
    const { userId } = await requireBabyAccess(babyId);
    const parsed = medicationSchema.safeParse(parseForm(formData));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const [row] = await db
      .insert(medicationLogs)
      .values({ babyId, loggedByUserId: userId, ...parsed.data })
      .returning({ id: medicationLogs.id });
    revalidateAll();
    return { ok: true, id: row.id, message: "Medication logged" };
  } catch (e) {
    return fail(e);
  }
}

export async function updateMedication(
  id: string,
  _prev: LogResult | undefined,
  formData: FormData
): Promise<LogResult> {
  try {
    const row = await db.query.medicationLogs.findFirst({
      where: eq(medicationLogs.id, id),
    });
    if (!row) return { ok: false, error: "Not found" };
    await requireMutate("medication", row.babyId, row.loggedByUserId);
    const parsed = medicationSchema.safeParse(parseForm(formData));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    await db.update(medicationLogs).set(parsed.data).where(eq(medicationLogs.id, id));
    revalidateAll();
    return { ok: true, message: "Medication updated" };
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------- Note -------------------------------- */

export async function createNote(
  babyId: string,
  _prev: LogResult | undefined,
  formData: FormData
): Promise<LogResult> {
  try {
    const { userId } = await requireBabyAccess(babyId);
    const parsed = noteSchema.safeParse(parseForm(formData));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const [row] = await db
      .insert(notes)
      .values({
        babyId,
        loggedByUserId: userId,
        time: parsed.data.time,
        text: parsed.data.text,
        tags: parsed.data.tags,
      })
      .returning({ id: notes.id });
    revalidateAll();
    return { ok: true, id: row.id, message: "Note saved" };
  } catch (e) {
    return fail(e);
  }
}

export async function updateNote(
  id: string,
  _prev: LogResult | undefined,
  formData: FormData
): Promise<LogResult> {
  try {
    const row = await db.query.notes.findFirst({ where: eq(notes.id, id) });
    if (!row) return { ok: false, error: "Not found" };
    await requireMutate("note", row.babyId, row.loggedByUserId);
    const parsed = noteSchema.safeParse(parseForm(formData));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    await db
      .update(notes)
      .set({ time: parsed.data.time, text: parsed.data.text, tags: parsed.data.tags })
      .where(eq(notes.id, id));
    revalidateAll();
    return { ok: true, message: "Note updated" };
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------ Delete ------------------------------- */

const TABLES = {
  feed: feedLogs,
  diaper: diaperLogs,
  sleep: sleepLogs,
  temperature: temperatureLogs,
  growth: growthLogs,
  medication: medicationLogs,
  note: notes,
} as const;

/**
 * Shared mutate-permission check: owners may edit/delete any log in the
 * household; caregivers may only touch their own. Viewers never can.
 */
async function requireMutate(
  type: LogType,
  babyId: string,
  loggedByUserId: string
) {
  const { userId, membership } = await requireBabyAccess(babyId, "caregiver");
  const isOwner = roleAtLeast(membership.role, "owner");
  if (!isOwner && loggedByUserId !== userId) {
    throw new AuthError("You can only change logs you created");
  }
  void type;
  return { userId, membership };
}

export async function deleteLog(type: LogType, id: string): Promise<LogResult> {
  try {
    const table = TABLES[type];
    const row = await db
      .select({
        babyId: table.babyId,
        loggedByUserId: table.loggedByUserId,
      })
      .from(table)
      .where(eq(table.id, id))
      .limit(1);
    if (!row[0]) return { ok: false, error: "Not found" };
    await requireMutate(type, row[0].babyId, row[0].loggedByUserId);
    await db.delete(table).where(eq(table.id, id));
    revalidateAll();
    return { ok: true, message: "Deleted" };
  } catch (e) {
    return fail(e);
  }
}
