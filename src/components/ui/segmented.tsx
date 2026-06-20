"use client";

import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
  className?: string;
}

/** Big-tap-target segmented control for picking one of a few options. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "grid gap-1 rounded-xl bg-secondary p-1",
        className
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex h-11 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
