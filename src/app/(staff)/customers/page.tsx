import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth-helpers";
import { PageHeader, LinkButton } from "@/components/ui";

const TYPE_LABEL: Record<string, string> = {
  CUSTOMER: "Klant",
  NON_CUSTOMER: "Niet-klant",
};

export default async function CustomersPage() {
  await requireStaff();
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { projects: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Klanten"
        description="Beheer klanten en niet-klanten."
        action={<LinkButton href="/customers/new">Nieuwe klant</LinkButton>}
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Naam</th>
              <th className="px-4 py-3 font-medium">Bedrijf</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Projecten</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3">{c.company ?? "-"}</td>
                <td className="px-4 py-3">{c.email}</td>
                <td className="px-4 py-3">{TYPE_LABEL[c.type]}</td>
                <td className="px-4 py-3">{c._count.projects}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/customers/${c.id}`}
                    className="text-primary hover:underline"
                  >
                    Bewerken
                  </Link>
                </td>
              </tr>
            ))}
            {customers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  Nog geen klanten. Maak er een aan.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
