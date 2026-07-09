import Link from "next/link";
import { startOfMonth, endOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/auth-helpers";
import { Card } from "@/components/ui";
import { StatCard } from "@/components/stat-card";
import { formatMinutes } from "@/lib/rounding";

export const CARD_STATUS_LABEL: Record<string, string> = {
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
const monthFmt = new Intl.DateTimeFormat("nl-NL", {
  month: "long",
  year: "numeric",
});

export default async function PortalHome() {
  const { customerId } = await requireCustomer();

  const now = new Date();
  const [cards, monthEntries] = await Promise.all([
    prisma.strippenkaart.findMany({
      where: { customerId },
      include: { cardType: true, project: true },
      orderBy: [{ status: "asc" }, { purchasedAt: "desc" }],
    }),
    prisma.timeEntry.findMany({
      where: {
        date: { gte: startOfMonth(now), lte: endOfMonth(now) },
        OR: [{ project: { customerId } }, { strippenkaart: { customerId } }],
      },
      include: { project: true, strippenkaart: { include: { cardType: true } } },
    }),
  ]);

  const activeCards = cards.filter((c) => c.status === "ACTIVE");
  const totalRemaining = activeCards.reduce(
    (s, c) => s + c.remainingMinutes,
    0,
  );

  // Verbruik per project (deze maand)
  const perProject = new Map<string, { name: string; minutes: number }>();
  for (const e of monthEntries) {
    const key = e.projectId ?? `card:${e.strippenkaartId ?? "onbekend"}`;
    const name =
      e.project?.name ??
      (e.strippenkaart
        ? `Strippenkaart: ${e.strippenkaart.cardType.name}`
        : "Overig");
    const cur = perProject.get(key) ?? { name, minutes: 0 };
    cur.minutes += e.chargedMinutes;
    perProject.set(key, cur);
  }
  const projectUsage = [...perProject.values()].sort(
    (a, b) => b.minutes - a.minutes,
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Resterend saldo"
          value={formatMinutes(totalRemaining)}
          hint="Over alle actieve strippenkaarten"
        />
        <StatCard label="Actieve kaarten" value={activeCards.length} />
        <StatCard
          label={`Verbruik ${monthFmt.format(now)}`}
          value={formatMinutes(
            monthEntries.reduce((s, e) => s + e.chargedMinutes, 0),
          )}
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold">Mijn strippenkaarten</h2>
        {cards.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">
              Er zijn nog geen strippenkaarten voor uw account.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {cards.map((card) => {
              const used = card.totalMinutes - card.remainingMinutes;
              const pct =
                card.totalMinutes > 0
                  ? Math.min(
                      100,
                      Math.max(0, (used / card.totalMinutes) * 100),
                    )
                  : 0;
              return (
                <Link
                  key={card.id}
                  href={`/portal/cards/${card.id}`}
                  className="block rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{card.cardType.name}</p>
                      {card.project ? (
                        <p className="text-xs text-muted">
                          Project: {card.project.name}
                        </p>
                      ) : null}
                    </div>
                    <span className="rounded-full bg-background px-2 py-1 text-xs">
                      {CARD_STATUS_LABEL[card.status]}
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-background">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-2 flex justify-between text-sm">
                      <span
                        className={
                          card.remainingMinutes < 0 ? "text-red-600" : ""
                        }
                      >
                        {formatMinutes(card.remainingMinutes)} resterend
                      </span>
                      <span className="text-muted">
                        van {formatMinutes(card.totalMinutes)}
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-muted">
                    {card.expiresAt
                      ? `Vervalt op ${dateFmt.format(card.expiresAt)}`
                      : "Geen vervaldatum"}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold">
          Verbruik per project ({monthFmt.format(now)})
        </h2>
        <Card>
          {projectUsage.length === 0 ? (
            <p className="text-sm text-muted">
              Deze maand nog geen geregistreerde werkzaamheden.
            </p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {projectUsage.map((p) => (
                <li key={p.name} className="flex justify-between py-2">
                  <span>{p.name}</span>
                  <span className="font-medium">{formatMinutes(p.minutes)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
