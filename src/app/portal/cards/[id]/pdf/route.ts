import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/auth-helpers";
import { generateCardOverviewPdf } from "@/lib/pdf";

const dateFmt = new Intl.DateTimeFormat("nl-NL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { customerId } = await requireCustomer();
  const { id } = await params;

  const card = await prisma.strippenkaart.findUnique({
    where: { id },
    include: {
      customer: true,
      cardType: true,
      timeEntries: { orderBy: { date: "desc" }, include: { project: true } },
    },
  });
  if (!card || card.customerId !== customerId) {
    return new Response("Niet gevonden", { status: 404 });
  }

  const used = card.totalMinutes - card.remainingMinutes;
  const pdf = await generateCardOverviewPdf({
    customerName: card.customer.name,
    cardTypeName: card.cardType.name,
    totalMinutes: card.totalMinutes,
    usedMinutes: used,
    remainingMinutes: card.remainingMinutes,
    purchasedAtLabel: dateFmt.format(card.purchasedAt),
    expiresAtLabel: card.expiresAt ? dateFmt.format(card.expiresAt) : "onbeperkt",
    entries: card.timeEntries.map((e) => ({
      dateLabel: dateFmt.format(e.date),
      projectName: e.project?.name ?? "-",
      description: e.description,
      minutes: e.chargedMinutes,
    })),
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="strippenkaart-${card.id}.pdf"`,
    },
  });
}
