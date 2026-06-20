/** Human-friendly "time since" e.g. "2h 5m ago", "just now". */
export function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return "soon";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs < 24) return remMins ? `${hrs}h ${remMins}m ago` : `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/** Compact elapsed string without "ago" — for ongoing timers. */
export function elapsed(from: Date | string, to: Date = new Date()): string {
  const start = typeof from === "string" ? new Date(from) : from;
  const mins = Math.max(0, Math.floor((to.getTime() - start.getTime()) / 60000));
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs < 1) return `${remMins}m`;
  return `${hrs}h ${remMins}m`;
}

export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h < 1) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Value for an <input type="date"> from a Date (local tz). */
export function toDateInput(date: Date = new Date()): string {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 10);
}

/** Value for an <input type="datetime-local"> from a Date (local tz). */
export function toDateTimeLocal(date: Date = new Date()): string {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}

export function ageInMonths(birthDate: Date | string, at: Date = new Date()): number {
  const b = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  return (at.getTime() - b.getTime()) / (1000 * 60 * 60 * 24 * 30.4375);
}

export function formatAge(birthDate: Date | string, at: Date = new Date()): string {
  const b = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  const days = Math.floor((at.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return "not born yet";
  if (days < 14) return `${days} day${days === 1 ? "" : "s"} old`;
  if (days < 90) return `${Math.floor(days / 7)} weeks old`;
  const months = Math.floor(days / 30.4375);
  if (months < 24) return `${months} month${months === 1 ? "" : "s"} old`;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  return remMonths ? `${years}y ${remMonths}m old` : `${years} years old`;
}

export function mlToOz(ml: number): number {
  return ml / 29.5735;
}

export function cToF(c: number): number {
  return (c * 9) / 5 + 32;
}

export function fToC(f: number): number {
  return ((f - 32) * 5) / 9;
}

/** Fever check, normalised to Celsius. >= 38.0°C is the common newborn threshold. */
export function isFever(value: number, unit: "c" | "f"): boolean {
  const c = unit === "f" ? fToC(value) : value;
  return c >= 38;
}

export function formatTemp(value: number, unit: "c" | "f"): string {
  return `${value.toFixed(1)}°${unit.toUpperCase()}`;
}
