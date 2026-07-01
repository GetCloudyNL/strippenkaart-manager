"use client";

import { useActionState } from "react";
import { inputClass, Field } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { saveRates, type SettingsState } from "./actions";

export function SettingsForm({
  rates,
}: {
  rates: { customer: number; nonCustomer: number };
}) {
  const [state, formAction] = useActionState<SettingsState, FormData>(
    saveRates,
    undefined,
  );

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <Field
        label="Uurtarief klanten (€)"
        htmlFor="customer"
        hint="Standaardtarief voor projecten van bestaande klanten."
      >
        <input
          id="customer"
          name="customer"
          inputMode="decimal"
          defaultValue={rates.customer}
          className={inputClass}
        />
      </Field>
      <Field
        label="Uurtarief niet-klanten (€)"
        htmlFor="nonCustomer"
        hint="Standaardtarief voor projecten van niet-klanten."
      >
        <input
          id="nonCustomer"
          name="nonCustomer"
          inputMode="decimal"
          defaultValue={rates.nonCustomer}
          className={inputClass}
        />
      </Field>

      {state?.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
      {state?.success ? (
        <p className="text-sm text-green-600">Opgeslagen.</p>
      ) : null}

      <SubmitButton>Opslaan</SubmitButton>
    </form>
  );
}
