import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { OnboardingForm } from "@/components/household/onboarding-form";
import { getAppContext } from "@/lib/context";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const ctx = await getAppContext();
  if (!ctx) redirect("/login");
  // Already has a household — no need to onboard.
  if (ctx.activeHousehold) redirect("/dashboard");

  const { code } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="text-4xl">🐣</span>
          <h1 className="mt-2 text-2xl font-bold">Welcome, {ctx.user.name?.split(" ")[0] ?? "there"}!</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Let&apos;s get set up</CardTitle>
            <CardDescription>
              Create a household for your family, or join one you&apos;ve been
              invited to.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OnboardingForm defaultCode={code} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
