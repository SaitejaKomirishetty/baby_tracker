import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { invites } from "@/db/schema";
import { getSessionUser } from "@/lib/authz";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { JoinAcceptForm } from "@/components/household/join-accept-form";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const user = await getSessionUser();

  const invite = code
    ? await db.query.invites.findFirst({
        where: eq(invites.code, code.trim().toUpperCase()),
      })
    : null;

  const household = invite
    ? await db.query.households.findFirst({
        where: (h, { eq }) => eq(h.id, invite.householdId),
      })
    : null;

  const expired = invite ? invite.expiresAt.getTime() < Date.now() : false;
  const normalizedCode = code?.trim().toUpperCase() ?? "";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="text-4xl">🐣</span>
          <h1 className="mt-2 text-2xl font-bold">You&apos;re invited!</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>
              {household ? `Join “${household.name}”` : "Household invite"}
            </CardTitle>
            <CardDescription>
              {!invite
                ? "We couldn't find that invite code."
                : expired
                  ? "This invite has expired — ask the household owner for a new one."
                  : `You'll join as a ${invite.role}.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {invite && !expired && user && <JoinAcceptForm code={normalizedCode} />}

            {invite && !expired && !user && (
              <>
                <Link
                  href={`/register?code=${normalizedCode}`}
                  className={buttonVariants({ size: "lg", className: "w-full" })}
                >
                  Create an account & join
                </Link>
                <Link
                  href={`/login?next=${encodeURIComponent(
                    `/join?code=${normalizedCode}`
                  )}`}
                  className={buttonVariants({
                    variant: "outline",
                    size: "lg",
                    className: "w-full",
                  })}
                >
                  I already have an account
                </Link>
              </>
            )}

            {(!invite || expired) && (
              <Link
                href="/dashboard"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "w-full",
                })}
              >
                Go to app
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
