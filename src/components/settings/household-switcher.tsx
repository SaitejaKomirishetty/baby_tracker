"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { setActiveHousehold } from "@/server/household-actions";
import { Select } from "@/components/ui/select";

export function HouseholdSwitcher({
  households,
  activeId,
}: {
  households: { id: string; name: string; role: string }[];
  activeId: string;
}) {
  const router = useRouter();
  const [busy, startTransition] = React.useTransition();

  return (
    <Select
      value={activeId}
      disabled={busy}
      onChange={(e) =>
        startTransition(async () => {
          await setActiveHousehold(e.target.value);
          router.refresh();
        })
      }
    >
      {households.map((h) => (
        <option key={h.id} value={h.id}>
          {h.name} ({h.role})
        </option>
      ))}
    </Select>
  );
}
