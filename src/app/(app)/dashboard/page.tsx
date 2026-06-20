import Link from "next/link";
import { redirect } from "next/navigation";
import { getAppContext } from "@/lib/context";
import {
  getDashboardData,
  getTimeline,
  getHouseholdMemberNames,
} from "@/server/queries";
import { roleAtLeast } from "@/lib/authz";
import { DashboardLive, type DashboardSnapshot } from "@/components/dashboard/dashboard-live";
import { LogTimeline, type TimelineItemDTO } from "@/components/log/log-timeline";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function DashboardPage() {
  const ctx = await getAppContext();
  if (!ctx) redirect("/login");
  if (!ctx.activeHousehold) redirect("/onboarding");

  const isOwner = roleAtLeast(ctx.role!, "owner");

  if (!ctx.activeBaby) {
    return (
      <Card className="mt-6">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <span className="text-5xl">👶</span>
          <div>
            <h2 className="text-lg font-semibold">No babies yet</h2>
            <p className="text-sm text-muted-foreground">
              {isOwner
                ? "Add your little one to start tracking."
                : "Ask the household owner to add a baby profile."}
            </p>
          </div>
          {isOwner && (
            <Link
              href="/settings/babies/new"
              className={buttonVariants({ size: "lg" })}
            >
              Add a baby
            </Link>
          )}
        </CardContent>
      </Card>
    );
  }

  const baby = ctx.activeBaby;
  const [data, timeline, memberMap] = await Promise.all([
    getDashboardData(baby.id),
    getTimeline(baby.id, 2, 12),
    getHouseholdMemberNames(ctx.activeHousehold.id),
  ]);

  const snapshot: DashboardSnapshot = {
    lastFeed: data.lastFeed?.startTime.toISOString() ?? null,
    lastDiaper: data.lastDiaper?.time.toISOString() ?? null,
    sleeping: !!data.ongoingSleep,
    sleepStart: data.ongoingSleep?.startTime.toISOString() ?? null,
    lastSleepEnd: data.lastSleep?.endTime?.toISOString() ?? null,
    totals: data.totals,
    lastTemp: data.lastTemp
      ? {
          value: data.lastTemp.value,
          unit: data.lastTemp.unit,
          time: data.lastTemp.time.toISOString(),
        }
      : null,
  };

  const members = Object.fromEntries(memberMap.entries());
  const recent: TimelineItemDTO[] = timeline.slice(0, 8).map((t) => ({
    ...t,
    raw: t.raw as TimelineItemDTO["raw"],
  }));

  return (
    <div className="flex flex-col gap-6">
      <DashboardLive babyId={baby.id} babyName={baby.name} initial={snapshot} />

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent activity</h2>
          <div className="flex items-center gap-3 text-sm font-medium text-primary">
            <Link href="/activity">Household feed</Link>
            <Link href="/log">View all</Link>
          </div>
        </div>
        <LogTimeline
          items={recent}
          members={members}
          currentUserId={ctx.user.id}
          isOwner={isOwner}
        />
      </section>
    </div>
  );
}
