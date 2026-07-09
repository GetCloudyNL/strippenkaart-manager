"use client";

import { useEffect, useState } from "react";
import { inputClass } from "@/components/ui";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Invoer voor de duur van een boeking: een timer, of begin/eindtijd, of
 * handmatig uren/minuten. Levert de formuliervelden `hours`, `minutes`,
 * `start` en `end` aan het omliggende formulier.
 */
export function DurationFields() {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const displayHours = running ? Math.floor(seconds / 3600) : hours;
  const displayMinutes = running ? Math.floor((seconds % 3600) / 60) : minutes;

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

  function recomputeFromTimes(nextStart: string, nextEnd: string) {
    if (!nextStart || !nextEnd) return;
    const [sh, sm] = nextStart.split(":").map(Number);
    const [eh, em] = nextEnd.split(":").map(Number);
    const diff = eh * 60 + em - (sh * 60 + sm);
    if (diff > 0) {
      setHours(Math.floor(diff / 60));
      setMinutes(diff % 60);
    }
  }

  const elapsed = `${pad(Math.floor(seconds / 3600))}:${pad(
    Math.floor((seconds % 3600) / 60),
  )}:${pad(seconds % 60)}`;

  return (
    <div className="space-y-4 rounded-lg border border-border bg-background/60 p-4">
      {/* Timer */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-2xl tabular-nums">{elapsed}</span>
        {!running ? (
          <button
            type="button"
            onClick={() => setRunning(true)}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            {seconds > 0 ? "Hervat" : "Start timer"}
          </button>
        ) : (
          <button
            type="button"
            onClick={pause}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90"
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

      {/* Begin- en eindtijd */}
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-xs text-muted">Begintijd</span>
          <input
            type="time"
            name="start"
            value={start}
            disabled={running}
            onChange={(e) => {
              setStart(e.target.value);
              recomputeFromTimes(e.target.value, end);
            }}
            className={inputClass}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted">Eindtijd</span>
          <input
            type="time"
            name="end"
            value={end}
            disabled={running}
            onChange={(e) => {
              setEnd(e.target.value);
              recomputeFromTimes(start, e.target.value);
            }}
            className={inputClass}
          />
        </label>
      </div>

      {/* Handmatige duur */}
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-xs text-muted">Uren</span>
          <input
            type="number"
            name="hours"
            min={0}
            value={displayHours}
            readOnly={running}
            onChange={(e) => {
              setHours(Number(e.target.value));
              setStart("");
              setEnd("");
            }}
            className={inputClass}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted">Minuten</span>
          <input
            type="number"
            name="minutes"
            min={0}
            max={59}
            value={displayMinutes}
            readOnly={running}
            onChange={(e) => {
              setMinutes(Number(e.target.value));
              setStart("");
              setEnd("");
            }}
            className={inputClass}
          />
        </label>
      </div>
      <p className="text-xs text-muted">
        Gebruik de timer, of vul een begin- en eindtijd in, of typ de duur
        rechtstreeks.
      </p>
    </div>
  );
}
