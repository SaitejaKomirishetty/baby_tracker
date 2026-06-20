"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { Segmented } from "@/components/ui/segmented";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-[52px] rounded-xl bg-secondary" />;
  }

  return (
    <Segmented
      value={(theme as "light" | "dark" | "system") ?? "system"}
      onChange={(v) => setTheme(v)}
      options={[
        { value: "light", label: "☀️ Light" },
        { value: "dark", label: "🌙 Dark" },
        { value: "system", label: "💻 Auto" },
      ]}
    />
  );
}

export function ThemeToggleIcon() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-11 w-11" />;

  const next = resolvedTheme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(next)}
      className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
      <Monitor className="hidden" />
    </button>
  );
}
