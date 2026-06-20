import "server-only";
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  feedLogs,
  diaperLogs,
  sleepLogs,
  temperatureLogs,
  growthLogs,
  medicationLogs,
  notes,
  householdMembers,
  babies,
  users,
  invites,
} from "@/db/schema";
import type { LogType } from "@/lib/log-meta";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/* ----------------------------- Dashboard ----------------------------- */

export async function getDashboardData(babyId: string) {
  const todayStart = startOfToday();

  const [
    lastFeed,
    lastDiaper,
    ongoingSleep,
    lastSleep,
    lastTemp,
    lastGrowth,
    feedCount,
    diaperCount,
    sleepToday,
  ] = await Promise.all([
    db.query.feedLogs.findFirst({
      where: eq(feedLogs.babyId, babyId),
      orderBy: desc(feedLogs.startTime),
    }),
    db.query.diaperLogs.findFirst({
      where: eq(diaperLogs.babyId, babyId),
      orderBy: desc(diaperLogs.time),
    }),
    db.query.sleepLogs.findFirst({
      where: and(eq(sleepLogs.babyId, babyId), isNull(sleepLogs.endTime)),
      orderBy: desc(sleepLogs.startTime),
    }),
    db.query.sleepLogs.findFirst({
      where: eq(sleepLogs.babyId, babyId),
      orderBy: desc(sleepLogs.startTime),
    }),
    db.query.temperatureLogs.findFirst({
      where: eq(temperatureLogs.babyId, babyId),
      orderBy: desc(temperatureLogs.time),
    }),
    db.query.growthLogs.findFirst({
      where: eq(growthLogs.babyId, babyId),
      orderBy: desc(growthLogs.time),
    }),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(feedLogs)
      .where(and(eq(feedLogs.babyId, babyId), gte(feedLogs.startTime, todayStart))),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(diaperLogs)
      .where(and(eq(diaperLogs.babyId, babyId), gte(diaperLogs.time, todayStart))),
    db
      .select({
        mins: sql<number>`coalesce(sum(extract(epoch from (coalesce(${sleepLogs.endTime}, now()) - ${sleepLogs.startTime})) / 60), 0)::int`,
      })
      .from(sleepLogs)
      .where(and(eq(sleepLogs.babyId, babyId), gte(sleepLogs.startTime, todayStart))),
  ]);

  return {
    lastFeed: lastFeed ?? null,
    lastDiaper: lastDiaper ?? null,
    ongoingSleep: ongoingSleep ?? null,
    lastSleep: lastSleep ?? null,
    lastTemp: lastTemp ?? null,
    lastGrowth: lastGrowth ?? null,
    totals: {
      feeds: feedCount[0]?.c ?? 0,
      diapers: diaperCount[0]?.c ?? 0,
      sleepMinutes: sleepToday[0]?.mins ?? 0,
    },
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

/* ------------------------ Caregiver name lookup ---------------------- */

export async function getHouseholdMemberNames(householdId: string) {
  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email, image: users.image })
    .from(householdMembers)
    .innerJoin(users, eq(householdMembers.userId, users.id))
    .where(eq(householdMembers.householdId, householdId));
  const map = new Map<string, { name: string; image: string | null }>();
  for (const r of rows) {
    map.set(r.id, { name: r.name ?? r.email ?? "Someone", image: r.image });
  }
  return map;
}

/* ------------------------------ Timeline ----------------------------- */

export type TimelineItem = {
  id: string;
  type: LogType;
  time: Date;
  loggedByUserId: string;
  title: string;
  subtitle?: string;
  // raw fields needed for the edit form
  raw: Record<string, unknown>;
};

function fmtMl(ml: number | null) {
  return ml != null ? `${Math.round(ml)} ml` : null;
}

