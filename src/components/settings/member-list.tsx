"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { updateMemberRole, removeMember } from "@/server/household-actions";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";

type Member = {
  memberId: string;
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
  role: "owner" | "caregiver" | "viewer";
};

export function MemberList({
  householdId,
  members,
  currentUserId,
  isOwner,
}: {
  householdId: string;
  members: Member[];
  currentUserId: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [busy, startTransition] = React.useTransition();

  function changeRole(memberId: string, role: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("memberId", memberId);
      fd.set("role", role);
      const res = await updateMemberRole(householdId, fd);
      if (!res.ok) setError(res.error);
      else {
        setError(null);
        router.refresh();
      }
    });
  }

  function remove(memberId: string, name: string) {
    if (!confirm(`Remove ${name} from this household?`)) return;
    startTransition(async () => {
      const res = await removeMember(householdId, memberId);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {members.map((m) => {
        const display = m.name ?? m.email;
        const isSelf = m.userId === currentUserId;
        return (
          <div
            key={m.memberId}
            className="flex items-center gap-3 rounded-xl border border-border p-3"
          >
            <Avatar name={display} src={m.image} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {display} {isSelf && <span className="text-muted-foreground">(you)</span>}
              </p>
              <p className="truncate text-xs text-muted-foreground">{m.email}</p>
            </div>
            {isOwner && !isSelf ? (
              <div className="flex items-center gap-1">
                <div className="w-32">
                  <Select
                    value={m.role}
                    disabled={busy}
                    onChange={(e) => changeRole(m.memberId, e.target.value)}
                    className="h-9 text-sm"
                  >
                    <option value="owner">Owner</option>
                    <option value="caregiver">Caregiver</option>
                    <option value="viewer">Viewer</option>
                  </Select>
                </div>
                <button
                  onClick={() => remove(m.memberId, display)}
                  disabled={busy}
                  aria-label="Remove member"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Badge className="capitalize">{m.role}</Badge>
            )}
          </div>
        );
      })}
    </div>
  );
}
