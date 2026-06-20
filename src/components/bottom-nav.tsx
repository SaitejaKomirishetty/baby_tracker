"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListChecks, LineChart, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/log", label: "Log", icon: ListChecks },
  { href: "/analytics", label: "Stats", icon: LineChart },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur safe-bottom">
      <div className="mx-auto flex max-w-2xl items-stretch justify-around">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                className={cn("h-6 w-6", active && "scale-110")}
                strokeWidth={active ? 2.4 : 2}
              />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
