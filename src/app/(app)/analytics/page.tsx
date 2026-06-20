import { redirect } from "next/navigation";
import { getAppContext } from "@/lib/context";
import { getAnalyticsData } from "@/server/queries";
import { AnalyticsCharts } from "@/components/analytics/analytics-charts";

export default async function AnalyticsPage() {
  const ctx = await getAppContext();
  if (!ctx) redirect("/login");
  if (!ctx.activeHousehold) redirect("/onboarding");

  if (!ctx.activeBaby) {
    return (
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Add a baby to see trends and charts.
      </p>
    );
  }

  const baby = ctx.activeBaby;
  const data = await getAnalyticsData(baby.id, 14);
  const sex = baby.sex === "female" ? "female" : "male";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold">
          {baby.name}&apos;s trends
        </h1>
        <p className="text-sm text-muted-foreground">Last 14 days</p>
      </div>
      <AnalyticsCharts
        data={data}
        sex={sex}
        birthDate={new Date(baby.birthDate).toISOString()}
      />
    </div>
  );
}
