"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  LineChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import type { AnalyticsData } from "@/server/queries";
import { whoSeries, type WhoSex } from "@/lib/who";
import { ageInMonths } from "@/lib/format";

const tooltipStyle = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
  color: "var(--foreground)",
};

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-56 w-full">{children}</div>
      </CardContent>
    </Card>
  );
}

export function AnalyticsCharts({
  data,
  sex,
  birthDate,
}: {
  data: AnalyticsData;
  sex: WhoSex;
  birthDate: string;
}) {
  const axis = { fontSize: 11, fill: "var(--muted-foreground)" };
  const hasGrowth = data.growth.some((g) => g.weightKg != null);

  // Weight vs WHO percentile bands.
  const who = whoSeries(sex, "weight");
  const maxBabyMonth = Math.max(
    0,
    ...data.growth.map((g) => ageInMonths(birthDate, new Date(g.time)))
  );
  const maxMonth = Math.min(24, Math.ceil(Math.max(3, maxBabyMonth + 1)));
  const weightData: Record<string, number | null>[] = [];
  for (const w of who) {
    if (w.month > maxMonth) continue;
    weightData.push({ month: w.month, p3: w.p3, p50: w.p50, p97: w.p97, baby: null });
  }
  for (const g of data.growth) {
    if (g.weightKg == null) continue;
    const month = Math.round(ageInMonths(birthDate, new Date(g.time)) * 10) / 10;
    weightData.push({ month, p3: null, p50: null, p97: null, baby: g.weightKg });
  }
  weightData.sort((a, b) => (a.month as number) - (b.month as number));

  const tempData = data.temps.map((t) => ({
    label: new Date(t.time).toLocaleDateString(undefined, {
      month: "numeric",
      day: "numeric",
    }),
    temp: Math.round(t.valueC * 10) / 10,
  }));

  return (
    <div className="flex flex-col gap-4">
      {/* Feeding */}
      <ChartCard
        title="Feeding"
        description="Feeds per day & bottle volume (last 14 days)"
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data.daily} margin={{ left: -18, right: 4, top: 6 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={axis} interval="preserveStartEnd" />
            <YAxis yAxisId="left" tick={axis} allowDecimals={false} />
            <YAxis yAxisId="right" orientation="right" tick={axis} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="left" dataKey="feeds" name="Feeds" fill="var(--feed)" radius={[4, 4, 0, 0]} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="volumeMl"
              name="Volume (ml)"
              stroke="var(--growth)"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Sleep */}
      <ChartCard
        title="Sleep"
        description="Day vs night hours per day"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.daily} margin={{ left: -18, right: 4, top: 6 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={axis} interval="preserveStartEnd" />
            <YAxis tick={axis} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="sleepNightHours" name="Night" stackId="s" fill="var(--sleep)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="sleepDayHours" name="Day" stackId="s" fill="var(--diaper)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Diapers */}
      <ChartCard title="Diapers" description="Changes per day">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.daily} margin={{ left: -18, right: 4, top: 6 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={axis} interval="preserveStartEnd" />
            <YAxis tick={axis} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="diapers" name="Diapers" fill="var(--diaper)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Growth vs WHO */}
      <ChartCard
        title="Weight growth"
        description="Against WHO percentile bands (P3 / P50 / P97)"
      >
        {hasGrowth ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weightData} margin={{ left: -18, right: 4, top: 6 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="month"
                type="number"
                tick={axis}
                domain={[0, maxMonth]}
                label={{ value: "months", position: "insideBottomRight", fontSize: 10, fill: "var(--muted-foreground)" }}
              />
              <YAxis tick={axis} width={32} unit="kg" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line dataKey="p3" name="P3" stroke="var(--muted-foreground)" strokeDasharray="4 4" dot={false} connectNulls strokeWidth={1} />
              <Line dataKey="p50" name="P50" stroke="var(--muted-foreground)" dot={false} connectNulls strokeWidth={1} />
              <Line dataKey="p97" name="P97" stroke="var(--muted-foreground)" strokeDasharray="4 4" dot={false} connectNulls strokeWidth={1} />
              <Line dataKey="baby" name="Baby" stroke="var(--primary)" strokeWidth={2.5} connectNulls dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart label="Log a weight measurement to see the growth chart." />
        )}
      </ChartCard>

      {/* Temperature */}
      <ChartCard
        title="Temperature"
        description="Fever threshold highlighted at 38°C"
      >
        {tempData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={tempData} margin={{ left: -18, right: 4, top: 6 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={axis} />
              <YAxis tick={axis} domain={[35, 40]} width={32} unit="°" />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine
                y={38}
                stroke="var(--destructive)"
                strokeDasharray="5 4"
                label={{ value: "fever", fontSize: 10, fill: "var(--destructive)", position: "insideTopRight" }}
              />
              <Line
                dataKey="temp"
                name="Temp °C"
                stroke="var(--temp)"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart label="No temperature readings yet." />
        )}
      </ChartCard>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}
