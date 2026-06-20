import bcrypt from "bcryptjs";
import { inArray } from "drizzle-orm";
import { db } from "./index";
import {
  users,
  households,
  householdMembers,
  babies,
  feedLogs,
  diaperLogs,
  sleepLogs,
  temperatureLogs,
  growthLogs,
  medicationLogs,
  notes,
} from "./schema";

const SEED_EMAILS = [
  "alice@example.com",
  "bob@example.com",
  "grandma@example.com",
];

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const MIN = 60 * 1000;

function daysAgo(d: number, hour = 0, minute = 0) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return new Date(date.getTime() - d * DAY);
}

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1));
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log("🌱 Seeding database…");

  // --- Clean previous seed data (cascades to memberships/babies/logs) ---
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.email, SEED_EMAILS));
  if (existing.length) {
    await db.delete(users).where(inArray(users.email, SEED_EMAILS));
    console.log(`   removed ${existing.length} previous seed user(s)`);
  }

  const passwordHash = await bcrypt.hash("password123", 10);

  // --- Users ---
  const [alice, bob, grandma] = await db
    .insert(users)
    .values([
      { name: "Alice Nguyen", email: "alice@example.com", passwordHash },
      { name: "Bob Nguyen", email: "bob@example.com", passwordHash },
      { name: "Grandma Rose", email: "grandma@example.com", passwordHash },
    ])
    .returning();

  // --- Household ---
  const [household] = await db
    .insert(households)
    .values({ name: "The Nguyen Nest", createdByUserId: alice.id })
    .returning();

  await db.insert(householdMembers).values([
    { householdId: household.id, userId: alice.id, role: "owner" },
    { householdId: household.id, userId: bob.id, role: "caregiver" },
    { householdId: household.id, userId: grandma.id, role: "viewer" },
  ]);

  // --- Babies (twins) ---
  const birth = daysAgo(84); // ~12 weeks old
  const [mia, leo] = await db
    .insert(babies)
    .values([
      {
        householdId: household.id,
        name: "Mia",
        birthDate: birth,
        sex: "female",
        birthWeightGrams: 3200,
        birthLengthCm: 49,
        birthHeadCircumferenceCm: 34,
        createdByUserId: alice.id,
      },
      {
        householdId: household.id,
        name: "Leo",
        birthDate: birth,
        sex: "male",
        birthWeightGrams: 3400,
        birthLengthCm: 50,
        birthHeadCircumferenceCm: 35,
        createdByUserId: alice.id,
      },
    ])
    .returning();

  const caregivers = [alice.id, bob.id];

  for (const baby of [mia, leo]) {
    const feeds: (typeof feedLogs.$inferInsert)[] = [];
    const diapers: (typeof diaperLogs.$inferInsert)[] = [];
    const sleeps: (typeof sleepLogs.$inferInsert)[] = [];

    // ~10 days of round-the-clock care.
    for (let d = 9; d >= 0; d--) {
      // Feeds roughly every 3 hours.
      for (let h = 1; h < 24; h += 3) {
        const start = daysAgo(d, h, randInt(0, 50));
        if (start.getTime() > Date.now()) continue;
        const bottle = Math.random() < 0.4;
        feeds.push({
          babyId: baby.id,
          loggedByUserId: pick(caregivers),
          type: bottle ? "bottle" : "breast",
          startTime: start,
          durationMinutes: randInt(10, 35),
          side: bottle ? undefined : pick(["left", "right", "both"] as const),
          amountMl: bottle ? randInt(60, 150) : undefined,
        });
        // A diaper near most feeds.
        if (Math.random() < 0.85) {
          diapers.push({
            babyId: baby.id,
            loggedByUserId: pick(caregivers),
            type: pick(["wet", "dirty", "both"] as const),
            time: new Date(start.getTime() + randInt(5, 40) * MIN),
          });
        }
      }
      // A few sleep sessions per day (naps + a longer night stretch).
      const napStarts = [9, 13, 16, 21];
      for (const h of napStarts) {
        const start = daysAgo(d, h, randInt(0, 40));
        if (start.getTime() > Date.now()) continue;
        const lengthMin = h === 21 ? randInt(180, 360) : randInt(40, 110);
        const end = new Date(start.getTime() + lengthMin * MIN);
        sleeps.push({
          babyId: baby.id,
          loggedByUserId: pick(caregivers),
          startTime: start,
          endTime: end.getTime() > Date.now() ? null : end,
        });
      }
    }

    await db.insert(feedLogs).values(feeds);
    await db.insert(diaperLogs).values(diapers);
    await db.insert(sleepLogs).values(sleeps);

    // Weekly growth checkups since birth.
    const growth: (typeof growthLogs.$inferInsert)[] = [];
    const startW = baby.birthWeightGrams ?? 3300;
    const startL = baby.birthLengthCm ?? 50;
    for (let w = 0; w <= 12; w += 2) {
      const t = new Date(birth.getTime() + w * 7 * DAY);
      if (t.getTime() > Date.now()) break;
      growth.push({
        babyId: baby.id,
        loggedByUserId: alice.id,
        time: t,
        weightGrams: Math.round(startW + w * rand(140, 200)),
        heightCm: Math.round((startL + w * rand(0.6, 0.9)) * 10) / 10,
        headCircumferenceCm:
          Math.round((34 + w * rand(0.3, 0.5)) * 10) / 10,
      });
    }
    await db.insert(growthLogs).values(growth);

    // A temperature reading or two (one slightly elevated).
    await db.insert(temperatureLogs).values([
      {
        babyId: baby.id,
        loggedByUserId: bob.id,
        value: 36.8,
        unit: "c",
        method: "armpit",
        time: daysAgo(3, 20, 0),
      },
      {
        babyId: baby.id,
        loggedByUserId: alice.id,
        value: 38.2,
        unit: "c",
        method: "ear",
        time: daysAgo(1, 2, 30),
        note: "Slightly warm overnight, watching closely",
      },
    ]);

    // Vitamin D daily-ish, a couple recent entries.
    await db.insert(medicationLogs).values([
      {
        babyId: baby.id,
        loggedByUserId: alice.id,
        name: "Vitamin D drops",
        doseAmount: 400,
        doseUnit: "IU",
        time: daysAgo(1, 8, 0),
      },
      {
        babyId: baby.id,
        loggedByUserId: bob.id,
        name: "Vitamin D drops",
        doseAmount: 400,
        doseUnit: "IU",
        time: daysAgo(0, 8, 0),
      },
    ]);

    // A note with tags.
    await db.insert(notes).values({
      babyId: baby.id,
      loggedByUserId: alice.id,
      time: daysAgo(2, 18, 0),
      text: `${baby.name} was extra smiley today and had a great tummy-time session.`,
      tags: ["milestone", "mood"],
    });
  }

  console.log("✅ Seed complete!");
  console.log("\n   Sign in with any of:");
  console.log("   • alice@example.com   (owner)     password123");
  console.log("   • bob@example.com     (caregiver) password123");
  console.log("   • grandma@example.com (viewer)    password123");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
