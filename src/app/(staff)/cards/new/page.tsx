import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/ui";
import { CardForm } from "../card-form";

export default async function NewCardPage() {
  await requireRole(["ADMIN", "TECHNICIAN"]);
  const [customers, cardTypes, projects] = await Promise.all([
    prisma.customer.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.cardType.findMany({
      where: { active: true },
      orderBy: { totalMinutes: "asc" },
      select: { id: true, name: true },
    }),
    prisma.project.findMany({
      orderBy: { name: "asc" },
      include: { customer: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Nieuwe strippenkaart" />
      {customers.length === 0 || cardTypes.length === 0 ? (
        <p className="text-sm text-muted">
          Zorg eerst voor minimaal één{" "}
          <Link href="/customers/new" className="text-primary hover:underline">
            klant
          </Link>{" "}
          en één actief{" "}
          <Link
            href="/admin/card-types/new"
            className="text-primary hover:underline"
          >
            kaarttype
          </Link>
          .
        </p>
      ) : (
        <CardForm
          customers={customers}
          cardTypes={cardTypes}
          projects={projects.map((p) => ({
            id: p.id,
            label: `${p.name} (${p.customer.name})`,
          }))}
        />
      )}
    </div>
  );
}
