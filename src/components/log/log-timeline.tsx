"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { LOG_META, type LogType } from "@/lib/log-meta";
import { deleteLog } from "@/server/log-actions";
import { LogForm } from "@/components/quick-log/log-form";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Avatar } from "@/components/ui/avatar";
import { formatTime, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export type TimelineItemDTO = {
  id: string;
  type: LogType;
  time: string | Date;
  loggedByUserId: string;
  title: string;
  subtitle?: string;
  babyName?: string;
  raw: Record<string, unknown> & { id: string };
};

type Member = { name: string; image: string | null };

export function LogTimeline({
  items,
  members,
  currentUserId,
  isOwner,
  showBaby = false,
  editable = true,
}: {
  items: TimelineItemDTO[];
  members: Record<string, Member>;
  currentUserId: string;
  isOwner: boolean;
  showBaby?: boolean;
  editable?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<TimelineItemDTO | null>(null);
  const [pendingDelete, startDelete] = React.useTransition();
  // Times/dates are formatted in the viewer's timezone, which the server can't
  // know — so we render a skeleton until mount to keep the server and first
  // client render identical (avoids a hydration mismatch when the server runs
  // in a different timezone than the browser).
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  function canMutate(item: TimelineItemDTO) {
    return editable && (isOwner || item.loggedByUserId === currentUserId);
  }

  function handleDelete(item: TimelineItemDTO) {
    if (!confirm("Delete this entry? This can't be undone.")) return;
    startDelete(async () => {
      await deleteLog(item.type, item.id);
      setEditing(null);
      router.refresh();
    });
  }

  // Group by day.
  const groups: { day: string; items: TimelineItemDTO[] }[] = [];
  for (const it of items) {
    const day = formatDate(it.time);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(it);
    else groups.push({ day, items: [it] });
  }

  if (items.length === 0) {
    return (
      <p className="rounded-xl bg-secondary/50 p-6 text-center text-sm text-muted-foreground">
        Nothing logged yet. Tap the + button to add your first entry.
      </p>
    );
  }

  if (!mounted) {
    return <TimelineSkeleton count={Math.min(items.length, 8)} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <div key={g.day}>
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {g.day}
          </p>
          <div className="flex flex-col gap-1.5">
            {g.items.map((item) => {
              const meta = LOG_META[item.type];
              const Icon = meta.icon;
              const who = members[item.loggedByUserId];
              const mutable = canMutate(item);
              return (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => mutable && setEditing(item)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left",
                    mutable && "active:scale-[0.99] hover:bg-secondary/50"
                  )}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: `var(--${meta.color})` }}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {showBaby && item.babyName ? `${item.babyName}: ` : ""}
                      {item.title}
                    </p>
                    {item.subtitle && (
                      <p className="truncate text-sm text-muted-foreground">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-xs font-medium">
                      {formatTime(item.time)}
                    </span>
                    {who && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Avatar name={who.name} src={who.image} size={16} />
                        {who.name.split(" ")[0]}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <Drawer open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DrawerContent className="px-4">
          <DrawerHeader className="px-0">
            <DrawerTitle>
              Edit {editing ? LOG_META[editing.type].label : ""}
            </DrawerTitle>
          </DrawerHeader>
          {editing && (
            <div className="max-h-[70dvh] overflow-y-auto pb-4 safe-bottom">
              <LogForm
                type={editing.type}
                item={editing.raw}
                onDone={() => setEditing(null)}
              />
              <Button
                variant="ghost"
                className="mt-2 w-full text-destructive"
                disabled={pendingDelete}
                onClick={() => handleDelete(editing)}
              >
                <Trash2 className="h-4 w-4" /> Delete entry
              </Button>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}

/** Placeholder shown until mount, so SSR and first client render match. */
function TimelineSkeleton({ count }: { count: number }) {
  return (
    <div className="flex animate-pulse flex-col gap-1.5" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
        >
          <span className="h-9 w-9 shrink-0 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/2 rounded bg-muted" />
            <div className="h-2.5 w-1/3 rounded bg-muted" />
          </div>
          <div className="h-3 w-12 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
