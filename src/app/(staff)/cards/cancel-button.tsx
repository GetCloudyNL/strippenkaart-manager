"use client";

import { cancelCard } from "./actions";

export function CancelCardButton({ id }: { id: string }) {
  return (
    <form
      action={async () => {
        if (confirm("Deze strippenkaart annuleren?")) {
          await cancelCard(id);
        }
      }}
    >
      <button
        type="submit"
        className="rounded-md border border-border bg-white px-3 py-2 text-sm text-red-600 hover:bg-background"
      >
        Kaart annuleren
      </button>
    </form>
  );
}
