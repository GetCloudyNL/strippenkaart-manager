import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, LinkButton, inputClass } from "@/components/ui";
import { StatCard } from "@/components/stat-card";
import { formatMinutes } from "@/lib/rounding";
import { getHourlyRates } from "@/lib/settings";
import { resolveHourlyRate, amountForMinutes, formatEuro } from "@/lib/rates";
import { parseExportFilter, buildExportWhere, filterToQuery } from "./query";
import { MarkBilledButton } from "./mark-billed-button";

const dateFmt = new Intl.DateTimeFormat("nl-NL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export default async function ExportPage({
  searchParams,
}: {
  searchParams: Promise<{
    customerId?: string;
    from?: string;
    to?: string;
    unbilled?: string;
  }>;
}) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const filter = parseExportFilter(sp);

  const [customers, entries, rates] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.timeEntry.findMany({
      where: buildExportWhere(filter),
      include: { project: { include: { customer: true } }, user: true },
      orderBy: { date: "asc" },
    }),
    getHourlyRates(),
  ]);

  const rows = entries.flatMap((e) => {
    if (!e.project) return [];
    const rate = resolveHourlyRate(
      e.project.hourlyRate ? Number(e.project.hourlyRate) : null,
      e.project.customer.type,
      rates,
    );
    return [{ e, project: e.project, amount: amountForMinutes(e.chargedMinutes, rate) }];
  });

  const totalMinutes = rows.reduce((s, r) => s + r.e.chargedMinutes, 0);
  const totalAmount = rows.reduce((s, r) => s + r.amount, 0);
  const unbilledCount = rows.filter((r) => !r.e.billed).length;
  const unbilledAmount = rows
    .filter((r) => !r.e.billed)
    .reduce((s, r) => s + r.amount, 0);

  const csvHref = `/admin/export/csv${
    filterToQuery(filter) ? `?${filterToQuery(filter)}` : ""
  }`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Facturatie-export"
        description="Boekingen op uurtarief exporteren en als gefactureerd markeren."
        action={<LinkButton href={csvHref}>Download CSV</LinkButton>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label="Boekingen" value={rows.length} />
        <StatCard label="Totaal tijd" value={formatMinutes(totalMinutes)} />
        <StatCard label="Totaal bedrag" value={formatEuro(totalAmount)} />
        <StatCard
          label="Nog te factureren"
          value={formatEuro(unbilledAmount)}
          hint={`${unbilledCount} boeking(en)`}
        />
      </div>

      <Card>
        <form className="grid grid-cols-1 gap-4 md:grid-cols-5" method="get">
          <div className="space-y-1">
            <label className="text-sm font-medium">Klant</label>
            <select
              name="customerId"
              defaultValue={filter.customerId ?? ""}
              className={inputClass}
            >
              <option value="">Alle</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Vanaf</label>
            <input
              type="date"
              name="from"
              defaultValue={filter.from ?? ""}
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Tot</label>
            <input
              type="date"
              name="to"
              defaultValue={filter.to ?? ""}
              className={inputClass}
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="unbilled"
                value="1"
                defaultChecked={filter.onlyUnbilled}
              />
              Alleen ongefactureerd
            </label>
          </div>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Filter
            </button>
            <Link
              href="/admin/export"
              className="rounded-md border border-border bg-white px-4 py-2 text-sm hover:bg-background"
            >
              Reset
            </Link>
          </div>
        </form>
      </Card>

      <MarkBilledButton
        customerId={filter.customerId}
        from={filter.from}
        to={filter.to}
        disabled={unbilledCount === 0}
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Datum</th>
              <th className="px-4 py-3 font-medium">Klant / project</th>
              <th className="px-4 py-3 font-medium">Omschrijving</th>
              <th className="px-4 py-3 font-medium">Tijd</th>
              <th className="px-4 py-3 font-medium">Bedrag</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ e, project, amount }) => (
              <tr key={e.id} className="border-t border-border align-top">
                <td className="px-4 py-3 whitespace-nowrap">
                  {dateFmt.format(e.date)}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{project.name}</div>
                  <div className="text-xs text-muted">
                    {project.customer.name}
                  </div>
                </td>
                <td className="px-4 py-3">{e.description}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {formatMinutes(e.chargedMinutes)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {formatEuro(amount)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {e.billed ? (
                    <span className="text-green-600">Gefactureerd</span>
                  ) : (
                    <span className="text-amber-600">Openstaand</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  Geen boekingen gevonden.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
