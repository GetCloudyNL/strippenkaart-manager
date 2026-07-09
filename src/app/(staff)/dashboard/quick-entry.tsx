"use client";

import { useActionState } from "react";
import { inputClass } from "@/components/ui";
import { DurationFields } from "@/components/duration-fields";
import { createTimeEntry, type TimeEntryFormState } from "../time/actions";

export function QuickEntry({
  projects,
}: {
  projects: { id: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState<
    TimeEntryFormState,
    FormData
  >(createTimeEntry, undefined);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="date" value={today} />

      <select name="projectId" required defaultValue="" className={inputClass}>
        <option value="" disabled>
          Kies een project...
        </option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>

      <input
        name="description"
        required
        placeholder="Omschrijving werkzaamheden"
        className={inputClass}
      />

      <DurationFields />

      {state?.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Opslaan..." : "Boeking opslaan"}
      </button>
    </form>
  );
}
