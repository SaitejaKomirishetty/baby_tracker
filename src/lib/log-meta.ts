import {
  Milk,
  Droplets,
  Moon,
  Thermometer,
  Ruler,
  Pill,
  NotebookPen,
  type LucideIcon,
} from "lucide-react";

export type LogType =
  | "feed"
  | "diaper"
  | "sleep"
  | "temperature"
  | "growth"
  | "medication"
  | "note";

export type LogMeta = {
  key: LogType;
  label: string;
  /** Tailwind color token (matches --color-* in globals.css). */
  color: string;
  icon: LucideIcon;
};

export const LOG_META: Record<LogType, LogMeta> = {
  feed: { key: "feed", label: "Feed", color: "feed", icon: Milk },
  diaper: { key: "diaper", label: "Diaper", color: "diaper", icon: Droplets },
  sleep: { key: "sleep", label: "Sleep", color: "sleep", icon: Moon },
  temperature: {
    key: "temperature",
    label: "Temp",
    color: "temp",
    icon: Thermometer,
  },
  growth: { key: "growth", label: "Growth", color: "growth", icon: Ruler },
  medication: {
    key: "medication",
    label: "Meds",
    color: "med",
    icon: Pill,
  },
  note: { key: "note", label: "Note", color: "note", icon: NotebookPen },
};

export const LOG_ORDER: LogType[] = [
  "feed",
  "diaper",
  "sleep",
  "temperature",
  "growth",
  "medication",
  "note",
];
