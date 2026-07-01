import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { isHostbillConfigured } from "@/lib/hostbill";
import { PageHeader, Card } from "@/components/ui";
import { SyncButton } from "./sync-button";

const dateFmt = new Intl.DateTimeFormat("nl-NL", {
  dateStyle: "short",
  timeStyle: "short",
});

export default async function HostbillPage() {
  await requireRole("ADMIN");
  const [configured, state, cardTypes] = await Promise.all([
    isHostbillConfigured(),
    prisma.hostbillSyncState.findUnique({ where: { key: "orders" } }),
    prisma.cardType.findMany({ orderBy: { totalMinutes: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="HostBill"
        description="Koppeling met HostBill: nieuwe bestellingen worden strippenkaarten."
      />

      <Card>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted">Status:</span>
          {configured ? (
            <span className="text-green-600">Geconfigureerd</span>
          ) : (
            <span className="text-red-600">Niet geconfigureerd</span>
          )}
        </div>
        <div className="mt-2 text-sm text-muted">
          Laatste synchronisatie:{" "}
          {state?.lastPolledAt ? dateFmt.format(state.lastPolledAt) : "nog niet"}
          {state?.lastOrderId
            ? ` (t/m order-id ${state.lastOrderId})`
            : ""}
        </div>
        <div className="mt-4">
          <SyncButton />
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">
          Koppeling kaarttype ↔ HostBill-product
        </h2>
        <p className="mb-3 text-sm text-muted">
          Een order wordt een strippenkaart als het HostBill product-ID
          overeenkomt met een kaarttype. Stel dit in bij het kaarttype.
        </p>
        <ul className="space-y-1 text-sm">
          {cardTypes.map((ct) => (
            <li key={ct.id} className="flex justify-between">
              <span>{ct.name}</span>
              <span className={ct.hostbillProductId ? "" : "text-red-600"}>
                {ct.hostbillProductId
                  ? `product-ID ${ct.hostbillProductId}`
                  : "geen product-ID"}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
