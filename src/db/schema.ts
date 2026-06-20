import {
  pgTable,
  text,
  timestamp,
  integer,
  real,
  boolean,
  primaryKey,
  uuid,
  pgEnum,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";
import { relations } from "drizzle-orm";

/* -------------------------------------------------------------------------- */
/*  Enums                                                                     */
/* -------------------------------------------------------------------------- */

export const memberRoleEnum = pgEnum("member_role", [
  "owner",
  "caregiver",
  "viewer",
]);
export const babySexEnum = pgEnum("baby_sex", ["male", "female", "unspecified"]);
export const feedTypeEnum = pgEnum("feed_type", ["breast", "bottle"]);
export const feedSideEnum = pgEnum("feed_side", ["left", "right", "both"]);
export const diaperTypeEnum = pgEnum("diaper_type", ["wet", "dirty", "both"]);
export const tempUnitEnum = pgEnum("temp_unit", ["c", "f"]);
export const tempMethodEnum = pgEnum("temp_method", [
  "armpit",
  "oral",
  "ear",
  "forehead",
  "rectal",
]);

/* -------------------------------------------------------------------------- */
/*  Auth.js tables (compatible with @auth/drizzle-adapter)                    */
/* -------------------------------------------------------------------------- */

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = pgTable("session", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_token",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

/* -------------------------------------------------------------------------- */
/*  Household / membership                                                    */
/* -------------------------------------------------------------------------- */

export const households = pgTable("households", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdByUserId: text("created_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const householdMembers = pgTable(
  "household_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("caregiver"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("household_members_household_user_unique").on(
      t.householdId,
      t.userId
    ),
    index("household_members_user_idx").on(t.userId),
  ]
);

export const invites = pgTable(
  "invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    code: text("code").notNull().unique(),
    role: memberRoleEnum("role").notNull().default("caregiver"),
    email: text("email"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    acceptedByUserId: text("accepted_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    acceptedAt: timestamp("accepted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("invites_household_idx").on(t.householdId)]
);

/* -------------------------------------------------------------------------- */
/*  Babies                                                                    */
/* -------------------------------------------------------------------------- */

export const babies = pgTable(
  "babies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    birthDate: date("birth_date", { mode: "date" }).notNull(),
    sex: babySexEnum("sex").notNull().default("unspecified"),
    birthWeightGrams: real("birth_weight_grams"),
    birthLengthCm: real("birth_length_cm"),
    birthHeadCircumferenceCm: real("birth_head_circumference_cm"),
    photoUrl: text("photo_url"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("babies_household_idx").on(t.householdId)]
);

/* -------------------------------------------------------------------------- */
/*  Logs — every log references babyId + loggedByUserId                       */
/* -------------------------------------------------------------------------- */

export const feedLogs = pgTable(
  "feed_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    babyId: uuid("baby_id")
      .notNull()
      .references(() => babies.id, { onDelete: "cascade" }),
    loggedByUserId: text("logged_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),
    type: feedTypeEnum("type").notNull(),
    startTime: timestamp("start_time").notNull(),
    durationMinutes: integer("duration_minutes"),
    side: feedSideEnum("side"),
    amountMl: real("amount_ml"),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("feed_logs_baby_time_idx").on(t.babyId, t.startTime)]
);

export const diaperLogs = pgTable(
  "diaper_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    babyId: uuid("baby_id")
      .notNull()
      .references(() => babies.id, { onDelete: "cascade" }),
    loggedByUserId: text("logged_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),
    type: diaperTypeEnum("type").notNull(),
    time: timestamp("time").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("diaper_logs_baby_time_idx").on(t.babyId, t.time)]
);

export const sleepLogs = pgTable(
  "sleep_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    babyId: uuid("baby_id")
      .notNull()
      .references(() => babies.id, { onDelete: "cascade" }),
    loggedByUserId: text("logged_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time"),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("sleep_logs_baby_time_idx").on(t.babyId, t.startTime)]
);

export const temperatureLogs = pgTable(
  "temperature_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    babyId: uuid("baby_id")
      .notNull()
      .references(() => babies.id, { onDelete: "cascade" }),
    loggedByUserId: text("logged_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),
    value: real("value").notNull(),
    unit: tempUnitEnum("unit").notNull().default("c"),
    method: tempMethodEnum("method"),
    time: timestamp("time").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("temperature_logs_baby_time_idx").on(t.babyId, t.time)]
);

export const growthLogs = pgTable(
  "growth_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    babyId: uuid("baby_id")
      .notNull()
      .references(() => babies.id, { onDelete: "cascade" }),
    loggedByUserId: text("logged_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),
    time: timestamp("time").notNull(),
    weightGrams: real("weight_grams"),
    heightCm: real("height_cm"),
    headCircumferenceCm: real("head_circumference_cm"),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("growth_logs_baby_time_idx").on(t.babyId, t.time)]
);

export const medicationLogs = pgTable(
  "medication_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    babyId: uuid("baby_id")
      .notNull()
      .references(() => babies.id, { onDelete: "cascade" }),
    loggedByUserId: text("logged_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    doseAmount: real("dose_amount"),
    doseUnit: text("dose_unit"),
    time: timestamp("time").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("medication_logs_baby_time_idx").on(t.babyId, t.time)]
);

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    babyId: uuid("baby_id")
      .notNull()
      .references(() => babies.id, { onDelete: "cascade" }),
    loggedByUserId: text("logged_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),
    time: timestamp("time").notNull(),
    text: text("text").notNull(),
    tags: text("tags").array(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("notes_baby_time_idx").on(t.babyId, t.time)]
);

/* -------------------------------------------------------------------------- */
/*  Relations (for query convenience)                                         */
/* -------------------------------------------------------------------------- */

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(householdMembers),
}));

export const householdsRelations = relations(households, ({ many, one }) => ({
  members: many(householdMembers),
  babies: many(babies),
  createdBy: one(users, {
    fields: [households.createdByUserId],
    references: [users.id],
  }),
}));

export const householdMembersRelations = relations(
  householdMembers,
  ({ one }) => ({
    household: one(households, {
      fields: [householdMembers.householdId],
      references: [households.id],
    }),
    user: one(users, {
      fields: [householdMembers.userId],
      references: [users.id],
    }),
  })
);

export const babiesRelations = relations(babies, ({ one, many }) => ({
  household: one(households, {
    fields: [babies.householdId],
    references: [households.id],
  }),
  feedLogs: many(feedLogs),
  diaperLogs: many(diaperLogs),
  sleepLogs: many(sleepLogs),
  temperatureLogs: many(temperatureLogs),
  growthLogs: many(growthLogs),
  medicationLogs: many(medicationLogs),
  notes: many(notes),
}));

/* -------------------------------------------------------------------------- */
/*  Inferred types                                                            */
/* -------------------------------------------------------------------------- */

export type User = typeof users.$inferSelect;
export type Household = typeof households.$inferSelect;
export type HouseholdMember = typeof householdMembers.$inferSelect;
export type MemberRole = (typeof memberRoleEnum.enumValues)[number];
export type Invite = typeof invites.$inferSelect;
export type Baby = typeof babies.$inferSelect;
export type FeedLog = typeof feedLogs.$inferSelect;
export type DiaperLog = typeof diaperLogs.$inferSelect;
export type SleepLog = typeof sleepLogs.$inferSelect;
export type TemperatureLog = typeof temperatureLogs.$inferSelect;
export type GrowthLog = typeof growthLogs.$inferSelect;
export type MedicationLog = typeof medicationLogs.$inferSelect;
export type Note = typeof notes.$inferSelect;
