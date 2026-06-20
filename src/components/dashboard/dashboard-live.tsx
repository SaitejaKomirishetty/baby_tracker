"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Milk, Droplets, Moon, Thermometer, AlertTriangle } from "lucide-react";
import { quickDiaper, toggleSleep } from "@/server/log-actions";
import { QuickLogFab } from "@/components/quick-log/quick-log-fab";
import { Card } from "@/components/ui/card";
import {
  timeAgo,
  elapsed,
  formatDuration,
  formatTime,
  formatTemp,
  isFever,
} from "@/lib/format";
import { cn } from "@/lib/utils";

// A typical newborn feed interval — drives the "time until next feed" ring.
const FEED_TARGET_MIN = 180;

export type DashboardSnapshot = {
  lastFeed: string | null;
  lastDiaper: string | null;
  sleeping: boolean;
  sleepStart: string | null;
  lastSleepEnd: string | null;
  totals: { feeds: number; diapers: number; sleepMinutes: number };
  lastTemp: { value: number; unit: "c" | "f"; time: string } | null;
};

type OptAction =
  | { kind: "diaper" }
  | { kind: "sleepStart" }
  | { kind: "sleepEnd" };

function reducer(state: DashboardSnapshot, action: OptAction): DashboardSnapshot {
  const now = new Date().toISOString();
  switch (action.kind) {
    case "diaper":
      return {
        ...state,
        lastDiaper: now,
        totals: { ...state.totals, diapers: state.totals.diapers + 1 },
      };
    case "sleepStart":
      return { ...state, sleeping: true, sleepStart: now };
    case "sleepEnd":
      return { ...state, sleeping: false, sleepStart: null, lastSleepEnd: now };
  }
}

function useNow(intervalMs = 30000) {
  const [now, setNow] = React.useState<number | null>(null);
  React.useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function DashboardLive({
  babyId,
  babyName,
  initial,
}: {
  babyId: string;
  babyName: string;
  initial: DashboardSnapshot;
}) {
  const router = useRouter();
  const [optimistic, addOptimistic] = React.useOptimistic(initial, reducer);
  const [, startTransition] = React.useTransition();
  const now = useNow();
  const mounted = now !== null;

  function handleQuickDiaper(type: "wet" | "dirty" | "both") {
    startTransition(async () => {
      addOptimistic({ kind: "diaper" });
      await quickDiaper(babyId, type);
      router.refresh();
    });
  }

  function handleToggleSleep() {
    startTransition(async () => {
      addOptimistic({ kind: optimistic.sleeping ? "sleepEnd" : "sleepStart" });
      await toggleSleep(babyId);
      router.refresh();
    });
  }

  const feverWarning =
    optimistic.lastTemp && isFever(optimistic.lastTemp.value, optimistic.lastTemp.unit);

  // Feed focal maths.
  const minsSinceFeed =
    mounted && optimistic.lastFeed
      ? (now! - new Date(optimistic.lastFeed).getTime()) / 60000
      : null;
  const progress =
    minsSinceFeed == null ? 0 : Math.min(minsSinceFeed / FEED_TARGET_MIN, 1);
  const remaining = minsSinceFeed == null ? null : FEED_TARGET_MIN - minsSinceFeed;

  // Reminders
  const reminders: { text: string; tone: "warn" | "alert" }[] = [];
  if (mounted) {
    if (optimistic.lastDiaper) {
      const hrs = (now! - new Date(optimistic.lastDiaper).getTime()) / 3600000;
      if (hrs >= 4)
        reminders.push({
          text: `${Math.floor(hrs)}h since the last diaper change`,
          tone: "warn",
        });
    }
  }
  if (feverWarning && optimistic.lastTemp) {
    reminders.unshift({
      text: `Last temperature ${formatTemp(
        optimistic.lastTemp.value,
        optimistic.lastTemp.unit
      )} — above the fever line`,
      tone: "alert",
    });
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="lamp-in">
        <p className="text-sm text-muted-foreground">
          {!mounted
            ? "With"
            : new Date(now!).getHours() >= 19 || new Date(now!).getHours() < 5
              ? "Tonight with"
              : "Today with"}
        </p>
        <h1 className="font-display text-3xl font-semibold leading-none">
          {babyName}
        </h1>
      </div>

      {reminders.length > 0 && (
        <div className="flex flex-col gap-2">
          {reminders.map((r, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium",
                r.tone === "alert"
                  ? "bg-destructive/15 text-destructive"
                  : "bg-diaper/15 text-diaper"
              )}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {r.text}
            </div>
          ))}
        </div>
      )}

      {/* Feed focal — the thesis */}
      <FeedFocal
        mounted={mounted}
        elapsedText={
          mounted && optimistic.lastFeed
            ? elapsed(optimistic.lastFeed, new Date(now!))
            : null
        }
        progress={progress}
        lastFeedTime={optimistic.lastFeed}
        remaining={remaining}
      />

      {/* Quieter lamp row */}
      <div className="grid grid-cols-3 gap-3">
        <Lamp
          icon={<Droplets className="h-5 w-5" />}
          color="diaper"
          label="Diaper"
          value={mounted ? timeAgo(optimistic.lastDiaper) : "—"}
        />
        <button onClick={handleToggleSleep} className="text-left">
          <Lamp
            icon={<Moon className="h-5 w-5" />}
            color="sleep"
            label={optimistic.sleeping ? "Sleeping" : "Awake"}
            value={
              !mounted
                ? "—"
                : optimistic.sleeping && optimistic.sleepStart
                  ? elapsed(optimistic.sleepStart, new Date(now!))
                  : "tap to start"
            }
            breathe={optimistic.sleeping}
          />
        </button>
        <Lamp
          icon={<Thermometer className="h-5 w-5" />}
          color={feverWarning ? "temp" : "growth"}
          label="Temp"
          value={
            optimistic.lastTemp
              ? formatTemp(optimistic.lastTemp.value, optimistic.lastTemp.unit)
              : "—"
          }
          alert={!!feverWarning}
        />
      </div>

      {/* Today's totals */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Since midnight
        </p>
        <Card className="grid grid-cols-3 divide-x divide-border p-5">
          <Total label="Feeds" value={`${optimistic.totals.feeds}`} />
          <Total
            label="Sleep"
            value={formatDuration(optimistic.totals.sleepMinutes)}
          />
          <Total label="Diapers" value={`${optimistic.totals.diapers}`} />
        </Card>
      </div>

      <QuickLogFab
        babyId={babyId}
        sleeping={optimistic.sleeping}
        onQuickDiaper={handleQuickDiaper}
        onToggleSleep={handleToggleSleep}
      />
    </div>
  );
}

