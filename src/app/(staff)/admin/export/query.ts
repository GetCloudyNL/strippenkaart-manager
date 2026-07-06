import type { Prisma } from "@/generated/prisma/client";

export interface ExportFilter {
  customerId?: string;
  from?: string;
  to?: string;
  onlyUnbilled: boolean;
}

export function parseExportFilter(sp: {
  customerId?: string;
  from?: string;
  to?: string;
  unbilled?: string;
}): ExportFilter {
  return {
    customerId: sp.customerId || undefined,
    from: sp.from || undefined,
    to: sp.to || undefined,
    onlyUnbilled: sp.unbilled === "1",
  };
}

/** Alleen op uurtarief gefactureerde projecten zijn per boeking factureerbaar. */
export function buildExportWhere(
  filter: ExportFilter,
): Prisma.TimeEntryWhereInput {
  const dateFilter =
    filter.from || filter.to
      ? {
          gte: filter.from ? new Date(filter.from) : undefined,
          lte: filter.to ? new Date(`${filter.to}T23:59:59`) : undefined,
        }
      : undefined;

  return {
    date: dateFilter,
    billed: filter.onlyUnbilled ? false : undefined,
    project: {
      billingType: "HOURLY",
      customerId: filter.customerId,
    },
  };
}

export function filterToQuery(filter: ExportFilter): string {
  const params = new URLSearchParams();
  if (filter.customerId) params.set("customerId", filter.customerId);
  if (filter.from) params.set("from", filter.from);
  if (filter.to) params.set("to", filter.to);
  if (filter.onlyUnbilled) params.set("unbilled", "1");
  return params.toString();
}
