export interface DurationInput {
  hours?: number;
  minutes?: number;
  start?: string; // "HH:MM"
  end?: string; // "HH:MM"
}

export interface ResolvedDuration {
  rawMinutes: number;
  startedAt: Date | null;
  endedAt: Date | null;
}

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

function minutesOfDay(value: string): number | null {
  const m = TIME_RE.exec(value.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * Bepaalt de duur op basis van óf een begin- en eindtijd, óf losse uren/minuten.
 * `dateStr` is de dag (YYYY-MM-DD) waarop de begin/eindtijd valt.
 */
export function resolveDuration(
  input: DurationInput,
  dateStr: string,
): ResolvedDuration | { error: string } {
  const hasStart = Boolean(input.start && input.start.trim());
  const hasEnd = Boolean(input.end && input.end.trim());

  if (hasStart || hasEnd) {
    if (!hasStart || !hasEnd) {
      return { error: "Vul zowel een begin- als een eindtijd in." };
    }
    const startMin = minutesOfDay(input.start as string);
    const endMin = minutesOfDay(input.end as string);
    if (startMin === null || endMin === null) {
      return { error: "Ongeldige begin- of eindtijd." };
    }
    const rawMinutes = endMin - startMin;
    if (rawMinutes <= 0) {
      return { error: "De eindtijd moet na de begintijd liggen." };
    }
    return {
      rawMinutes,
      startedAt: new Date(`${dateStr}T${input.start}:00`),
      endedAt: new Date(`${dateStr}T${input.end}:00`),
    };
  }

  const rawMinutes = (input.hours ?? 0) * 60 + (input.minutes ?? 0);
  if (rawMinutes <= 0) {
    return { error: "Vul een duur in (uren/minuten of begin- en eindtijd)." };
  }
  return { rawMinutes, startedAt: null, endedAt: null };
}
