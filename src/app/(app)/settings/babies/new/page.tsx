import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getAppContext } from "@/lib/context";
import { roleAtLeast } from "@/lib/authz";
import { BabyForm } from "@/components/baby/baby-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewBabyPage() {
  const ctx = await getAppContext();
  if (!ctx) redirect("/login");
  if (!ctx.activeHousehold) redirect("/onboarding");
  if (!roleAtLeast(ctx.role!, "owner")) redirect("/dashboard");

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/settings"
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Settings
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Add a baby</CardTitle>
        </CardHeader>
        <CardContent>
          <BabyForm householdId={ctx.activeHousehold.id} />
        </CardContent>
      </Card>
    </div>
  );
}
