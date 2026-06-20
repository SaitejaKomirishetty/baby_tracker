"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { joinHousehold } from "@/server/household-actions";
import { Button } from "@/components/ui/button";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Joining…" : "Join household"}
    </Button>
  );
}

export function JoinAcceptForm({ code }: { code: string }) {
  const [state, action] = useActionState(joinHousehold, undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="code" value={code} />
      {state?.ok === false && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Submit />
    </form>
  );
}
