import type { RoundingDirection } from "@/generated/prisma/enums";

export interface RoundingRules {
  roundingIncrementMin: number;
  roundingDirection: RoundingDirection;
  minimumPerEntryMin: number;
}

/**
 * Berekent het aantal af te schrijven minuten op basis van de ruwe gewerkte
 * tijd en de afrondingsregels van een strippenkaart.
 *
 * Voorbeeld: ruw 22 min, increment 15, richting UP, minimum 15 => 30 min.
 */
export function calculateChargedMinutes(
  rawMinutes: number,
  rules: RoundingRules,
): number {
  if (rawMinutes <= 0) return 0;

  const increment = Math.max(1, Math.floor(rules.roundingIncrementMin || 1));

  let rounded: number;
  switch (rules.roundingDirection) {
    case "UP":
      rounded = Math.ceil(rawMinutes / increment) * increment;
      break;
    case "DOWN":
      rounded = Math.floor(rawMinutes / increment) * increment;
      break;
    case "NEAREST":
    default:
      rounded = Math.round(rawMinutes / increment) * increment;
      break;
  }

  return Math.max(rounded, rules.minimumPerEntryMin || 0);
}

/** Formatteert minuten als "Xu Ym" (bijv. 90 => "1u 30m"). */
export function formatMinutes(minutes: number): string {
  const sign = minutes < 0 ? "-" : "";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${sign}${m}m`;
  if (m === 0) return `${sign}${h}u`;
  return `${sign}${h}u ${m}m`;
}
