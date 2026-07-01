"use client";

import { useActionState } from "react";
import Link from "next/link";
import { inputClass, Field } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import type { ProjectFormState } from "./actions";

type Action = (
  state: ProjectFormState,
  formData: FormData,
) => Promise<ProjectFormState>;

export function ProjectForm({
  action,
  customers,
  project,
}: {
  action: Action;
  customers: { id: string; name: string }[];
  project?: {
    customerId: string;
    name: string;
    billingType: "STRIPPENKAART" | "HOURLY" | "RETAINER" | "FIXED_PRICE";
    hourlyRate: string | null;
    status: "ACTIVE" | "ARCHIVED";
  };
}) {
  const [state, formAction] = useActionState<ProjectFormState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <Field label="Klant" htmlFor="customerId">
        <select
          id="customerId"
          name="customerId"
          defaultValue={project?.customerId ?? ""}
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
      <Field label="Projectnaam" htmlFor="name">
        <input
          id="name"
          name="name"
          required
          defaultValue={project?.name}
          className={inputClass}
        />
      </Field>
      <Field label="Afrekenvorm" htmlFor="billingType">
        <select
          id="billingType"
          name="billingType"
          defaultValue={project?.billingType ?? "HOURLY"}
          className={inputClass}
        >
          <option value="HOURLY">Uurtarief</option>
          <option value="STRIPPENKAART">Strippenkaart</option>
          <option value="RETAINER">Retainer</option>
          <option value="FIXED_PRICE">Vaste prijs</option>
        </select>
      </Field>
      <Field
        label="Uurtarief (optioneel)"
        htmlFor="hourlyRate"
        hint="Laat leeg om het standaardtarief o.b.v. het klanttype te gebruiken."
      >
        <input
          id="hourlyRate"
          name="hourlyRate"
          inputMode="decimal"
          placeholder="bijv. 110"
          defaultValue={project?.hourlyRate ?? ""}
          className={inputClass}
        />
      </Field>
      <Field label="Status" htmlFor="status">
        <select
          id="status"
          name="status"
          defaultValue={project?.status ?? "ACTIVE"}
          className={inputClass}
        >
          <option value="ACTIVE">Actief</option>
          <option value="ARCHIVED">Gearchiveerd</option>
        </select>
      </Field>

      {state?.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton>Opslaan</SubmitButton>
        <Link href="/projects" className="text-sm text-muted hover:underline">
          Annuleren
        </Link>
      </div>
    </form>
  );
}
