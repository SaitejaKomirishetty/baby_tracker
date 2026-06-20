import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getAppContext } from "@/lib/context";
import { getActivityFeed, getHouseholdMemberNames } from "@/server/queries";
import { roleAtLeast } from "@/lib/authz";
import { LogTimeline, type TimelineItemDTO } from "@/components/log/log-timeline";

export default async function ActivityPage() {
  const ctx = await getAppContext();
  if (!ctx) redirect("/login");
  if (!ctx.activeHousehold) redirect("/onboarding");

  const isOwner = roleAtLeast(ctx.role!, "owner");
  const [feed, memberMap] = await Promise.all([
    getActivityFeed(ctx.activeHousehold.id),
    getHouseholdMemberNames(ctx.activeHousehold.id),
  ]);

  const items: TimelineItemDTO[] = feed.map((t) => ({
    ...t,
    raw: t.raw as TimelineItemDTO["raw"],
  }));
  const members = Object.fromEntries(memberMap.entries());

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Dashboard
      </Link>
      <div>
        <h1 className="font-display text-3xl font-semibold">Household activity</h1>
        <p className="text-sm text-muted-foreground">
          Who logged what across {ctx.activeHousehold.name}
        </p>
      </div>
      <LogTimeline
        items={items}
        members={members}
        currentUserId={ctx.user.id}
        isOwner={isOwner}
        showBaby
      />
    </div>
  );
}