function FeedFocal({
  mounted,
  elapsedText,
  progress,
  lastFeedTime,
  remaining,
}: {
  mounted: boolean;
  elapsedText: string | null;
  progress: number;
  lastFeedTime: string | null;
  remaining: number | null;
}) {
  const r = 86;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - progress);
  const overdue = remaining != null && remaining <= 0;

  return (
    <div className="lamp-in relative flex flex-col items-center">
      {/* ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-6 h-56 w-56 rounded-full opacity-70 blur-3xl"
        style={{ background: "var(--glow)" }}
      />
      <div className="relative flex h-52 w-52 items-center justify-center">
        <svg viewBox="0 0 200 200" className="absolute inset-0 -rotate-90">
          <circle
            cx="100"
            cy="100"
            r={r}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="6"
          />
          <circle
            cx="100"
            cy="100"
            r={r}
            fill="none"
            stroke={overdue ? "var(--color-temp)" : "var(--color-primary)"}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={mounted ? offset : c}
            className="glow-ring transition-[stroke-dashoffset] duration-1000 ease-out"
          />
        </svg>
        <div className="flex flex-col items-center text-center">
          <Milk className="mb-1 h-5 w-5 text-primary" />
          <span className="font-display text-4xl font-semibold leading-none tracking-tight">
            {elapsedText ?? "—"}
          </span>
          <span className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
            since last feed
          </span>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {!mounted ? (
          " "
        ) : !lastFeedTime ? (
          "No feeds logged yet — tap + to start"
        ) : overdue ? (
          <span className="font-medium text-temp">Likely due for a feed</span>
        ) : (
          <>
            Last at{" "}
            <span className="text-foreground">{formatTime(lastFeedTime)}</span> ·
            ~{Math.round(remaining!)}m to go
          </>
        )}
      </p>
    </div>
  );
}

function Lamp({
  icon,
  color,
  label,
  value,
  breathe,
  alert,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
  value: string;
  breathe?: boolean;
  alert?: boolean;
}) {
  return (
    <Card
      className={cn(
        "flex h-full flex-col items-center gap-2 p-4 text-center",
        alert && "ring-1 ring-destructive/40"
      )}
    >
      <span className="relative flex h-11 w-11 items-center justify-center">
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 rounded-full blur-md",
            breathe && "breathe"
          )}
          style={{ backgroundColor: `var(--${color})`, opacity: 0.35 }}
        />
        <span
          className="relative flex h-11 w-11 items-center justify-center rounded-full text-background"
          style={{ backgroundColor: `var(--${color})` }}
        >
          {icon}
        </span>
      </span>
      <span className="text-[15px] font-semibold leading-tight">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </Card>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-display text-2xl font-semibold">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
