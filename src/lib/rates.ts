import type { CustomerType } from "@/generated/prisma/enums";
import type { HourlyRates } from "@/lib/settings";

/**
 * Bepaalt het geldende uurtarief: een project-specifiek tarief heeft voorrang,
 * anders het standaardtarief op basis van het klanttype (klant of niet-klant).
 */
export function resolveHourlyRate(
  projectRate: number | null | undefined,
  customerType: CustomerType,
  rates: HourlyRates,
): number {
  if (projectRate != null && projectRate > 0) return projectRate;
  return customerType === "CUSTOMER" ? rates.customer : rates.nonCustomer;
}

/** Bedrag (excl. btw) voor een aantal minuten tegen een uurtarief. */
export function amountForMinutes(minutes: number, hourlyRate: number): number {
  return Math.round((minutes / 60) * hourlyRate * 100) / 100;
}

/** Formatteert een bedrag als euro-string, bijv. "€ 1.234,56". */
export function formatEuro(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}
