import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/auth-helpers";
import { PageHeader, Card, LinkButton } from "@/components/ui";
import { StatCard } from "@/components/stat-card";
import { formatMinutes } from "@/lib/rounding";
import { CARD_STATUS_LABEL } from "../../page";

const DIRECTION_LABEL: Record<string, string> = {
  UP: "naar boven",
  NEAREST: "dichtstbij",
  DOWN: "naar beneden",
};

const dateFmt = new Intl.DateTimeFormat("nl-NL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export default async function PortalCardDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { customerId } = await requireCustomer();
  const { id } = await params;

  const card = await prisma.strippenkaart.findUnique({
    where: { id },
    include: {
      cardType: true,
      project: true,
      timeEntries: { orderBy: { date: "desc" }, include: { project: true } },
    },
  });
  if (!card || card.customerId !== customerId) notFound();

  const used = card.totalMinutes - card.remainingMinutes;

  return (
    <div className="space-y-6">
      <PageHeader
        title={card.cardType.name}
        description={
          card.project ? `Project: ${card.project.name}` : "Voor alle projecten"
        }
        action={
          <LinkButton href={`/portal/cards/${card.id}/pdf`} variant="secondary">
            Download PDF
          </LinkButton>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label="Totaal" value={formatMinutes(card.totalMinutes)} />
        <StatCard label="Verbruikt" value={formatMinutes(used)} />
        <StatCard
          label="Resterend"
          value={formatMinutes(card.remainingMinutes)}
          hint={card.remainingMinutes < 0 ? "Saldo overschreden" : undefined}
        />
        <StatCard label="Status" value={CARD_STATUS_LABEL[card.status]} />
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Voorwaarden</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">Afronding</dt>
            <dd>
              {card.roundingIncrementMin} min{" "}
              {DIRECTION_LABEL[card.roundingDirection]}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Minimum per boeking</dt>
            <dd>{formatMinutes(card.minimumPerEntryMin)}</dd>
          </div>
          <div>
            <dt className="text-muted">Aangekocht</dt>
            <dd>{dateFmt.format(card.purchasedAt)}</dd>
          </div>
          <div>
            <dt className="text-muted">Vervalt</dt>
            <dd>
              {card.expiresAt ? dateFmt.format(card.expiresAt) : "onbeperkt"}
            </dd>
          </div>
        </dl>
        {card.cardType.termsText ? (
          <p className="mt-4 text-sm text-muted">{card.cardType.termsText}</p>
        ) : null}
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold">Boekingen</h2>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-background text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Datum</th>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Omschrijving</th>
                <th className="px-4 py-3 font-medium">Afgeschreven</th>
              </tr>
            </thead>
            <tbody>
              {card.timeEntries.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {dateFmt.format(e.date)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {e.project?.name ?? "-"}
                  </td>
                  <td className="px-4 py-3">{e.description}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatMinutes(e.chargedMinutes)}
                  </td>
                </tr>
              ))}
              {card.timeEntries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted">
                    Nog geen boekingen op deze kaart.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Link
        href="/portal"
        className="inline-block text-sm text-primary hover:underline"
      >
        &larr; Terug naar overzicht
      </Link>
    </div>
  );
}
