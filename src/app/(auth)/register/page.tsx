import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/register-form";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-2xl font-semibold">
          Create your account
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RegisterForm inviteCode={code} />
      </CardContent>
    </Card>
  );
}
