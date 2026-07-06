"use client";

import { useActionState } from "react";
import { markBilled, type MarkBilledState } from "./actions";

export function MarkBilledButton({
  customerId,
  from,
  to,
  disabled,
}: {
  customerId?: string;
  from?: string;
  to?: string;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState<
    MarkBilledState,
    FormData
  >(markBilled, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="customerId" value={customerId ?? ""} />
      <input type="hidden" name="from" value={from ?? ""} />
      <input type="hidden" name="to" value={to ?? ""} />
      <button
        type="submit"
        disabled={pending || disabled}
        className="inline-flex items-center rounded-md border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-background disabled:opacity-60"
      >
        {pending ? "Bezig..." : "Markeer ongefactureerde als gefactureerd"}
      </button>
      {state?.message ? (
        <p className="text-sm text-green-700">{state.message}</p>
      ) : null}
      {state?.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
    </form>
  );
}
