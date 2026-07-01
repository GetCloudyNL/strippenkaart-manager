"use client";

import { useActionState } from "react";
import Link from "next/link";
import { inputClass, Field } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import type { CardTypeFormState } from "./actions";

type Action = (
  state: CardTypeFormState,
  formData: FormData,
) => Promise<CardTypeFormState>;

const INCREMENTS = [5, 10, 15, 30, 60];

export function CardTypeForm({
  action,
  cardType,
}: {
  action: Action;
  cardType?: {
    name: string;
    totalHours: number;
    price: string;
    roundingIncrementMin: number;
    roundingDirection: "UP" | "NEAREST" | "DOWN";
    minimumPerEntryMin: number;
    validityMonths: number | null;
    hostbillProductId: number | null;
    termsText: string | null;
    active: boolean;
  };
}) {
  const [state, formAction] = useActionState<CardTypeFormState, FormData>(
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
          defaultValue={cardType?.name}
          className={inputClass}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Totaal (uren)" htmlFor="totalHours">
          <input
            id="totalHours"
            name="totalHours"
            inputMode="decimal"
            required
            placeholder="bijv. 8"
            defaultValue={cardType?.totalHours ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Prijs (€)" htmlFor="price">
          <input
            id="price"
            name="price"
            inputMode="decimal"
            required
            defaultValue={cardType?.price ?? ""}
            className={inputClass}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Afronding per (min)"
          htmlFor="roundingIncrementMin"
          hint="Eenheid waarop tijd wordt afgerond."
        >
          <select
            id="roundingIncrementMin"
            name="roundingIncrementMin"
            defaultValue={cardType?.roundingIncrementMin ?? 15}
            className={inputClass}
          >
            {INCREMENTS.map((n) => (
              <option key={n} value={n}>
                {n} min
              </option>
            ))}
          </select>
        </Field>
        <Field label="Richting" htmlFor="roundingDirection">
          <select
            id="roundingDirection"
            name="roundingDirection"
            defaultValue={cardType?.roundingDirection ?? "UP"}
            className={inputClass}
          >
            <option value="UP">Naar boven</option>
            <option value="NEAREST">Dichtstbijzijnde</option>
            <option value="DOWN">Naar beneden</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Minimum per boeking (min)"
          htmlFor="minimumPerEntryMin"
        >
          <input
            id="minimumPerEntryMin"
            name="minimumPerEntryMin"
            type="number"
            min={0}
            defaultValue={cardType?.minimumPerEntryMin ?? 0}
            className={inputClass}
          />
        </Field>
        <Field
          label="Geldigheid (maanden)"
          htmlFor="validityMonths"
          hint="Leeg = onbeperkt geldig."
        >
          <input
            id="validityMonths"
            name="validityMonths"
            type="number"
            min={1}
            defaultValue={cardType?.validityMonths ?? ""}
            className={inputClass}
          />
        </Field>
      </div>
      <Field
        label="HostBill product-ID (optioneel)"
        htmlFor="hostbillProductId"
        hint="Voor automatische aanmaak bij een bestelling (fase 4)."
      >
        <input
          id="hostbillProductId"
          name="hostbillProductId"
          type="number"
          min={1}
          defaultValue={cardType?.hostbillProductId ?? ""}
          className={inputClass}
        />
      </Field>
      <Field label="Voorwaarden (tekst)" htmlFor="termsText">
        <textarea
          id="termsText"
          name="termsText"
          rows={3}
          defaultValue={cardType?.termsText ?? ""}
          className={inputClass}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="active"
          defaultChecked={cardType?.active ?? true}
        />
        Actief (beschikbaar voor nieuwe kaarten)
      </label>

      {state?.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton>Opslaan</SubmitButton>
        <Link
          href="/admin/card-types"
          className="text-sm text-muted hover:underline"
        >
          Annuleren
        </Link>
      </div>
    </form>
  );
}
