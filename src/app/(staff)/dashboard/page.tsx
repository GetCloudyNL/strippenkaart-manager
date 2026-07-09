import Link from "next/link";
import { startOfMonth, endOfMonth, addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth-helpers";
import { StatCard } from "@/components/stat-card";
import { Card } from "@/components/ui";
import { formatMinutes } from "@/lib/rounding";
import { getHourlyRates } from "@/lib/settings";
import { resolveHourlyRate, amountForMinutes, formatEuro } from "@/lib/rates";
import { QuickEntry } from "./quick-entry";

const dateFmt = new Intl.DateTimeFormat("nl-NL", {
  day: "2-digit",
  month: "2-digit",
});
const monthFmt = new Intl.DateTimeFormat("nl-NL", {
  month: "long",
  year: "numeric",
});

export default async function DashboardPage() {
  const session = await requireStaff();
  const canBook =
    session.user.role === "ADMIN" || session.user.role === "TECHNICIAN";

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const lowThreshold = Number(process.env.LOW_BALANCE_THRESHOLD_MIN || 60);
  const expiryUntil = addDays(
    now,
    Number(process.env.EXPIRY_REMINDER_DAYS || 14),
  );

  const [
    customers,
    activeProjects,
    activeCards,
    balance,
    monthEntries,
    lowCards,
    expiringCards,
    recentEntries,
    projectsForEntry,
    rates,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.project.count({ where: { status: "ACTIVE" } }),
    prisma.strippenkaart.count({ where: { status: "ACTIVE" } }),
    prisma.strippenkaart.aggregate({
      where: { status: "ACTIVE" },
      _sum: { remainingMinutes: true },
    }),
    prisma.timeEntry.findMany({
      where: { date: { gte: monthStart, lte: monthEnd } },
      include: {
        project: { include: { customer: true } },
        strippenkaart: { include: { customer: true, cardType: true } },
      },
    }),
    prisma.strippenkaart.findMany({
      where: { status: "ACTIVE", remainingMinutes: { lt: lowThreshold } },
      include: { customer: true, cardType: true },
      orderBy: { remainingMinutes: "asc" },
      take: 6,
    }),
    prisma.strippenkaart.findMany({
      where: {
        status: "ACTIVE",
        remainingMinutes: { gt: 0 },
        expiresAt: { not: null, gte: now, lte: expiryUntil },
      },
      include: { customer: true, cardType: true },
      orderBy: { expiresAt: "asc" },
      take: 6,
    }),
    prisma.timeEntry.findMany({
      orderBy: { date: "desc" },
      take: 6,
      include: {
        project: { include: { customer: true } },
        strippenkaart: { include: { customer: true, cardType: true } },
        user: true,
      },
    }),
    prisma.project.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      include: { customer: true },
    }),
    getHourlyRates(),
  ]);

  const outstanding = balance._sum.remainingMinutes ?? 0;
  const monthMinutes = monthEntries.reduce((s, e) => s + e.chargedMinutes, 0);
  const monthRevenue = monthEntries.reduce((s, e) => {
    if (e.project?.billingType !== "HOURLY") return s;
    const rate = resolveHourlyRate(
      e.project.hourlyRate ? Number(e.project.hourlyRate) : null,
      e.project.customer.type,
      rates,
    );
    return s + amountForMinutes(e.chargedMinutes, rate);
  }, 0);

  const perProject = new Map<string, { name: string; minutes: number }>();
  for (const e of monthEntries) {
    const key = e.projectId ?? `card:${e.strippenkaartId ?? "onbekend"}`;
    const name = e.project
      ? `${e.project.name} (${e.project.customer.name})`
      : e.strippenkaart
        ? `Strippenkaart: ${e.strippenkaart.cardType.name} (${e.strippenkaart.customer.name})`
        : "Overig";
    const cur = perProject.get(key) ?? { name, minutes: 0 };
    cur.minutes += e.chargedMinutes;
    perProject.set(key, cur);
  }
  const topProjects = [...perProject.values()]
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 5);
  const topMax = topProjects[0]?.minutes ?? 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted">
          Overzicht van strippenkaarten, projecten en tijdregistratie.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Klanten" value={customers} />
        <StatCard label="Actieve projecten" value={activeProjects} />
        <StatCard label="Actieve strippenkaarten" value={activeCards} />
        <StatCard
          label="Openstaand tegoed"
          value={formatMinutes(outstanding)}
          hint="Som van resterende minuten"
        />
        <StatCard
          label={`Uren ${monthFmt.format(now)}`}
          value={formatMinutes(monthMinutes)}
        />
        <StatCard
          label={`Omzet ${monthFmt.format(now)}`}
          value={formatEuro(monthRevenue)}
          hint="Projecten op uurtarief"
        />
        <StatCard label="Boekingen deze maand" value={monthEntries.length} />
        <StatCard
          label="Aandacht nodig"
          value={lowCards.length + expiringCards.length}
          hint="Laag saldo of bijna verlopen"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {canBook ? (
          <Card className="lg:col-span-1">
            <h2 className="mb-3 text-sm font-semibold">Snel tijd schrijven</h2>
            <QuickEntry
              projects={projectsForEntry.map((p) => ({
                id: p.id,
                label: `${p.name} (${p.customer.name})`,
              }))}
            />
          </Card>
        ) : null}

        <div
          className={`space-y-6 ${canBook ? "lg:col-span-2" : "lg:col-span-3"}`}
        >
          <Card>
            <h2 className="mb-3 text-sm font-semibold">
              Top projecten ({monthFmt.format(now)})
            </h2>
            {topProjects.length === 0 ? (
              <p className="text-sm text-muted">
                Deze maand nog geen boekingen.
              </p>
            ) : (
              <ul className="space-y-2">
                {topProjects.map((p) => (
                  <li key={p.name}>
                    <div className="flex justify-between text-sm">
                      <span className="truncate pr-2">{p.name}</span>
                      <span className="whitespace-nowrap font-medium">
                        {formatMinutes(p.minutes)}
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-background">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${(p.minutes / topMax) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Card>
              <h2 className="mb-3 text-sm font-semibold">Laag saldo</h2>
              {lowCards.length === 0 ? (
                <p className="text-sm text-muted">Geen kaarten met laag saldo.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {lowCards.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/cards/${c.id}`}
                        className="flex justify-between hover:underline"
                      >
                        <span className="truncate pr-2">
                          {c.customer.name} – {c.cardType.name}
                        </span>
                        <span
                          className={`whitespace-nowrap font-medium ${
                            c.remainingMinutes < 0 ? "text-red-600" : ""
                          }`}
                        >
                          {formatMinutes(c.remainingMinutes)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <h2 className="mb-3 text-sm font-semibold">Bijna verlopen</h2>
              {expiringCards.length === 0 ? (
                <p className="text-sm text-muted">
                  Geen kaarten die binnenkort verlopen.
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {expiringCards.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/cards/${c.id}`}
                        className="flex justify-between hover:underline"
                      >
                        <span className="truncate pr-2">
                          {c.customer.name} – {c.cardType.name}
                        </span>
                        <span className="whitespace-nowrap text-muted">
                          {c.expiresAt ? dateFmt.format(c.expiresAt) : ""}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card>
            <h2 className="mb-3 text-sm font-semibold">Recente boekingen</h2>
            {recentEntries.length === 0 ? (
              <p className="text-sm text-muted">Nog geen boekingen.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {recentEntries.map((e) => (
                  <li key={e.id} className="flex justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <p className="truncate">{e.description}</p>
                      <p className="text-xs text-muted">
                        {e.project?.name ??
                          (e.strippenkaart
                            ? `Strippenkaart: ${e.strippenkaart.cardType.name}`
                            : "—")}{" "}
                        ·{" "}
                        {e.project?.customer.name ??
                          e.strippenkaart?.customer.name ??
                          "—"}{" "}
                        · {e.user.name}
                      </p>
                    </div>
                    <div className="whitespace-nowrap text-right">
                      <p className="font-medium">
                        {formatMinutes(e.chargedMinutes)}
                      </p>
                      <p className="text-xs text-muted">
                        {dateFmt.format(e.date)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