export async function getTimeline(
  babyId: string,
  sinceDays = 14,
  limit = 200
): Promise<TimelineItem[]> {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

  const [feeds, diapers, sleeps, temps, growths, meds, noteRows] =
    await Promise.all([
      db.query.feedLogs.findMany({
        where: and(eq(feedLogs.babyId, babyId), gte(feedLogs.startTime, since)),
        orderBy: desc(feedLogs.startTime),
        limit,
      }),
      db.query.diaperLogs.findMany({
        where: and(eq(diaperLogs.babyId, babyId), gte(diaperLogs.time, since)),
        orderBy: desc(diaperLogs.time),
        limit,
      }),
      db.query.sleepLogs.findMany({
        where: and(eq(sleepLogs.babyId, babyId), gte(sleepLogs.startTime, since)),
        orderBy: desc(sleepLogs.startTime),
        limit,
      }),
      db.query.temperatureLogs.findMany({
        where: and(
          eq(temperatureLogs.babyId, babyId),
          gte(temperatureLogs.time, since)
        ),
        orderBy: desc(temperatureLogs.time),
        limit,
      }),
      db.query.growthLogs.findMany({
        where: and(eq(growthLogs.babyId, babyId), gte(growthLogs.time, since)),
        orderBy: desc(growthLogs.time),
        limit,
      }),
      db.query.medicationLogs.findMany({
        where: and(
          eq(medicationLogs.babyId, babyId),
          gte(medicationLogs.time, since)
        ),
        orderBy: desc(medicationLogs.time),
        limit,
      }),
      db.query.notes.findMany({
        where: and(eq(notes.babyId, babyId), gte(notes.time, since)),
        orderBy: desc(notes.time),
        limit,
      }),
    ]);

  const items: TimelineItem[] = [];

  for (const f of feeds) {
    const parts = [
      f.type === "breast" ? "Breastfeed" : "Bottle",
      f.side ? `${f.side} side` : null,
      fmtMl(f.amountMl),
      f.durationMinutes ? `${f.durationMinutes} min` : null,
    ].filter(Boolean);
    items.push({
      id: f.id,
      type: "feed",
      time: f.startTime,
      loggedByUserId: f.loggedByUserId,
      title: parts[0] as string,
      subtitle: parts.slice(1).join(" · ") || undefined,
      raw: f,
    });
  }
  for (const d of diapers) {
    items.push({
      id: d.id,
      type: "diaper",
      time: d.time,
      loggedByUserId: d.loggedByUserId,
      title: `${d.type[0].toUpperCase()}${d.type.slice(1)} diaper`,
      subtitle: d.note ?? undefined,
      raw: d,
    });
  }
  for (const s of sleeps) {
    const mins = s.endTime
      ? Math.round((s.endTime.getTime() - s.startTime.getTime()) / 60000)
      : null;
    items.push({
      id: s.id,
      type: "sleep",
      time: s.startTime,
      loggedByUserId: s.loggedByUserId,
      title: s.endTime ? "Sleep" : "Sleep (ongoing)",
      subtitle:
        mins != null
          ? `${Math.floor(mins / 60)}h ${mins % 60}m`
          : "in progress",
      raw: s,
    });
  }
  for (const t of temps) {
    items.push({
      id: t.id,
      type: "temperature",
      time: t.time,
      loggedByUserId: t.loggedByUserId,
      title: `${t.value.toFixed(1)}°${t.unit.toUpperCase()}`,
      subtitle: t.method ?? undefined,
      raw: t,
    });
  }
  for (const g of growths) {
    const parts = [
      g.weightGrams ? `${(g.weightGrams / 1000).toFixed(2)} kg` : null,
      g.heightCm ? `${g.heightCm} cm` : null,
      g.headCircumferenceCm ? `head ${g.headCircumferenceCm} cm` : null,
    ].filter(Boolean);
    items.push({
      id: g.id,
      type: "growth",
      time: g.time,
      loggedByUserId: g.loggedByUserId,
      title: "Measurement",
      subtitle: parts.join(" · ") || undefined,
      raw: g,
    });
  }
  for (const m of meds) {
    items.push({
      id: m.id,
      type: "medication",
      time: m.time,
      loggedByUserId: m.loggedByUserId,
      title: m.name,
      subtitle:
        m.doseAmount != null
          ? `${m.doseAmount}${m.doseUnit ? " " + m.doseUnit : ""}`
          : undefined,
      raw: m,
    });
  }
  for (const n of noteRows) {
    items.push({
      id: n.id,
      type: "note",
      time: n.time,
      loggedByUserId: n.loggedByUserId,
      title: n.text.length > 60 ? n.text.slice(0, 60) + "…" : n.text,
      subtitle: n.tags?.length ? n.tags.map((t) => `#${t}`).join(" ") : undefined,
      raw: n,
    });
  }

  items.sort((a, b) => b.time.getTime() - a.time.getTime());
  return items;
}

/* --------------------------- Activity feed --------------------------- */

export type ActivityItem = TimelineItem & { babyName: string };

/** Household-wide recent activity across all babies, with caregiver + baby. */
export async function getActivityFeed(householdId: string, limit = 60) {
  const householdBabies = await db.query.babies.findMany({
    where: eq(babies.householdId, householdId),
  });
  const babyName = new Map(householdBabies.map((b) => [b.id, b.name]));

  const all: ActivityItem[] = [];
  for (const baby of householdBabies) {
    const items = await getTimeline(baby.id, 7, 40);
    for (const it of items) {
      all.push({ ...it, babyName: babyName.get(baby.id) ?? "Baby" });
    }
  }
  all.sort((a, b) => b.time.getTime() - a.time.getTime());
  return all.slice(0, limit);
}

