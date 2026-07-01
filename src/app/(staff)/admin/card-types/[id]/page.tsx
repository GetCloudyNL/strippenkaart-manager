import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/ui";
import { CardTypeForm } from "../card-type-form";
import { updateCardType } from "../actions";

export default async function EditCardTypePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN");
  const { id } = await params;
  const cardType = await prisma.cardType.findUnique({ where: { id } });
  if (!cardType) notFound();

  const action = updateCardType.bind(null, cardType.id);

  return (
    <div className="space-y-6">
      <PageHeader title={`Kaarttype bewerken: ${cardType.name}`} />
      <CardTypeForm
        action={action}
        cardType={{
          name: cardType.name,
          totalHours: cardType.totalMinutes / 60,
          price: String(cardType.price),
          roundingIncrementMin: cardType.roundingIncrementMin,
          roundingDirection: cardType.roundingDirection,
          minimumPerEntryMin: cardType.minimumPerEntryMin,
          validityMonths: cardType.validityMonths,
          hostbillProductId: cardType.hostbillProductId,
          termsText: cardType.termsText,
          active: cardType.active,
        }}
      />
    </div>
  );
}
