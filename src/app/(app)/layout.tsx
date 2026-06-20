import { redirect } from "next/navigation";
import { getAppContext } from "@/lib/context";
import { BottomNav } from "@/components/bottom-nav";
import { BabySwitcher } from "@/components/baby-switcher";
import { ThemeToggleIcon } from "@/components/theme-toggle";
import { roleAtLeast } from "@/lib/authz";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAppContext();
  if (!ctx) redirect("/login");
  if (!ctx.activeHousehold) redirect("/onboarding");

  const canManage = roleAtLeast(ctx.role!, "owner");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col">
      <header className="safe-top sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-border bg-background/85 px-3 py-2 backdrop-blur">
        <BabySwitcher
          babies={ctx.babies}
          activeBabyId={ctx.activeBaby?.id ?? null}
          canAdd={canManage}
        />
        <div className="flex items-center gap-1">
          <span className="hidden truncate px-2 text-xs text-muted-foreground sm:block">
            {ctx.activeHousehold.name}
          </span>
          <ThemeToggleIcon />
        </div>
      </header>

      <main className="flex-1 px-4 pb-28 pt-3">{children}</main>

      <BottomNav />
    </div>
  );
}
