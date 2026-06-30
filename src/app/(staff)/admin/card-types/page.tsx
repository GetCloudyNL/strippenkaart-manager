import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { formatMinutes } from "@/lib/rounding";

const DIRECTION_LABEL: Record<string, string> = {
  UP: "naar boven",
  NEAREST: "dichtstbij",
  DOWN: "naar beneden",
};

export default async function CardTypesPage() {
  await requireRole("ADMIN");
  const cardTypes = await prisma.cardType.findMany({
    orderBy: { totalMinutes: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Kaarttypes</h1>
        <p className="text-sm text-muted">
          Configureerbare strippenkaarten met eigen afrondingsregels. Bewerken
          volgt in fase 3.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Naam</th>
              <th className="px-4 py-3 font-medium">Tegoed</th>
              <th className="px-4 py-3 font-medium">Prijs</th>
              <th className="px-4 py-3 font-medium">Afronding</th>
              <th className="px-4 py-3 font-medium">Minimum</th>
              <th className="px-4 py-3 font-medium">Geldigheid</th>
              <th className="px-4 py-3 font-medium">Actief</th>
            </tr>
          </thead>
          <tbody>
            {cardTypes.map((ct) => (
              <tr key={ct.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{ct.name}</td>
                <td className="px-4 py-3">{formatMinutes(ct.totalMinutes)}</td>
                <td className="px-4 py-3">€ {ct.price.toString()}</td>
                <td className="px-4 py-3">
                  {ct.roundingIncrementMin} min {DIRECTION_LABEL[ct.roundingDirection]}
                </td>
                <td className="px-4 py-3">{formatMinutes(ct.minimumPerEntryMin)}</td>
                <td className="px-4 py-3">
                  {ct.validityMonths ? `${ct.validityMonths} mnd` : "onbeperkt"}
                </td>
                <td className="px-4 py-3">{ct.active ? "Ja" : "Nee"}</td>
              </tr>
            ))}
            {cardTypes.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted">
                  Nog geen kaarttypes.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
