"use client";

import { useActionState } from "react";
import Link from "next/link";
import { inputClass, Field } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createCard, type CardFormState } from "./actions";

export function CardForm({
  customers,
  cardTypes,
  projects,
}: {
  customers: { id: string; name: string }[];
  cardTypes: { id: string; name: string }[];
  projects: { id: string; label: string }[];
}) {
  const [state, formAction] = useActionState<CardFormState, FormData>(
    createCard,
    undefined,
  );
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <Field label="Klant" htmlFor="customerId">
        <select
          id="customerId"
          name="customerId"
          defaultValue=""
          required
          className={inputClass}
        >
          <option value="" disabled>
            Kies een klant...
          </option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Kaarttype" htmlFor="cardTypeId">
        <select
          id="cardTypeId"
          name="cardTypeId"
          defaultValue=""
          required
          className={inputClass}
        >
          <option value="" disabled>
            Kies een kaarttype...
          </option>
          {cardTypes.map((ct) => (
            <option key={ct.id} value={ct.id}>
              {ct.name}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="Project (optioneel)"
        htmlFor="projectId"
        hint="Koppel de kaart aan een specifiek project, of laat leeg voor de hele klant."
      >
        <select
          id="projectId"
          name="projectId"
          defaultValue=""
          className={inputClass}
        >
          <option value="">Geen / hele klant</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="Aankoopdatum"
        htmlFor="purchasedAt"
        hint="Bepaalt samen met de geldigheid de vervaldatum."
      >
        <input
          id="purchasedAt"
          name="purchasedAt"
          type="date"
          defaultValue={today}
          className={inputClass}
        />
      </Field>

      {state?.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton>Aanmaken</SubmitButton>
        <Link href="/cards" className="text-sm text-muted hover:underline">
          Annuleren
        </Link>
      </div>
    </form>
  );
}
