import { redirect } from "next/navigation";
import { getAppContext } from "@/lib/context";
import { getTimeline, getHouseholdMemberNames } from "@/server/queries";
import { roleAtLeast } from "@/lib/authz";
import { LogPageClient } from "@/components/log/log-page-client";
import type { TimelineItemDTO } from "@/components/log/log-timeline";

export default async function LogPage() {
  const ctx = await getAppContext();
  if (!ctx) redirect("/login");
  if (!ctx.activeHousehold) redirect("/onboarding");

  if (!ctx.activeBaby) {
    return (
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Add a baby first to start logging.
      </p>
    );
  }

  const isOwner = roleAtLeast(ctx.role!, "owner");
  const [timeline, memberMap] = await Promise.all([
    getTimeline(ctx.activeBaby.id, 30, 300),
    getHouseholdMemberNames(ctx.activeHousehold.id),
  ]);

  const items: TimelineItemDTO[] = timeline.map((t) => ({
    ...t,
    raw: t.raw as TimelineItemDTO["raw"],
  }));
  const members = Object.fromEntries(memberMap.entries());

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-semibold">
        {ctx.activeBaby.name}&apos;s log
      </h1>
      <LogPageClient
        items={items}
        members={members}
        currentUserId={ctx.user.id}
        isOwner={isOwner}
      />
    </div>
  );
}
