"use client";

import { useActionState } from "react";
import {
  triggerMonthly,
  triggerAlerts,
  type ReportState,
} from "./actions";

function ActionButton({
  action,
  idleLabel,
  busyLabel,
}: {
  action: () => Promise<ReportState>;
  idleLabel: string;
  busyLabel: string;
}) {
  const [state, formAction, pending] = useActionState<ReportState, FormData>(
    async () => action(),
    undefined,
  );

  return (
    <form action={formAction} className="space-y-2">
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        {pending ? busyLabel : idleLabel}
      </button>
      {state?.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
      {state?.message ? (
        <p className="text-sm text-green-700">{state.message}</p>
      ) : null}
    </form>
  );
}

export function ReportButtons() {
  return (
    <div className="flex flex-wrap gap-6">
      <ActionButton
        action={triggerMonthly}
        idleLabel="Maandoverzichten versturen"
        busyLabel="Bezig..."
      />
      <ActionButton
        action={triggerAlerts}
        idleLabel="Alerts versturen (laag saldo/vervaldatum)"
        busyLabel="Bezig..."
      />
    </div>
  );
}
