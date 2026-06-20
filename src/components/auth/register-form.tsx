"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { registerAccount } from "@/server/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Creating account…" : "Create account"}
    </Button>
  );
}

export function RegisterForm({ inviteCode }: { inviteCode?: string }) {
  const [state, formAction] = useActionState(registerAccount, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {inviteCode && (
        <>
          <input type="hidden" name="inviteCode" value={inviteCode} />
          <p className="rounded-xl bg-primary/10 p-3 text-sm text-primary">
            You&apos;re joining a household with invite code{" "}
            <span className="font-mono font-semibold">{inviteCode}</span>
          </p>
        </>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Your name</Label>
        <Input id="name" name="name" autoComplete="name" placeholder="Alex" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          required
        />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <SubmitButton />

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary">
          Sign in
        </Link>
      </p>
    </form>
  );
}
