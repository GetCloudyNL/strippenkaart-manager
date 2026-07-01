"use client";

import { useActionState } from "react";
import Link from "next/link";
import { inputClass, Field } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import type { CustomerFormState } from "./actions";

type Action = (
  state: CustomerFormState,
  formData: FormData,
) => Promise<CustomerFormState>;

export function CustomerForm({
  action,
  customer,
}: {
  action: Action;
  customer?: {
    name: string;
    company: string | null;
    email: string;
    type: "CUSTOMER" | "NON_CUSTOMER";
    notifyOnCompletion: boolean;
  };
}) {
  const [state, formAction] = useActionState<CustomerFormState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <Field label="Naam" htmlFor="name">
        <input
          id="name"
          name="name"
          required
          defaultValue={customer?.name}
          className={inputClass}
        />
      </Field>
      <Field label="Bedrijf" htmlFor="company">
        <input
          id="company"
          name="company"
          defaultValue={customer?.company ?? ""}
          className={inputClass}
        />
      </Field>
      <Field label="E-mail" htmlFor="email">
        <input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={customer?.email}
          className={inputClass}
        />
      </Field>
      <Field
        label="Type"
        htmlFor="type"
        hint="Bepaalt welk standaard uurtarief geldt."
      >
        <select
          id="type"
          name="type"
          defaultValue={customer?.type ?? "CUSTOMER"}
          className={inputClass}
        >
          <option value="CUSTOMER">Klant</option>
          <option value="NON_CUSTOMER">Niet-klant</option>
        </select>
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="notifyOnCompletion"
          defaultChecked={customer?.notifyOnCompletion ?? false}
        />
        Mail sturen na afronden werkzaamheden
      </label>

      {state?.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton>Opslaan</SubmitButton>
        <Link href="/customers" className="text-sm text-muted hover:underline">
          Annuleren
        </Link>
      </div>
    </form>
  );
}
