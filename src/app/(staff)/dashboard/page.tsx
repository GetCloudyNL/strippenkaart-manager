import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/stat-card";
import { formatMinutes } from "@/lib/rounding";

export default async function DashboardPage() {
  const [customers, activeProjects, activeCards, balance] = await Promise.all([
    prisma.customer.count(),
    prisma.project.count({ where: { status: "ACTIVE" } }),
    prisma.strippenkaart.count({ where: { status: "ACTIVE" } }),
    prisma.strippenkaart.aggregate({
      where: { status: "ACTIVE" },
      _sum: { remainingMinutes: true },
    }),
  ]);

  const outstanding = balance._sum.remainingMinutes ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted">Overzicht van je strippenkaarten en projecten.</p>
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
      </div>

      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted">
        Fundament staat. Volgende fasen: tijdregistratie, strippenkaart-afschrijving,
        HostBill-koppeling en mailrapportages.
      </div>
    </div>
  );
}
