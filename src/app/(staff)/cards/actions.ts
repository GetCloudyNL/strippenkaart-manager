"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addMonths } from "date-fns";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";
import { deductFromCard } from "@/lib/strippenkaart";
import { resolveDuration } from "@/lib/duration";
import { sendWorkCompletedMail } from "@/lib/notify";

const cardSchema = z.object({
  customerId: z.string().min(1, "Kies een klant"),
  cardTypeId: z.string().min(1, "Kies een kaarttype"),
  projectId: z.string().optional(),
  purchasedAt: z.string().optional(),
});

export type CardFormState = { error?: string } | undefined;

export async function createCard(
  _prev: CardFormState,
  formData: FormData,
): Promise<CardFormState> {
  const session = await requireRole(["ADMIN", "TECHNICIAN"]);
  const parsed = cardSchema.safeParse({
    customerId: formData.get("customerId"),
    cardTypeId: formData.get("cardTypeId"),
    projectId: formData.get("projectId") || undefined,
    purchasedAt: formData.get("purchasedAt") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const cardType = await prisma.cardType.findUnique({
    where: { id: parsed.data.cardTypeId },
  });
  if (!cardType) return { error: "Kaarttype niet gevonden." };

  const purchasedAt = parsed.data.purchasedAt
    ? new Date(parsed.data.purchasedAt)
    : new Date();
  const expiresAt = cardType.validityMonths
    ? addMonths(purchasedAt, cardType.validityMonths)
    : null;

  const card = await prisma.strippenkaart.create({
    data: {
      customerId: parsed.data.customerId,
      projectId: parsed.data.projectId || null,
      cardTypeId: cardType.id,
      totalMinutes: cardType.totalMinutes,
      remainingMinutes: cardType.totalMinutes,
      roundingIncrementMin: cardType.roundingIncrementMin,
      roundingDirection: cardType.roundingDirection,
      minimumPerEntryMin: cardType.minimumPerEntryMin,
      purchasedAt,
      expiresAt,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "CARD_CREATED",
    entity: "Strippenkaart",
    entityId: card.id,
    meta: { cardType: cardType.name, totalMinutes: cardType.totalMinutes },
  });

  revalidatePath("/cards");
  redirect("/cards");
}

const cardTimeSchema = z.object({
  date: z.string().min(1, "Datum is verplicht"),
  description: z.string().trim().min(1, "Omschrijving is verplicht"),
  hours: z.coerce.number().int().min(0).max(1000),
  minutes: z.coerce.number().int().min(0).max(59),
  start: z.string().optional(),
  end: z.string().optional(),
  ticketRef: z.string().trim().optional(),
});

export type CardTimeState = { error?: string } | undefined;

export async function logTimeOnCard(
  cardId: string,
  _prev: CardTimeState,
  formData: FormData,
): Promise<CardTimeState> {
  const session = await requireRole(["ADMIN", "TECHNICIAN"]);
  const parsed = cardTimeSchema.safeParse({
    date: formData.get("date"),
    description: formData.get("description"),
    hours: formData.get("hours") || 0,
    minutes: formData.get("minutes") || 0,
    start: formData.get("start") || undefined,
    end: formData.get("end") || undefined,
    ticketRef: formData.get("ticketRef") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const { date, description, hours, minutes, start, end, ticketRef } =
    parsed.data;
  const duration = resolveDuration({ hours, minutes, start, end }, date);
  if ("error" in duration) return { error: duration.error };

  const card = await prisma.strippenkaart.findUnique({ where: { id: cardId } });
  if (!card) return { error: "Strippenkaart niet gevonden." };
  if (card.status === "CANCELLED" || card.status === "EXPIRED") {
    return { error: "Deze strippenkaart is niet meer actief." };
  }

  let createdId: string | null = null;
  await prisma.$transaction(async (tx) => {
    const charged = await deductFromCard(
      tx,
      card,
      duration.rawMinutes,
      session.user.id,
    );
    const created = await tx.timeEntry.create({
      data: {
        projectId: card.projectId,
        strippenkaartId: card.id,
        userId: session.user.id,
        date: new Date(date),
        startedAt: duration.startedAt,
        endedAt: duration.endedAt,
        description,
        rawMinutes: duration.rawMinutes,
        chargedMinutes: charged,
        ticketRef: ticketRef || null,
      },
    });
    createdId = created.id;
  });

  await logAudit({
    userId: session.user.id,
    action: "TIME_CREATED",
    entity: "TimeEntry",
    entityId: createdId,
    meta: { strippenkaartId: card.id, rawMinutes: duration.rawMinutes },
  });

  if (createdId) {
    try {
      await sendWorkCompletedMail(createdId);
    } catch {
      // mailfout mag het boeken niet blokkeren
    }
  }

  revalidatePath(`/cards/${cardId}`);
  revalidatePath("/cards");
  revalidatePath("/time");
  redirect(`/cards/${cardId}`);
}

export async function cancelCard(id: string): Promise<void> {
  const session = await requireRole(["ADMIN", "TECHNICIAN"]);
  await prisma.strippenkaart.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  await logAudit({
    userId: session.user.id,
    action: "CARD_CANCELLED",
    entity: "Strippenkaart",
    entityId: id,
  });
  revalidatePath("/cards");
  revalidatePath(`/cards/${id}`);
  redirect(`/cards/${id}`);
}
