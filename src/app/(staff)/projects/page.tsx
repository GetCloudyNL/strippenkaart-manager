import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth-helpers";
import { PageHeader, LinkButton } from "@/components/ui";
import { getHourlyRates } from "@/lib/settings";
import { resolveHourlyRate, formatEuro } from "@/lib/rates";

const BILLING_LABEL: Record<string, string> = {
  STRIPPENKAART: "Strippenkaart",
  HOURLY: "Uurtarief",
  RETAINER: "Retainer",
  FIXED_PRICE: "Vaste prijs",
};

export default async function ProjectsPage() {
  await requireStaff();
  const [projects, rates] = await Promise.all([
    prisma.project.findMany({
      orderBy: [{ status: "asc" }, { name: "asc" }],
      include: { customer: true, _count: { select: { timeEntries: true } } },
    }),
    getHourlyRates(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projecten"
        description="Projecten per klant met hun afrekenvorm."
        action={<LinkButton href="/projects/new">Nieuw project</LinkButton>}
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Klant</th>
              <th className="px-4 py-3 font-medium">Afrekenvorm</th>
              <th className="px-4 py-3 font-medium">Tarief</th>
              <th className="px-4 py-3 font-medium">Boekingen</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => {
              const rate =
                p.billingType === "HOURLY"
                  ? resolveHourlyRate(
                      p.hourlyRate ? Number(p.hourlyRate) : null,
                      p.customer.type,
                      rates,
                    )
                  : null;
              return (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3">{p.customer.name}</td>
                  <td className="px-4 py-3">{BILLING_LABEL[p.billingType]}</td>
                  <td className="px-4 py-3">
                    {rate != null ? (
                      <>
                        {formatEuro(rate)}/u
                        {p.hourlyRate ? null : (
                          <span className="ml-1 text-xs text-muted">(standaard)</span>
                        )}
                      </>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3">{p._count.timeEntries}</td>
                  <td className="px-4 py-3">
                    {p.status === "ACTIVE" ? "Actief" : "Gearchiveerd"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/projects/${p.id}`}
                      className="text-primary hover:underline"
                    >
                      Bewerken
                    </Link>
                  </td>
                </tr>
              );
            })}
            {projects.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted">
                  Nog geen projecten.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
