"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { inputClass } from "@/components/ui";
import { createTimeEntry, type TimeEntryFormState } from "../time/actions";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function QuickEntry({
  projects,
}: {
  projects: { id: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState<
    TimeEntryFormState,
    FormData
  >(createTimeEntry, undefined);

  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    intervalRef.current = id;
    return () => clearInterval(id);
  }, [running]);

  // Tijdens het lopen wordt de duur afgeleid van de timer; gepauzeerd is hij
  // handmatig aanpasbaar.
  const displayHours = running ? Math.floor(seconds / 3600) : hours;
  const displayMinutes = running
    ? Math.floor((seconds % 3600) / 60)
    : minutes;

  function pause() {
    setHours(Math.floor(seconds / 3600));
    setMinutes(Math.floor((seconds % 3600) / 60));
    setRunning(false);
  }

  function reset() {
    setRunning(false);
    setSeconds(0);
    setHours(0);
    setMinutes(0);
  }

  const today = new Date().toISOString().slice(0, 10);
  const elapsed = `${pad(Math.floor(seconds / 3600))}:${pad(
    Math.floor((seconds % 3600) / 60),
  )}:${pad(seconds % 60)}`;

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="date" value={today} />

      <div className="flex items-center gap-3">
        <span className="font-mono text-2xl tabular-nums">{elapsed}</span>
        <div className="flex gap-2">
          {!running ? (
            <button
              type="button"
              onClick={() => setRunning(true)}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              {seconds > 0 ? "Hervat" : "Start"}
            </button>
          ) : (
            <button
              type="button"
              onClick={pause}
              className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
            >
              Pauze
            </button>
          )}
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-border bg-white px-3 py-1.5 text-sm hover:bg-background"
          >
            Reset
          </button>
        </div>
      </div>

      <select name="projectId" required defaultValue="" className={inputClass}>
        <option value="" disabled>
          Kies een project...
        </option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>

      <input
        name="description"
        required
        placeholder="Omschrijving werkzaamheden"
        className={inputClass}
      />

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-xs text-muted">Uren</span>
          <input
            name="hours"
            type="number"
            min={0}
            value={displayHours}
            readOnly={running}
            onChange={(e) => setHours(Number(e.target.value))}
            className={inputClass}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted">Minuten</span>
          <input
            name="minutes"
            type="number"
            min={0}
            max={59}
            value={displayMinutes}
            readOnly={running}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className={inputClass}
          />
        </label>
      </div>

      {state?.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Opslaan..." : "Boeking opslaan"}
      </button>
    </form>
  );
}
