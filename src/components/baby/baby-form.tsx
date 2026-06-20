"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import type { Baby } from "@/db/schema";
import { createBaby, updateBaby, deleteBaby } from "@/server/baby-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { toDateInput } from "@/lib/format";

// Client-side schema (string inputs); the server re-validates & coerces.
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  birthDate: z.string().min(1, "Birth date is required"),
  sex: z.enum(["male", "female", "unspecified"]),
  birthWeightGrams: z.string().optional(),
  birthLengthCm: z.string().optional(),
  birthHeadCircumferenceCm: z.string().optional(),
  photoUrl: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

export function BabyForm({
  householdId,
  baby,
}: {
  householdId?: string;
  baby?: Baby;
}) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [deleting, startDelete] = React.useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: baby?.name ?? "",
      birthDate: baby?.birthDate ? toDateInput(new Date(baby.birthDate)) : "",
      sex: baby?.sex ?? "unspecified",
      birthWeightGrams: baby?.birthWeightGrams?.toString() ?? "",
      birthLengthCm: baby?.birthLengthCm?.toString() ?? "",
      birthHeadCircumferenceCm: baby?.birthHeadCircumferenceCm?.toString() ?? "",
      photoUrl: baby?.photoUrl ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => fd.set(k, v ?? ""));
    const action = baby
      ? updateBaby.bind(null, baby.id)
      : createBaby.bind(null, householdId!);
    const res = await action(undefined, fd);
    // On success the action redirects; only failures return here.
    if (res && !res.ok) setServerError(res.error);
  }

  function onDelete() {
    if (!baby) return;
    if (!confirm(`Delete ${baby.name}'s profile and all their logs?`)) return;
    startDelete(async () => {
      const res = await deleteBaby(baby.id);
      if (res && !res.ok) setServerError(res.error);
      else router.push("/dashboard");
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" {...register("name")} placeholder="Baby's name" />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="birthDate">Birth date</Label>
        <Input id="birthDate" type="date" {...register("birthDate")} />
        {errors.birthDate && (
          <p className="text-sm text-destructive">{errors.birthDate.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sex">Sex (for growth percentiles)</Label>
        <Select id="sex" {...register("sex")}>
          <option value="unspecified">Prefer not to say</option>
          <option value="female">Girl</option>
          <option value="male">Boy</option>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="birthWeightGrams">Birth weight (g)</Label>
          <Input
            id="birthWeightGrams"
            type="number"
            inputMode="numeric"
            {...register("birthWeightGrams")}
            placeholder="3300"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="birthLengthCm">Birth length (cm)</Label>
          <Input
            id="birthLengthCm"
            type="number"
            inputMode="decimal"
            step="0.1"
            {...register("birthLengthCm")}
            placeholder="50"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="birthHeadCircumferenceCm">
          Head circumference at birth (cm)
        </Label>
        <Input
          id="birthHeadCircumferenceCm"
          type="number"
          inputMode="decimal"
          step="0.1"
          {...register("birthHeadCircumferenceCm")}
          placeholder="35"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="photoUrl">Photo URL (optional)</Label>
        <Input
          id="photoUrl"
          type="url"
          {...register("photoUrl")}
          placeholder="https://…"
        />
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : baby ? "Save changes" : "Add baby"}
      </Button>

      {baby && (
        <Button
          type="button"
          variant="ghost"
          className="text-destructive"
          onClick={onDelete}
          disabled={deleting}
        >
          Delete profile
        </Button>
      )}
    </form>
  );
}
