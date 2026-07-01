import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth-helpers";
import { PageHeader, LinkButton, Card, inputClass } from "@/components/ui";
import { StatCard } from "@/components/stat-card";
import { getHourlyRates } from "@/lib/settings";
import { resolveHourlyRate, amountForMinutes, formatEuro } from "@/lib/rates";
import { formatMinutes } from "@/lib/rounding";
import { DeleteEntryButton } from "./delete-button";

const dateFmt = new Intl.DateTimeFormat("nl-NL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export default async function TimePage({
  searchParams,
}: {
  searchParams: Promise<{
    customerId?: string;
    projectId?: string;
    from?: string;
    to?: string;
  }>;
}) {
  await requireStaff();
  const sp = await searchParams;

  const [customers, projects, rates] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.project.findMany({
      orderBy: { name: "asc" },
      include: { customer: true },
    }),
    getHourlyRates(),
  ]);

  const dateFilter =
    sp.from || sp.to
      ? {
          gte: sp.from ? new Date(sp.from) : undefined,
          lte: sp.to ? new Date(`${sp.to}T23:59:59`) : undefined,
        }
      : undefined;

  const entries = await prisma.timeEntry.findMany({
    where: {
      projectId: sp.projectId || undefined,
      project: sp.customerId ? { customerId: sp.customerId } : undefined,
      date: dateFilter,
    },
    include: { project: { include: { customer: true } }, user: true },
    orderBy: { date: "desc" },
  });

  const rows = entries.map((e) => {
    let amount: number | null = null;
    if (e.project.billingType === "HOURLY") {
      const rate = resolveHourlyRate(
        e.project.hourlyRate ? Number(e.project.hourlyRate) : null,
        e.project.customer.type,
        rates,
      );
      amount = amountForMinutes(e.chargedMinutes, rate);
    }
    return { e, amount };
  });

  const totalMinutes = rows.reduce((sum, r) => sum + r.e.chargedMinutes, 0);
  const totalAmount = rows.reduce((sum, r) => sum + (r.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tijdregistratie"
        description="Boekingen over alle projecten."
        action={<LinkButton href="/time/new">Nieuwe boeking</LinkButton>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Aantal boekingen" value={entries.length} />
        <StatCard label="Totaal tijd" value={formatMinutes(totalMinutes)} />
        <StatCard
          label="Bedrag (uurtarief)"
          value={formatEuro(totalAmount)}
          hint="Alleen projecten op uurtarief"
        />
      </div>

      <Card>
        <form className="grid grid-cols-1 gap-4 md:grid-cols-5" method="get">
          <div className="space-y-1">
            <label className="text-sm font-medium">Klant</label>
            <select name="customerId" defaultValue={sp.customerId ?? ""} className={inputClass}>
              <option value="">Alle</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Project</label>
            <select name="projectId" defaultValue={sp.projectId ?? ""} className={inputClass}>
              <option value="">Alle</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.customer.name})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Vanaf</label>
            <input type="date" name="from" defaultValue={sp.from ?? ""} className={inputClass} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Tot</label>
            <input type="date" name="to" defaultValue={sp.to ?? ""} className={inputClass} />
          </div>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Filter
            </button>
            <Link
              href="/time"
              className="rounded-md border border-border bg-white px-4 py-2 text-sm hover:bg-background"
            >
              Reset
            </Link>
          </div>
        </form>
      </Card>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Datum</th>
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Omschrijving</th>
              <th className="px-4 py-3 font-medium">Door</th>
              <th className="px-4 py-3 font-medium">Tijd</th>
              <th className="px-4 py-3 font-medium">Bedrag</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ e, amount }) => (
              <tr key={e.id} className="border-t border-border align-top">
                <td className="px-4 py-3 whitespace-nowrap">{dateFmt.format(e.date)}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{e.project.name}</div>
                  <div className="text-xs text-muted">{e.project.customer.name}</div>
                </td>
                <td className="px-4 py-3">
                  {e.description}
                  {e.ticketRef ? (
                    <span className="ml-1 text-xs text-muted">#{e.ticketRef}</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{e.user.name}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {formatMinutes(e.chargedMinutes)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {amount != null ? formatEuro(amount) : "-"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <div className="flex justify-end gap-3">
                    <Link
                      href={`/time/${e.id}`}
                      className="text-primary hover:underline"
                    >
                      Bewerken
                    </Link>
                    <DeleteEntryButton id={e.id} />
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted">
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
