"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { signIn, signOut } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { registerSchema } from "@/lib/validators";
import { acceptInviteByCode } from "@/server/household-actions";

export type AuthFormState = { error?: string } | undefined;

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/dashboard" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function authenticate(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  try {
    const redirectTo = String(formData.get("redirectTo") || "/dashboard");
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: redirectTo.startsWith("/") ? redirectTo : "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return { error: "Invalid email or password." };
      }
      return { error: "Something went wrong signing in." };
    }
    // Re-throw redirect / control-flow errors.
    throw error;
  }
}

export async function registerAccount(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    inviteCode: formData.get("inviteCode") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details." };
  }

  const { name, email, password, inviteCode } = parsed.data;

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [created] = await db
    .insert(users)
    .values({ name, email, passwordHash })
    .returning();

  // If they registered via an invite, join the household immediately.
  if (inviteCode) {
    await acceptInviteByCode(inviteCode, created.id).catch(() => null);
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: inviteCode ? "/dashboard" : "/onboarding",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created — please sign in." };
    }
    throw error;
  }
}
