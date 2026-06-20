"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

/**
 * Resolve a browser-local `datetime-local` value (e.g. "2026-06-20T09:05",
 * which carries no zone) into an absolute UTC instant. `new Date(value)` here
 * runs in the BROWSER, so it uses the user's own timezone — the one place it's
 * reliably known. We send that instant so the server stores the exact moment
 * the user picked, regardless of the server's own timezone.
 */
function localToISO(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

/**
 * A native datetime picker that submits a timezone-safe ISO instant. The
 * visible <input> has no `name` (so it isn't submitted); a hidden input
 * carries the converted ISO string under `name`. Drop-in replacement for
 * `<Input type="datetime-local" name=... defaultValue=... />`.
 */
export function DateTimeField({
  name,
  defaultValue = "",
  required,
  ...props
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "name" | "defaultValue" | "type"
>) {
  const [iso, setIso] = React.useState(() => localToISO(defaultValue));

  return (
    <>
      <Input
        type="datetime-local"
        defaultValue={defaultValue}
        required={required}
        onChange={(e) => setIso(localToISO(e.target.value))}
        {...props}
      />
      <input type="hidden" name={name} value={iso} readOnly />
    </>
  );
}
