"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  createFeed,
  updateFeed,
  createDiaper,
  updateDiaper,
  createSleep,
  updateSleep,
  createTemperature,
  updateTemperature,
  createGrowth,
  updateGrowth,
  createMedication,
  updateMedication,
  createNote,
  updateNote,
  type LogResult,
} from "@/server/log-actions";
import type { LogType } from "@/lib/log-meta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Segmented } from "@/components/ui/segmented";
import { toDateTimeLocal } from "@/lib/format";

type ActionFn = (
  prev: LogResult | undefined,
  formData: FormData
) => Promise<LogResult>;

function resolveAction(type: LogType, babyId?: string, id?: string): ActionFn {
  const create: Record<LogType, (b: string) => ActionFn> = {
    feed: (b) => createFeed.bind(null, b),
    diaper: (b) => createDiaper.bind(null, b),
    sleep: (b) => createSleep.bind(null, b),
    temperature: (b) => createTemperature.bind(null, b),
    growth: (b) => createGrowth.bind(null, b),
    medication: (b) => createMedication.bind(null, b),
    note: (b) => createNote.bind(null, b),
  };
  const update: Record<LogType, (i: string) => ActionFn> = {
    feed: (i) => updateFeed.bind(null, i),
    diaper: (i) => updateDiaper.bind(null, i),
    sleep: (i) => updateSleep.bind(null, i),
    temperature: (i) => updateTemperature.bind(null, i),
    growth: (i) => updateGrowth.bind(null, i),
    medication: (i) => updateMedication.bind(null, i),
    note: (i) => updateNote.bind(null, i),
  };
  return id ? update[type](id) : create[type](babyId!);
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export type LogFormProps = {
  type: LogType;
  babyId?: string;
  /** Existing log row for editing. */
  item?: Record<string, unknown> & { id: string };
  onDone?: () => void;
};

export function LogForm({ type, babyId, item, onDone }: LogFormProps) {
  const router = useRouter();
  const action = React.useMemo(
    () => resolveAction(type, babyId, item?.id),
    [type, babyId, item?.id]
  );
  const [state, formAction] = useActionState(action, undefined);

  React.useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onDone?.();
    }
  }, [state, onDone, router]);

  const dt = (v: unknown) =>
    v ? toDateTimeLocal(new Date(v as string)) : toDateTimeLocal();

  // Controlled segmented values (mirrored into hidden inputs).
  const [feedType, setFeedType] = React.useState<"breast" | "bottle">(
    (item?.type as "breast" | "bottle") ?? "breast"
  );
  const [side, setSide] = React.useState<"left" | "right" | "both">(
    (item?.side as "left" | "right" | "both") ?? "left"
  );
  const [diaperType, setDiaperType] = React.useState<"wet" | "dirty" | "both">(
    (item?.type as "wet" | "dirty" | "both") ?? "wet"
  );
  const [unit, setUnit] = React.useState<"c" | "f">(
    (item?.unit as "c" | "f") ?? "c"
  );

  const submitLabel = item ? "Save changes" : "Log it";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {type === "feed" && (
        <>
          <input type="hidden" name="type" value={feedType} />
          <Field label="Feed type">
            <Segmented
              value={feedType}
              onChange={setFeedType}
              options={[
                { value: "breast", label: "🤱 Breast" },
                { value: "bottle", label: "🍼 Bottle" },
              ]}
            />
          </Field>
          <Field label="Start time">
            <Input
              type="datetime-local"
              name="startTime"
              defaultValue={dt(item?.startTime)}
              required
            />
          </Field>
          {feedType === "breast" ? (
            <>
              <input type="hidden" name="side" value={side} />
              <Field label="Side">
                <Segmented
                  value={side}
                  onChange={setSide}
                  options={[
                    { value: "left", label: "Left" },
                    { value: "right", label: "Right" },
                    { value: "both", label: "Both" },
                  ]}
                />
              </Field>
              <Field label="Duration (minutes)">
                <Input
                  type="number"
                  inputMode="numeric"
                  name="durationMinutes"
                  min={1}
                  placeholder="15"
                  defaultValue={(item?.durationMinutes as number) ?? ""}
                />
              </Field>
            </>
          ) : (
            <Field label="Amount (ml)">
              <Input
                type="number"
                inputMode="numeric"
                name="amountMl"
                min={1}
                placeholder="90"
                defaultValue={(item?.amountMl as number) ?? ""}
              />
            </Field>
          )}
        </>
      )}

      {type === "diaper" && (
        <>
          <input type="hidden" name="type" value={diaperType} />
          <Field label="Type">
            <Segmented
              value={diaperType}
              onChange={setDiaperType}
              options={[
                { value: "wet", label: "💧 Wet" },
                { value: "dirty", label: "💩 Dirty" },
                { value: "both", label: "Both" },
              ]}
            />
          </Field>
          <Field label="Time">
            <Input
              type="datetime-local"
              name="time"
              defaultValue={dt(item?.time)}
              required
            />
          </Field>
        </>
      )}

      {type === "sleep" && (
        <>
          <Field label="Fell asleep">
            <Input
              type="datetime-local"
              name="startTime"
              defaultValue={dt(item?.startTime)}
              required
            />
          </Field>
          <Field label="Woke up (leave blank if still sleeping)">
            <Input
              type="datetime-local"
              name="endTime"
              defaultValue={item?.endTime ? dt(item.endTime) : ""}
            />
          </Field>
        </>
      )}

      {type === "temperature" && (
        <>
          <input type="hidden" name="unit" value={unit} />
          <div className="flex gap-2">
            <Field label="Temperature">
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                name="value"
                placeholder={unit === "c" ? "37.0" : "98.6"}
                defaultValue={(item?.value as number) ?? ""}
                required
              />
            </Field>
            <div className="w-28">
              <Field label="Unit">
                <Segmented
                  value={unit}
                  onChange={setUnit}
                  options={[
                    { value: "c", label: "°C" },
                    { value: "f", label: "°F" },
                  ]}
                />
              </Field>
            </div>
          </div>
          <Field label="Method">
            <Select name="method" defaultValue={(item?.method as string) ?? ""}>
              <option value="">Not specified</option>
              <option value="armpit">Armpit</option>
              <option value="oral">Oral</option>
              <option value="ear">Ear</option>
              <option value="forehead">Forehead</option>
              <option value="rectal">Rectal</option>
            </Select>
          </Field>
          <Field label="Time">
            <Input
              type="datetime-local"
              name="time"
              defaultValue={dt(item?.time)}
              required
            />
          </Field>
        </>
      )}

      {type === "growth" && (
        <>
          <Field label="Weight (grams)">
            <Input
              type="number"
              inputMode="numeric"
              name="weightGrams"
              placeholder="4200"
              defaultValue={(item?.weightGrams as number) ?? ""}
            />
          </Field>
          <Field label="Height / length (cm)">
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              name="heightCm"
              placeholder="55"
              defaultValue={(item?.heightCm as number) ?? ""}
            />
          </Field>
          <Field label="Head circumference (cm)">
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              name="headCircumferenceCm"
              placeholder="38"
              defaultValue={(item?.headCircumferenceCm as number) ?? ""}
            />
          </Field>
          <Field label="Time">
            <Input
              type="datetime-local"
              name="time"
              defaultValue={dt(item?.time)}
              required
            />
          </Field>
        </>
      )}

      {type === "medication" && (
        <>
          <Field label="Medication / vitamin">
            <Input
              name="name"
              placeholder="Vitamin D drops"
              defaultValue={(item?.name as string) ?? ""}
              required
            />
          </Field>
          <div className="flex gap-2">
            <Field label="Dose">
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                name="doseAmount"
                placeholder="400"
                defaultValue={(item?.doseAmount as number) ?? ""}
              />
            </Field>
            <div className="w-28">
              <Field label="Unit">
                <Input
                  name="doseUnit"
                  placeholder="IU"
                  defaultValue={(item?.doseUnit as string) ?? ""}
                />
              </Field>
            </div>
          </div>
          <Field label="Time">
            <Input
              type="datetime-local"
              name="time"
              defaultValue={dt(item?.time)}
              required
            />
          </Field>
        </>
      )}

      {type === "note" && (
        <>
          <Field label="Note">
            <Textarea
              name="text"
              placeholder="What happened?"
              defaultValue={(item?.text as string) ?? ""}
              required
            />
          </Field>
          <Field label="Tags (comma separated)">
            <Input
              name="tags"
              placeholder="milestone, mood"
              defaultValue={
                Array.isArray(item?.tags)
                  ? (item?.tags as string[]).join(", ")
                  : ""
              }
            />
          </Field>
          <Field label="Time">
            <Input
              type="datetime-local"
              name="time"
              defaultValue={dt(item?.time)}
              required
            />
          </Field>
        </>
      )}

      {/* Shared note field for non-note types */}
      {type !== "note" && (
        <Field label="Note (optional)">
          <Input
            name="note"
            placeholder="Anything to remember?"
            defaultValue={(item?.note as string) ?? ""}
          />
        </Field>
      )}

      {state?.ok === false && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Submit label={submitLabel} />
    </form>
  );
}
