"use client";

import * as React from "react";
import { Plus, ArrowLeft } from "lucide-react";
import { LOG_ORDER, LOG_META, type LogType } from "@/lib/log-meta";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { LogForm } from "@/components/quick-log/log-form";
import { cn } from "@/lib/utils";

export function QuickLogFab({
  babyId,
  sleeping,
  onQuickDiaper,
  onToggleSleep,
}: {
  babyId: string;
  sleeping: boolean;
  onQuickDiaper: (type: "wet" | "dirty" | "both") => Promise<void> | void;
  onToggleSleep: () => Promise<void> | void;
}) {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<LogType | null>(null);
  const [pending, startTransition] = React.useTransition();

  function reset() {
    setSelected(null);
  }

  function close() {
    setOpen(false);
    setTimeout(reset, 250);
  }

  function runQuick(fn: () => Promise<void> | void) {
    startTransition(async () => {
      await fn();
      close();
    });
  }

  return (
    <>
      <button
        aria-label="Quick log"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-5 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-95 safe-bottom"
        style={{ boxShadow: "0 8px 30px -4px var(--glow), 0 0 0 1px var(--glow)" }}
      >
        <Plus className="h-8 w-8" strokeWidth={2.5} />
      </button>

      <Drawer
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setTimeout(reset, 250);
        }}
      >
        <DrawerContent className="px-4">
          <DrawerHeader className="flex-row items-center gap-2 px-0">
            {selected && (
              <button
                onClick={reset}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary"
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <DrawerTitle>
              {selected ? `Log ${LOG_META[selected].label}` : "Quick log"}
            </DrawerTitle>
          </DrawerHeader>

          {!selected ? (
            <div className="flex flex-col gap-4 pb-6 safe-bottom">
              {/* One-tap diaper */}
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  One-tap diaper
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(["wet", "dirty", "both"] as const).map((t) => (
                    <button
                      key={t}
                      disabled={pending}
                      onClick={() => runQuick(() => onQuickDiaper(t))}
                      className="flex h-14 items-center justify-center rounded-xl bg-diaper/15 text-sm font-medium capitalize text-diaper active:scale-95 disabled:opacity-50"
                    >
                      {t === "wet" ? "💧 Wet" : t === "dirty" ? "💩 Dirty" : "Both"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sleep toggle */}
              <button
                disabled={pending}
                onClick={() => runQuick(() => onToggleSleep())}
                className="flex h-14 items-center justify-center gap-2 rounded-xl bg-sleep/15 text-sm font-semibold text-sleep active:scale-95 disabled:opacity-50"
              >
                {sleeping ? "☀️ End sleep now" : "🌙 Start sleep now"}
              </button>

              {/* Full log types */}
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  All log types
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {LOG_ORDER.map((type) => {
                    const meta = LOG_META[type];
                    const Icon = meta.icon;
                    return (
                      <button
                        key={type}
                        onClick={() => setSelected(type)}
                        className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border py-3 active:scale-95"
                      >
                        <span
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-full"
                          )}
                          style={{
                            backgroundColor: `var(--${meta.color})`,
                            opacity: 0.95,
                          }}
                        >
                          <Icon className="h-5 w-5 text-white" />
                        </span>
                        <span className="text-xs font-medium">{meta.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-h-[70dvh] overflow-y-auto pb-6 safe-bottom">
              <LogForm type={selected} babyId={babyId} onDone={close} />
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
