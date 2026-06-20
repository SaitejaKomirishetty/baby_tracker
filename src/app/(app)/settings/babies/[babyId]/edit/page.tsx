import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { babies } from "@/db/schema";
import { getAppContext } from "@/lib/context";
import { getMembership, roleAtLeast } from "@/lib/authz";
import { BabyForm } from "@/components/baby/baby-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EditBabyPage({
  params,
}: {
  params: Promise<{ babyId: string }>;
}) {
  const ctx = await getAppContext();
  if (!ctx) redirect("/login");

  const { babyId } = await params;
  const baby = await db.query.babies.findFirst({ where: eq(babies.id, babyId) });
  if (!baby) notFound();

  const membership = await getMembership(ctx.user.id, baby.householdId);
  if (!membership || !roleAtLeast(membership.role, "owner")) {
    redirect("/dashboard");
  }

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
          <CardTitle className="text-xl">Edit {baby.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <BabyForm baby={baby} />
        </CardContent>
      </Card>
    </div>
  );
}