/* --------------------------- Household detail ------------------------ */

export async function getHouseholdDetail(householdId: string) {
  const memberRows = await db
    .select({
      memberId: householdMembers.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: householdMembers.role,
      createdAt: householdMembers.createdAt,
    })
    .from(householdMembers)
    .innerJoin(users, eq(householdMembers.userId, users.id))
    .where(eq(householdMembers.householdId, householdId))
    .orderBy(householdMembers.createdAt);

  const inviteRows = await db.query.invites.findMany({
    where: eq(invites.householdId, householdId),
    orderBy: desc(invites.createdAt),
  });

  const now = Date.now();
  const pendingInvites = inviteRows
    .filter((i) => !i.acceptedByUserId && i.expiresAt.getTime() > now)
    .map((i) => ({
      id: i.id,
      code: i.code,
      role: i.role,
      email: i.email,
      expiresAt: i.expiresAt,
    }));

  return { members: memberRows, pendingInvites };
}

/* ----------------------------- Analytics ----------------------------- */

export async function getAnalyticsData(babyId: string, days = 14) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [feeds, sleeps, diapers, growths, temps] = await Promise.all([
    db.query.feedLogs.findMany({
      where: and(eq(feedLogs.babyId, babyId), gte(feedLogs.startTime, since)),
      orderBy: feedLogs.startTime,
    }),
    db.query.sleepLogs.findMany({
      where: and(eq(sleepLogs.babyId, babyId), gte(sleepLogs.startTime, since)),
      orderBy: sleepLogs.startTime,
    }),
    db.query.diaperLogs.findMany({
      where: and(eq(diaperLogs.babyId, babyId), gte(diaperLogs.time, since)),
      orderBy: diaperLogs.time,
    }),
    db.query.growthLogs.findMany({
      where: eq(growthLogs.babyId, babyId),
      orderBy: growthLogs.time,
    }),
    db.query.temperatureLogs.findMany({
      where: and(eq(temperatureLogs.babyId, babyId), gte(temperatureLogs.time, since)),
      orderBy: temperatureLogs.time,
    }),
  ]);

  // Bucket per local day.
  const dayKey = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x.toISOString().slice(0, 10);
  };

  const dayMap = new Map<
    string,
    {
      date: string;
      feeds: number;
      volumeMl: number;
      diapers: number;
      sleepDayMin: number;
      sleepNightMin: number;
    }
  >();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, {
      date: key,
      feeds: 0,
      volumeMl: 0,
      diapers: 0,
      sleepDayMin: 0,
      sleepNightMin: 0,
    });
  }

  for (const f of feeds) {
    const b = dayMap.get(dayKey(f.startTime));
    if (b) {
      b.feeds += 1;
      b.volumeMl += f.amountMl ?? 0;
    }
  }
  for (const d of diapers) {
    const b = dayMap.get(dayKey(d.time));
    if (b) b.diapers += 1;
  }
  for (const s of sleeps) {
    const end = s.endTime ?? new Date();
    const mins = Math.max(0, (end.getTime() - s.startTime.getTime()) / 60000);
    const b = dayMap.get(dayKey(s.startTime));
    if (b) {
      const hour = s.startTime.getHours();
      const isNight = hour >= 19 || hour < 7;
      if (isNight) b.sleepNightMin += mins;
      else b.sleepDayMin += mins;
    }
  }

  const daily = Array.from(dayMap.values()).map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString(undefined, {
      month: "numeric",
      day: "numeric",
    }),
    sleepHours: Math.round(((d.sleepDayMin + d.sleepNightMin) / 60) * 10) / 10,
    sleepDayHours: Math.round((d.sleepDayMin / 60) * 10) / 10,
    sleepNightHours: Math.round((d.sleepNightMin / 60) * 10) / 10,
  }));

  return {
    daily,
    growth: growths.map((g) => ({
      time: g.time,
      weightKg: g.weightGrams != null ? g.weightGrams / 1000 : null,
      heightCm: g.heightCm ?? null,
      headCircumferenceCm: g.headCircumferenceCm ?? null,
    })),
    temps: temps.map((t) => ({
      time: t.time,
      valueC: t.unit === "f" ? ((t.value - 32) * 5) / 9 : t.value,
      method: t.method,
    })),
  };
}

export type AnalyticsData = Awaited<ReturnType<typeof getAnalyticsData>>;
