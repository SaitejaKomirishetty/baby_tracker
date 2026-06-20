"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Plus } from "lucide-react";
import type { Baby } from "@/db/schema";
import { setActiveBaby } from "@/server/household-actions";
import { Avatar } from "@/components/ui/avatar";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { formatAge } from "@/lib/format";
import { cn } from "@/lib/utils";

export function BabySwitcher({
  babies,
  activeBabyId,
  canAdd,
}: {
  babies: Baby[];
  activeBabyId: string | null;
  canAdd: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const active = babies.find((b) => b.id === activeBabyId) ?? babies[0];

  function select(id: string) {
    setOpen(false);
    startTransition(async () => {
      await setActiveBaby(id);
      router.refresh();
    });
  }

  if (!active) {
    return (
      <Link
        href="/settings/babies/new"
        className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium"
      >
        <Plus className="h-4 w-4" /> Add baby
      </Link>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-secondary"
          disabled={pending}
        >
          <Avatar name={active.name} src={active.photoUrl} size={36} />
          <span className="flex flex-col items-start leading-tight">
            <span className="text-sm font-semibold">{active.name}</span>
            <span className="text-[11px] text-muted-foreground">
              {formatAge(active.birthDate)}
            </span>
          </span>
          {babies.length > 1 && (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Switch baby</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-1 px-3 pb-2">
          {babies.map((b) => (
            <button
              key={b.id}
              onClick={() => select(b.id)}
              className={cn(
                "flex items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-secondary",
                b.id === active.id && "bg-secondary"
              )}
            >
              <Avatar name={b.name} src={b.photoUrl} size={40} />
              <span className="flex flex-1 flex-col leading-tight">
                <span className="font-medium">{b.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatAge(b.birthDate)}
                </span>
              </span>
              {b.id === active.id && <Check className="h-5 w-5 text-primary" />}
            </button>
          ))}
        </div>
        {canAdd && (
          <div className="px-3 pb-4 safe-bottom">
            <Link
              href="/settings/babies/new"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border p-3 text-sm font-medium text-muted-foreground hover:bg-secondary"
            >
              <Plus className="h-4 w-4" /> Add another baby
            </Link>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
