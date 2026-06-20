import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoginForm } from "@/components/auth/login-form";
import { signInWithGoogle } from "@/server/auth-actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const googleEnabled =
    !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-2xl font-semibold">
          Welcome back
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <LoginForm redirectTo={next} />

        {googleEnabled && (
          <>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              OR
              <span className="h-px flex-1 bg-border" />
            </div>
            <form action={signInWithGoogle}>
              <Button type="submit" variant="outline" size="lg" className="w-full">
                Continue with Google
              </Button>
            </form>
          </>
        )}

        <div className="rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Demo accounts</p>
          <p>alice@example.com · owner</p>
          <p>bob@example.com · caregiver</p>
          <p>grandma@example.com · viewer</p>
          <p className="mt-1">Password for all: password123</p>
        </div>
      </CardContent>
    </Card>
  );
}
