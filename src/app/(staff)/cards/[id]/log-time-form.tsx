"use client";

import { useActionState } from "react";
import { inputClass, Field } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { DurationFields } from "@/components/duration-fields";
import { logTimeOnCard, type CardTimeState } from "../actions";

export function LogTimeForm({ cardId }: { cardId: string }) {
  const action = logTimeOnCard.bind(null, cardId);
  const [state, formAction] = useActionState<CardTimeState, FormData>(
    action,
    undefined,
  );
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Datum" htmlFor="date">
        <input
          id="date"
          name="date"
          type="date"
          required
          defaultValue={today}
          className={inputClass}
        />
      </Field>

      <DurationFields />

      <Field label="Omschrijving" htmlFor="description">
        <textarea
          id="description"
          name="description"
          required
          rows={2}
          placeholder="Wat is er gedaan?"
          className={inputClass}
        />
      </Field>

      <Field label="Ticket-referentie (optioneel)" htmlFor="ticketRef">
        <input id="ticketRef" name="ticketRef" className={inputClass} />
      </Field>

      {state?.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}

      <SubmitButton>Tijd afschrijven</SubmitButton>
    </form>
  );
}
