"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Trash2 } from "lucide-react";
import { createInvite, revokeInvite } from "@/server/household-actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type Pending = {
  id: string;
  code: string;
  role: string;
  email: string | null;
  expiresAt: Date | string;
};

export function InviteManager({
  householdId,
  pending,
}: {
  householdId: string;
  pending: Pending[];
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [created, setCreated] = React.useState<{ code: string; url: string } | null>(
    null
  );
  const [copied, setCopied] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await createInvite(householdId, undefined, fd);
    setBusy(false);
    if (!res.ok) setError(res.error);
    else {
      setCreated(res.data as { code: string; url: string });
      router.refresh();
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable */
    }
  }

  async function onRevoke(id: string) {
    await revokeInvite(id);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="role">Invite a caregiver as</Label>
          <Select id="role" name="role" defaultValue="caregiver">
            <option value="caregiver">Caregiver (can log & view)</option>
            <option value="viewer">Viewer (read-only)</option>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Their email (optional)</Label>
          <Input id="email" name="email" type="email" placeholder="optional" />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={busy}>
          {busy ? "Generating…" : "Generate invite link"}
        </Button>
      </form>

      {created && (
        <div className="flex flex-col gap-2 rounded-xl bg-primary/10 p-3">
          <p className="text-sm font-medium">Share this link:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-lg bg-background px-2 py-1.5 text-xs">
              {created.url}
            </code>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={() => copy(created.url)}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Code: <span className="font-mono font-semibold">{created.code}</span>{" "}
            · expires in 7 days
          </p>
        </div>
      )}

      {pending.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">
            Pending invites
          </p>
          {pending.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-xl border border-border p-3"
            >
              <div>
                <p className="font-mono text-sm font-semibold">{p.code}</p>
                <p className="text-xs text-muted-foreground">
                  {p.role}
                  {p.email ? ` · ${p.email}` : ""}
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="text-destructive"
                onClick={() => onRevoke(p.id)}
                aria-label="Revoke invite"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
