"use client";

import { useActionState } from "react";
import Link from "next/link";
import { inputClass, Field } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import type { TimeEntryFormState } from "./actions";

type Action = (
  state: TimeEntryFormState,
  formData: FormData,
) => Promise<TimeEntryFormState>;

export function TimeEntryForm({
  action,
  projects,
  entry,
}: {
  action: Action;
  projects: { id: string; label: string }[];
  entry?: {
    projectId: string;
    date: string;
    description: string;
    hours: number;
    minutes: number;
    ticketRef: string | null;
  };
}) {
  const [state, formAction] = useActionState<TimeEntryFormState, FormData>(
    action,
    undefined,
  );
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <Field label="Project" htmlFor="projectId">
        <select
          id="projectId"
          name="projectId"
          defaultValue={entry?.projectId ?? ""}
          required
          className={inputClass}
        >
          <option value="" disabled>
            Kies een project...
          </option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Datum" htmlFor="date">
        <input
          id="date"
          name="date"
          type="date"
          required
          defaultValue={entry?.date ?? today}
          className={inputClass}
        />
      </Field>
      <Field label="Omschrijving" htmlFor="description">
        <textarea
          id="description"
          name="description"
          required
          rows={3}
          defaultValue={entry?.description}
          className={inputClass}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Uren" htmlFor="hours">
          <input
            id="hours"
            name="hours"
            type="number"
            min={0}
            defaultValue={entry?.hours ?? 0}
            className={inputClass}
          />
        </Field>
        <Field label="Minuten" htmlFor="minutes">
          <input
            id="minutes"
            name="minutes"
            type="number"
            min={0}
            max={59}
            defaultValue={entry?.minutes ?? 0}
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="Ticket-referentie (optioneel)" htmlFor="ticketRef">
        <input
          id="ticketRef"
          name="ticketRef"
          defaultValue={entry?.ticketRef ?? ""}
          className={inputClass}
        />
      </Field>

      {state?.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton>Opslaan</SubmitButton>
        <Link href="/time" className="text-sm text-muted hover:underline">
          Annuleren
        </Link>
      </div>
    </form>
  );
}
