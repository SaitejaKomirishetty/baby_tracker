"use client";

import * as React from "react";
import { LOG_ORDER, LOG_META, type LogType } from "@/lib/log-meta";
import { LogTimeline, type TimelineItemDTO } from "@/components/log/log-timeline";
import { cn } from "@/lib/utils";

export function LogPageClient({
  items,
  members,
  currentUserId,
  isOwner,
}: {
  items: TimelineItemDTO[];
  members: Record<string, { name: string; image: string | null }>;
  currentUserId: string;
  isOwner: boolean;
}) {
  const [filter, setFilter] = React.useState<LogType | "all">("all");
  const filtered =
    filter === "all" ? items : items.filter((i) => i.type === filter);

  return (
    <div className="flex flex-col gap-4">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          All
        </Chip>
        {LOG_ORDER.map((t) => (
          <Chip key={t} active={filter === t} onClick={() => setFilter(t)} color={LOG_META[t].color}>
            {LOG_META[t].label}
          </Chip>
        ))}
      </div>

      <LogTimeline
        items={filtered}
        members={members}
        currentUserId={currentUserId}
        isOwner={isOwner}
      />
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  color,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-9 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
        active
          ? "border-transparent bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground"
      )}
      style={active && color ? { backgroundColor: `var(--${color})`, color: "#fff" } : undefined}
    >
      {children}
    </button>
  );
}
