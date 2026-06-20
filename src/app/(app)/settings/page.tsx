import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Pencil, LogOut } from "lucide-react";
import { getAppContext } from "@/lib/context";
import { getHouseholdDetail } from "@/server/queries";
import { roleAtLeast } from "@/lib/authz";
import { signOutAction } from "@/server/auth-actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { MemberList } from "@/components/settings/member-list";
import { InviteManager } from "@/components/settings/invite-manager";
import { HouseholdSwitcher } from "@/components/settings/household-switcher";
import { formatAge } from "@/lib/format";

export default async function SettingsPage() {
  const ctx = await getAppContext();
  if (!ctx) redirect("/login");
  if (!ctx.activeHousehold) redirect("/onboarding");

  const isOwner = roleAtLeast(ctx.role!, "owner");
  const { members, pendingInvites } = await getHouseholdDetail(
    ctx.activeHousehold.id
  );

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-3xl font-semibold">Settings</h1>

      {/* Profile */}
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <Avatar name={ctx.user.name ?? ctx.user.email ?? "?"} src={ctx.user.image} size={48} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{ctx.user.name ?? "You"}</p>
            <p className="truncate text-sm text-muted-foreground">
              {ctx.user.email}
            </p>
          </div>
          <form action={signOutAction}>
            <Button type="submit" variant="outline" size="sm">
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Dark mode is great for night feeds.</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>

      {/* Babies */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Babies</CardTitle>
          {isOwner && (
            <Link
              href="/settings/babies/new"
              className={buttonVariants({ size: "sm", variant: "secondary" })}
            >
              <Plus className="h-4 w-4" /> Add
            </Link>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {ctx.babies.length === 0 && (
            <p className="text-sm text-muted-foreground">No babies yet.</p>
          )}
          {ctx.babies.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-3 rounded-xl border border-border p-3"
            >
              <Avatar name={b.name} src={b.photoUrl} size={40} />
              <div className="flex-1">
                <p className="font-medium">{b.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatAge(b.birthDate)}
                </p>
              </div>
              {isOwner && (
                <Link
                  href={`/settings/babies/${b.id}/edit`}
                  className={buttonVariants({ size: "icon", variant: "ghost" })}
                  aria-label={`Edit ${b.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </Link>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Household */}
      <Card>
        <CardHeader>
          <CardTitle>{ctx.activeHousehold.name}</CardTitle>
          <CardDescription>
            You are {isOwner ? "an owner" : `a ${ctx.role}`} of this household.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {ctx.households.length > 1 && (
            <div>
              <p className="mb-1.5 text-sm font-medium">Active household</p>
              <HouseholdSwitcher
                households={ctx.households}
                activeId={ctx.activeHousehold.id}
              />
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-medium">
              Caregivers ({members.length})
            </p>
            <MemberList
              householdId={ctx.activeHousehold.id}
              members={members}
              currentUserId={ctx.user.id}
              isOwner={isOwner}
            />
          </div>
        </CardContent>
      </Card>

      {/* Invites (owner only) */}
      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle>Invite caregivers</CardTitle>
            <CardDescription>
              Share a link so family can join this household.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InviteManager
              householdId={ctx.activeHousehold.id}
              pending={pendingInvites}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
