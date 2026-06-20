"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createHousehold, joinHousehold } from "@/server/household-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Please wait…" : label}
    </Button>
  );
}

export function OnboardingForm({ defaultCode }: { defaultCode?: string }) {
  const [mode, setMode] = useState<"create" | "join">(
    defaultCode ? "join" : "create"
  );
  const [createState, createAction] = useActionState(createHousehold, undefined);
  const [joinState, joinAction] = useActionState(joinHousehold, undefined);

  return (
    <div className="flex flex-col gap-5">
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: "create", label: "Create household" },
          { value: "join", label: "Join with code" },
        ]}
      />

      {mode === "create" ? (
        <form action={createAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Household name</Label>
            <Input
              id="name"
              name="name"
              placeholder="The Smith Family"
              required
            />
            <p className="text-xs text-muted-foreground">
              You&apos;ll be the owner — you can invite caregivers afterwards.
            </p>
          </div>
          {createState?.ok === false && (
            <p className="text-sm text-destructive">{createState.error}</p>
          )}
          <Submit label="Create household" />
        </form>
      ) : (
        <form action={joinAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code">Invite code</Label>
            <Input
              id="code"
              name="code"
              defaultValue={defaultCode}
              placeholder="e.g. K7P2QX9M"
              autoCapitalize="characters"
              className="font-mono tracking-widest"
              required
            />
          </div>
          {joinState?.ok === false && (
            <p className="text-sm text-destructive">{joinState.error}</p>
          )}
          <Submit label="Join household" />
        </form>
      )}
    </div>
  );
}
