import { z } from "zod";

/**
 * Turn "" / null / a missing key into undefined, then coerce to number.
 * `.nullish()` is what makes the *object key* optional in Zod v4 — a union that
 * merely includes `z.undefined()` no longer does (so a missing `amountMl` on a
 * breastfeed, or a missing `durationMinutes` on a bottle, would otherwise fail).
 */
const optionalNumber = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((v) => {
    if (v === "" || v === null || v === undefined) return undefined;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : undefined;
  })
  .pipe(z.number().positive().optional());

/** Parse a datetime-local / ISO string into a Date. */
const dateFromInput = z
  .union([z.string(), z.date()])
  .transform((v) => (v instanceof Date ? v : new Date(v)))
  .refine((d) => !Number.isNaN(d.getTime()), { message: "Invalid date/time" });

const optionalDateFromInput = z
  .union([z.string(), z.date()])
  .nullish()
  .transform((v) => {
    if (v === "" || v === null || v === undefined) return undefined;
    return v instanceof Date ? v : new Date(v);
  })
  .pipe(
    z
      .date()
      .refine((d) => !Number.isNaN(d.getTime()), { message: "Invalid date/time" })
      .optional()
  );

/* ------------------------------ Auth ------------------------------ */

export const credentialsSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  inviteCode: z.string().trim().optional(),
});

/* --------------------------- Household ---------------------------- */

export const memberRoleSchema = z.enum(["owner", "caregiver", "viewer"]);

export const createHouseholdSchema = z.object({
  name: z.string().min(1, "Household name is required").max(80),
});

export const inviteSchema = z.object({
  role: z.enum(["caregiver", "viewer"]),
  email: z.string().email().toLowerCase().optional().or(z.literal("")),
});

export const joinHouseholdSchema = z.object({
  code: z.string().trim().min(4, "Enter a valid invite code"),
});

export const updateMemberRoleSchema = z.object({
  memberId: z.string().uuid(),
  role: memberRoleSchema,
});

/* ----------------------------- Baby ------------------------------- */

export const babySchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  birthDate: dateFromInput,
  sex: z.enum(["male", "female", "unspecified"]).default("unspecified"),
  birthWeightGrams: optionalNumber,
  birthLengthCm: optionalNumber,
  birthHeadCircumferenceCm: optionalNumber,
  photoUrl: z.string().url().optional().or(z.literal("")),
});

/* ----------------------------- Logs ------------------------------- */

export const feedSchema = z.object({
  type: z.enum(["breast", "bottle"]),
  startTime: dateFromInput,
  durationMinutes: optionalNumber,
  side: z.enum(["left", "right", "both"]).optional(),
  amountMl: optionalNumber,
  note: z.string().max(500).optional(),
});

export const diaperSchema = z.object({
  type: z.enum(["wet", "dirty", "both"]),
  time: dateFromInput,
  note: z.string().max(500).optional(),
});

export const sleepSchema = z
  .object({
    startTime: dateFromInput,
    endTime: optionalDateFromInput,
    note: z.string().max(500).optional(),
  })
  .refine((d) => !d.endTime || d.endTime > d.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export const temperatureSchema = z.object({
  value: z
    .union([z.string(), z.number()])
    .transform((v) => Number(v))
    .pipe(z.number().min(25).max(45).or(z.number().min(77).max(113))),
  unit: z.enum(["c", "f"]).default("c"),
  method: z.enum(["armpit", "oral", "ear", "forehead", "rectal"]).optional(),
  time: dateFromInput,
  note: z.string().max(500).optional(),
});

export const growthSchema = z
  .object({
    time: dateFromInput,
    weightGrams: optionalNumber,
    heightCm: optionalNumber,
    headCircumferenceCm: optionalNumber,
    note: z.string().max(500).optional(),
  })
  .refine((d) => d.weightGrams || d.heightCm || d.headCircumferenceCm, {
    message: "Enter at least one measurement",
    path: ["weightGrams"],
  });

export const medicationSchema = z.object({
  name: z.string().min(1, "Medication name is required").max(120),
  doseAmount: optionalNumber,
  doseUnit: z.string().max(20).optional(),
  time: dateFromInput,
  note: z.string().max(500).optional(),
});

export const noteSchema = z.object({
  time: dateFromInput,
  text: z.string().min(1, "Note text is required").max(2000),
  tags: z
    .union([z.string(), z.array(z.string())])
    .transform((v) =>
      Array.isArray(v)
        ? v
        : v
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
    )
    .optional(),
});

export type FeedInput = z.infer<typeof feedSchema>;
export type DiaperInput = z.infer<typeof diaperSchema>;
export type SleepInput = z.infer<typeof sleepSchema>;
export type TemperatureInput = z.infer<typeof temperatureSchema>;
export type GrowthInput = z.infer<typeof growthSchema>;
export type MedicationInput = z.infer<typeof medicationSchema>;
export type NoteInput = z.infer<typeof noteSchema>;
export type BabyInput = z.infer<typeof babySchema>;
