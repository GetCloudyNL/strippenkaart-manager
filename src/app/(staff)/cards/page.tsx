import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth-helpers";
import { PageHeader, LinkButton } from "@/components/ui";
import { formatMinutes } from "@/lib/rounding";

export const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Actief",
  DEPLETED: "Opgebruikt",
  EXPIRED: "Verlopen",
  CANCELLED: "Geannuleerd",
};

const dateFmt = new Intl.DateTimeFormat("nl-NL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export default async function CardsPage() {
  await requireStaff();
  const cards = await prisma.strippenkaart.findMany({
    orderBy: [{ status: "asc" }, { purchasedAt: "desc" }],
    include: { customer: true, cardType: true, project: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Strippenkaarten"
        description="Actieve en historische strippenkaarten met saldo."
        action={<LinkButton href="/cards/new">Nieuwe strippenkaart</LinkButton>}
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Klant</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Saldo</th>
              <th className="px-4 py-3 font-medium">Vervalt</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {cards.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{c.customer.name}</td>
                <td className="px-4 py-3">{c.cardType.name}</td>
                <td className="px-4 py-3">{c.project?.name ?? "-"}</td>
                <td className="px-4 py-3">
                  <span
                    className={c.remainingMinutes < 0 ? "text-red-600" : ""}
                  >
                    {formatMinutes(c.remainingMinutes)}
                  </span>
                  <span className="text-muted"> / {formatMinutes(c.totalMinutes)}</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {c.expiresAt ? dateFmt.format(c.expiresAt) : "onbeperkt"}
                </td>
                <td className="px-4 py-3">{STATUS_LABEL[c.status]}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/cards/${c.id}`}
                    className="text-primary hover:underline"
                  >
                    Details
                  </Link>
                </td>
              </tr>
            ))}
            {cards.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted">
                  Nog geen strippenkaarten.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
