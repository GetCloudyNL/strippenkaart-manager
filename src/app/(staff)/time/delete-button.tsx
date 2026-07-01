"use client";

import { deleteTimeEntry } from "./actions";

export function DeleteEntryButton({ id }: { id: string }) {
  return (
    <form
      action={async () => {
        if (confirm("Deze boeking verwijderen?")) {
          await deleteTimeEntry(id);
        }
      }}
    >
      <button
        type="submit"
        className="text-sm text-red-600 hover:underline"
      >
        Verwijderen
      </button>
    </form>
  );
}
