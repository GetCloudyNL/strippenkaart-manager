import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth-helpers";
import { PageHeader, Card } from "@/components/ui";
import { StatCard } from "@/components/stat-card";
import { formatMinutes } from "@/lib/rounding";
import { STATUS_LABEL } from "../page";
import { CancelCardButton } from "../cancel-button";
import { LogTimeForm } from "./log-time-form";

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

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const card = await prisma.strippenkaart.findUnique({
    where: { id },
    include: {
      customer: true,
      cardType: true,
      project: true,
      timeEntries: {
        orderBy: { date: "desc" },
        include: { user: true, project: true },
      },
    },
  });
  if (!card) notFound();

  const used = card.totalMinutes - card.remainingMinutes;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${card.cardType.name} – ${card.customer.name}`}
        description={card.project ? `Gekoppeld aan project: ${card.project.name}` : "Voor de hele klant"}
        action={
          card.status === "ACTIVE" || card.status === "DEPLETED" ? (
            <CancelCardButton id={card.id} />
          ) : undefined
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
        <StatCard label="Status" value={STATUS_LABEL[card.status]} />
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Voorwaarden (bij aankoop)</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">Afronding</dt>
            <dd>
              {card.roundingIncrementMin} min {DIRECTION_LABEL[card.roundingDirection]}
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
            <dd>{card.expiresAt ? dateFmt.format(card.expiresAt) : "onbeperkt"}</dd>
          </div>
        </dl>
        {card.cardType.termsText ? (
          <p className="mt-4 text-sm text-muted">{card.cardType.termsText}</p>
        ) : null}
      </Card>

      {card.status === "ACTIVE" || card.status === "DEPLETED" ? (
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Tijd afschrijven</h2>
          <LogTimeForm cardId={card.id} />
        </Card>
      ) : null}

      <div>
        <h2 className="mb-3 text-sm font-semibold">Boekingen op deze kaart</h2>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-background text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Datum</th>
                <th className="px-4 py-3 font-medium">Omschrijving</th>
                <th className="px-4 py-3 font-medium">Door</th>
                <th className="px-4 py-3 font-medium">Ruw</th>
                <th className="px-4 py-3 font-medium">Afgeschreven</th>
              </tr>
            </thead>
            <tbody>
              {card.timeEntries.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {dateFmt.format(e.date)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/time/${e.id}`}
                      className="text-primary hover:underline"
                    >
                      {e.description}
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{e.user.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatMinutes(e.rawMinutes)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatMinutes(e.chargedMinutes)}
                  </td>
                </tr>
              ))}
              {card.timeEntries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted">
                    Nog geen boekingen op deze kaart.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
