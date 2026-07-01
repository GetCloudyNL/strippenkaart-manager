"use client";

import { useActionState } from "react";
import { runSync, type SyncState } from "./actions";

export function SyncButton() {
  const [state, formAction, pending] = useActionState<SyncState, FormData>(
    async () => runSync(),
    undefined,
  );

  return (
    <form action={formAction} className="space-y-3">
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Bezig met synchroniseren..." : "Nu synchroniseren"}
      </button>

      {state?.ok === false ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
      {state?.ok === true ? (
        <div className="rounded-md border border-border bg-background p-3 text-sm">
          {state.summary.configured ? (
            <ul className="space-y-1">
              <li>Opgehaald: {state.summary.fetched}</li>
              <li>Aangemaakt: {state.summary.created}</li>
              <li>Overgeslagen: {state.summary.skipped}</li>
              <li>Fouten: {state.summary.errors}</li>
              <li>Laatste order-id: {state.summary.lastOrderId ?? "-"}</li>
            </ul>
          ) : (
            <p className="text-muted">
              HostBill is niet geconfigureerd. Vul HOSTBILL_API_URL, _ID en _KEY
              in de omgeving in.
            </p>
          )}
        </div>
      ) : null}
    </form>
  );
}
